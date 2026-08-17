"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme | undefined
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: undefined,
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | undefined>(undefined)

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system"
    setThemeState(stored)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const resolve = (t: Theme): ResolvedTheme =>
      t === "system" ? (mq.matches ? "dark" : "light") : t
    setResolvedTheme(resolve(stored))
    document.documentElement.classList.toggle("dark", stored === "dark")
    document.documentElement.classList.toggle("light", stored === "light")

    function onSystemChange() {
      setThemeState((prev) => {
        if (prev === "system") {
          const r = mq.matches ? "dark" : "light"
          setResolvedTheme(r)
          document.documentElement.classList.toggle("dark", r === "dark")
        }
        return prev
      })
    }
    mq.addEventListener("change", onSystemChange)
    return () => mq.removeEventListener("change", onSystemChange)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const resolved: ResolvedTheme =
      next === "system" ? (mq.matches ? "dark" : "light") : next
    setThemeState(next)
    setResolvedTheme(resolved)
    // .dark forces dark; .light suppresses the prefers-color-scheme media query
    document.documentElement.classList.toggle("dark", next === "dark")
    document.documentElement.classList.toggle("light", next === "light")
    if (next === "system") {
      localStorage.removeItem("theme")
    } else {
      localStorage.setItem("theme", next)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
