export function ScoreDial({ score, size = 220 }: { score: number | null; size?: number }) {
  const stroke = 14
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const sweep = 0.75
  const track = circumference * sweep
  const value = score === null ? 0 : (score / 100) * track

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--cream)"
          strokeOpacity={0.14}
          strokeWidth={stroke}
          strokeDasharray={`${track} ${circumference}`}
          strokeLinecap="round"
        />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--pub-light)"
            strokeWidth={stroke}
            strokeDasharray={`${value} ${circumference}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score === null ? (
          <span className="font-display text-5xl font-bold text-cream/40">—</span>
        ) : (
          <span className="font-display text-7xl font-semibold leading-noneer text-cream tabular-nums">
            {score}
          </span>
        )}
        <span className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-cream/60">
          {score === null ? "Not yet rated" : "out of 100"}
        </span>
      </div>
    </div>
  )
}
