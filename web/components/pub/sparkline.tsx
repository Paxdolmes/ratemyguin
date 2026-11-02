export function Sparkline({ data }: { data: { month: string; score: number }[] }) {
  const width = 320
  const height = 96
  const pad = 6
  const scores = data.map((d) => d.score)
  const min = Math.min(...scores) - 2
  const max = Math.max(...scores) + 2
  const x = (i: number) => pad + (i * (width - pad * 2)) / (data.length - 1)
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2)
  const points = data.map((d, i) => `${x(i)},${y(d.score)}`).join(" ")
  const last = data[data.length - 1]
  const spread = Math.max(...scores) - Math.min(...scores)

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-24 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Monthly Excellence Index over the last 12 months, ranging ${Math.min(...scores)} to ${Math.max(...scores)}`}
      >
        <line x1={pad} x2={width - pad} y1={y(90)} y2={y(90)} stroke="var(--border)" strokeDasharray="3 4" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--pub)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(data.length - 1)} cy={y(last.score)} r={4} fill="var(--pub)" />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0].month} 2025</span>
        <span>
          Spread <span className="font-semibold text-foreground tabular-nums">{spread} pts</span>
        </span>
        <span>{last.month} 2026</span>
      </figcaption>
    </figure>
  )
}
