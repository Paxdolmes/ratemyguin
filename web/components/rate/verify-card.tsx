"use client"

import { BadgeCheck, Loader2, MapPin, MapPinOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type VerifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "verified" }
  | { status: "far"; metres: number }
  | { status: "unavailable" }

export function VerifyCard({ state, onCheck }: { state: VerifyState; onCheck: () => void }) {
  const verified = state.status === "verified"
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center",
        verified ? "bg-pub text-paper" : "bg-cream text-stout",
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          verified ? "bg-paper/15" : "bg-paper",
        )}
        aria-hidden="true"
      >
        {state.status === "checking" ? (
          <Loader2 className="size-6 animate-spin" />
        ) : verified ? (
          <BadgeCheck className="size-6" />
        ) : state.status === "far" || state.status === "unavailable" ? (
          <MapPinOff className="size-6 text-muted-foreground" />
        ) : (
          <MapPin className="size-6 text-pub" />
        )}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-display text-lg font-bold">
          {state.status === "idle" && "I'm at the pub"}
          {state.status === "checking" && "Checking your location…"}
          {verified && "Verified at the pub"}
          {state.status === "far" && "You don't seem to be at the pub"}
          {state.status === "unavailable" && "Couldn't get your location"}
        </span>
        <span className={cn("text-sm leading-relaxed", verified ? "text-paper/80" : "text-muted-foreground")}>
          {state.status === "idle" && "Confirm with GPS and your rating counts in full towards the Index."}
          {state.status === "checking" && "We only check once and never store your exact location."}
          {verified && "Your rating counts in full and earns a passport stamp."}
          {state.status === "far" &&
            `You're about ${state.metres >= 1000 ? `${(state.metres / 1000).toFixed(1)} km` : `${state.metres} m`} away. You can still rate; it just carries less weight.`}
          {state.status === "unavailable" && "You can still rate. Unverified ratings carry less weight."}
        </span>
      </div>
      {!verified && state.status !== "checking" && (
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-stout px-5 font-semibold text-cream hover:bg-pub"
        >
          <MapPin className="size-4" aria-hidden="true" />
          {state.status === "idle" ? "Verify I'm here" : "Try again"}
        </button>
      )}
    </div>
  )
}
