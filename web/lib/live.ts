"use client"

// Reads and writes the live ratemyGuin database (Supabase). The publishable key is
// safe to ship: row level security decides what each visitor can see and do.

import { createClient, type Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { LOCATIONS, distanceKm, type LocationKey, type PintRating, type Pub } from "./pubs"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://yhttayboxljswczexspg.supabase.co"
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_8aeFY-i4xdQPbQ7kA_BRjA_WfoJR18a"

export const supabase = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })

type DirectoryRow = {
  id: string
  name: string
  address: string
  neighbourhood: string | null
  city: string
  country: string
  atmosphere: string | null
  lat: number
  lng: number
  rating_count: number
  verified_share: number | null
  pour: number | null
  taste_temperature: number | null
  consistency: number | null
  atmosphere_service: number | null
  value: number | null
  median_price_pence: number | null
  excellence_index: number | null
  website: string | null
  brand: string | null
  logo_url: string | null
  image_url: string | null
}

const COLS =
  "id,name,address,neighbourhood,city,country,atmosphere,lat,lng,rating_count,verified_share,pour,taste_temperature,consistency,atmosphere_service,value,median_price_pence,excellence_index,website,brand,logo_url,image_url"

function toPub(r: DirectoryRow, origin?: { lat: number; lng: number }): Pub {
  const ten = (v: number | null) => (v == null ? 0 : Math.round(Number(v) * 10))
  return {
    slug: r.id,
    name: r.name,
    area: r.neighbourhood ?? r.city,
    city: r.city,
    country: r.country,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    price: r.median_price_pence == null ? null : r.median_price_pence / 100,
    ratingsLastYear: Number(r.rating_count ?? 0),
    totalPints: Number(r.rating_count ?? 0),
    verifiedShare: Number(r.verified_share ?? 0),
    components: {
      pour: ten(r.pour),
      taste: ten(r.taste_temperature),
      consistency: ten(r.consistency),
      atmosphere: ten(r.atmosphere_service),
      value: ten(r.value),
    },
    index: r.excellence_index,
    trend: 0,
    logoUrl: r.logo_url,
    imageUrl: r.image_url,
    website: r.website,
    brand: r.brand,
    atmosphereTag: r.atmosphere,
    distanceKm: origin ? distanceKm(origin, r) : undefined,
  }
}

async function loadArea(key: LocationKey, origin: { lat: number; lng: number }): Promise<Pub[]> {
  const loc = LOCATIONS[key]
  if (loc.radiusKm) {
    const centre = key === "near" ? origin : { lat: loc.center[0], lng: loc.center[1] }
    const { data, error } = await supabase.rpc("pub_directory_near", { p_lat: centre.lat, p_lng: centre.lng, p_radius_m: Math.round(loc.radiusKm * 1000) })
    if (error) throw error
    return (data as DirectoryRow[]).map((r) => toPub(r, centre))
  }
  // A whole city or country: page through the directory (the API returns up to 1,000 rows at a time).
  const out: Pub[] = []
  const centre = { lat: loc.center[0], lng: loc.center[1] }
  for (let from = 0; from < 20000; from += 1000) {
    let q = supabase.from("pub_directory").select(COLS).order("excellence_index", { ascending: false, nullsFirst: false }).order("id").range(from, from + 999)
    q = loc.city ? q.eq("city", loc.city) : q.eq("country", loc.country ?? "United Kingdom")
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as unknown as DirectoryRow[]).map((r) => toPub(r, centre)))
    if (!data || data.length < 1000) break
  }
  return out
}

export function usePubs(key: LocationKey, origin: { lat: number; lng: number }) {
  const [state, setState] = useState<{ pubs: Pub[]; loading: boolean; error: string | null }>({ pubs: [], loading: true, error: null })
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    loadArea(key, origin)
      .then((pubs) => live && setState({ pubs, loading: false, error: null }))
      .catch((e) => live && setState({ pubs: [], loading: false, error: e.message ?? "Couldn't load pubs" }))
    return () => {
      live = false
    }
  }, [key, origin.lat, origin.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

export async function loadPub(id: string): Promise<Pub | null> {
  const { data, error } = await supabase.from("pub_directory").select(COLS).eq("id", id).maybeSingle()
  if (error) throw error
  return data ? toPub(data as unknown as DirectoryRow) : null
}

/** The pub's place in its city's table (1 = best), or 0 if it isn't ranked yet. */
export async function cityPosition(pub: Pub): Promise<number> {
  if (pub.index == null) return 0
  const { count } = await supabase.from("pub_directory").select("id", { count: "exact", head: true }).eq("city", pub.city).gt("excellence_index", pub.index)
  return (count ?? 0) + 1
}

export async function cityMedianPrice(city: string): Promise<number | null> {
  const { data } = await supabase.from("pub_directory").select("median_price_pence").eq("city", city).not("median_price_pence", "is", null).limit(1000)
  const xs = (data ?? []).map((r) => Number(r.median_price_pence)).sort((a, b) => a - b)
  return xs.length ? xs[Math.floor(xs.length / 2)] / 100 : null
}

type RatingRow = {
  id: string
  overall: number
  taste: number
  temperature: number
  head: number
  texture: number
  pour: number
  price_pence: number | null
  note: string | null
  verification: string
  rated_at: string
  display_name: string | null
  reply: string | null
}

export async function loadRatings(pubId: string): Promise<PintRating[]> {
  const { data, error } = await supabase
    .from("public_ratings")
    .select("id,overall,taste,temperature,head,texture,pour,price_pence,note,verification,rated_at,display_name,reply")
    .eq("pub_id", pubId)
    .order("rated_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data as RatingRow[]).map((r) => {
    const user = r.display_name ?? "Anonymous"
    return {
      id: r.id,
      user,
      initials: user
        .split(" ")
        .filter((w) => /^\p{L}/u.test(w))
        .map((w) => w[0])
        .join("")
        .slice(0, 2),
      date: new Date(r.rated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      ratedAt: r.rated_at,
      overall: Number(r.overall),
      taste: Number(r.taste),
      temperature: Number(r.temperature),
      head: Number(r.head),
      texture: Number(r.texture),
      pour: Number(r.pour),
      price: r.price_pence == null ? null : r.price_pence / 100,
      verified: r.verification !== "none",
      comment: r.note ?? "",
      reply: r.reply ?? undefined,
    }
  })
}

export async function searchPubs(text: string, near?: { lat: number; lng: number }): Promise<Pub[]> {
  if (text.trim().length < 2) {
    if (!near) return []
    const { data } = await supabase.rpc("pub_directory_near", { p_lat: near.lat, p_lng: near.lng, p_radius_m: 400 })
    return ((data ?? []) as DirectoryRow[]).map((r) => toPub(r, near)).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  }
  const { data } = await supabase.from("pub_directory").select(COLS).ilike("name", `%${text.trim()}%`).limit(20)
  return ((data ?? []) as unknown as DirectoryRow[]).map((r) => toPub(r, near))
}

// Signing in: we email an 8-digit code, no passwords.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return { session, ready }
}

export async function myProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("handle,display_name").eq("id", userId).maybeSingle()
  return data as { handle: string; display_name: string } | null
}

export type NewRating = {
  pubId: string
  overall: number
  taste: number
  temperature: number
  head: number
  texture: number
  pour: number
  atmosphere?: number
  pricePence?: number | null
  note?: string
  fix?: { lat: number; lng: number; accuracy: number } | null
}

export async function submitRating(userId: string, r: NewRating) {
  const { error } = await supabase.from("ratings").insert({
    pub_id: r.pubId,
    user_id: userId,
    overall: r.overall,
    taste: r.taste,
    temperature: r.temperature,
    head: r.head,
    texture: r.texture,
    pour: r.pour,
    atmosphere: r.atmosphere ?? null,
    price_pence: r.pricePence ?? null,
    note: r.note || null,
    fix: r.fix ? `SRID=4326;POINT(${r.fix.lng} ${r.fix.lat})` : null,
    fix_accuracy_m: r.fix ? Math.round(r.fix.accuracy) : null,
  })
  if (error) throw error
}

export type Stamp = { pubId: string; name: string; city: string; country: string; at: string; index: number | null; verified: boolean }

export async function myStamps(userId: string): Promise<Stamp[]> {
  const { data } = await supabase
    .from("ratings")
    .select("pub_id,rated_at,verification,pubs(name,city,country)")
    .eq("user_id", userId)
    .order("rated_at", { ascending: true })
  const seen = new Map<string, Stamp>()
  for (const r of (data ?? []) as unknown as { pub_id: string; rated_at: string; verification: string; pubs: { name: string; city: string; country: string } }[]) {
    if (!seen.has(r.pub_id))
      seen.set(r.pub_id, { pubId: r.pub_id, name: r.pubs?.name ?? "A pub", city: r.pubs?.city ?? "", country: r.pubs?.country ?? "", at: r.rated_at, index: null, verified: r.verification !== "none" })
  }
  return [...seen.values()]
}
