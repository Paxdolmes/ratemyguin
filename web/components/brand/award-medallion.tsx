'use client'

import { useId } from 'react'
import { GlassGlyph } from './glass-mark'
import { AWARD_TIERS, BRAND, FONT_SANS, FONT_SERIF, polar, svgSafeId, type AwardTier } from './tokens'

export type MedallionVariant = 'gold' | 'gilt' | 'cream'

const VARIANTS: Record<
  MedallionVariant,
  { disc: string | null; ink: string; head: string; body: string }
> = {
  gold: { disc: null, ink: BRAND.stout, head: BRAND.cream, body: BRAND.stout },
  gilt: { disc: 'none', ink: BRAND.gilt, head: BRAND.cream, body: BRAND.stout },
  cream: { disc: BRAND.cream, ink: BRAND.gold, head: BRAND.paper, body: BRAND.stout },
}

const C = 120
const arcTop = (r: number) => `M ${C - r} ${C} A ${r} ${r} 0 0 1 ${C + r} ${C}`
const arcBottom = (r: number) => `M ${C - r} ${C} A ${r} ${r} 0 0 0 ${C + r} ${C}`
const BEADS = Array.from({ length: 72 }, (_, i) => polar(C, C, 113.5, i * 5))

type AwardMedallionProps = {
  tier: AwardTier
  variant?: MedallionVariant
  year?: number
  size?: number
  className?: string
}

export function AwardMedallion({
  tier,
  variant = 'gold',
  year = 2026,
  size = 200,
  className,
}: AwardMedallionProps) {
  const id = svgSafeId(useId())
  const t = AWARD_TIERS[tier]
  const v = VARIANTS[variant]
  const disc = v.disc ?? `url(#${id}-gilt)`
  const longName = t.name.length > 14

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={`ratemyGuin ${year} award: ${t.name}, Excellence Index ${t.range}`}
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-gilt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C077" />
          <stop offset="0.5" stopColor={BRAND.gilt} />
          <stop offset="1" stopColor="#B88C34" />
        </linearGradient>
        <path id={`${id}-top`} d={arcTop(88)} />
        <path id={`${id}-bottom`} d={arcBottom(97)} />
      </defs>

      <circle cx={C} cy={C} r={118} fill={disc} />
      <g fill={v.ink}>
        {BEADS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.35} />
        ))}
      </g>
      <circle cx={C} cy={C} r={108} fill="none" stroke={v.ink} strokeWidth={1.4} />
      <circle cx={C} cy={C} r={104.5} fill="none" stroke={v.ink} strokeWidth={0.5} />
      <circle cx={C} cy={C} r={78} fill="none" stroke={v.ink} strokeWidth={0.5} />
      <circle cx={C} cy={C} r={74.5} fill="none" stroke={v.ink} strokeWidth={1.2} />

      <text
        fill={v.ink}
        fontSize={longName ? 12.5 : 14.5}
        letterSpacing={longName ? 2.6 : 4}
        style={{ fontFamily: FONT_SERIF, fontWeight: 600 }}
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {t.name.toUpperCase()}
        </textPath>
      </text>
      <text
        fill={v.ink}
        fontSize={10}
        letterSpacing={3}
        style={{ fontFamily: FONT_SANS, fontWeight: 500 }}
      >
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {`RATEMYGUIN AWARDS · ${year}`}
        </textPath>
      </text>

      {[C - 92, C + 92].map((x) => (
        <circle key={x} cx={x} cy={C} r={2} fill={v.ink} />
      ))}

      <GlassGlyph
        x={C - 12.5}
        y={56}
        height={40}
        stroke={v.ink}
        body={v.body}
        head={v.head}
        strokeWidth={1.4}
      />
      <line x1={C - 30} y1={104} x2={C + 30} y2={104} stroke={v.ink} strokeWidth={0.5} />
      <text
        x={C}
        y={142}
        textAnchor="middle"
        fill={v.ink}
        fontSize={38}
        style={{ fontFamily: FONT_SERIF, fontWeight: 500, fontVariantNumeric: 'lining-nums' }}
      >
        {t.range}
      </text>
      <text
        x={C}
        y={160}
        textAnchor="middle"
        fill={v.ink}
        fontSize={7.5}
        letterSpacing={2.6}
        style={{ fontFamily: FONT_SANS, fontWeight: 500 }}
      >
        EXCELLENCE INDEX
      </text>
      <g fill={v.ink}>
        {Array.from({ length: t.marks }, (_, i) => {
          const x = C + (i - (t.marks - 1) / 2) * 11
          return (
            <rect
              key={i}
              x={x - 2.2}
              y={176 - 2.2}
              width={4.4}
              height={4.4}
              transform={`rotate(45 ${x} 176)`}
            />
          )
        })}
      </g>
    </svg>
  )
}
