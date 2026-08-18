"use client"

import { AnimatePresence, motion } from "framer-motion"
import { createContext, useCallback, useContext, useRef, useState } from "react"
import { Check, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastEntry = { id: number; message: string; variant: "default" | "success" }
type ToastFn = { (message: string): void; success: (message: string) => void }

const ToastContext = createContext<ToastFn | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const counter = useRef(0)

  const add = useCallback((message: string, variant: ToastEntry["variant"] = "default") => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500)
  }, [])

  const toast = add as ToastFn
  toast.success = (msg) => add(msg, "success")

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg text-sm text-foreground",
              )}
            >
              {t.variant === "success" && <Check className="size-3.5 shrink-0 text-green-500" />}
              {t.variant === "default" && <Info className="size-3.5 shrink-0 text-muted-foreground" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
