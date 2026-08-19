"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "framer-motion"
import {
  Ban,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import type { Priority, Subtask, Todo } from "@/lib/types"

const PRIORITY_DOT: Record<Priority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f43f5e",
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
  return { label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }), status: "upcoming" }
}

function toDateInputValue(ts: number) {
  return new Date(ts).toLocaleDateString("en-CA")
}

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onCancel: (id: string) => void
  onPause: (id: string) => void
  onUpdate: (id: string, changes: { title?: string; dueDate?: number | null }) => void
  onAddSubtask: (todoId: string, title: string) => void
  onToggleSubtask: (todoId: string, subtaskId: string) => void
  onRemoveSubtask: (todoId: string, subtaskId: string) => void
  onSaveAsTemplate: (title: string, priority: Priority) => void
  onTogglePersistent: (id: string) => void
}

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  onCancel,
  onPause,
  onUpdate,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onSaveAsTemplate,
  onTogglePersistent,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const [expanded, setExpanded] = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null)
  const [newSubtask, setNewSubtask] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const subtaskInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })

  useEffect(() => setMounted(true), [])
  useEffect(() => { setDraft(todo.title) }, [todo.title])
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])
  useEffect(() => { if (expanded) subtaskInputRef.current?.focus() }, [expanded])

  // Close menu on outside click, scroll, or resize
  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      closeMenu()
    }
    function handleClose() { closeMenu() }
    document.addEventListener("mousedown", handlePointer)
    window.addEventListener("scroll", handleClose, { capture: true })
    window.addEventListener("resize", handleClose)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      window.removeEventListener("scroll", handleClose, { capture: true })
      window.removeEventListener("resize", handleClose)
    }
  }, [menuOpen])

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setConfirmAction(null)
    setMenuOpen(true)
  }

  function closeMenu() {
    setMenuOpen(false)
    setConfirmAction(null)
  }

  function commit() { onUpdate(todo.id, { title: draft }); setEditing(false) }
  function cancel() { setDraft(todo.title); setEditing(false) }

  function handleSubtaskToggle(subtaskId: string) {
    const updated = todo.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    )
    onToggleSubtask(todo.id, subtaskId)
    const allDone = updated.length > 0 && updated.every((s) => s.completed)
    if (allDone && !todo.completed && !todo.persistent) {
      onToggle(todo.id)
    } else if (!allDone && todo.completed) {
      onToggle(todo.id)
    }
  }

  const dueInfo = todo.dueDate ? getDueDateInfo(todo.dueDate) : null
  const isOverdue = dueInfo?.status === "overdue" && !todo.completed
  const subtasksDone = todo.subtasks.filter((s) => s.completed).length

  return (
    <motion.li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: isDragging ? 0 : 0.15 }}
      className={cn(
        "group min-w-0 rounded-xl border border-border bg-card shadow-sm",
        isDragging && "shadow-lg ring-2 ring-primary/20",
        isOverdue && !todo.paused && "ring-1 ring-destructive/40",
        todo.paused && "opacity-60",
      )}
    >
      {/* Main row */}
      <div className="flex min-w-0 items-start gap-2 px-2 py-2.5">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        {/* Checkbox */}
        <motion.button
          key={`cb-${todo.completed}`}
          type="button"
          role="checkbox"
          aria-checked={todo.completed}
          aria-label={todo.persistent ? "Disable persistence to mark as done" : todo.completed ? "Mark as not done" : "Mark as done"}
          onClick={() => !todo.persistent && onToggle(todo.id)}
          disabled={todo.persistent}
          initial={todo.completed ? { scale: 0.7 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            todo.persistent && "cursor-not-allowed opacity-40",
            !todo.persistent && todo.completed && "border-primary bg-primary text-primary-foreground",
            !todo.persistent && !todo.completed && "border-muted-foreground/40 hover:border-primary",
          )}
        >
          {todo.completed && <Check className="size-3.5" />}
        </motion.button>

        {/* Title + metadata */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault(); commit()
                } else if (e.key === "Escape") {
                  cancel()
                }
              }}
              onBlur={commit}
              aria-label="Edit task"
              className="w-full rounded-md bg-transparent text-sm outline-none ring-2 ring-ring/50"
            />
          ) : (
            <span
              role="button"
              tabIndex={0}
              title={titleExpanded ? undefined : todo.title}
              onClick={() => setTitleExpanded((v) => !v)}
              onKeyDown={(e) => e.key === "Enter" && setTitleExpanded((v) => !v)}
              className={cn(
                "block cursor-pointer select-none text-sm leading-snug",
                titleExpanded ? "break-words whitespace-normal" : "truncate",
                todo.completed && "text-muted-foreground line-through",
              )}
            >
              {todo.title}
            </span>
          )}

          {/* Metadata row: due date + subtask count */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {dueInfo && !todo.completed && (
              <span className={cn(
                "text-[11px] font-medium",
                dueInfo.status === "overdue" && "text-destructive",
                dueInfo.status === "today" && "text-amber-500",
                dueInfo.status === "upcoming" && "text-muted-foreground",
              )}>
                {dueInfo.label}
              </span>
            )}
            {todo.subtasks.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <span className="tabular-nums">{subtasksDone}/{todo.subtasks.length} subtasks</span>
                <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        </div>

        {/* Priority dot */}
        <span
          title={todo.priority}
          className="mt-1.5 block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT[todo.priority] }}
        />

        {/* Persistent indicator */}
        {todo.persistent && !editing && (
          <button
            type="button"
            aria-label="Persistent task — disable in menu"
            title="Persistent task"
            onClick={openMenu}
            className="mt-0.5 shrink-0 text-green-500"
          >
            <Repeat className="size-3.5" />
          </button>
        )}

        {/* Paused indicator */}
        {todo.paused && !editing && (
          <button
            type="button"
            aria-label="Paused task — resume in menu"
            title="Paused"
            onClick={openMenu}
            className="mt-0.5 shrink-0 text-muted-foreground"
          >
            <Pause className="size-3.5" />
          </button>
        )}

        {/* Actions trigger */}
        {!editing && (
          <button
            ref={triggerRef}
            type="button"
            onClick={openMenu}
            aria-label="Task actions"
            aria-expanded={menuOpen}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}

        {/* Edit confirm/cancel */}
        {editing && (
          <div className="flex shrink-0 items-center">
            <IconBtn onClick={commit} label="Save"><Check className="size-4" /></IconBtn>
            <IconBtn onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={cancel} label="Cancel"><X className="size-4" /></IconBtn>
          </div>
        )}
      </div>

      {/* Subtasks panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 bg-muted/20 px-3 pb-2.5 pt-2">
              <div className="space-y-0.5 pl-7">
                {todo.subtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={() => handleSubtaskToggle(subtask.id)}
                    onRemove={() => onRemoveSubtask(todo.id, subtask.id)}
                  />
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newSubtask.trim()) return
                    onAddSubtask(todo.id, newSubtask)
                    setNewSubtask("")
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <Plus className="size-3 shrink-0 text-muted-foreground/30" />
                  <input
                    ref={subtaskInputRef}
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add subtask…"
                    className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/40"
                  />
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown — portaled to body to escape any overflow:auto ancestor */}
      {mounted && menuOpen && menuPos && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 50 }}
            className="w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            <MenuItem
              icon={<Pencil className="size-3.5" />}
              label="Edit"
              onClick={() => { setEditing(true); closeMenu() }}
            />

            <MenuItem
              icon={<ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />}
              label={todo.subtasks.length > 0 ? `Subtasks (${subtasksDone}/${todo.subtasks.length})` : "Subtasks"}
              onClick={() => { setExpanded((v) => !v); closeMenu() }}
            />

            <MenuItem
              icon={<CalendarDays className={cn(
                "size-3.5",
                dueInfo?.status === "overdue" && "text-destructive",
                dueInfo?.status === "today" && "text-amber-500",
                !dueInfo && "text-muted-foreground",
              )} />}
              label={dueInfo ? `Due: ${dueInfo.label}` : "Set due date"}
              onClick={() => {
                try { (datePickerRef.current as any).showPicker() } catch { datePickerRef.current?.focus() }
              }}
            />
            <input
              ref={datePickerRef}
              type="date"
              value={todo.dueDate ? toDateInputValue(todo.dueDate) : ""}
              onChange={(e) => {
                const v = e.target.value
                onUpdate(todo.id, { dueDate: v ? new Date(v + "T00:00:00").getTime() : null })
                closeMenu()
              }}
              className="pointer-events-none absolute opacity-0"
              style={{ width: 1, height: 1 }}
            />

            {todo.dueDate && (
              <MenuItem
                icon={<X className="size-3.5 text-muted-foreground" />}
                label="Clear due date"
                onClick={() => { onUpdate(todo.id, { dueDate: null }); closeMenu() }}
              />
            )}

            <MenuItem
              icon={<Bookmark className="size-3.5" />}
              label="Save as template"
              onClick={() => { onSaveAsTemplate(todo.title, todo.priority); closeMenu() }}
            />

            <MenuItem
              icon={<Repeat className={cn("size-3.5", todo.persistent && "text-primary")} />}
              label={todo.persistent ? "Persistent (on)" : "Persistent"}
              onClick={() => { onTogglePersistent(todo.id); closeMenu() }}
            />

            <MenuItem
              icon={todo.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              label={todo.paused ? "Resume" : "Pause"}
              onClick={() => { onPause(todo.id); closeMenu() }}
            />

            <div className="my-1 h-px bg-border" />

            {confirmAction ? (
              <div className="px-3 py-2.5">
                <p className="mb-2.5 text-xs text-foreground">
                  {confirmAction === "cancel"
                    ? "Mark as cancelled? This counts toward your commitment stats."
                    : "Delete this task permanently?"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmAction === "cancel") onCancel(todo.id)
                      else onRemove(todo.id)
                      closeMenu()
                    }}
                    className="flex-1 rounded-lg bg-destructive px-2 py-1.5 text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90"
                  >
                    {confirmAction === "cancel" ? "Cancel task" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MenuItem
                  icon={<Ban className="size-3.5" />}
                  label="Cancel task"
                  onClick={() => setConfirmAction("cancel")}
                  danger
                />
                <MenuItem
                  icon={<Trash2 className="size-3.5" />}
                  label="Delete"
                  onClick={() => setConfirmAction("delete")}
                  danger
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </motion.li>
  )
}

function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function SubtaskRow({
  subtask, onToggle, onRemove,
}: {
  subtask: Subtask
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div className="group/sub flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          subtask.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {subtask.completed && <Check className="size-2.5" />}
      </button>
      <span className={cn(
        "flex-1 text-xs",
        subtask.completed ? "text-muted-foreground line-through" : "text-foreground",
      )}>
        {subtask.title}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove "${subtask.title}"`}
        className="opacity-0 text-muted-foreground/50 transition-opacity hover:text-destructive group-hover/sub:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function IconBtn({
  children, onClick, onMouseDown, label,
}: {
  children: React.ReactNode
  onClick?: () => void
  onMouseDown?: (e: React.MouseEvent) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}
