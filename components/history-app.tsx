"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Ban, Check, RotateCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/components/toast"
import { useHistory } from "@/hooks/use-history"
import { cn } from "@/lib/utils"
import type { HistoryItem, HistoryOutcome } from "@/lib/types"

type HistoryFilter = "all" | HistoryOutcome

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
]

export function HistoryApp() {
  const { items, hydrated, restoreItem } = useHistory()
  const [filter, setFilter] = useState<HistoryFilter>("all")
  const [search, setSearch] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const toast = useToast()

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      if (filter !== "all" && item.outcome !== filter) return false
      if (!term) return true
      return item.title.toLowerCase().includes(term)
        || item.subtasks.some((subtask) => subtask.title.toLowerCase().includes(term))
    })
  }, [filter, items, search])

  const doneCount = items.filter((item) => item.outcome === "done").length
  const cancelledCount = items.length - doneCount

  async function handleRestore(item: HistoryItem) {
    setRestoringId(item.id)
    try {
      await restoreItem(item)
      toast.success("Task returned to your active list")
    } catch (error) {
      console.error("[Firestore] restore failed:", error)
      toast("Could not restore task")
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <a
            href="/"
            aria-label="Back to tasks"
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </a>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">Task history</h1>
            <p className="text-[11px] text-muted-foreground">Past work, kept within reach</p>
          </div>
          <ThemeToggle className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Archive</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Nothing useful gets lost.</h2>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Completed and cancelled tasks stay searchable, with their original steps and context.
              </p>
            </div>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <Count value={doneCount} label="Done" />
              <Count value={cancelledCount} label="Cancelled" />
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex w-fit rounded-xl border border-border bg-card p-1 shadow-sm">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search old tasks and steps…"
              aria-label="Search task history"
              className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="mt-4">
          {!hydrated ? (
            <HistorySkeleton />
          ) : visible.length === 0 ? (
            <EmptyHistory hasItems={items.length > 0} search={search} />
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {visible.map((item) => (
                  <HistoryRow
                    key={`${item.source}-${item.id}`}
                    item={item}
                    restoring={restoringId === item.id}
                    onRestore={() => handleRestore(item)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

function HistoryRow({
  item,
  restoring,
  onRestore,
}: {
  item: HistoryItem
  restoring: boolean
  onRestore: () => void
}) {
  const isDone = item.outcome === "done"
  const date = new Date(item.outcomeAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(item.outcomeAt).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
    >
      <div className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
        isDone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
      )}>
        {isDone ? <Check className="size-4" /> : <Ban className="size-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-card-foreground">{item.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className={cn("font-medium", isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {isDone ? "Completed" : "Cancelled"} {date}
          </span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{item.priority} priority</span>
          {item.subtasks.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{item.subtasks.length} {item.subtasks.length === 1 ? "step" : "steps"}</span>
            </>
          )}
        </div>
        {item.subtasks.length > 0 && (
          <p className="mt-2 truncate text-xs text-muted-foreground/80">
            {item.subtasks.map((subtask) => subtask.title).join(" · ")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRestore}
        disabled={restoring}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <RotateCcw className={cn("size-3.5", restoring && "animate-spin")} />
        <span className="hidden sm:inline">Restore</span>
      </button>
    </motion.li>
  )
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-xl bg-muted px-3 py-2 text-center">
      <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading task history">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[76px] animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  )
}

function EmptyHistory({ hasItems, search }: { hasItems: boolean; search: string }) {
  const message = search
    ? `No history matches “${search}”.`
    : hasItems
      ? "No tasks in this category."
      : "Completed and cancelled tasks will collect here."

  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
