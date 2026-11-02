"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortKey = "best" | "nearest" | "cheapest" | "atmosphere"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best rated" },
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

export function FilterChips({
  sort,
  onSortChange,
  ninetyPlus,
  onNinetyPlusChange,
}: {
  sort: SortKey
  onSortChange: (s: SortKey) => void
  ninetyPlus: boolean
  onNinetyPlusChange: (v: boolean) => void
}) {
  return (
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
    </div>
  )
}
