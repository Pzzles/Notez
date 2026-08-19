"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { AnimatePresence } from "framer-motion"
import { Bell, ListTodo } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FilterBar } from "@/components/filter-bar"
import { NextMove } from "@/components/next-move"
import { ProgressRing } from "@/components/progress-ring"
import { StandupGenerator } from "@/components/standup-generator"
import { ThemeToggle } from "@/components/theme-toggle"
import { TodoInput } from "@/components/todo-input"
import { TodoItem } from "@/components/todo-item"
import { TranscriptParser } from "@/components/transcript-parser"
import { VoiceInput } from "@/components/voice-input"
import { useReminders } from "@/hooks/use-reminders"
import { useStats } from "@/hooks/use-stats"
import { useTemplates } from "@/hooks/use-templates"
import { useTodos } from "@/hooks/use-todos"
import { useToast } from "@/components/toast"
import type { Filter, Priority } from "@/lib/types"

export function TodoApp() {
  const {
    todos, hydrated,
    addTodo, toggleTodo, updateTodo, removeTodo, cancelTodo,
    clearCompleted, togglePersistent, pauseTodo, reorderTodos,
    addSubtask, toggleSubtask, removeSubtask,
  } = useTodos()
  const reminderCount = useReminders(todos)
  const { templates, saveTemplate, removeTemplate } = useTemplates()
  const stats = useStats()
  const toast = useToast()

  function handleAddTodo(title: string, priority: Priority, dueDate?: number) {
    addTodo(title, priority, dueDate)
    toast.success("Task added")
  }

  function handleRemoveTodo(id: string) {
    removeTodo(id)
    toast("Task deleted")
  }

  function handleCancelTodo(id: string) {
    cancelTodo(id)
    toast("Task cancelled")
  }

  function handlePauseTodo(id: string) {
    const todo = todos.find((t) => t.id === id)
    pauseTodo(id)
    if (todo) toast(todo.paused ? "Task resumed" : "Task paused")
  }

  function handleClearCompleted() {
    const count = todos.filter((t) => t.completed && !t.persistent && !t.paused).length
    clearCompleted()
    if (count > 0) toast(`${count} task${count > 1 ? "s" : ""} cleared`)
  }

  function handleTogglePersistent(id: string) {
    const todo = todos.find((t) => t.id === id)
    togglePersistent(id)
    if (todo) toast(todo.persistent ? "Persistent off" : "Persistent on")
  }

  function handleSaveTemplate(title: string, priority: Priority) {
    saveTemplate(title, priority)
    toast.success("Saved as template")
  }

  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [dateLabel, setDateLabel] = useState("")
  const prevActiveCountRef = useRef<number | null>(null)

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
    )
  }, [])

  const pausedCount = todos.filter((t) => t.paused).length
  const nonPausedCount = todos.length - pausedCount
  const completedCount = todos.filter((t) => t.completed && !t.paused).length
  const activeCount = nonPausedCount - completedCount

  // Confetti when all non-paused tasks are done
  useEffect(() => {
    if (!hydrated) return
    if (prevActiveCountRef.current !== null && prevActiveCountRef.current > 0 && activeCount === 0 && nonPausedCount > 0) {
      import("canvas-confetti").then(({ default: fire }) => {
        fire({ particleCount: 120, spread: 80, origin: { y: 0.55 } })
      })
    }
    prevActiveCountRef.current = activeCount
  }, [activeCount, hydrated, nonPausedCount])

  const visible = useMemo(() =>
    todos
      .filter((t) => {
        if (filter === "paused") return !!t.paused && (!search || t.title.toLowerCase().includes(search.toLowerCase()))
        if (t.paused) return false
        if (filter === "active" && t.completed) return false
        if (filter === "completed" && !t.completed) return false
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (a.persistent !== b.persistent) return a.persistent ? -1 : 1
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return a.order - b.order
      }),
  [todos, filter, search])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = visible.findIndex((t) => t.id === active.id)
    const newIndex = visible.findIndex((t) => t.id === over.id)
    reorderTodos(arrayMove(visible, oldIndex, newIndex))
  }

  const subtitle =
    todos.length === 0
      ? "A calm place for what's next"
      : activeCount === 0 && pausedCount === 0
        ? "All done — nice work"
        : activeCount === 0
          ? `All clear · ${pausedCount} paused`
          : `${activeCount} ${activeCount === 1 ? "task" : "tasks"} to go`

  return (
    <div className="flex min-h-dvh flex-col bg-background sm:items-center sm:justify-center sm:px-6 sm:py-10">
      <div className="flex w-full flex-1 flex-col overflow-hidden sm:max-w-4xl sm:flex-none sm:rounded-3xl sm:border sm:border-border sm:shadow-xl sm:shadow-primary/5 lg:grid lg:grid-cols-[260px_1fr]">

        {/* ── Mobile header ─────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-3 bg-panel px-4 py-3 text-panel-foreground lg:hidden">
          <ProgressRing
            completed={completedCount}
            total={nonPausedCount}
            size={44}
            trackClassName="stroke-panel-foreground/15"
            barClassName="stroke-panel-foreground"
            labelClassName="text-panel-foreground"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-none">Tasks</h1>
            <p className="mt-0.5 truncate text-xs text-panel-foreground/70">{subtitle}</p>
          </div>
          {reminderCount > 0 && (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              <Bell className="size-3" />
            </span>
          )}
          <span className="hidden shrink-0 text-xs text-panel-foreground/60 sm:block" suppressHydrationWarning>
            {dateLabel}
          </span>
          <ThemeToggle />
        </header>

        {/* ── Desktop aside ─────────────────────────────────────── */}
        <aside className="hidden flex-col gap-7 bg-panel p-8 text-panel-foreground lg:flex">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-panel-foreground/60" suppressHydrationWarning>
              {dateLabel || "Today"}
            </span>
            <div className="flex items-center gap-2">
              {reminderCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  <Bell className="size-3" />{reminderCount}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <ProgressRing
              completed={completedCount}
              total={nonPausedCount}
              size={88}
              trackClassName="stroke-panel-foreground/15"
              barClassName="stroke-panel-foreground"
              labelClassName="text-panel-foreground"
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
              <p className="mt-1 text-sm text-panel-foreground/70">{subtitle}</p>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat value={activeCount} label="Active" />
              <Stat value={completedCount} label="Done" />
            </div>
            {pausedCount > 0 && <Stat value={pausedCount} label="Paused" />}
            <CommitmentStats completed={stats.completed} cancelled={stats.cancelled} />
          </div>

          <p className="text-xs text-panel-foreground/40">Real-time sync · drag to reorder</p>
        </aside>

        {/* ── Task workspace ────────────────────────────────────── */}
        <div className="flex flex-1 flex-col p-4 sm:p-8">
          <div className="flex flex-col gap-2" suppressHydrationWarning>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TodoInput onAdd={handleAddTodo} templates={templates} onRemoveTemplate={removeTemplate} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <VoiceInput
                onAddTasks={(tasks: { title: string; priority: Priority }[]) => {
                  tasks.forEach((t) => addTodo(t.title, t.priority))
                  if (tasks.length) toast.success(`${tasks.length} task${tasks.length > 1 ? "s" : ""} added`)
                }}
              />
              <TranscriptParser
                onAddTasks={(tasks: { title: string; priority: Priority }[]) => {
                  tasks.forEach((t) => addTodo(t.title, t.priority))
                  if (tasks.length) toast.success(`${tasks.length} task${tasks.length > 1 ? "s" : ""} added`)
                }}
              />
              <StandupGenerator todos={todos} />
            </div>
          </div>

          {hydrated && filter !== "completed" && filter !== "paused" && (
            <NextMove todos={todos} onComplete={toggleTodo} />
          )}

          {todos.length > 0 && (
            <div className="mt-4">
              <FilterBar
                filter={filter}
                onChange={setFilter}
                activeCount={activeCount}
                completedCount={completedCount}
                pausedCount={pausedCount}
                onClearCompleted={handleClearCompleted}
                search={search}
                onSearchChange={setSearch}
              />
            </div>
          )}

          <main className="mt-4 min-h-[200px] flex-1">
            {!hydrated ? null : visible.length === 0 ? (
              <EmptyState hasTodos={todos.length > 0} filter={filter} search={search} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-2 overflow-x-hidden overflow-y-auto pr-1 lg:max-h-[46vh]">
                    <AnimatePresence initial={false}>
                      {visible.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onToggle={toggleTodo}
                          onRemove={handleRemoveTodo}
                          onCancel={handleCancelTodo}
                          onPause={handlePauseTodo}
                          onUpdate={updateTodo}
                          onAddSubtask={addSubtask}
                          onToggleSubtask={toggleSubtask}
                          onRemoveSubtask={removeSubtask}
                          onSaveAsTemplate={handleSaveTemplate}
                          onTogglePersistent={handleTogglePersistent}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </main>

          {stats.completed + stats.cancelled > 0 && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground lg:hidden">
              {stats.completed} done · {stats.cancelled} cancelled · {Math.round(stats.completed / (stats.completed + stats.cancelled) * 100)}% committed
            </p>
          )}

          <p className="mt-2 text-center text-xs text-muted-foreground lg:hidden">
            Real-time sync · drag to reorder
          </p>
        </div>

      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-panel-foreground/10 bg-panel-foreground/5 px-3 py-2.5">
      <div className="font-mono text-xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-1.5 text-xs text-panel-foreground/60">{label}</div>
    </div>
  )
}

function EmptyState({ hasTodos, filter, search }: { hasTodos: boolean; filter: Filter; search: string }) {
  let message = "No tasks yet. Add one above to get started."
  if (search) message = `No tasks match "${search}".`
  else if (filter === "paused") message = "Nothing paused — your board is clear."
  else if (hasTodos && filter === "active") message = "Nothing active — you're all caught up."
  else if (hasTodos && filter === "completed") message = "No completed tasks yet."

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <ListTodo className="size-6" />
      </div>
      <p className="mt-3 max-w-[16rem] text-balance text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function CommitmentStats({ completed, cancelled }: { completed: number; cancelled: number }) {
  const total = completed + cancelled
  if (total === 0) return null
  const rate = Math.round((completed / total) * 100)
  return (
    <div className="rounded-xl border border-panel-foreground/10 bg-panel-foreground/5 px-3 py-2.5">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-panel-foreground/50">
        Commitment
      </div>
      <div className="mb-2.5 flex items-center gap-1 text-[11px] text-panel-foreground/70">
        <span className="font-mono font-semibold tabular-nums text-panel-foreground">{completed}</span>
        <span>done</span>
        <span className="mx-1 text-panel-foreground/30">·</span>
        <span className="font-mono font-semibold tabular-nums text-panel-foreground">{cancelled}</span>
        <span>cancelled</span>
        <span className="ml-auto text-xs font-semibold text-panel-foreground">{rate}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-panel-foreground/10">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  )
}
