'use client'

import { useId } from 'react'
import { GlassGlyph } from './glass-mark'
import { BRAND, FONT_SERIF, polar, svgSafeId } from './tokens'

export type SealTone = 'gold' | 'black' | 'cream'

const TONES: Record<SealTone, { disc: string | null; ink: string; head: string; body: string }> = {
  gold: { disc: null, ink: BRAND.stout, head: BRAND.cream, body: BRAND.stout },
  black: { disc: BRAND.stout, ink: BRAND.gilt, head: BRAND.cream, body: BRAND.stout },
  cream: { disc: BRAND.cream, ink: BRAND.gold, head: BRAND.paper, body: BRAND.stout },
}

const C = 120
const arcTop = (r: number) => `M ${C - r} ${C} A ${r} ${r} 0 0 1 ${C + r} ${C}`
const arcBottom = (r: number) => `M ${C - r} ${C} A ${r} ${r} 0 0 0 ${C + r} ${C}`

const RAYS = Array.from({ length: 96 }, (_, i) => {
  const deg = i * 3.75
  return { a: polar(C, C, 64, deg), b: polar(C, C, i % 2 === 0 ? 78 : 74, deg) }
})

type SealProps = {
  size?: number
  tone?: SealTone
  top?: string
  bottom?: string
  className?: string
}

export function Seal({
  size = 240,
  tone = 'gold',
  top = 'RATEMYGUIN',
  bottom = 'EST. 2026 · INDEPENDENT',
  className,
}: SealProps) {
  const id = svgSafeId(useId())
  const t = TONES[tone]
  const disc = t.disc ?? `url(#${id}-gilt)`
  const head = tone === 'gold' ? BRAND.cream : t.head

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={`ratemyGuin seal: ${top}, ${bottom}`}
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-gilt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C077" />
          <stop offset="0.5" stopColor={BRAND.gilt} />
          <stop offset="1" stopColor="#B88C34" />
        </linearGradient>
        <path id={`${id}-top`} d={arcTop(94)} />
        <path id={`${id}-bottom`} d={arcBottom(103)} />
      </defs>

      <circle cx={C} cy={C} r={118} fill={disc} />
      <circle cx={C} cy={C} r={113} fill="none" stroke={t.ink} strokeWidth={1.4} />
      <circle cx={C} cy={C} r={109.5} fill="none" stroke={t.ink} strokeWidth={0.5} />
      <circle cx={C} cy={C} r={86} fill="none" stroke={t.ink} strokeWidth={0.5} />
      <circle cx={C} cy={C} r={82.5} fill="none" stroke={t.ink} strokeWidth={1.4} />

      <g stroke={t.ink} strokeWidth={0.45} opacity={0.55}>
        {RAYS.map((r, i) => (
          <line key={i} x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} />
        ))}
      </g>

      <text
        fill={t.ink}
        fontSize={15}
        letterSpacing={4.2}
        style={{ fontFamily: FONT_SERIF, fontWeight: 600 }}
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text
        fill={t.ink}
        fontSize={12.5}
        letterSpacing={3.2}
        style={{ fontFamily: FONT_SERIF, fontWeight: 600 }}
      >
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {bottom}
        </textPath>
      </text>

      {[C - 98, C + 98].map((x) => (
        <rect
          key={x}
          x={x - 2.4}
          y={C - 2.4}
          width={4.8}
          height={4.8}
          fill={t.ink}
          transform={`rotate(45 ${x} ${C})`}
        />
      ))}

      <circle cx={C} cy={C} r={60} fill={disc} />
      <GlassGlyph
        x={C - 32.5}
        y={C - 32 * 1.625}
        height={104}
        stroke={t.ink}
        body={t.body}
        head={head}
        strokeWidth={0.8}
        detailed
      />
    </svg>
  )
}
