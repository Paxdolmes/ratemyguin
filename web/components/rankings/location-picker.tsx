"use client"

import { LocateFixed } from "lucide-react"
import { LOCATIONS, type LocationKey } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export function LocationPicker({
  value,
  onChange,
  locating,
}: {
  value: LocationKey
  onChange: (key: LocationKey) => void
  locating?: boolean
}) {
  const keys = Object.keys(LOCATIONS) as LocationKey[]
  return (
    <div role="radiogroup" aria-label="Location" className="flex flex-wrap gap-1.5">
      {keys.map((key) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 font-display text-base font-semibold transition-colors",
              active
                ? "border-stout bg-stout text-cream"
                : "border-border bg-paper text-foreground hover:border-stout/40",
            )}
          >
            {key === "near" && (
              <LocateFixed className={cn("size-4", locating && "animate-pulse")} aria-hidden="true" />
            )}
            {key === "near" && locating ? "Locating…" : LOCATIONS[key].label}
          </button>
        )
      })}
    </div>
  )
}
