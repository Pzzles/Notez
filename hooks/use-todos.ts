"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  addDoc,
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
import type { Priority, Todo } from "@/lib/types"

type DbDoc = {
  id: string
  title: string
  completed: boolean
  priority: string
  createdAt: Timestamp | null
  dueDate?: number | null
  order?: number | null
}

function fromDoc(d: DbDoc): Todo {
  const createdAt = d.createdAt?.toMillis() ?? Date.now()
  return {
    id: d.id,
    title: d.title,
    completed: d.completed,
    priority: d.priority as Priority,
    createdAt,
    dueDate: d.dueDate ?? undefined,
    // Negative createdAt so ascending sort puts newest first by default
    order: d.order ?? -createdAt,
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [hydrated, setHydrated] = useState(false)
  const todosRef = useRef<Todo[]>([])

  useEffect(() => {
    todosRef.current = todos
  }, [todos])

  useEffect(() => {
    const q = query(collection(db, "todos"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setTodos(
          snapshot.docs.map((d) =>
            fromDoc({ id: d.id, ...(d.data() as Omit<DbDoc, "id">) }),
          ),
        )
        setHydrated(true)
      },
      (err) => {
        console.error("[Firestore] snapshot failed:", err)
        setHydrated(true)
      },
    )
    return unsub
  }, [])

  const addTodo = useCallback(async (title: string, priority: Priority, dueDate?: number) => {
    const trimmed = title.trim()
    if (!trimmed) return
    await addDoc(collection(db, "todos"), {
      title: trimmed,
      priority,
      completed: false,
      createdAt: serverTimestamp(),
      dueDate: dueDate ?? null,
      order: -Date.now(),
    }).catch((err) => console.error("[Firestore] add failed:", err))
  }, [])

  const toggleTodo = useCallback((id: string) => {
    const todo = todosRef.current.find((t) => t.id === id)
    if (!todo) return
    updateDoc(doc(db, "todos", id), { completed: !todo.completed }).catch((err) =>
      console.error("[Firestore] toggle failed:", err),
    )
  }, [])

  const updateTodo = useCallback(
    (id: string, changes: { title?: string; dueDate?: number | null }) => {
      if (changes.title !== undefined && !changes.title.trim()) return
      const patch: Record<string, unknown> = {}
      if (changes.title !== undefined) patch.title = changes.title.trim()
      if ("dueDate" in changes) patch.dueDate = changes.dueDate ?? null
      updateDoc(doc(db, "todos", id), patch).catch((err) =>
        console.error("[Firestore] update failed:", err),
      )
    },
    [],
  )

  const removeTodo = useCallback((id: string) => {
    deleteDoc(doc(db, "todos", id)).catch((err) =>
      console.error("[Firestore] delete failed:", err),
    )
  }, [])

  const clearCompleted = useCallback(() => {
    const completed = todosRef.current.filter((t) => t.completed)
    const batch = writeBatch(db)
    completed.forEach((t) => batch.delete(doc(db, "todos", t.id)))
    batch.commit().catch((err) => console.error("[Firestore] clearCompleted failed:", err))
  }, [])

  const reorderTodos = useCallback((reordered: Todo[]) => {
    // Optimistic: assign new order values immediately so UI doesn't snap back
    setTodos((prev) => {
      const reorderedIds = new Set(reordered.map((t) => t.id))
      const withOrder = reordered.map((t, i) => ({ ...t, order: i * 1000 }))
      const rest = prev.filter((t) => !reorderedIds.has(t.id))
      return [...withOrder, ...rest]
    })
    const batch = writeBatch(db)
    reordered.forEach((t, i) => batch.update(doc(db, "todos", t.id), { order: i * 1000 }))
    batch.commit().catch((err) => console.error("[Firestore] reorder failed:", err))
  }, [])

  return { todos, hydrated, addTodo, toggleTodo, updateTodo, removeTodo, clearCompleted, reorderTodos }
}
