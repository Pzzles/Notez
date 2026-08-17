"use client"

import { Check, Copy, Loader2, Megaphone, RefreshCw, X } from "lucide-react"
import { useState } from "react"
import type { Todo } from "@/lib/types"

async function generateStandup(todos: Todo[]): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const completed = todos.filter((t) => t.completed)
  const active = todos.filter((t) => !t.completed)
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })

  const completedList = completed.length > 0
    ? completed.map((t) => `- ${t.title} [${t.priority} priority]`).join("\n")
    : "(none)"

  const activeList = active.length > 0
    ? active.map((t) => {
        let line = `- ${t.title} [${t.priority} priority]`
        if (t.subtasks.length > 0) {
          const done = t.subtasks.filter((s) => s.completed).length
          line += ` (${done}/${t.subtasks.length} subtasks done)`
        }
        return line
      }).join("\n")
    : "(none)"

  const prompt = `Today is ${today}. Write a concise daily standup update for Slack or Teams based on this task list.

COMPLETED TASKS:
${completedList}

ACTIVE / IN-PROGRESS TASKS:
${activeList}

Format the standup with these three sections using bold labels:
*Yesterday:* [summarise completed work naturally — combine related tasks, don't just list them verbatim]
*Today:* [summarise what's in progress or planned]
*Blockers:* [write "None" unless you can infer a blocker from task context]

Rules:
- Sound like a real person wrote it, not a robot
- Keep it under 100 words total
- No introduction, sign-off, or explanation — just the three sections
- Ready to paste directly into Slack or Teams`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
}

type StandupGeneratorProps = {
  todos: Todo[]
}

export function StandupGenerator({ todos }: StandupGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [standup, setStandup] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setError("")
    setStandup("")
    try {
      const result = await generateStandup(todos)
      setStandup(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    generate()
  }

  function handleClose() {
    setOpen(false)
    setStandup("")
    setError("")
    setLoading(false)
    setCopied(false)
  }

  async function handleCopy() {
    if (!standup) return
    await navigator.clipboard.writeText(standup)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Generate standup"
        aria-label="Generate standup"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <Megaphone className="size-3.5" />
        <span className="hidden sm:inline">Standup</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Daily standup</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ready to paste into Slack or Teams
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

            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Writing your standup…</p>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {standup && (
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{standup}</pre>
              </div>
            )}

            {(standup || error) && !loading && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => generate()}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </button>
                {standup && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {copied ? (
                      <><Check className="size-4" /> Copied!</>
                    ) : (
                      <><Copy className="size-4" /> Copy</>
                    )}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
