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
import { AnimatePresence, motion } from "framer-motion"
import { Archive, Bell, CalendarClock, ChevronDown, Infinity, ListTodo, RefreshCw } from "lucide-react"
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
import { useRecurring } from "@/hooks/use-recurring"
import { useReminders } from "@/hooks/use-reminders"
import { useStats } from "@/hooks/use-stats"
import { useTemplates } from "@/hooks/use-templates"
import { useTodos } from "@/hooks/use-todos"
import { useToast } from "@/components/toast"
import type { Filter, Priority, Todo } from "@/lib/types"
import { savePattern } from "@/lib/familiarity"
import { cn } from "@/lib/utils"

export function TodoApp() {
  const {
    todos, hydrated,
    addTodo, toggleTodo, updateTodo, removeTodo, cancelTodo,
    clearCompleted, togglePersistent, pauseTodo, reorderTodos,
    updateNote, clearRecurringFromTodo, addSubtask, toggleSubtask, removeSubtask,
  } = useTodos()
  const { rules, createRule, deleteRule } = useRecurring(hydrated, todos)
  const reminderCount = useReminders(todos)
  const { templates, saveTemplate, removeTemplate } = useTemplates()
  const stats = useStats()
  const toast = useToast()

  function handleAddTodo(title: string, priority: Priority, dueDate?: number, subtasks?: string[]) {
    addTodo(title, priority, dueDate, subtasks)
    if (subtasks?.length) savePattern(title, subtasks)
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

  function handleSetRecurring(id: string) {
    const todo = todos.find((t) => t.id === id)
    if (todo) setRecurringSetupTodo(todo)
  }

  function handleRemoveRecurring(id: string) {
    const todo = todos.find((t) => t.id === id)
    if (todo?.recurringRuleId) deleteRule(todo.recurringRuleId)
    clearRecurringFromTodo(id)
    toast("Recurring removed")
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

  const persistentVisible = useMemo(() => visible.filter((t) => t.persistent), [visible])
  const regularVisible = useMemo(() => visible.filter((t) => !t.persistent), [visible])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [persistentExpanded, setPersistentExpanded] = useState(true)
  const [recurringSetupTodo, setRecurringSetupTodo] = useState<Todo | null>(null)

  const lockedTodoIds = useMemo(() => {
    const locked = new Set<string>()
    const byRule = new Map<string, Todo[]>()
    todos.forEach((t) => {
      if (t.recurringRuleId && !t.completed) {
        const arr = byRule.get(t.recurringRuleId) ?? []
        arr.push(t)
        byRule.set(t.recurringRuleId, arr)
      }
    })
    byRule.forEach((instances) => {
      if (instances.length <= 1) return
      const sorted = [...instances].sort((a, b) => (a.instanceDue ?? 0) - (b.instanceDue ?? 0))
      sorted.slice(1).forEach((t) => locked.add(t.id))
    })
    return locked
  }, [todos])

  const monthlyAlerts = useMemo(() => {
    if (new Date().getDate() !== 24) return []
    return rules
      .map((r) => ({
        rule: r,
        count: todos.filter((t) => t.recurringRuleId === r.id && !t.completed).length,
      }))
      .filter(({ count }) => count >= 2)
  }, [rules, todos])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = regularVisible.findIndex((t) => t.id === active.id)
    const newIndex = regularVisible.findIndex((t) => t.id === over.id)
    reorderTodos(arrayMove(regularVisible, oldIndex, newIndex))
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
          <a
            href="/history"
            aria-label="Open task history"
            title="Task history"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-foreground/15 bg-panel-foreground/10 text-panel-foreground transition-colors hover:bg-panel-foreground/20"
          >
            <Archive className="size-4" />
          </a>
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
              <a
                href="/history"
                aria-label="Open task history"
                title="Task history"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-foreground/15 bg-panel-foreground/10 text-panel-foreground transition-colors hover:bg-panel-foreground/20"
              >
                <Archive className="size-4" />
              </a>
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
                onAddTasks={(tasks: { title: string; priority: Priority; subtasks: string[] }[]) => {
                  tasks.forEach((t) => {
                    addTodo(t.title, t.priority, undefined, t.subtasks)
                    if (t.subtasks.length) savePattern(t.title, t.subtasks)
                  })
                  if (tasks.length) toast.success(`${tasks.length} task${tasks.length > 1 ? "s" : ""} added`)
                }}
              />
              <TranscriptParser
                onAddTasks={(tasks: { title: string; priority: Priority; subtasks: string[] }[]) => {
                  tasks.forEach((t) => {
                    addTodo(t.title, t.priority, undefined, t.subtasks)
                    if (t.subtasks.length) savePattern(t.title, t.subtasks)
                  })
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

          {monthlyAlerts.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Monthly reminder — 24th</p>
                  <ul className="mt-1 space-y-0.5">
                    {monthlyAlerts.map(({ rule, count }) => (
                      <li key={rule.id} className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{rule.title}</span>
                        {" "}— {count} instance{count > 1 ? "s" : ""} pending
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <main className="mt-4 min-h-[200px] flex-1">
            {!hydrated ? null : visible.length === 0 ? (
              <EmptyState hasTodos={todos.length > 0} filter={filter} search={search} />
            ) : (
              <>
                {persistentVisible.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                      <Infinity className="size-3.5 shrink-0 text-green-500" />
                      <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
                        Persistent
                      </span>
                      <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                        {persistentVisible.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPersistentExpanded((v) => !v)}
                        aria-label={persistentExpanded ? "Collapse persistent tasks" : "Expand persistent tasks"}
                        className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {persistentExpanded ? "collapse" : "expand"}
                        <ChevronDown className={cn("size-3 transition-transform", persistentExpanded && "rotate-180")} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {persistentExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-1.5 flex flex-col gap-2">
                            {persistentVisible.map((todo) => (
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
                                onUpdateNote={updateNote}
                                isLocked={lockedTodoIds.has(todo.id)}
                                onSetRecurring={handleSetRecurring}
                                onRemoveRecurring={handleRemoveRecurring}
                              />
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {regularVisible.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={regularVisible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      <ul className="flex flex-col gap-2 overflow-x-hidden overflow-y-auto pr-1 lg:max-h-[46vh]">
                        <AnimatePresence initial={false}>
                          {regularVisible.map((todo) => (
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
                              onUpdateNote={updateNote}
                              isLocked={lockedTodoIds.has(todo.id)}
                              onSetRecurring={handleSetRecurring}
                              onRemoveRecurring={handleRemoveRecurring}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </SortableContext>
                  </DndContext>
                ) : persistentVisible.length === 0 ? (
                  <EmptyState hasTodos={todos.length > 0} filter={filter} search={search} />
                ) : null}
              </>
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
      {recurringSetupTodo && (
        <RecurringSetupModal
          todo={recurringSetupTodo}
          onConfirm={async (opts) => {
            await createRule(
              recurringSetupTodo.title,
              recurringSetupTodo.priority,
              recurringSetupTodo.subtasks,
              opts,
              recurringSetupTodo.id,
            )
            setRecurringSetupTodo(null)
            toast.success("Recurring schedule set")
          }}
          onClose={() => setRecurringSetupTodo(null)}
        />
      )}
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

function RecurringSetupModal({
  todo,
  onConfirm,
  onClose,
}: {
  todo: Todo
  onConfirm: (opts: { frequencyDays?: number; dayOfMonth?: number }) => void
  onClose: () => void
}) {
  const [type, setType] = useState<"days" | "monthly">("days")
  const [days, setDays] = useState("2")
  const [dom, setDom] = useState("24")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (type === "days") {
      const n = parseInt(days, 10)
      if (!n || n < 1) return
      onConfirm({ frequencyDays: n })
    } else {
      const n = parseInt(dom, 10)
      if (!n || n < 1 || n > 31) return
      onConfirm({ dayOfMonth: n })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-2">
          <RefreshCw className="mt-0.5 size-4 shrink-0 text-blue-500" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Set recurring schedule</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{todo.title}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-muted">
            <input
              type="radio"
              name="type"
              value="days"
              checked={type === "days"}
              onChange={() => setType("days")}
              className="accent-primary"
            />
            <span className="flex-1 text-sm">Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onClick={() => setType("days")}
              className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-muted">
            <input
              type="radio"
              name="type"
              value="monthly"
              checked={type === "monthly"}
              onChange={() => setType("monthly")}
              className="accent-primary"
            />
            <span className="flex-1 text-sm">On day</span>
            <input
              type="number"
              min={1}
              max={31}
              value={dom}
              onChange={(e) => setDom(e.target.value)}
              onClick={() => setType("monthly")}
              className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground">of each month</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create
            </button>
          </div>
        </form>
      </div>
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
        Commitment · this month
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
