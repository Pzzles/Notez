"use client"

import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Filter } from "@/lib/types"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",       label: "All"    },
  { value: "active",    label: "Active" },
  { value: "completed", label: "Done"   },
  { value: "paused",    label: "Paused" },
]

type FilterBarProps = {
  filter: Filter
  onChange: (filter: Filter) => void
  activeCount: number
  completedCount: number
  pausedCount: number
  onClearCompleted: () => void
  search: string
  onSearchChange: (s: string) => void
}

export function FilterBar({
  filter,
  onChange,
  activeCount,
  completedCount,
  pausedCount,
  onClearCompleted,
  search,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: filter tabs + clear done */}
      <div className="flex items-center gap-2">
        <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "relative rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              {f.value === "paused" && pausedCount > 0 && (
                <span className={cn(
                  "absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold leading-none",
                  filter === "paused"
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground",
                )}>
                  {pausedCount > 9 ? "9+" : pausedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {filter !== "paused" && (
          <button
            type="button"
            onClick={onClearCompleted}
            disabled={completedCount === 0}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
          >
            Clear done
          </button>
        )}
      </div>

      {/* Row 2: search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="w-full rounded-xl border border-border bg-card py-1.5 pl-7 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <span className="sr-only" aria-live="polite">{activeCount} tasks remaining</span>
    </div>
  )
}
