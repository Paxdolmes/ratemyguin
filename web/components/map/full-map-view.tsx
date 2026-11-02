"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { MapLoader } from "./map-loader"
import { BandChip } from "@/components/band-chip"
import { PubBadge } from "@/components/pub/pub-badge"
import { usePubs } from "@/lib/live"
import { FULHAM_BROADWAY, LOCATIONS, bandFor, excellenceIndex, formatPrice, isRated, pubHref } from "@/lib/pubs"

export function FullMapView() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const { pubs, loading } = usePubs("london", FULHAM_BROADWAY)
  const RATED = useMemo(() => pubs.filter(isRated), [pubs])
  const unrated = useMemo<[number, number, string, string][]>(() => pubs.filter((p) => !isRated(p)).map((p) => [p.lat, p.lng, p.slug, p.name]), [pubs])
  const active = activeSlug ? pubs.find((p) => p.slug === activeSlug) : null
  const score = active ? excellenceIndex(active) : null

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      <MapLoader
        pubs={RATED}
        unrated={unrated}
        center={LOCATIONS.london.center}
        zoom={LOCATIONS.london.zoom}
        activeSlug={activeSlug}
        onSelect={setActiveSlug}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex p-4 md:p-6">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl bg-paper/95 px-4 py-3 shadow-sm ring-1 ring-border backdrop-blur">
          <h1 className="font-display text-xl font-extrabold tracking-tight">The pint map</h1>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading pubs…" : `${RATED.length} rated pubs · ${unrated.length.toLocaleString("en-GB")} in London waiting for a score`}
          </p>
        </div>
      </div>

      {active && (
        <div className="absolute inset-x-0 bottom-0 z-[500] flex justify-center p-4 md:justify-start md:p-6">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-stout p-5 text-cream shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <PubBadge pub={active} size={48} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-xs text-cream/60">{active.area}</span>
                <h2 className="font-display text-2xl font-extrabold leading-tight">{active.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlug(null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {score != null ? (
              <div className="flex items-center gap-3">
                <span className="font-display text-4xl font-extrabold tabular-nums">{score}</span>
                <BandChip band={bandFor(score)} onDark />
                <span className="ml-auto text-sm text-cream/70 tabular-nums">{formatPrice(active)}</span>
              </div>
            ) : (
              <p className="text-sm text-cream/75">Not yet rated. {active.ratingsLastYear} of 3 pints so far.</p>
            )}
            {score == null && (
              <Link
                href={`/rate/?pub=${active.slug}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cream font-semibold text-stout hover:bg-pub-light"
              >
                Rate a pint here
              </Link>
            )}
            <Link
              href={pubHref(active)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-pub-light font-semibold text-stout hover:bg-cream"
            >
              View pub <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
