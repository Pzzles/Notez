"use client"

import { Loader2, Mic, MicOff, Plus, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Priority } from "@/lib/types"

type ExtractedTask = {
  title: string
  priority: Priority
  selected: boolean
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f43f5e",
}

async function processVoiceNote(
  blob: Blob,
): Promise<{ transcript: string; tasks: ExtractedTask[] }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const prompt = `Transcribe this audio recording, then extract every distinct task or action item mentioned.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "transcript": "verbatim transcription",
  "tasks": [
    {"title": "concise actionable task starting with a verb", "priority": "low|medium|high"}
  ]
}

Infer priority from urgency words. If no tasks are found return {"transcript": "...", "tasks": []}.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: blob.type || "audio/webm", data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`)
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const parsed = JSON.parse(cleaned)

  return {
    transcript: parsed.transcript ?? "",
    tasks: (parsed.tasks ?? []).map((t: { title: string; priority: string }) => ({
      title: t.title,
      priority: (["low", "medium", "high"].includes(t.priority) ? t.priority : "medium") as Priority,
      selected: true,
    })),
  }
}

type VoiceInputProps = {
  onAddTasks: (tasks: { title: string; priority: Priority }[]) => void
}

export function VoiceInput({ onAddTasks }: VoiceInputProps) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [tasks, setTasks] = useState<ExtractedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { stopRecording() }, [])

  async function startRecording() {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : ""
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        processAndExtract(blob)
      }

      recorderRef.current = recorder
      recorder.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError("Couldn't access microphone — check browser permissions.")
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const r = recorderRef.current
    recorderRef.current = null
    if (r && r.state !== "inactive") r.stop()
    setRecording(false)
  }

  async function processAndExtract(blob: Blob) {
    setLoading(true)
    setError("")
    try {
      const result = await processVoiceNote(blob)
      setTranscript(result.transcript)
      setTasks(result.tasks)
      if (result.tasks.length === 0) setError("No tasks found. Try speaking specific action items.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    const selected = tasks.filter((t) => t.selected)
    if (!selected.length) return
    onAddTasks(selected)
    handleClose()
  }

  function handleClose() {
    stopRecording()
    setOpen(false)
    setTranscript("")
    setTasks([])
    setError("")
    setLoading(false)
    setSeconds(0)
  }

  const selectedCount = tasks.filter((t) => t.selected).length
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Dictate tasks"
        aria-label="Dictate tasks"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <Mic className="size-3.5" />
        <span className="hidden sm:inline">Dictate</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Dictate tasks</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Speak your tasks — Gemini will extract them
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Mic button */}
            {!loading && tasks.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  aria-label={recording ? "Stop recording" : "Start recording"}
                  className={cn(
                    "flex size-20 items-center justify-center rounded-full border-4 transition-all duration-200",
                    recording
                      ? "animate-pulse border-destructive bg-destructive/10 text-destructive shadow-lg shadow-destructive/20"
                      : "border-border bg-muted text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  {recording ? <MicOff className="size-8" /> : <Mic className="size-8" />}
                </button>
                <p className="text-sm text-muted-foreground">
                  {recording ? `Listening… ${fmt(seconds)}` : "Tap to start speaking"}
                </p>
              </div>
            )}

            {/* Processing */}
            {loading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing…</p>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="rounded-xl border border-border bg-background px-3 py-2.5">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Transcript
                </p>
                <p className="text-sm leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {/* Task results */}
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Found {tasks.length} task{tasks.length !== 1 ? "s" : ""} — select the ones to add
                </p>
                <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
                  {tasks.map((task, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={task.selected}
                          onChange={(e) =>
                            setTasks((prev) =>
                              prev.map((t, j) => (j === i ? { ...t, selected: e.target.checked } : t)),
                            )
                          }
                          className="size-4 accent-primary"
                        />
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
                        />
                        <span className={cn("flex-1 text-sm", !task.selected && "text-muted-foreground line-through")}>
                          {task.title}
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {task.priority}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTasks((p) => p.map((t) => ({ ...t, selected: true })))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={() => setTasks((p) => p.map((t) => ({ ...t, selected: false })))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={selectedCount === 0}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                    Add {selectedCount} task{selectedCount !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
