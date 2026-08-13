"use client"

import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Filter } from "@/lib/types"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Done" },
]

type FilterBarProps = {
  filter: Filter
  onChange: (filter: Filter) => void
  activeCount: number
  completedCount: number
  onClearCompleted: () => void
  search: string
  onSearchChange: (s: string) => void
}

export function FilterBar({
  filter,
  onChange,
  activeCount,
  completedCount,
  onClearCompleted,
  search,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClearCompleted}
          disabled={completedCount === 0}
          className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
        >
          Clear done
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        {activeCount} tasks remaining
      </span>
    </div>
  )
}
