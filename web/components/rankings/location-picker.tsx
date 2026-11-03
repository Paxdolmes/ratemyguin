"use client"

import { ChevronDown, LocateFixed } from "lucide-react"
import { LOCATIONS, PLACES, type LocationKey } from "@/lib/pubs"
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
  const all = Object.keys(LOCATIONS) as LocationKey[]
  const keys = all.filter((k) => !PLACES[k].hood)
  const hoods = all.filter((k) => PLACES[k].hood).sort((a, b) => PLACES[a].label.localeCompare(PLACES[b].label))
  const hoodActive = PLACES[value].hood
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
            {key === "near" && locating ? "Locating…" : PLACES[key].label}
          </button>
        )
      })}
      <label
        className={cn(
          "relative inline-flex h-10 items-center rounded-full border pl-4 pr-9 font-display text-base font-semibold transition-colors",
          hoodActive ? "border-stout bg-stout text-cream" : "border-border bg-paper text-foreground hover:border-stout/40",
        )}
      >
        <span className="sr-only">Neighbourhood</span>
        {hoodActive ? PLACES[value].label : "Neighbourhood"}
        <ChevronDown className="pointer-events-none absolute right-3 size-4" aria-hidden="true" />
        <select
          value={hoodActive ? value : ""}
          onChange={(e) => e.target.value && onChange(e.target.value as LocationKey)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="" disabled>
            Neighbourhood
          </option>
          {hoods.map((k) => (
            <option key={k} value={k}>
              {PLACES[k].label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
