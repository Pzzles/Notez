"use client"

import { FileText, Loader2, Plus, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Priority } from "@/lib/types"

type ExtractedTask = {
  title: string
  priority: Priority
  selected: boolean
}

type TranscriptParserProps = {
  onAddTasks: (tasks: { title: string; priority: Priority }[]) => void
}

async function extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const prompt = `You are extracting action items from a meeting transcript.

Find ALL tasks, action items, and follow-ups assigned to or belonging to "Pule" in this transcript. Include tasks where Pule is mentioned by name or where context makes it clear the task belongs to them.

Return ONLY a valid JSON array with no other text. Each item:
- "title": clean actionable task (e.g. "Review the onboarding doc" not "Pule needs to review the onboarding doc")
- "priority": "low", "medium", or "high" based on urgency or importance mentioned

If nothing is found, return [].

Transcript:
${transcript}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`)
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]"

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const parsed = JSON.parse(cleaned)

  return parsed.map((t: { title: string; priority: string }) => ({
    title: t.title,
    priority: (["low", "medium", "high"].includes(t.priority) ? t.priority : "medium") as Priority,
    selected: true,
  }))
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f43f5e",
}

export function TranscriptParser({ onAddTasks }: TranscriptParserProps) {
  const [open, setOpen] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [tasks, setTasks] = useState<ExtractedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleParse() {
    if (!transcript.trim()) return
    setLoading(true)
    setError("")
    setTasks([])
    try {
      const extracted = await extractTasksFromTranscript(transcript)
      setTasks(extracted)
      if (extracted.length === 0) setError("No tasks found for Pule in this transcript.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    const selected = tasks.filter((t) => t.selected)
    if (selected.length === 0) return
    onAddTasks(selected)
    setOpen(false)
    setTranscript("")
    setTasks([])
    setError("")
  }

  function handleClose() {
    setOpen(false)
    setTranscript("")
    setTasks([])
    setError("")
    setLoading(false)
  }

  const selectedCount = tasks.filter((t) => t.selected).length

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Parse meeting transcript"
        aria-label="Parse meeting transcript"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <FileText className="size-3.5" />
        <span className="hidden sm:inline">From transcript</span>
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Parse meeting transcript</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Paste your transcript — Gemini will extract Pule's tasks</p>
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

            {/* Textarea */}
            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setTasks([]); setError("") }}
              placeholder="Paste your meeting transcript here…"
              rows={8}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />

            {/* Parse button */}
            {tasks.length === 0 && (
              <button
                type="button"
                onClick={handleParse}
                disabled={!transcript.trim() || loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Extracting tasks…</>
                ) : (
                  <><FileText className="size-4" /> Extract Pule's tasks</>
                )}
              </button>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {/* Results */}
            {tasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Found {tasks.length} task{tasks.length !== 1 ? "s" : ""} — select the ones to add
                </p>

                <ul className="flex flex-col gap-1.5">
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
                    onClick={() => setTasks((prev) => prev.map((t) => ({ ...t, selected: true })))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={() => setTasks((prev) => prev.map((t) => ({ ...t, selected: false })))}
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
