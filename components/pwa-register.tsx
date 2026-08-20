"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    // Service workers and Turbopack's changing development chunks do not mix.
    // Remove any previously installed app worker while developing locally.
    if (process.env.NODE_ENV !== "production") {
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        ),
        "caches" in window
          ? caches.keys().then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith("tasks-cache-"))
                  .map((key) => caches.delete(key)),
              ),
            )
          : Promise.resolve([]),
      ])
      return
    }

    // Register after load so it never blocks first paint.
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js?v=8", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Registration can fail in unsupported/insecure contexts; ignore.
        })
    }
    if (document.readyState === "complete") {
      onLoad()
    } else {
      window.addEventListener("load", onLoad)
      return () => window.removeEventListener("load", onLoad)
    }
  }, [])

  return null
}
