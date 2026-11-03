"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/live"

/** Sends uncaught errors to us (at most 5 a visit), so we hear about problems people hit. */
export function CrashReporter() {
  useEffect(() => {
    let sent = 0
    const send = (message: string, stack?: string) => {
      if (sent++ >= 5) return
      void supabase.from("app_errors").insert({
        source: "web",
        message: message.slice(0, 500) || "Unknown error",
        stack: stack?.slice(0, 4000) ?? null,
        path: location.pathname.slice(0, 200),
      })
    }
    const onError = (e: ErrorEvent) => send(e.message, e.error?.stack)
    const onRejection = (e: PromiseRejectionEvent) => send(String(e.reason?.message ?? e.reason), e.reason?.stack)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
