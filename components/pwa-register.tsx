"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Register after load so it never blocks first paint.
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js?v=6", { scope: "/", updateViaCache: "none" })
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
