"use client"

import { useState } from "react"
import { Check, SlidersHorizontal } from "lucide-react"
import { FEATURES, type FeatureKey } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export type SortKey = "best" | "balanced" | "nearest" | "cheapest" | "atmosphere"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best rated" },
  { key: "balanced", label: "Best near me" },
  { key: "nearest", label: "Nearest" },
  { key: "cheapest", label: "Cheapest" },
  { key: "atmosphere", label: "Atmosphere" },
]

function Chip({
  active,
  onClick,
  children,
  pressed,
  role,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  pressed?: boolean
  role?: string
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "radio" ? active : undefined}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
        active ? "border-pub bg-pub text-paper" : "border-border bg-paper text-foreground hover:border-stout/40",
      )}
    >
      {active && <Check className="size-3.5" aria-hidden="true" />}
      {children}
    </button>
  )
}

export type Filters = { features: FeatureKey[]; newOnly: boolean }

export function FilterChips({
  sort,
  onSortChange,
  ninetyPlus,
  onNinetyPlusChange,
  filters,
  onFiltersChange,
}: {
  sort: SortKey
  onSortChange: (s: SortKey) => void
  ninetyPlus: boolean
  onNinetyPlusChange: (v: boolean) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
}) {
  const [open, setOpen] = useState(false)
  const count = filters.features.length + (filters.newOnly ? 1 : 0)
  const toggle = (k: FeatureKey) =>
    onFiltersChange({ ...filters, features: filters.features.includes(k) ? filters.features.filter((x) => x !== k) : [...filters.features, k] })
  return (
    <div className="flex flex-col gap-3">
    <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <div role="radiogroup" aria-label="Sort by" className="flex gap-1.5">
        {SORTS.map((s) => (
          <Chip key={s.key} role="radio" active={sort === s.key} onClick={() => onSortChange(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>
      <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <Chip active={ninetyPlus} pressed={ninetyPlus} onClick={() => onNinetyPlusChange(!ninetyPlus)}>
        90+ only
      </Chip>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
          count ? "border-stout bg-stout text-cream" : "border-border bg-paper hover:border-stout/40",
        )}
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Filters{count ? ` · ${count}` : ""}
      </button>
    </div>
    {open && (
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-paper p-3">
        {(Object.keys(FEATURES) as FeatureKey[]).map((k) => (
          <Chip key={k} active={filters.features.includes(k)} pressed={filters.features.includes(k)} onClick={() => toggle(k)}>
            {FEATURES[k]}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <Chip active={filters.newOnly} pressed={filters.newOnly} onClick={() => onFiltersChange({ ...filters, newOnly: !filters.newOnly })}>
          New openings
        </Chip>
        {count > 0 && (
          <button type="button" onClick={() => onFiltersChange({ features: [], newOnly: false })} className="ml-auto text-sm font-medium text-pub hover:underline">
            Clear
          </button>
        )}
      </div>
    )}
    </div>
  )
}
