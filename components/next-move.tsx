"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/toast"
import { rankNextMoves } from "@/lib/next-move"
import type { Todo } from "@/lib/types"

const DURATIONS = [10, 25, 45] as const

type NextMoveProps = {
  todos: Todo[]
  onComplete: (id: string) => void
}

export function NextMove({ todos, onComplete }: NextMoveProps) {
  const ranked = useMemo(() => rankNextMoves(todos), [todos])
  const [expanded, setExpanded] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>(25)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const announcedDoneRef = useRef(false)
  const toast = useToast()

  const recommendation = ranked.length > 0
    ? ranked[candidateIndex % ranked.length]
    : null
  const focusTask = todos.find((todo) => todo.id === focusTaskId)

  useEffect(() => {
    if (!focusTaskId || !isRunning || !endAt) return

    const tick = () => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0) {
        setIsRunning(false)
        if (!announcedDoneRef.current) {
          announcedDoneRef.current = true
          toast.success("Focus sprint complete — nice work")
        }
      }
    }

    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [endAt, focusTaskId, isRunning, toast])

  useEffect(() => {
    if (focusTaskId && (!focusTask || focusTask.completed || focusTask.paused)) {
      setFocusTaskId(null)
      setIsRunning(false)
    }
  }, [focusTask, focusTaskId])

  useEffect(() => {
    if (!focusTaskId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusTaskId(null)
        setIsRunning(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [focusTaskId])

  if (!recommendation) return null

  const firstStep = recommendation.todo.subtasks.find((subtask) => !subtask.completed)

  function startFocus() {
    const seconds = minutes * 60
    announcedDoneRef.current = false
    setFocusTaskId(recommendation!.todo.id)
    setRemaining(seconds)
    setEndAt(Date.now() + seconds * 1000)
    setIsRunning(true)
  }

  function pauseFocus() {
    if (!endAt) return
    setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
    setEndAt(null)
    setIsRunning(false)
  }

  function resumeFocus() {
    if (remaining === 0) return
    setEndAt(Date.now() + remaining * 1000)
    setIsRunning(true)
  }

  function resetFocus() {
    const seconds = minutes * 60
    announcedDoneRef.current = false
    setRemaining(seconds)
    setEndAt(null)
    setIsRunning(false)
  }

  function completeFocusTask() {
    if (!focusTask) return
    onComplete(focusTask.id)
    setFocusTaskId(null)
    setIsRunning(false)
    toast.success("Next move completed")
  }

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls="next-move-details"
          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-card-foreground">Next move</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Choose one task and focus
            </div>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id="next-move-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Recommended
                    </span>
                    <h2 className="mt-1 truncate text-sm font-semibold text-card-foreground sm:text-base">
                      {recommendation.todo.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recommendation.reasons.map((reason) => (
                        <span key={reason} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {reason}
                        </span>
                      ))}
                    </div>
                    {firstStep && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <ChevronRight className="size-3 text-primary" />
                        First step: <span className="truncate text-foreground">{firstStep.title}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCandidateIndex((index) => (index + 1) % ranked.length)}
                    disabled={ranked.length < 2}
                    aria-label="Suggest another task"
                    title="Suggest another task"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <Shuffle className="size-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-muted p-0.5" aria-label="Focus duration">
                    {DURATIONS.map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setMinutes(duration)}
                        aria-pressed={minutes === duration}
                        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                          minutes === duration
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {duration}m
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={startFocus}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Play className="size-3 fill-current" />
                    Focus now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {focusTask && focusTaskId && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Focus on ${focusTask.title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex min-h-dvh items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,oklch(0.34_0.12_280),oklch(0.14_0.025_280)_58%)] p-5 text-white"
          >
            <button
              type="button"
              onClick={() => { setFocusTaskId(null); setIsRunning(false) }}
              aria-label="Exit focus mode"
              className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="flex w-full max-w-lg flex-col items-center text-center"
            >
              <div className="mb-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Focus room
              </div>

              <FocusClock remaining={remaining} total={minutes * 60} />

              <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-violet-200/70">
                Your only task
              </p>
              <h2 className="mt-2 max-w-md text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {focusTask.title}
              </h2>

              {focusTask.subtasks.some((subtask) => !subtask.completed) && (
                <div className="mt-5 max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  <span className="mr-1 text-violet-300">Start here:</span>
                  {focusTask.subtasks.find((subtask) => !subtask.completed)?.title}
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFocus}
                  aria-label="Reset focus timer"
                  className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={isRunning ? pauseFocus : resumeFocus}
                  disabled={!isRunning && remaining === 0}
                  className="flex h-12 min-w-32 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02] disabled:opacity-40"
                >
                  {isRunning ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                  {isRunning ? "Pause" : remaining === 0 ? "Finished" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={completeFocusTask}
                  aria-label="Complete focused task"
                  className="flex size-11 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-emerald-200 transition-colors hover:bg-emerald-300/20"
                >
                  <Check className="size-5" />
                </button>
              </div>
              <p className="mt-4 text-xs text-white/35">Esc to exit · check to complete</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function FocusClock({ remaining, total }: { remaining: number; total: number }) {
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? remaining / total : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="relative flex size-44 items-center justify-center" aria-live="off">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 176 176" aria-hidden="true">
        <circle cx="88" cy="88" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-white/10" />
        <motion.circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-violet-300"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </svg>
      <div>
        <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          {remaining === 0 ? "Complete" : "Stay with it"}
        </div>
      </div>
    </div>
  )
}
