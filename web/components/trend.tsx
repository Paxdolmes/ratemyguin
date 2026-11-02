import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export function Trend({ delta, className }: { delta: number; className?: string }) {
  const label =
    delta > 0 ? `Up ${delta} on last month` : delta < 0 ? `Down ${Math.abs(delta)} on last month` : "No change on last month"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums",
        delta > 0 ? "text-pub" : delta < 0 ? "text-muted-foreground" : "text-muted-foreground/70",
        className,
      )}
      title={label}
    >
      {delta > 0 ? (
        <ArrowUpRight className="size-4" aria-hidden="true" />
      ) : delta < 0 ? (
        <ArrowDownRight className="size-4" aria-hidden="true" />
      ) : (
        <Minus className="size-4" aria-hidden="true" />
      )}
      <span aria-hidden="true">{delta === 0 ? "" : Math.abs(delta)}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
