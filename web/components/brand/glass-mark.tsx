import { BRAND } from './tokens'

/*
 * Tulip stout glass, drawn on a 40 × 64 grid (centre line x = 20).
 * Rim half-width 10.5 at y=4 → bulge half-width 13.5 at y=24 (two-thirds up) →
 * narrow heel half-width 7.4 at y=55, with a thick glass base below.
 */
const GLASS_BODY =
  'M9.5 4 C8.7 10 6.5 16 6.5 24 C6.5 34 11.6 45 12.6 55 L12.6 59.4 Q12.6 60.5 13.7 60.5 H26.3 Q27.4 60.5 27.4 59.4 L27.4 55 C28.4 45 33.5 34 33.5 24 C33.5 16 31.3 10 30.5 4 Z'
const GLASS_OUTLINE =
  'M9.5 4 C8.7 10 6.5 16 6.5 24 C6.5 34 11.6 45 12.6 55 L12.6 59.4 Q12.6 60.5 13.7 60.5 H26.3 Q27.4 60.5 27.4 59.4 L27.4 55 C28.4 45 33.5 34 33.5 24 C33.5 16 31.3 10 30.5 4'
const HEAD = 'M9.5 4 Q20 0.9 30.5 4 C30.9 6.2 31.25 8.3 31.6 10.5 Q20 11.4 8.4 10.5 C8.75 8.3 9.1 6.2 9.5 4 Z'
const BASE_LINE = 'M12.6 55 H27.4'
const REFLECTION = 'M10 15.5 C9.4 25 11.2 37 13.6 49'

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
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={GLASS_BODY} fill={body} />
      <path
        d={HEAD}
        fill={head}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.7}
        strokeLinejoin="round"
      />
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
