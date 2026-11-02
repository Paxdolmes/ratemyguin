import { Award } from "lucide-react"
import { BAND_LABEL, type Band } from "@/lib/pubs"
import { cn } from "@/lib/utils"

const BAND_STYLES: Record<Band, string> = {
  exceptional: "bg-stout text-cream border-stout",
  gold: "bg-pub text-paper border-pub",
  recommended: "bg-paper text-pub border-pub/60",
  unbanded: "bg-paper text-muted-foreground border-border",
}

export function BandChip({
  band,
  size = "sm",
  onDark = false,
  className,
}: {
  band: Band
  size?: "xs" | "sm" | "md"
  onDark?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-medium",
        size === "xs" && "px-2 py-0.5 text-[11px]",
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        onDark && band === "exceptional" ? "border-cream/40 bg-cream text-stout" : BAND_STYLES[band],
        onDark && band === "gold" && "border-pub-light bg-pub-light text-stout",
        onDark && band === "recommended" && "border-pub-light/60 bg-transparent text-pub-light",
        onDark && band === "unbanded" && "border-cream/30 bg-transparent text-cream/80",
        className,
      )}
    >
      {BAND_LABEL[band]}
    </span>
  )
}

export function AwardChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brass/60 bg-brass/15 px-2.5 py-0.5 text-xs font-medium text-stout",
        className,
      )}
    >
      <Award className="size-3.5 text-brass" aria-hidden="true" />
      <span>
        <span className="sr-only">ratemyGuin Awards: </span>
        {label}
      </span>
    </span>
  )
}

export function NotYetRatedChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-dashed border-stout/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      Not yet rated
    </span>
  )
}
