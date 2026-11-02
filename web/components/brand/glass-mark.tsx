import { useId } from 'react'
import { BRAND } from './tokens'

/*
 * Stout pint glass on a 40 x 64 grid (centre x = 20): one smooth line from a wide rim,
 * swelling gently a third of the way down, then tapering to a heavy base.
 */
const GLASS_BODY =
  'M7.2 3 H32.8 C33.3 9 34.2 17 34.2 24 C34.2 38 30.3 50 29.4 58 L29.4 59.6 Q29.4 61 28.0 61 H12.0 Q10.6 61 10.6 59.6 L10.6 58 C9.7 50 5.8 38 5.8 24 C5.8 17 6.7 9 7.2 3 Z'
const GLASS_OUTLINE = GLASS_BODY
const HEAD_DEPTH = 10 // the head fills the glass from the rim down to here
const BASE_LINE = 'M10.6 58 H29.4'
const REFLECTION = 'M9.4 15 C8.4 26 9.6 40 11.6 52'

export type GlassTone = 'onDark' | 'onLight' | 'gilt' | 'ink'

const TONES: Record<GlassTone, { stroke: string; body: string; head: string }> = {
  onDark: { stroke: BRAND.gilt, body: BRAND.stout, head: BRAND.cream },
  onLight: { stroke: BRAND.stout, body: BRAND.stout, head: BRAND.cream },
  gilt: { stroke: BRAND.gilt, body: BRAND.stout, head: BRAND.gilt },
  ink: { stroke: BRAND.gold, body: BRAND.stout, head: BRAND.paper },
}

type GlassGlyphProps = {
  x?: number
  y?: number
  height?: number
  stroke: string
  body: string
  head: string
  /** Stroke width in glyph units (the 40 × 64 grid). */
  strokeWidth?: number
  detailed?: boolean
}

/** Renders the glass as a <g> for composing inside other SVG marks. */
export function GlassGlyph({
  x = 0,
  y = 0,
  height = 64,
  stroke,
  body,
  head,
  strokeWidth = 1,
  detailed = false,
}: GlassGlyphProps) {
  const scale = height / 64
  const clip = 'glass-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={GLASS_BODY} fill={body} />
      <clipPath id={clip}>
        <path d={GLASS_BODY} />
      </clipPath>
      <rect x="0" y="0" width="40" height={HEAD_DEPTH} fill={head} clipPath={`url(#${clip})`} />
      <path d={`M4 ${HEAD_DEPTH} H36`} stroke={stroke} strokeWidth={strokeWidth * 0.5} clipPath={`url(#${clip})`} />
      <path
        d={GLASS_OUTLINE}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d={BASE_LINE} fill="none" stroke={stroke} strokeWidth={strokeWidth * 0.7} />
      {detailed && (
        <path
          d={REFLECTION}
          fill="none"
          stroke={head}
          strokeOpacity={0.45}
          strokeWidth={strokeWidth * 0.55}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

/** Optical stroke weight so the line reads the same from 24px to 240px. */
export function glassStrokeFor(size: number) {
  if (size >= 160) return 0.8
  if (size >= 80) return 1.1
  if (size >= 40) return 1.7
  return 2.6
}

type GlassMarkProps = {
  /** Rendered height in px; width is 0.625 × height. */
  size?: number
  tone?: GlassTone
  stroke?: string
  body?: string
  head?: string
  detailed?: boolean
  title?: string
  className?: string
}

export function GlassMark({
  size = 64,
  tone = 'onDark',
  stroke,
  body,
  head,
  detailed,
  title = 'ratemyGuin tulip glass',
  className,
}: GlassMarkProps) {
  const colors = TONES[tone]
  return (
    <svg
      width={(size * 40) / 64}
      height={size}
      viewBox="0 0 40 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <GlassGlyph
        stroke={stroke ?? colors.stroke}
        body={body ?? colors.body}
        head={head ?? colors.head}
        strokeWidth={glassStrokeFor(size)}
        detailed={detailed ?? size >= 96}
      />
    </svg>
  )
}
