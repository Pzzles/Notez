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

    if (
      due.length === 0 ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) return

    const unfired = due.filter((todo) => !firedRef.current.has(todo.id))
    if (unfired.length === 0) return

    async function notify() {
      const title = unfired.length === 1 ? "Task due today" : `${unfired.length} tasks due`
      const body =
        unfired.length === 1
          ? unfired[0].title
          : `${unfired[0].title} and ${unfired.length - 1} more`

      try {
        // Android Chrome requires notifications to be created by a service worker.
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification(title, { body, tag: "tasks-due" })
        } else {
          new Notification(title, { body, tag: "tasks-due" })
        }
        unfired.forEach((todo) => firedRef.current.add(todo.id))
      } catch (error) {
        // A notification failure must never take down the task list.
        console.warn("[Notifications] reminder failed:", error)
      }
    }

    void notify()
  }, [todos])

  return count
}
