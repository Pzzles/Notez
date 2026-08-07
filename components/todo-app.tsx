"use client"

import { ListTodo } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { FilterBar } from "@/components/filter-bar"
import { ProgressRing } from "@/components/progress-ring"
import { ThemeToggle } from "@/components/theme-toggle"
import { TodoInput } from "@/components/todo-input"
import { TodoItem } from "@/components/todo-item"
import { useTodos } from "@/hooks/use-todos"
import type { Filter } from "@/lib/types"

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export function TodoApp() {
  const {
    todos,
    hydrated,
    addTodo,
    toggleTodo,
    updateTodo,
    removeTodo,
    clearCompleted,
  } = useTodos()
  const [filter, setFilter] = useState<Filter>("all")
  const [dateLabel, setDateLabel] = useState("")

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    )
  }, [])

  const completedCount = todos.filter((t) => t.completed).length
  const activeCount = todos.length - completedCount

  const visible = useMemo(() => {
    const filtered = todos.filter((t) => {
      if (filter === "active") return !t.completed
      if (filter === "completed") return t.completed
      return true
    })
    // Active tasks first, then by priority, then newest.
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.priority !== b.priority)
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      return b.createdAt - a.createdAt
    })
  }, [todos, filter])

  const subtitle =
    todos.length === 0
      ? "A calm place for what's next"
      : activeCount === 0
        ? "All done — nice work"
        : `${activeCount} ${activeCount === 1 ? "task" : "tasks"} to go`

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5 lg:grid-cols-[300px_1fr]">
        {/* Signature side panel */}
        <aside className="flex flex-col gap-7 bg-panel p-6 text-panel-foreground sm:p-8">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-[0.18em] text-panel-foreground/60"
              suppressHydrationWarning
            >
              {dateLabel || "Today"}
            </span>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-6">
            <ProgressRing
              completed={completedCount}
              total={todos.length}
              size={92}
              trackClassName="stroke-panel-foreground/15"
              barClassName="stroke-panel-foreground"
              labelClassName="text-panel-foreground"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
              <p className="mt-1 text-sm text-panel-foreground/70 text-pretty">{subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:mt-auto">
            <Stat value={activeCount} label="Active" />
            <Stat value={completedCount} label="Done" />
          </div>

          <p className="hidden text-xs text-panel-foreground/45 lg:block">
            Saved on this device · works offline
          </p>
        </aside>

        {/* Task workspace */}
        <div className="flex flex-col p-5 sm:p-8">
          <TodoInput onAdd={addTodo} />

          {todos.length > 0 && (
            <div className="mt-4">
              <FilterBar
                filter={filter}
                onChange={setFilter}
                activeCount={activeCount}
                completedCount={completedCount}
                onClearCompleted={clearCompleted}
              />
            </div>
          )}

          <main className="mt-4 min-h-[280px] flex-1">
            {!hydrated ? null : visible.length === 0 ? (
              <EmptyState hasTodos={todos.length > 0} filter={filter} />
            ) : (
              <ul className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
                {visible.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onRemove={removeTodo}
                    onUpdate={updateTodo}
                  />
                ))}
              </ul>
            )}
          </main>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            Saved on this device · works offline
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

function EmptyState({ hasTodos, filter }: { hasTodos: boolean; filter: Filter }) {
  let message = "No tasks yet. Add one above to get started."
  if (hasTodos && filter === "active") message = "Nothing active — you're all caught up."
  else if (hasTodos && filter === "completed") message = "No completed tasks yet."

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <ListTodo className="size-6" />
      </div>
      <p className="mt-3 max-w-[16rem] text-sm text-balance text-muted-foreground">{message}</p>
    </div>
  )
}
