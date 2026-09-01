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
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { GroceryFavorite } from "@/lib/types"

type DbDoc = {
  id: string
  name: string
  price: number
  createdAt: Timestamp | null
}

function fromDoc(d: DbDoc): GroceryFavorite {
  return {
    id: d.id,
    name: d.name,
    price: d.price ?? 0,
    createdAt: d.createdAt?.toMillis() ?? Date.now(),
  }
}

export function useGroceryFavorites() {
  const [favorites, setFavorites] = useState<GroceryFavorite[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "grocery-favorites"), orderBy("name", "asc"))
    const unsub = onSnapshot(q, (snap) => {
      setFavorites(snap.docs.map((d) => fromDoc({ id: d.id, ...d.data() } as DbDoc)))
      setHydrated(true)
    })
    return unsub
  }, [])

  // Upserts by name — updates price if name already exists
  const saveFavorite = useCallback(
    async (name: string, price: number) => {
      const existing = favorites.find((f) => f.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        await updateDoc(doc(db, "grocery-favorites", existing.id), { price })
      } else {
        await addDoc(collection(db, "grocery-favorites"), {
          name,
          price,
          createdAt: serverTimestamp(),
        })
      }
    },
    [favorites],
  )

  const updateFavoritePrice = useCallback(async (id: string, price: number) => {
    await updateDoc(doc(db, "grocery-favorites", id), { price })
  }, [])

  const removeFavorite = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "grocery-favorites", id))
  }, [])

  return { favorites, hydrated, saveFavorite, updateFavoritePrice, removeFavorite }
}
