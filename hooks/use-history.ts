"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { HistoryItem, HistoryOutcome, Priority, Subtask } from "@/lib/types"

type DbTodo = {
  id: string
  title: string
  completed: boolean
  priority: string
  createdAt: Timestamp | null
  completedAt?: Timestamp | null
  dueDate?: number | null
  order?: number | null
  subtasks?: Subtask[] | null
  persistent?: boolean | null
}

type DbHistory = Omit<DbTodo, "completed"> & {
  outcome: HistoryOutcome
  archivedAt: Timestamp | null
}

function liveDoneFromDoc(item: DbTodo): HistoryItem {
  const createdAt = item.createdAt?.toMillis() ?? Date.now()
  return {
    id: item.id,
    title: item.title,
    priority: item.priority as Priority,
    createdAt,
    dueDate: item.dueDate ?? undefined,
    order: item.order ?? -createdAt,
    subtasks: item.subtasks ?? [],
    persistent: item.persistent ?? false,
    outcome: "done",
    outcomeAt: item.completedAt?.toMillis() ?? createdAt,
    source: "todos",
  }
}

function archivedFromDoc(item: DbHistory): HistoryItem {
  const createdAt = item.createdAt?.toMillis() ?? Date.now()
  const archivedAt = item.archivedAt?.toMillis() ?? createdAt
  return {
    id: item.id,
    title: item.title,
    priority: item.priority as Priority,
    createdAt,
    dueDate: item.dueDate ?? undefined,
    order: item.order ?? -createdAt,
    subtasks: item.subtasks ?? [],
    persistent: item.persistent ?? false,
    outcome: item.outcome,
    outcomeAt:
      item.outcome === "done"
        ? item.completedAt?.toMillis() ?? archivedAt
        : archivedAt,
    source: "history",
  }
}

export function useHistory() {
  const [liveDone, setLiveDone] = useState<HistoryItem[]>([])
  const [archived, setArchived] = useState<HistoryItem[]>([])
  const [todosReady, setTodosReady] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)

  useEffect(() => {
    const todosQuery = query(collection(db, "todos"), orderBy("createdAt", "desc"))
    return onSnapshot(
      todosQuery,
      (snapshot) => {
        setLiveDone(
          snapshot.docs
            .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<DbTodo, "id">) }))
            .filter((item) => item.completed)
            .map(liveDoneFromDoc),
        )
        setTodosReady(true)
      },
      (error) => {
        console.error("[Firestore] completed history snapshot failed:", error)
        setTodosReady(true)
      },
    )
  }, [])

  useEffect(() => {
    const historyQuery = query(collection(db, "history"), orderBy("archivedAt", "desc"))
    return onSnapshot(
      historyQuery,
      (snapshot) => {
        setArchived(
          snapshot.docs.map((entry) =>
            archivedFromDoc({ id: entry.id, ...(entry.data() as Omit<DbHistory, "id">) }),
          ),
        )
        setHistoryReady(true)
      },
      (error) => {
        console.error("[Firestore] archive snapshot failed:", error)
        setHistoryReady(true)
      },
    )
  }, [])

  const items = useMemo(
    () => [...liveDone, ...archived].sort((a, b) => b.outcomeAt - a.outcomeAt),
    [archived, liveDone],
  )

  const restoreItem = useCallback(async (item: HistoryItem) => {
    const resetSubtasks = item.subtasks.map((subtask) => ({ ...subtask, completed: false }))

    if (item.source === "todos") {
      await updateDoc(doc(db, "todos", item.id), {
        completed: false,
        completedAt: null,
        paused: false,
        subtasks: resetSubtasks,
      })
      return
    }

    const batch = writeBatch(db)
    batch.set(doc(db, "todos", item.id), {
      title: item.title,
      priority: item.priority,
      completed: false,
      completedAt: null,
      createdAt: Timestamp.fromMillis(item.createdAt),
      dueDate: item.dueDate ?? null,
      order: -Date.now(),
      subtasks: resetSubtasks,
      persistent: item.persistent ?? false,
      paused: false,
    })
    batch.delete(doc(db, "history", item.id))
    await batch.commit()
  }, [])

  return {
    items,
    hydrated: todosReady && historyReady,
    restoreItem,
  }
}
