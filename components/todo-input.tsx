"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Priority } from "@/lib/types"

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

type TodoInputProps = {
  onAdd: (title: string, priority: Priority) => void
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [value, setValue] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")

  function submit() {
    if (!value.trim()) return
    onAdd(value, priority)
    setValue("")
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2">
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
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Add task"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1 px-1 pb-1">
        <span className="mr-1 text-xs text-muted-foreground">Priority</span>
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPriority(p.value)}
            aria-pressed={priority === p.value}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              priority === p.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
