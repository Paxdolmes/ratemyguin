import { cn } from '@/lib/utils'

/** Thin double rule. Inherits colour from `currentColor` (e.g. `text-gold`). */
export function DoubleRule({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('block h-[5px] w-full', className)}
      viewBox="0 0 100 5"
      preserveAspectRatio="none"
    >
      <line x1="0" y1="0.75" x2="100" y2="0.75" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="4.25" x2="100" y2="4.25" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Ornamental divider: fine rules converging on a lozenge with a rising
 * three-bubble cascade either side. Inherits `currentColor`.
 */
export function OrnamentalDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('block h-4 w-60', className)}
      viewBox="0 0 240 16"
      fill="none"
      stroke="currentColor"
    >
      <line x1="0" y1="8" x2="88" y2="8" strokeWidth="0.6" />
      <line x1="152" y1="8" x2="240" y2="8" strokeWidth="0.6" />
      <circle cx="92.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="97" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="102.5" cy="8" r="1.8" strokeWidth="0.6" />
      <circle cx="147.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="143" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="137.5" cy="8" r="1.8" strokeWidth="0.6" />
      <path d="M120 1 L127 8 L120 15 L113 8 Z" strokeWidth="0.7" />
      <path d="M120 4.6 L123.4 8 L120 11.4 L116.6 8 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rand = seeded(1759)
const BUBBLES = Array.from({ length: 340 }, () => {
  const y = rand()
  return {
    x: (rand() * 400).toFixed(2),
    // Denser toward the foot, like a settling surge.
    y: (Math.pow(y, 0.7) * 400).toFixed(2),
    r: (0.35 + Math.pow(rand(), 3) * 1.4).toFixed(2),
    o: (0.25 + rand() * 0.75).toFixed(2),
  }
})

/** Fine stout-bubble cascade texture. Absolutely fills its positioned parent. */
export function CascadeTexture({
  className,
  opacity = 0.18,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      {BUBBLES.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="none" stroke="currentColor" strokeWidth={0.35} strokeOpacity={b.o} />
      ))}
    </svg>
  )
}
