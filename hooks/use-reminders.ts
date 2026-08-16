"use client"

import { useEffect, useRef, useState } from "react"
import type { Todo } from "@/lib/types"

export function useReminders(todos: Todo[]): number {
  const [count, setCount] = useState(0)
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const due = todos.filter((t) => !t.completed && t.dueDate && t.dueDate <= todayEnd.getTime())
    setCount(due.length)

    if (due.length === 0 || typeof window === "undefined" || !("Notification" in window)) return

    const fire = () => {
      due.forEach((t) => {
        if (firedRef.current.has(t.id)) return
        firedRef.current.add(t.id)
        new Notification("Task due today", { body: t.title })
      })
    }

    if (Notification.permission === "granted") {
      fire()
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => { if (p === "granted") fire() })
    }
  }, [todos])

  return count
}
