"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Priority, Subtask, Todo } from "@/lib/types"

const statsRef = () => doc(db, "stats", "main")

type DbDoc = {
  id: string
  title: string
  completed: boolean
  priority: string
  createdAt: Timestamp | null
  dueDate?: number | null
  order?: number | null
  subtasks?: Subtask[] | null
  persistent?: boolean | null
  paused?: boolean | null
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
    order: d.order ?? -createdAt,
    subtasks: d.subtasks ?? [],
    persistent: d.persistent ?? false,
    paused: d.paused ?? false,
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
        setTodos(snapshot.docs.map((d) => fromDoc({ id: d.id, ...(d.data() as Omit<DbDoc, "id">) })))
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
      subtasks: [],
    }).catch((err) => console.error("[Firestore] add failed:", err))
  }, [])

  const toggleTodo = useCallback((id: string) => {
    const todo = todosRef.current.find((t) => t.id === id)
    if (!todo) return
    const nowComplete = !todo.completed
    const patch: { completed: boolean; subtasks?: Subtask[] } = { completed: nowComplete }
    // When completing the parent, auto-complete all subtasks too
    if (nowComplete && todo.subtasks.some((s) => !s.completed)) {
      patch.subtasks = todo.subtasks.map((s) => ({ ...s, completed: true }))
    }
    updateDoc(doc(db, "todos", id), patch).catch((err) =>
      console.error("[Firestore] toggle failed:", err),
    )
  }, [])

  const updateTodo = useCallback(
    (id: string, changes: { title?: string; dueDate?: number | null }) => {
      if (changes.title !== undefined && !changes.title.trim()) return
      const patch: { title?: string; dueDate?: number | null } = {}
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

  const cancelTodo = useCallback((id: string) => {
    deleteDoc(doc(db, "todos", id))
      .then(() => setDoc(statsRef(), { cancelled: increment(1) }, { merge: true }))
      .catch((err) => console.error("[Firestore] cancel failed:", err))
  }, [])

  const clearCompleted = useCallback(() => {
    const completed = todosRef.current.filter((t) => t.completed && !t.persistent && !t.paused)
    if (!completed.length) return
    const batch = writeBatch(db)
    completed.forEach((t) => batch.delete(doc(db, "todos", t.id)))
    batch.commit()
      .then(() => setDoc(statsRef(), { completed: increment(completed.length) }, { merge: true }))
      .catch((err) => console.error("[Firestore] clearCompleted failed:", err))
  }, [])

  const togglePersistent = useCallback((id: string) => {
    const todo = todosRef.current.find((t) => t.id === id)
    if (!todo) return
    updateDoc(doc(db, "todos", id), { persistent: !todo.persistent }).catch((err) =>
      console.error("[Firestore] togglePersistent failed:", err),
    )
  }, [])

  const pauseTodo = useCallback((id: string) => {
    const todo = todosRef.current.find((t) => t.id === id)
    if (!todo) return
    updateDoc(doc(db, "todos", id), { paused: !todo.paused }).catch((err) =>
      console.error("[Firestore] pause failed:", err),
    )
  }, [])

  const reorderTodos = useCallback((reordered: Todo[]) => {
    setTodos((prev) => {
      const ids = new Set(reordered.map((t) => t.id))
      return [...reordered.map((t, i) => ({ ...t, order: i * 1000 })), ...prev.filter((t) => !ids.has(t.id))]
    })
    const batch = writeBatch(db)
    reordered.forEach((t, i) => batch.update(doc(db, "todos", t.id), { order: i * 1000 }))
    batch.commit().catch((err) => console.error("[Firestore] reorder failed:", err))
  }, [])

  const addSubtask = useCallback((todoId: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const todo = todosRef.current.find((t) => t.id === todoId)
    if (!todo) return
    const subtask: Subtask = { id: crypto.randomUUID(), title: trimmed, completed: false }
    updateDoc(doc(db, "todos", todoId), { subtasks: [...todo.subtasks, subtask] }).catch(console.error)
  }, [])

  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    const todo = todosRef.current.find((t) => t.id === todoId)
    if (!todo) return
    const updated = todo.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    )
    updateDoc(doc(db, "todos", todoId), { subtasks: updated }).catch(console.error)
  }, [])

  const removeSubtask = useCallback((todoId: string, subtaskId: string) => {
    const todo = todosRef.current.find((t) => t.id === todoId)
    if (!todo) return
    updateDoc(doc(db, "todos", todoId), {
      subtasks: todo.subtasks.filter((s) => s.id !== subtaskId),
    }).catch(console.error)
  }, [])

  return {
    todos,
    hydrated,
    addTodo,
    toggleTodo,
    updateTodo,
    removeTodo,
    cancelTodo,
    clearCompleted,
    togglePersistent,
    pauseTodo,
    reorderTodos,
    addSubtask,
    toggleSubtask,
    removeSubtask,
  }
}
