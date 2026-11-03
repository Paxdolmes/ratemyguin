"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronRight, Tag } from "lucide-react"
import { PubBadge } from "@/components/pub/pub-badge"
import { featuredPubs, type FeaturedPub } from "@/lib/live"
import { distanceKm, pubHref } from "@/lib/pubs"

/** Paid placement. Always labelled Sponsored and kept apart from the league table. */
export function FeaturedStrip({ city, origin }: { city?: string; origin?: { lat: number; lng: number } | null }) {
  const [pubs, setPubs] = useState<FeaturedPub[]>([])
  useEffect(() => {
    featuredPubs(city).then(setPubs).catch(() => setPubs([]))
  }, [city])
  const shown = origin ? [...pubs].sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b)).slice(0, 6) : pubs.slice(0, 6)

  if (shown.length === 0)
    return (
      <Link href="/offers/" className="flex items-center gap-3 rounded-2xl border border-border bg-paper p-4 hover:bg-cream">
        <Tag className="size-5 shrink-0 text-pub" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-lg font-semibold">Offers near me</span>
          <span className="text-sm text-muted-foreground">Food deals, quiz nights and more from pubs nearby.</span>
        </span>
        <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
      </Link>
    )

  return (
    <section aria-labelledby="featured-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="featured-heading" className="flex items-center gap-2 font-display text-2xl font-semibold">
          Our featured pubs
          <span className="rounded-full border border-stout/20 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sponsored
          </span>
        </h2>
        <Link href="/offers/" className="inline-flex items-center gap-1 text-sm font-semibold text-pub hover:underline">
          <Tag className="size-4" aria-hidden="true" /> Offers near me
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {shown.map((p) => (
              <li key={p.id} className="w-64 shrink-0 snap-start md:w-auto">
                <Link href={pubHref({ slug: p.id })} className="flex items-center gap-3 rounded-2xl border border-border bg-paper p-3 hover:bg-cream">
                  <PubBadge pub={p} size={48} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-lg font-semibold">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.area ?? p.city}
                      {origin ? ` · ${distanceKm(origin, p).toFixed(1)} km` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
      <p className="text-xs text-muted-foreground">Featured pubs pay to appear here. It never affects their score or their place in the table.</p>
    </section>
  )
}
