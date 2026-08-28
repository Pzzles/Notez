"use client"

import { collection, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"

export type MonthStats = {
  month: string
  completed: number
  cancelled: number
}

export function useMonthlyStats() {
  const [months, setMonths] = useState<MonthStats[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    return onSnapshot(
      collection(db, "stats"),
      (snap) => {
        const result = snap.docs
          .filter((d) => d.id !== "main")
          .map((d) => ({
            month: d.id,
            completed: (d.data().completed as number) ?? 0,
            cancelled: (d.data().cancelled as number) ?? 0,
          }))
          .sort((a, b) => b.month.localeCompare(a.month))
        setMonths(result)
        setHydrated(true)
      },
      (err) => {
        console.error("[Firestore] monthly stats snapshot failed:", err)
        setHydrated(true)
      },
    )
  }, [])

  return { months, hydrated }
}
