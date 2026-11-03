"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Footprints, LocateFixed, Tag } from "lucide-react"
import { MapLoader } from "@/components/map/map-loader"
import { offerDays } from "@/components/pub/pub-extras"
import { OFFER_KINDS, offersNear, type Offer } from "@/lib/live"
import { FULHAM_BROADWAY, pubHref } from "@/lib/pubs"
import { cn } from "@/lib/utils"

const RADII = [1000, 3000, 10000]

export default function OffersPage() {
  const [origin, setOrigin] = useState(FULHAM_BROADWAY)
  const [located, setLocated] = useState<"idle" | "busy" | "yes" | "no">("idle")
  const [radius, setRadius] = useState(3000)
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const router = useRouter()
  const openPub = useCallback((id: string) => router.push(pubHref({ slug: id })), [router])

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return setLocated("no")
    setLocated("busy")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocated("yes")
      },
      () => setLocated("no"),
      { timeout: 8000, maximumAge: 60000 },
    )
  }, [])
  useEffect(() => {
    locate()
  }, [locate])
  useEffect(() => {
    setOffers(null)
    offersNear(origin.lat, origin.lng, radius).then(setOffers).catch(() => setOffers([]))
  }, [origin, radius])

  const center = useMemo<[number, number]>(() => [origin.lat, origin.lng], [origin])
  const dots = useMemo<[number, number, string, string][]>(
    () => (offers ?? []).filter((o) => o.lat != null).map((o) => [o.lat!, o.lng!, o.pubId, o.pubName]),
    [offers],
  )

  return (
    <main className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-10 md:px-8 md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">Offers near me</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.95] md:text-6xl">Deals from pubs nearby.</h1>
          <p className="max-w-2xl text-muted-foreground text-pretty">
            Food deals, quiz nights and fair-priced pints, posted by the pubs themselves and running today. Offers never affect the
            rankings, and we don&apos;t allow ones that push you to drink more.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={locate}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-stout px-4 text-sm font-semibold text-cream hover:bg-pub"
            >
              <LocateFixed className="size-4" aria-hidden="true" />
              {located === "busy" ? "Finding you…" : located === "yes" ? "Near you" : "Use my location"}
            </button>
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={radius === r}
                onClick={() => setRadius(r)}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold", radius === r ? "border-stout bg-stout text-cream" : "border-stout/20 bg-paper")}
              >
                {r / 1000} km
              </button>
            ))}
          </div>
          {located === "no" && <p className="text-sm text-muted-foreground">Location unavailable, showing offers around Fulham Broadway.</p>}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 md:px-8 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {offers === null ? (
            Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-cream" />)
          ) : offers.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-stout/25 p-6">
              <p className="font-display text-2xl font-semibold">No offers nearby today</p>
              <p className="text-sm text-muted-foreground">Try a wider radius, or check back later. Run a pub? <Link href="/owners/" className="font-semibold text-pub hover:underline">Post an offer</Link>.</p>
            </div>
          ) : (
            offers.map((o) => (
              <article key={o.id} className="flex gap-4 rounded-2xl border border-border bg-paper p-4">
                <Tag className="mt-1 size-5 shrink-0 text-pub" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pub">
                    {OFFER_KINDS[o.kind]} offer · {offerDays(o.days)}
                  </span>
                  <h2 className="font-display text-2xl font-semibold leading-tight">{o.title}</h2>
                  {o.details && <p className="text-sm">{o.details}</p>}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <Link href={pubHref({ slug: o.pubId })} className="font-semibold hover:underline">
                      {o.pubName}
                    </Link>
                    {o.area && <span className="text-muted-foreground">{o.area}</span>}
                    {o.metres != null && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pub hover:underline"
                      >
                        <Footprints className="size-4" aria-hidden="true" />
                        {Math.max(1, Math.round((o.metres * 1.2) / 80))} min walk
                      </a>
                    )}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="h-[360px] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-24 lg:h-[560px] lg:w-[520px]">
          <MapLoader pubs={[]} unrated={dots} center={center} zoom={radius > 3000 ? 12 : 14} userLocation={located === "yes" ? origin : null} focus={null} onSelect={openPub} />
        </div>
      </section>
    </main>
  )
}
