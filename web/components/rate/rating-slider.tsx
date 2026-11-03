"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

export function RatingSlider({
  label,
  hint,
  value,
  onChange,
  emphasis = false,
}: {
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
  emphasis?: boolean
}) {
  const id = useId()
  const fill = `${(value / 10) * 100}%`
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <label htmlFor={id} className={cn("font-display font-semibold", emphasis ? "text-xl" : "text-base")}>
            {label}
          </label>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <output
          htmlFor={id}
          className={cn(
            "font-display font-bold tabular-nums leading-none",
            emphasis ? "text-5xl" : "text-2xl",
          )}
        >
          {value.toFixed(1)}
          <span className="ml-0.5 text-sm font-medium text-muted-foreground">/10</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rmg-range"
        style={{ ["--fill" as string]: fill }}
      />
    </div>
  )
}
