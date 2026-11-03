import { BRAND, FONT_SANS, FONT_SERIF, getBand, polar } from './tokens'

const C = 110
const R = 86
const START = 135
const SWEEP = 270

const start = polar(C, C, R, START)
const end = polar(C, C, R, START + SWEEP)
const ARC = `M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${end.x} ${end.y}`

const TICKS = Array.from({ length: 51 }, (_, i) => {
  const v = i * 2
  const major = v % 10 === 0
  const deg = START + (v / 100) * SWEEP
  return { major, a: polar(C, C, major ? 96 : 97.5, deg), b: polar(C, C, 102, deg) }
})

type ScoreDialProps = {
  score: number
  tone?: 'onDark' | 'onLight'
  size?: number
  className?: string
}

export function ScoreDial({ score, tone = 'onDark', size = 220, className }: ScoreDialProps) {
  const value = Math.max(0, Math.min(100, score))
  const band = getBand(value)
  const accent = tone === 'onDark' ? BRAND.gilt : BRAND.gold
  const text = tone === 'onDark' ? BRAND.cream : BRAND.stout
  const marker = polar(C, C, R, START + (value / 100) * SWEEP)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      role="img"
      aria-label={`Excellence Index ${value} out of 100${band ? `, ${band}` : ''}`}
      className={className}
    >
      <g stroke={accent}>
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.a.x}
            y1={t.a.y}
            x2={t.b.x}
            y2={t.b.y}
            strokeWidth={t.major ? 1 : 0.5}
            strokeOpacity={t.major ? 0.9 : 0.45}
          />
        ))}
      </g>
      <path d={ARC} fill="none" stroke={accent} strokeOpacity={0.18} strokeWidth={3} />
      <path
        d={ARC}
        fill="none"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${value} 100`}
      />
      <circle cx={marker.x} cy={marker.y} r={5} fill={tone === 'onDark' ? BRAND.stout : BRAND.paper} stroke={accent} strokeWidth={1.5} />

      <text
        x={C}
        y={74}
        textAnchor="middle"
        fill={text}
        fillOpacity={0.6}
        fontSize={7.5}
        letterSpacing={2.6}
        style={{ fontFamily: FONT_SANS, fontWeight: 500 }}
      >
        EXCELLENCE INDEX
      </text>
      <text
        x={C}
        y={132}
        textAnchor="middle"
        fill={text}
        fontSize={68}
        style={{ fontFamily: FONT_SERIF, fontWeight: 500, fontVariantNumeric: 'lining-nums' }}
      >
        {value}
      </text>
      <line x1={C - 22} y1={146} x2={C + 22} y2={146} stroke={accent} strokeWidth={0.6} />
      {band && (
        <text
          x={C}
          y={166}
          textAnchor="middle"
          fill={accent}
          fontSize={15}
          style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 500 }}
        >
          {band}
        </text>
      )}
      <text
        x={C}
        y={204}
        textAnchor="middle"
        fill={text}
        fillOpacity={0.5}
        fontSize={8}
        letterSpacing={2}
        style={{ fontFamily: FONT_SANS }}
      >
        OUT OF 100
      </text>
    </svg>
  )
}
