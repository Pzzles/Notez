"use client"

import { CalendarDays, Plus, Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Priority, Template } from "@/lib/types"
import { useFamiliarity } from "@/hooks/use-familiarity"

const PRIORITIES: { value: Priority; color: string; label: string }[] = [
  { value: "low",    color: "#22c55e", label: "Low"    },
  { value: "medium", color: "#f59e0b", label: "Medium" },
  { value: "high",   color: "#f43f5e", label: "High"   },
]

type TodoInputProps = {
  onAdd: (title: string, priority: Priority, dueDate?: number, subtasks?: string[]) => void
  templates: Template[]
  onRemoveTemplate: (id: string) => void
}

export function TodoInput({ onAdd, templates, onRemoveTemplate }: TodoInputProps) {
  const [value, setValue] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [dismissed, setDismissed] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const suggestion = useFamiliarity(value)

  // Reset dismissal whenever a new (different) suggestion arrives
  const prevSuggestion = useRef<string | null>(null)
  useEffect(() => {
    const key = suggestion?.title ?? null
    if (key !== prevSuggestion.current) {
      prevSuggestion.current = key
      setDismissed(false)
    }
  }, [suggestion])

  const showSuggestion = suggestion && !dismissed

  function submit(subtasks?: string[]) {
    if (!value.trim()) return
    onAdd(value, priority, dueDate ? new Date(dueDate + "T00:00:00").getTime() : undefined, subtasks)
    setValue("")
    setDueDate("")
    setDismissed(false)
  }

  const today = new Date().toLocaleDateString("en-CA")

  return (
    <div className="space-y-2">
      {/* One unified card — everything on a single row */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-sm">
        {/* Priority dots */}
        <div className="flex shrink-0 items-center gap-1.5 py-3">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.label}
              aria-label={`Set priority to ${p.label}`}
              onClick={() => setPriority(p.value)}
              style={{
                backgroundColor: p.color,
                boxShadow: priority === p.value ? `0 0 0 2px var(--color-card, white), 0 0 0 4px ${p.color}` : "none",
              }}
              className={cn(
                "rounded-full transition-all duration-150",
                priority === p.value ? "size-3 opacity-100" : "size-2 opacity-25 hover:opacity-50",
              )}
            />
          ))}
        </div>

        <div className="h-4 w-px shrink-0 bg-border" />

        {/* Text field */}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="What needs to get done?"
          aria-label="New task"
          className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
        />

        {/* Calendar / due-date toggle */}
        <button
          type="button"
          title={dueDate ? `Due: ${dueDate}` : "Set due date"}
          aria-label="Set due date"
          onClick={() => {
            try { (dateInputRef.current as any).showPicker() } catch { dateInputRef.current?.focus() }
          }}
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 transition-colors",
            dueDate ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="size-4" />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={dueDate}
          min={today}
          onChange={(e) => setDueDate(e.target.value)}
          className="pointer-events-none absolute opacity-0"
          style={{ width: 1, height: 1 }}
        />

        {dueDate && (
          <button
            type="button"
            onClick={() => setDueDate("")}
            aria-label="Clear due date"
            className="shrink-0 text-muted-foreground/50 hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}

        {/* Add */}
        <button
          type="button"
          onClick={() => submit()}
          disabled={!value.trim()}
          aria-label="Add task"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Familiarity suggestion */}
      {showSuggestion && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              <span>
                Looks familiar — {suggestion.usedCount > 1 ? `you've done this ${suggestion.usedCount}×` : "last time you added subtasks"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss suggestion"
              className="text-muted-foreground/50 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {suggestion.subtasks.map((sub, i) => (
              <span
                key={i}
                className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground"
              >
                {sub}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => submit(suggestion.subtasks)}
            disabled={!value.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            Add with {suggestion.subtasks.length} subtask{suggestion.subtasks.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Template chips */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {templates.map((t) => {
            const p = PRIORITIES.find((x) => x.value === t.priority)
            return (
              <div key={t.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onAdd(t.title, t.priority)}
                  title={`Add "${t.title}"`}
                  className="flex items-center gap-1.5 rounded-l-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: p?.color }} />
                  <span className="max-w-[120px] truncate">{t.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTemplate(t.id)}
                  aria-label={`Remove template "${t.title}"`}
                  className="flex items-center justify-center rounded-r-lg border border-l-0 border-border bg-card px-1.5 py-1 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
