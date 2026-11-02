// Shared types, constants and helpers for the website. Data comes from the live
// ratemyGuin database (see lib/live.ts); nothing here is sample data.

export type City = string

export type Components = {
  pour: number
  taste: number
  consistency: number
  atmosphere: number
  value: number
}

export type Pub = {
  slug: string // the pub's id, used in links
  name: string
  area: string
  city: City
  country: string
  address: string
  lat: number
  lng: number
  price: number | null // typical price in pounds, from ratings
  ratingsLastYear: number
  totalPints: number
  verifiedShare: number
  components: Components // 0–100 each
  index: number | null // Excellence Index, null until 3 ratings in the last year
  trend: number
  award?: string
  ownerName?: string
  logoUrl?: string | null
  imageUrl?: string | null
  website?: string | null
  brand?: string | null
  atmosphereTag?: string | null
  distanceKm?: number
  pintScore?: number | null // the glass alone: pour, taste and temperature, consistency
  pubScore?: number | null // atmosphere and service, out of 100
  priceUpdatedAt?: string | null
  underReview?: boolean
}

export type Band = "exceptional" | "gold" | "recommended" | "unbanded"

export const WEIGHTS: Record<keyof Components, number> = {
  pour: 0.4,
  taste: 0.2,
  consistency: 0.15,
  atmosphere: 0.15,
  value: 0.1,
}

export const COMPONENT_LABELS: Record<keyof Components, { label: string; detail: string }> = {
  pour: { label: "The pour", detail: "Two-part pour, head, texture" },
  taste: { label: "Taste & temperature", detail: "Flavour, chill, freshness of the line" },
  consistency: { label: "Consistency", detail: "How little scores vary visit to visit" },
  atmosphere: { label: "Atmosphere & service", detail: "Room, staff, patience at the tap" },
  value: { label: "Value", detail: "Price against the city median" },
}

export const MIN_RATINGS = 3

export function currencyFor(city: City) {
  return city === "Dublin" ? "€" : "£"
}

export function formatPrice(pub: Pick<Pub, "price" | "city">) {
  return pub.price == null ? "–" : `${currencyFor(pub.city)}${pub.price.toFixed(2)}`
}

export function isRated(pub: Pub) {
  return pub.index != null
}

export function excellenceIndex(pub: Pub): number | null {
  return pub.index
}

/** The Index the weights give for a set of components (used on the scoring page). */
export function weightedIndex(c: Components) {
  return Math.round(
    c.pour * WEIGHTS.pour + c.taste * WEIGHTS.taste + c.consistency * WEIGHTS.consistency + c.atmosphere * WEIGHTS.atmosphere + c.value * WEIGHTS.value,
  )
}

export function bandFor(score: number | null): Band {
  if (score === null) return "unbanded"
  if (score >= 95) return "exceptional"
  if (score >= 90) return "gold"
  if (score >= 80) return "recommended"
  return "unbanded"
}

export const BAND_LABEL: Record<Band, string> = {
  exceptional: "Exceptional",
  gold: "Gold Standard",
  recommended: "Highly Recommended",
  unbanded: "Rated",
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`
  return `${km.toFixed(1)} km`
}

export type LocationKey = "near" | "fulham" | "london" | "uk" | "dublin"

export const LOCATIONS: Record<LocationKey, { label: string; center: [number, number]; zoom: number; radiusKm?: number; city?: string; country?: string }> = {
  near: { label: "Near me", center: [51.4802, -0.1953], zoom: 14, radiusKm: 2.5 },
  fulham: { label: "Fulham", center: [51.477, -0.2], zoom: 14, radiusKm: 2.2 },
  london: { label: "London", center: [51.508, -0.14], zoom: 11, city: "London" },
  uk: { label: "UK", center: [53.4, -2.4], zoom: 6, country: "United Kingdom" },
  dublin: { label: "Dublin", center: [53.344, -6.272], zoom: 13, city: "Dublin" },
}

export const FULHAM_BROADWAY = { lat: 51.4802, lng: -0.1953 }

export const pubHref = (pub: Pick<Pub, "slug">) => `/pub/?id=${pub.slug}`

export type PintRating = {
  id: string
  user: string
  initials: string
  date: string
  ratedAt: string
  overall: number
  taste: number
  temperature: number
  head: number
  texture: number
  pour: number
  price: number | null
  verified: boolean
  comment: string
  reply?: string
  tags: TagKey[]
  photoUrl?: string | null
  visitedOn?: string | null
}

/** Pour and fault tags: say why a pint scored what it did. */
export const TAGS = {
  two_part_pour: { label: "Two-part pour", good: true },
  settled: { label: "Left to settle", good: true },
  good_head: { label: "Proper head", good: true },
  creamy: { label: "Creamy", good: true },
  cold: { label: "Well chilled", good: true },
  fresh: { label: "Fresh lines", good: true },
  clean_glass: { label: "Clean glass", good: true },
  rushed_pour: { label: "Rushed pour", good: false },
  flat: { label: "Flat", good: false },
  thin_head: { label: "Thin head", good: false },
  too_warm: { label: "Too warm", good: false },
  too_cold: { label: "Too cold", good: false },
  metallic: { label: "Metallic", good: false },
  sour: { label: "Sour", good: false },
  dirty_glass: { label: "Dirty glass", good: false },
} as const
export type TagKey = keyof typeof TAGS

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return "today"
  if (days === 1) return "yesterday"
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

/** Monthly average of the overall score (×10), oldest first, for the consistency line. */
export function monthlyTrend(ratings: PintRating[]): { month: string; score: number }[] {
  const byMonth = new Map<string, number[]>()
  for (const r of [...ratings].sort((a, b) => a.ratedAt.localeCompare(b.ratedAt))) {
    const key = r.ratedAt.slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), r.overall * 10])
  }
  return [...byMonth.entries()].map(([key, xs]) => ({
    month: new Date(`${key}-01`).toLocaleDateString("en-GB", { month: "short" }),
    score: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length),
  }))
}
