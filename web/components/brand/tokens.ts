export const BRAND = {
  stout: '#17110D',
  cream: '#F6EEDC',
  paper: '#FBF8F1',
  gold: '#8A6516',
  gilt: '#D4A94A',
} as const

// SVG <text> needs inline font stacks; these resolve the next/font variables set on <html>.
export const FONT_SERIF = "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
export const FONT_SANS = "var(--font-jost), 'Jost', system-ui, sans-serif"

export const AWARD_TIERS = {
  exceptional: { name: 'Exceptional', range: '95+', marks: 3 },
  goldStandard: { name: 'Gold Standard', range: '90–94', marks: 2 },
  highlyRecommended: { name: 'Highly Recommended', range: '80–89', marks: 1 },
} as const

export type AwardTier = keyof typeof AWARD_TIERS

export type Band = 'Exceptional' | 'Gold Standard' | 'Highly Recommended'

export function getBand(score: number): Band | null {
  if (score >= 95) return 'Exceptional'
  if (score >= 90) return 'Gold Standard'
  if (score >= 80) return 'Highly Recommended'
  return null
}

export function svgSafeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return {
    x: Number((cx + r * Math.cos(rad)).toFixed(3)),
    y: Number((cy + r * Math.sin(rad)).toFixed(3)),
  }
}
