"use client"

import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"

export type Stats = {
  completed: number
  cancelled: number
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({ completed: 0, cancelled: 0 })

  useEffect(() => {
    const ref = doc(db, "stats", "main")
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setStats({
            completed: (data.completed as number) ?? 0,
            cancelled: (data.cancelled as number) ?? 0,
          })
        }
      },
      (err) => console.error("[Firestore] stats snapshot failed:", err),
    )
    return unsub
  }, [])

  return stats
}
