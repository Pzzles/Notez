"use client"

import { useCallback, useEffect, useState } from "react"
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Priority, RecurringRule, Subtask, Todo } from "@/lib/types"

type DbRule = {
  id: string
  title: string
  priority: string
  subtasks?: Subtask[]
  frequencyDays?: number | null
  dayOfMonth?: number | null
  nextDue: Timestamp
  pausedUntil?: Timestamp | null
  active: boolean
  createdAt: Timestamp
}

function fromRule(d: DbRule): RecurringRule {
  return {
    id: d.id,
    title: d.title,
    priority: d.priority as Priority,
    subtasks: d.subtasks ?? [],
    frequencyDays: d.frequencyDays ?? undefined,
    dayOfMonth: d.dayOfMonth ?? undefined,
    nextDue: d.nextDue.toMillis(),
    pausedUntil: d.pausedUntil?.toMillis() ?? undefined,
    active: d.active,
    createdAt: d.createdAt?.toMillis() ?? Date.now(),
  }
}

function nextDueAfter(rule: RecurringRule, from: number): number {
  if (rule.frequencyDays) {
    return from + rule.frequencyDays * 24 * 60 * 60 * 1000
  }
  if (rule.dayOfMonth) {
    const d = new Date(from)
    let month = d.getMonth()
    let year = d.getFullYear()
    if (d.getDate() >= rule.dayOfMonth) month++
    if (month > 11) { month = 0; year++ }
    return new Date(year, month, rule.dayOfMonth).getTime()
  }
  return from + 7 * 24 * 60 * 60 * 1000
}

export function useRecurring(hydrated: boolean, todos: Todo[]) {
  const [rules, setRules] = useState<RecurringRule[]>([])

  useEffect(() => {
    const q = query(collection(db, "recurringRules"), orderBy("createdAt", "desc"))
    return onSnapshot(
      q,
      (snap) => {
        setRules(snap.docs.map((d) => fromRule({ id: d.id, ...(d.data() as Omit<DbRule, "id">) })))
      },
      console.error,
    )
  }, [])

  // Spawn instances when a rule's nextDue has passed
  useEffect(() => {
    if (!hydrated || !rules.length) return
    const now = Date.now()
    rules.forEach((rule) => {
      if (!rule.active) return
      if (rule.pausedUntil && rule.pausedUntil > now) return
      if (rule.nextDue > now) return
      // Idempotency: skip if an instance for this exact due date already exists
      const alreadyExists = todos.some(
        (t) => t.recurringRuleId === rule.id && t.instanceDue === rule.nextDue,
      )
      if (alreadyExists) return
      const batch = writeBatch(db)
      const newTodoRef = doc(collection(db, "todos"))
      batch.set(newTodoRef, {
        title: rule.title,
        priority: rule.priority,
        completed: false,
        createdAt: serverTimestamp(),
        dueDate: rule.nextDue,
        order: -now,
        subtasks: rule.subtasks,
        completedAt: null,
        recurringRuleId: rule.id,
        instanceDue: rule.nextDue,
      })
      batch.update(doc(db, "recurringRules", rule.id), {
        nextDue: Timestamp.fromMillis(nextDueAfter(rule, rule.nextDue)),
      })
      batch.commit().catch(console.error)
    })
  }, [hydrated, rules, todos])

  const createRule = useCallback(
    async (
      title: string,
      priority: Priority,
      subtasks: Subtask[],
      opts: { frequencyDays?: number; dayOfMonth?: number },
      existingTodoId?: string,
    ) => {
      const now = Date.now()
      let next: number
      if (opts.frequencyDays) {
        next = now + opts.frequencyDays * 24 * 60 * 60 * 1000
      } else if (opts.dayOfMonth) {
        const d = new Date(now)
        let month = d.getMonth()
        let year = d.getFullYear()
        if (d.getDate() >= opts.dayOfMonth) month++
        if (month > 11) { month = 0; year++ }
        next = new Date(year, month, opts.dayOfMonth).getTime()
      } else {
        next = now + 7 * 24 * 60 * 60 * 1000
      }
      const batch = writeBatch(db)
      const ruleRef = doc(collection(db, "recurringRules"))
      batch.set(ruleRef, {
        title,
        priority,
        subtasks,
        frequencyDays: opts.frequencyDays ?? null,
        dayOfMonth: opts.dayOfMonth ?? null,
        nextDue: Timestamp.fromMillis(next),
        pausedUntil: null,
        active: true,
        createdAt: serverTimestamp(),
      })
      if (existingTodoId) {
        batch.update(doc(db, "todos", existingTodoId), {
          recurringRuleId: ruleRef.id,
          instanceDue: now,
        })
      }
      await batch.commit().catch(console.error)
      return ruleRef.id
    },
    [],
  )

  const deleteRule = useCallback((id: string) => {
    deleteDoc(doc(db, "recurringRules", id)).catch(console.error)
  }, [])

  const pauseRule = useCallback((id: string, until: number) => {
    updateDoc(doc(db, "recurringRules", id), {
      pausedUntil: Timestamp.fromMillis(until),
    }).catch(console.error)
  }, [])

  return { rules, createRule, deleteRule, pauseRule }
}
