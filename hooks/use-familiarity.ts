"use client"

import { useEffect, useRef, useState } from "react"
import { findSuggestion, type FamiliarPattern } from "@/lib/familiarity"

export function useFamiliarity(inputTitle: string): FamiliarPattern | null {
  const [suggestion, setSuggestion] = useState<FamiliarPattern | null>(null)
  const lastTitle = useRef("")

  useEffect(() => {
    if (inputTitle === lastTitle.current) return
    lastTitle.current = inputTitle

    const timer = setTimeout(() => {
      setSuggestion(findSuggestion(inputTitle))
    }, 300)
    return () => clearTimeout(timer)
  }, [inputTitle])

  // Clear suggestion when input is emptied
  useEffect(() => {
    if (!inputTitle.trim()) setSuggestion(null)
  }, [inputTitle])

  return suggestion
}
