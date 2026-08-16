"use client"

import { useCallback, useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Priority, Template } from "@/lib/types"

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    const q = query(collection(db, "templates"), orderBy("createdAt", "asc"))
    return onSnapshot(
      q,
      (snap) =>
        setTemplates(
          snap.docs.map((d) => ({
            id: d.id,
            title: d.data().title as string,
            priority: d.data().priority as Priority,
          })),
        ),
      console.error,
    )
  }, [])

  const saveTemplate = useCallback(async (title: string, priority: Priority) => {
    const trimmed = title.trim()
    if (!trimmed) return
    await addDoc(collection(db, "templates"), {
      title: trimmed,
      priority,
      createdAt: serverTimestamp(),
    }).catch(console.error)
  }, [])

  const removeTemplate = useCallback((id: string) => {
    deleteDoc(doc(db, "templates", id)).catch(console.error)
  }, [])

  return { templates, saveTemplate, removeTemplate }
}
