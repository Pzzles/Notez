"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Priority, Todo } from "@/lib/types"

type DbRow = {
  id: string
  title: string
  completed: boolean
  priority: string
  created_at: string
}

function fromRow(row: DbRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    priority: row.priority as Priority,
    createdAt: new Date(row.created_at).getTime(),
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
    supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTodos(data.map(fromRow))
        setHydrated(true)
      })
  }, [])

  const addTodo = useCallback(async (title: string, priority: Priority) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const { data } = await supabase
      .from("todos")
      .insert({ title: trimmed, priority, completed: false })
      .select()
      .single()
    if (data) setTodos((prev) => [fromRow(data as DbRow), ...prev])
  }, [])

  const toggleTodo = useCallback((id: string) => {
    const todo = todosRef.current.find((t) => t.id === id)
    if (!todo) return
    const newCompleted = !todo.completed
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)),
    )
    supabase.from("todos").update({ completed: newCompleted }).eq("id", id)
  }, [])

  const updateTodo = useCallback((id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
    )
    supabase.from("todos").update({ title: trimmed }).eq("id", id)
  }, [])

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    supabase.from("todos").delete().eq("id", id)
  }, [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.completed))
    supabase.from("todos").delete().eq("completed", true)
  }, [])

  return {
    todos,
    hydrated,
    addTodo,
    toggleTodo,
    updateTodo,
    removeTodo,
    clearCompleted,
  }
}
