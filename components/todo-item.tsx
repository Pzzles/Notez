"use client"

import { Check, Pencil, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Priority, Todo } from "@/lib/types"

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, title: string) => void
}

export function TodoItem({ todo, onToggle, onRemove, onUpdate }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    onUpdate(todo.id, draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(todo.title)
    setEditing(false)
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm transition-colors">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={todo.completed ? "Mark as not done" : "Mark as done"}
        onClick={() => onToggle(todo.id)}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          todo.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {todo.completed && <Check className="size-4" />}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              cancel()
            }
          }}
          onBlur={commit}
          aria-label="Edit task"
          className="min-w-0 flex-1 rounded-md bg-transparent text-sm outline-none ring-2 ring-ring/50 ring-offset-0"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm transition-colors",
            todo.completed && "text-muted-foreground line-through",
          )}
          title={todo.title}
        >
          {todo.title}
        </button>
      )}

      <span
        className={cn(
          "hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-block",
          PRIORITY_STYLES[todo.priority],
        )}
      >
        {PRIORITY_LABEL[todo.priority]}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        {editing ? (
          <>
            <button
              type="button"
              onClick={commit}
              aria-label="Save"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
              aria-label="Cancel"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit task"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(todo.id)}
              aria-label="Delete task"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
    </li>
  )
}
