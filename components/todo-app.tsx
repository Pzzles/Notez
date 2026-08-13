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
import { ListTodo } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FilterBar } from "@/components/filter-bar"
import { ProgressRing } from "@/components/progress-ring"
import { ThemeToggle } from "@/components/theme-toggle"
import { TodoInput } from "@/components/todo-input"
import { TodoItem } from "@/components/todo-item"
import { useTodos } from "@/hooks/use-todos"
import type { Filter } from "@/lib/types"

export function TodoApp() {
  const { todos, hydrated, addTodo, toggleTodo, updateTodo, removeTodo, clearCompleted, reorderTodos } =
    useTodos()
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [dateLabel, setDateLabel] = useState("")
  const prevActiveCountRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (!hydrated) return
    if (prevActiveCountRef.current !== null && prevActiveCountRef.current > 0 && activeCount === 0 && todos.length > 0) {
      import("canvas-confetti").then(({ default: fire }) => {
        fire({ particleCount: 120, spread: 80, origin: { y: 0.55 } })
      })
    }
    prevActiveCountRef.current = activeCount
  }, [activeCount, hydrated, todos.length])

  const visible = useMemo(() => {
    return todos
      .filter((t) => {
        if (filter === "active" && t.completed) return false
        if (filter === "completed" && !t.completed) return false
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return a.order - b.order
      })
  }, [todos, filter, search])

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
      : activeCount === 0
        ? "All done — nice work"
        : `${activeCount} ${activeCount === 1 ? "task" : "tasks"} to go`

  return (
    // Mobile: full-screen column, no outer padding. Desktop: centered card.
    <div className="flex min-h-dvh flex-col bg-background sm:items-center sm:justify-center sm:px-6 sm:py-10">
      <div className="flex w-full flex-1 flex-col overflow-hidden sm:max-w-4xl sm:flex-none sm:rounded-3xl sm:border sm:border-border sm:shadow-xl sm:shadow-primary/5 lg:grid lg:grid-cols-[300px_1fr]">

        {/* Mobile / tablet compact header */}
        <header className="flex shrink-0 items-center gap-3 bg-panel px-4 py-3 text-panel-foreground lg:hidden">
          <ProgressRing
            completed={completedCount}
            total={todos.length}
            size={44}
            trackClassName="stroke-panel-foreground/15"
            barClassName="stroke-panel-foreground"
            labelClassName="text-panel-foreground"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-none">Tasks</h1>
            <p className="mt-0.5 truncate text-xs text-panel-foreground/70">{subtitle}</p>
          </div>
          <span
            className="hidden shrink-0 text-xs text-panel-foreground/60 sm:block"
            suppressHydrationWarning
          >
            {dateLabel}
          </span>
          <ThemeToggle />
        </header>

        {/* Desktop side panel */}
        <aside className="hidden flex-col gap-7 bg-panel p-8 text-panel-foreground lg:flex">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-[0.18em] text-panel-foreground/60"
              suppressHydrationWarning
            >
              {dateLabel || "Today"}
            </span>
            <ThemeToggle />
          </div>

          <div className="flex flex-col gap-6">
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
              <p className="mt-1 text-pretty text-sm text-panel-foreground/70">{subtitle}</p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Stat value={activeCount} label="Active" />
            <Stat value={completedCount} label="Done" />
          </div>

          <p className="text-xs text-panel-foreground/45">
            Synced in real-time · drag to reorder
          </p>
        </aside>

        {/* Task workspace */}
        <div className="flex flex-1 flex-col p-4 sm:p-8">
          <TodoInput onAdd={addTodo} />

          {todos.length > 0 && (
            <div className="mt-4">
              <FilterBar
                filter={filter}
                onChange={setFilter}
                activeCount={activeCount}
                completedCount={completedCount}
                onClearCompleted={clearCompleted}
                search={search}
                onSearchChange={setSearch}
              />
            </div>
          )}

          <main className="mt-4 min-h-[200px] flex-1">
            {!hydrated ? null : visible.length === 0 ? (
              <EmptyState hasTodos={todos.length > 0} filter={filter} search={search} />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visible.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
                    <AnimatePresence initial={false}>
                      {visible.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onToggle={toggleTodo}
                          onRemove={removeTodo}
                          onUpdate={updateTodo}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </main>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            Synced in real-time · drag to reorder
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

function EmptyState({
  hasTodos,
  filter,
  search,
}: {
  hasTodos: boolean
  filter: Filter
  search: string
}) {
  let message = "No tasks yet. Add one above to get started."
  if (search) message = `No tasks match "${search}".`
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
