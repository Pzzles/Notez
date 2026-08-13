"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import { CalendarDays, Check, GripVertical, Pencil, Trash2, X } from "lucide-react"
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
  medium: "Med",
  high: "High",
}

function getDueDateInfo(ts: number): { label: string; status: "overdue" | "today" | "upcoming" } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(ts)
  due.setHours(0, 0, 0, 0)

  if (due < today) return { label: "overdue", status: "overdue" }
  if (due.getTime() === today.getTime()) return { label: "today", status: "today" }

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (due.getTime() === tomorrow.getTime()) return { label: "tomorrow", status: "upcoming" }

  return {
    label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    status: "upcoming",
  }
}

function toDateInputValue(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA")
}

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, changes: { title?: string; dueDate?: number | null }) => void
}

export function TodoItem({ todo, onToggle, onRemove, onUpdate }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  useEffect(() => {
    setDraft(todo.title)
  }, [todo.title])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    onUpdate(todo.id, { title: draft })
    setEditing(false)
  }

  function cancel() {
    setDraft(todo.title)
    setEditing(false)
  }

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueInfo = todo.dueDate ? getDueDateInfo(todo.dueDate) : null

  return (
    <motion.li
      ref={setNodeRef}
      style={dndStyle}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.14 }}
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2.5 shadow-sm",
        isDragging && "shadow-lg ring-2 ring-primary/20",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab touch-none text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Checkbox */}
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

      {/* Title */}
      <div className="min-w-0 flex-1">
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
            className="w-full rounded-md bg-transparent text-sm outline-none ring-2 ring-ring/50"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "w-full truncate text-left text-sm transition-colors",
              todo.completed && "text-muted-foreground line-through",
            )}
            title={todo.title}
          >
            {todo.title}
          </button>
        )}

        {/* Due date chip */}
        {dueInfo && !todo.completed && (
          <span
            className={cn(
              "mt-0.5 block text-[11px] font-medium",
              dueInfo.status === "overdue" && "text-destructive",
              dueInfo.status === "today" && "text-amber-500",
              dueInfo.status === "upcoming" && "text-muted-foreground",
            )}
          >
            {dueInfo.label}
          </span>
        )}
      </div>

      {/* Priority badge */}
      <span
        className={cn(
          "hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-block",
          PRIORITY_STYLES[todo.priority],
        )}
      >
        {PRIORITY_LABEL[todo.priority]}
      </span>

      {/* Actions */}
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
            {/* Due date picker */}
            <label
              aria-label="Set due date"
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-opacity hover:bg-muted focus-within:opacity-100 group-hover:opacity-100",
                dueInfo && "opacity-100",
              )}
            >
              <CalendarDays
                className={cn(
                  "size-4",
                  dueInfo?.status === "overdue" && "text-destructive",
                  dueInfo?.status === "today" && "text-amber-500",
                  !dueInfo && "text-muted-foreground",
                )}
              />
              <input
                type="date"
                value={todo.dueDate ? toDateInputValue(todo.dueDate) : ""}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdate(todo.id, {
                    dueDate: val ? new Date(val + "T00:00:00").getTime() : null,
                  })
                }}
                className="sr-only"
              />
            </label>

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
    </motion.li>
  )
}
