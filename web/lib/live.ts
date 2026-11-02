"use client"

// Reads and writes the live ratemyGuin database (Supabase). The publishable key is
// safe to ship: row level security decides what each visitor can see and do.

import { createClient, type Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { LOCATIONS, PLACES, distanceKm, type LocationKey, type PintRating, type Pub, type TagKey, type FeatureKey } from "./pubs"

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
  pint_score: number | null
  pub_score: number | null
  price_updated_at: string | null
  under_review: boolean | null
  features: FeatureKey[] | null
  opened_on: string | null
  added_at: string | null
}

const COLS =
  "id,name,address,neighbourhood,city,country,atmosphere,lat,lng,rating_count,verified_share,pour,taste_temperature,consistency,atmosphere_service,value,median_price_pence,excellence_index,website,brand,logo_url,image_url,pint_score,pub_score,price_updated_at,under_review,features,opened_on,added_at"

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
    pintScore: r.pint_score,
    pubScore: r.pub_score,
    priceUpdatedAt: r.price_updated_at,
    underReview: !!r.under_review,
    features: r.features ?? [],
    openedOn: r.opened_on,
    addedAt: r.added_at,
  }
}

async function loadArea(key: LocationKey, origin: { lat: number; lng: number }): Promise<Pub[]> {
  const loc = PLACES[key]
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
  tags: TagKey[] | null
  visited_on: string | null
  photo_path: string | null
}

export async function loadRatings(pubId: string): Promise<PintRating[]> {
  const { data, error } = await supabase
    .from("public_ratings")
    .select("id,overall,taste,temperature,head,texture,pour,price_pence,note,verification,rated_at,display_name,reply,tags,visited_on,photo_path")
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
      tags: r.tags ?? [],
      visitedOn: r.visited_on,
      photoUrl: r.photo_path ? supabase.storage.from("pint-photos").getPublicUrl(r.photo_path).data.publicUrl : null,
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
  tags?: TagKey[]
  features?: FeatureKey[]
  visitedOn?: string
  photo?: File | null
}

/** Shrinks a phone photo to at most 1600 px on the long side as a JPEG before upload. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise((ok) => canvas.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85))
  } catch {
    return file
  }
}

export async function submitRating(userId: string, r: NewRating) {
  let photoPath: string | null = null
  if (r.photo) {
    const path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error: upErr } = await supabase.storage.from("pint-photos").upload(path, await shrink(r.photo), { contentType: "image/jpeg" })
    if (upErr) throw new Error(`Couldn't upload the photo: ${upErr.message}`)
    photoPath = path
  }
  const { error } = await supabase.from("ratings").insert({
    photo_path: photoPath,
    tags: r.tags ?? [],
    features: r.features ?? [],
    visited_on: r.visitedOn ?? null,
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

export type Stamp = { pubId: string; name: string; city: string; country: string; hood: string | null; at: string; index: number | null; verified: boolean }

export async function myStamps(userId: string): Promise<Stamp[]> {
  const { data } = await supabase
    .from("ratings")
    .select("pub_id,rated_at,verification,pubs(name,city,country,neighbourhood)")
    .eq("user_id", userId)
    .order("rated_at", { ascending: true })
  const seen = new Map<string, Stamp>()
  for (const r of (data ?? []) as unknown as { pub_id: string; rated_at: string; verification: string; pubs: { name: string; city: string; country: string; neighbourhood: string | null } }[]) {
    if (!seen.has(r.pub_id))
      seen.set(r.pub_id, { pubId: r.pub_id, name: r.pubs?.name ?? "A pub", city: r.pubs?.city ?? "", country: r.pubs?.country ?? "", hood: r.pubs?.neighbourhood ?? null, at: r.rated_at, index: null, verified: r.verification !== "none" })
  }
  return [...seen.values()]
}

export type ReportReason = "fake" | "not_there" | "offensive" | "staff" | "other"

export async function reportRating(ratingId: string, reason: ReportReason) {
  const { error } = await supabase.from("rating_reports").insert({ rating_id: ratingId, reason })
  if (error && error.code !== "23505") throw error
}

export type Station = { name: string; kind: "tube" | "overground" | "elizabeth" | "dlr" | "rail" | "tram"; metres: number; walk_minutes: number }

export async function nearestStations(lat: number, lng: number): Promise<Station[]> {
  const { data } = await supabase.rpc("nearest_stations", { p_lat: lat, p_lng: lng })
  return (data ?? []) as Station[]
}

// ── Pint diary ─────────────────────────────────────────────────────────────
export type DiaryEntry = {
  id: string
  pubId: string
  pubName: string
  area: string
  overall: number
  note: string | null
  tags: TagKey[]
  photoUrl: string | null
  ratedAt: string
  visitedOn: string | null
  verified: boolean
  anonymous: boolean
}

export async function myDiary(userId: string): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("id,pub_id,overall,note,tags,photo_path,rated_at,visited_on,verification,anonymous,pubs(name,city,neighbourhood)")
    .eq("user_id", userId)
    .order("rated_at", { ascending: false })
    .limit(200)
  if (error) throw error
  type Row = { id: string; pub_id: string; overall: number; note: string | null; tags: TagKey[] | null; photo_path: string | null; rated_at: string; visited_on: string | null; verification: string; anonymous: boolean; pubs: { name: string; city: string; neighbourhood: string | null } | null }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    pubId: r.pub_id,
    pubName: r.pubs?.name ?? "A pub",
    area: r.pubs?.neighbourhood ?? r.pubs?.city ?? "",
    overall: Number(r.overall),
    note: r.note,
    tags: r.tags ?? [],
    photoUrl: r.photo_path ? supabase.storage.from("pint-photos").getPublicUrl(r.photo_path).data.publicUrl : null,
    ratedAt: r.rated_at,
    visitedOn: r.visited_on,
    verified: r.verification !== "none",
    anonymous: r.anonymous,
  }))
}

export async function setRatingAnonymous(id: string, anonymous: boolean) {
  const { error } = await supabase.rpc("set_rating_anonymous", { p_rating: id, p_anonymous: anonymous })
  if (error) throw error
}

export async function setProfilePublic(userId: string, isPublic: boolean) {
  const { error } = await supabase.from("profiles").update({ is_public: isPublic }).eq("id", userId)
  if (error) throw error
}

export async function profileSettings(userId: string) {
  const { data } = await supabase.from("profiles").select("handle,display_name,is_public").eq("id", userId).maybeSingle()
  return data as { handle: string; display_name: string; is_public: boolean } | null
}

// ── Saved lists ────────────────────────────────────────────────────────────
export type SavedList = { id: string; name: string; isPublic: boolean; pubs: { id: string; name: string; area: string }[] }

export async function myLists(userId: string): Promise<SavedList[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("id,name,is_public,list_pubs(pub_id,added_at,pubs(name,city,neighbourhood))")
    .eq("owner", userId)
    .order("created_at", { ascending: true })
  if (error) throw error
  type Row = { id: string; name: string; is_public: boolean; list_pubs: { pub_id: string; pubs: { name: string; city: string; neighbourhood: string | null } | null }[] }
  return ((data ?? []) as unknown as Row[]).map((l) => ({
    id: l.id,
    name: l.name,
    isPublic: l.is_public,
    pubs: l.list_pubs.map((lp) => ({ id: lp.pub_id, name: lp.pubs?.name ?? "A pub", area: lp.pubs?.neighbourhood ?? lp.pubs?.city ?? "" })),
  }))
}

export async function createList(name: string): Promise<string> {
  const { data, error } = await supabase.from("lists").insert({ name }).select("id").single()
  if (error) throw error
  return data.id as string
}

export async function deleteList(id: string) {
  const { error } = await supabase.from("lists").delete().eq("id", id)
  if (error) throw error
}

export async function setListPublic(id: string, isPublic: boolean) {
  const { error } = await supabase.from("lists").update({ is_public: isPublic }).eq("id", id)
  if (error) throw error
}

export async function addToList(listId: string, pubId: string) {
  const { error } = await supabase.from("list_pubs").insert({ list_id: listId, pub_id: pubId })
  if (error && error.code !== "23505") throw error
}

export async function removeFromList(listId: string, pubId: string) {
  const { error } = await supabase.from("list_pubs").delete().eq("list_id", listId).eq("pub_id", pubId)
  if (error) throw error
}

// ── Friends ────────────────────────────────────────────────────────────────
export type Person = { id: string; handle: string; name: string }

export async function findPeople(text: string): Promise<Person[]> {
  const t = text.trim().replace(/^@/, "")
  if (t.length < 2) return []
  const { data } = await supabase.from("profiles").select("id,handle,display_name").ilike("handle", `${t}%`).limit(8)
  return (data ?? []).map((p) => ({ id: p.id, handle: p.handle, name: p.display_name }))
}

export async function following(userId: string): Promise<Person[]> {
  const { data } = await supabase.from("follows").select("followee,profiles!follows_followee_fkey(id,handle,display_name)").eq("follower", userId)
  type Row = { followee: string; profiles: { id: string; handle: string; display_name: string } | null }
  return ((data ?? []) as unknown as Row[]).filter((r) => r.profiles).map((r) => ({ id: r.profiles!.id, handle: r.profiles!.handle, name: r.profiles!.display_name }))
}

export async function follow(userId: string, other: string) {
  const { error } = await supabase.from("follows").insert({ follower: userId, followee: other })
  if (error && error.code !== "23505") throw error
}

export async function unfollow(userId: string, other: string) {
  const { error } = await supabase.from("follows").delete().eq("follower", userId).eq("followee", other)
  if (error) throw error
}

export type FeedItem = { id: string; who: string; pubId: string; pubName: string; overall: number; note: string | null; at: string; photoUrl: string | null }

export async function friendsFeed(ids: string[]): Promise<FeedItem[]> {
  if (!ids.length) return []
  const { data } = await supabase
    .from("public_ratings")
    .select("id,pub_id,user_id,display_name,overall,note,rated_at,photo_path")
    .in("user_id", ids)
    .order("rated_at", { ascending: false })
    .limit(30)
  type Row = { id: string; pub_id: string; display_name: string | null; overall: number; note: string | null; rated_at: string; photo_path: string | null }
  const rows = (data ?? []) as Row[]
  const pubIds = [...new Set(rows.map((r) => r.pub_id))]
  const names = new Map<string, string>()
  if (pubIds.length) {
    const { data: pubs } = await supabase.from("pubs").select("id,name").in("id", pubIds)
    for (const p of pubs ?? []) names.set(p.id, p.name)
  }
  return rows.map((r) => ({
    id: r.id,
    who: r.display_name ?? "Someone",
    pubId: r.pub_id,
    pubName: names.get(r.pub_id) ?? "a pub",
    overall: Number(r.overall),
    note: r.note,
    at: r.rated_at,
    photoUrl: r.photo_path ? supabase.storage.from("pint-photos").getPublicUrl(r.photo_path).data.publicUrl : null,
  }))
}

export type Favourite = { pub_id: string; name: string; city: string; pints: number; average: number }

export async function favourites(userId: string): Promise<Favourite[]> {
  const { data } = await supabase.rpc("favourites", { p_user: userId })
  return ((data ?? []) as Favourite[]).map((f) => ({ ...f, average: Number(f.average) }))
}
