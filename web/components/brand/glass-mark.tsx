import { BRAND } from './tokens'

/*
 * Tulip stout glass on a 40 x 64 grid (centre x = 20), proportioned like a real
 * imperial stout pint: rim 29 wide, a slight neck under the head, the bulge a third
 * of the way down, tapering to a 21-wide heavy base.
 */
const GLASS_BODY =
  'M5.6 3 H34.4 C34.3 5.5 33.9 6.5 33.9 9 C33.9 12 35.2 16 35.2 21 C35.2 32 31.0 48 30.4 57 L30.4 59.4 Q30.4 61 28.799999999999997 61 H11.2 Q9.6 61 9.6 59.4 L9.6 57 C9.0 48 4.800000000000001 32 4.800000000000001 21 C4.800000000000001 16 6.1 12 6.1 9 C6.1 6.5 5.699999999999999 5.5 5.6 3 Z'
const GLASS_OUTLINE = GLASS_BODY
const HEAD = 'M5.6 3 H34.4 C34.3 5.5 33.9 6.5 33.9 9 L33.95 10.5 Q20 11.3 6.05 10.5 L6.1 9 C6.1 6.5 5.7 5.5 5.6 3 Z'
const BASE_LINE = 'M9.6 57 H30.4'
const REFLECTION = 'M8.4 14 C7.8 24 9.6 40 11.4 52'

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
