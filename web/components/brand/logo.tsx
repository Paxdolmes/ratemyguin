import { cn } from "@/lib/utils"

export function TickMark({
  className,
  title,
  onDark = false,
}: {
  className?: string
  title?: string
  onDark?: boolean
}) {
  return (
    <svg
      viewBox="0 0 32 40"
      className={cn("h-8 w-auto", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M4 3h24l-2.6 33.2A2 2 0 0 1 23.4 38H8.6a2 2 0 0 1-2-1.8L4 3Z"
        fill="var(--stout)"
        stroke={onDark ? "var(--cream)" : "none"}
        strokeOpacity={onDark ? 0.55 : 0}
        strokeWidth={onDark ? 1.5 : 0}
      />
      <path d="M4 3h24l-0.62 8H4.62L4 3Z" fill="var(--cream)" />
      <path
        d="M10.5 22.5l4 4 7.5-8.5"
        fill="none"
        stroke="var(--pub-light)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("font-display text-xl font-bold tracking-tight lowercase", className)}>
      <span className={onDark ? "text-cream" : "text-stout"}>ratemy</span>
      <span className={onDark ? "text-pub-light" : "text-pub"}>guin</span>
    </span>
  )
}

export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TickMark className="h-7" onDark={onDark} />
      <Wordmark onDark={onDark} />
    </span>
  )
}
