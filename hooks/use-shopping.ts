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
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ShoppingItem } from "@/lib/types"

type DbDoc = {
  id: string
  name: string
  quantity: number
  price: number
  checked: boolean
  createdAt: Timestamp | null
  order: number
}

function fromDoc(d: DbDoc): ShoppingItem {
  const createdAt = d.createdAt?.toMillis() ?? Date.now()
  return {
    id: d.id,
    name: d.name,
    quantity: d.quantity ?? 1,
    price: d.price ?? 0,
    checked: d.checked ?? false,
    createdAt,
    order: d.order ?? createdAt,
  }
}

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "shopping-items"), orderBy("createdAt", "asc"))
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => fromDoc({ id: d.id, ...d.data() } as DbDoc)))
      setHydrated(true)
    })
    return unsub
  }, [])

  const addItem = useCallback(async (name: string, quantity: number, price: number) => {
    await addDoc(collection(db, "shopping-items"), {
      name,
      quantity,
      price,
      checked: false,
      createdAt: serverTimestamp(),
      order: Date.now(),
    })
  }, [])

  const toggleItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      await updateDoc(doc(db, "shopping-items", id), { checked: !item.checked })
    },
    [items],
  )

  const removeItem = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "shopping-items", id))
  }, [])

  const clearAll = useCallback(async () => {
    const batch = writeBatch(db)
    items.forEach((item) => batch.delete(doc(db, "shopping-items", item.id)))
    await batch.commit()
  }, [items])

  return { items, hydrated, addItem, toggleItem, removeItem, clearAll }
}
