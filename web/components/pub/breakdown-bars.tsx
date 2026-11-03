import { COMPONENT_LABELS, WEIGHTS, type Components } from "@/lib/pubs"

export function BreakdownBars({ components }: { components: Components }) {
  const keys = Object.keys(WEIGHTS) as (keyof Components)[]
  return (
    <ul className="flex flex-col gap-5">
      {keys.map((key) => {
        const value = components[key]
        const points = (value * WEIGHTS[key]).toFixed(1)
        return (
          <li key={key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-display text-base font-semibold">
                  {COMPONENT_LABELS[key].label}{" "}
                  <span className="text-sm font-medium text-muted-foreground">{Math.round(WEIGHTS[key] * 100)}%</span>
                </span>
                <span className="text-xs text-muted-foreground">{COMPONENT_LABELS[key].detail}</span>
              </div>
              <span className="shrink-0 text-right">
                <span className="font-display text-xl font-bold tabular-nums">{value}</span>
                <span className="ml-1 text-xs text-muted-foreground tabular-nums">+{points} pts</span>
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-cream"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              aria-label={COMPONENT_LABELS[key].label}
            >
              <div className="h-full rounded-full bg-pub" style={{ width: `${value}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
