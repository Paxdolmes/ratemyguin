"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, Map as MapIcon, X } from "lucide-react"
import { MapLoader } from "@/components/map/map-loader"
import { NotYetRatedChip } from "@/components/band-chip"
import { FilterChips, type Filters, type SortKey } from "./filter-chips"
import { LeagueTable, type LeagueRow } from "./league-table"
import { LocationPicker } from "./location-picker"
import { FeaturedStrip } from "./featured-strip"
import { useMediaQuery } from "@/hooks/use-media-query"
import { PubBadge } from "@/components/pub/pub-badge"
import { usePubs } from "@/lib/live"
import { FULHAM_BROADWAY, LOCATIONS, PLACES, distanceKm, excellenceIndex, formatDistance, isNewOpening, isRated, pubHref, type LocationKey } from "@/lib/pubs"

export function RankingsView() {
  const [location, setLocation] = useState<LocationKey>("london")
  const [sort, setSort] = useState<SortKey>("best")
  const [ninetyPlus, setNinetyPlus] = useState(false)
  const [filters, setFilters] = useState<Filters>({ features: [], newOnly: false })
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [origin, setOrigin] = useState(FULHAM_BROADWAY)
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  const handleLocation = (key: LocationKey) => {
    setLocation(key)
    setLocationNote(null)
    if (key !== "near") return
    if (!("geolocation" in navigator)) {
      setLocationNote("Location unavailable, showing pubs around Fulham Broadway.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        setOrigin(FULHAM_BROADWAY)
        setLocationNote("Location unavailable, showing pubs around Fulham Broadway.")
      },
      { timeout: 8000, maximumAge: 60000 },
    )
  }

  const sortOrigin = useMemo(() => {
    if (location === "near") return origin
    const c = PLACES[location].center
    return { lat: c[0], lng: c[1] }
  }, [location, origin])

  const { pubs: loaded, loading, error } = usePubs(location, origin)
  const inArea = useMemo(
    () =>
      loaded.filter(
        (p) => filters.features.every((f) => p.features?.includes(f)) && (!filters.newOnly || isNewOpening(p)),
      ),
    [loaded, filters],
  )
  const cityMedian = useMemo(() => {
    const xs = loaded.map((p) => p.price).filter((x): x is number => x != null).sort((a, b) => a - b)
    return xs.length ? xs[Math.floor(xs.length / 2)] : null
  }, [loaded])
  const [unratedShown, setUnratedShown] = useState(25)

  const rows: LeagueRow[] = useMemo(() => {
    const rated = inArea
      .filter(isRated)
      .map((pub) => ({ pub, score: excellenceIndex(pub) as number }))
      .sort((a, b) => b.score - a.score || b.pub.ratingsLastYear - a.pub.ratingsLastYear)
      .map((r, i) => ({ ...r, position: i + 1, distance: distanceKm(sortOrigin, r.pub) }))

    const filtered = ninetyPlus ? rated.filter((r) => r.score >= 90) : rated
    const sorted = [...filtered]
    if (sort === "nearest") sorted.sort((a, b) => a.distance - b.distance)
    // Best near me: quality first, then a short walk, then a fair price.
    const balance = (r: (typeof sorted)[number]) =>
      r.score - 6 * r.distance - (r.pub.price != null && cityMedian != null ? 3 * (r.pub.price - cityMedian) : 0)
    if (sort === "balanced") sorted.sort((a, b) => balance(b) - balance(a))
    if (sort === "cheapest") sorted.sort((a, b) => (a.pub.price ?? 99) - (b.pub.price ?? 99))
    if (sort === "atmosphere") sorted.sort((a, b) => b.pub.components.atmosphere - a.pub.components.atmosphere)
    return sorted
  }, [inArea, ninetyPlus, sort, sortOrigin, cityMedian])

  const unratedNamed = useMemo(
    () => inArea.filter((p) => !isRated(p)).sort((a, b) => b.ratingsLastYear - a.ratingsLastYear || Number(isNewOpening(b)) - Number(isNewOpening(a)) || distanceKm(sortOrigin, a) - distanceKm(sortOrigin, b)),
    [inArea, sortOrigin],
  )
  const ratedCount = inArea.length - unratedNamed.length
  const allPoints = useMemo<[number, number, string, string][]>(() => unratedNamed.map((p) => [p.lat, p.lng, p.slug, p.name]), [unratedNamed])
  const showDistance = location === "near" || sort === "nearest" || sort === "balanced"

  const mapCenter = useMemo<[number, number]>(
    () => (location === "near" ? [origin.lat, origin.lng] : PLACES[location].center),
    [location, origin],
  )

  const map = (
    <MapLoader
      pubs={inArea}
      unrated={allPoints}
      center={mapCenter}
      zoom={PLACES[location].zoom}
      activeSlug={activeSlug}
      onSelect={setActiveSlug}
      userLocation={location === "near" ? origin : null}
    />
  )


  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:flex-row lg:gap-8 lg:pt-8">
      <section aria-labelledby="rankings-heading" className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">
            The league table · updated weekly
          </p>
          <h1
            id="rankings-heading"
            className="font-display text-4xl font-semibold leading-[0.95] text-balance md:text-6xl"
          >
            {PLACES[location].hood ? `The best pint in ${PLACES[location].label}` : location === "london" ? "The best pint in London" : "The best pint near you"}
          </h1>
          <LocationPicker value={location} onChange={handleLocation} locating={locating} />
          {locationNote && (
            <p role="status" className="text-sm text-muted-foreground">
              {locationNote}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <FilterChips
            sort={sort}
            onSortChange={setSort}
            ninetyPlus={ninetyPlus}
            onNinetyPlusChange={setNinetyPlus}
            filters={filters}
            onFiltersChange={setFilters}
          />
          <p className="shrink-0 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> of {ratedCount} rated
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm">
            Couldn&apos;t load pubs: {error}
          </p>
        ) : loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-cream" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <LeagueTable rows={rows} showDistance={showDistance} activeSlug={activeSlug} onActivate={setActiveSlug} />
        ) : ratedCount === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-stout p-6 text-cream md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub-light">Season one is open</p>
            <p className="font-display text-3xl font-semibold leading-tight text-balance">
              No pints rated here yet. The top spot is up for grabs.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-cream/75">
              Every pub needs three ratings in the last year before it gets an Excellence Index and a place in the table. Rate the
              Guinness at your local and put it on the map.
            </p>
            <Link href="/rate/" className="inline-flex h-11 items-center gap-2 rounded-full bg-pub-light px-5 font-semibold text-stout hover:bg-cream">
              Rate a pint
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-stout/25 p-6">
            <p className="font-display text-lg font-semibold">No pubs match those filters</p>
            <p className="text-sm text-muted-foreground">Try removing 90+ only or widen the area.</p>
          </div>
        )}

        <FeaturedStrip
          city={location === "near" || location === "uk" ? undefined : (PLACES[location].city ?? (PLACES[location].hood ? "London" : undefined))}
          origin={location === "near" ? origin : PLACES[location].hood ? sortOrigin : null}
        />

        {!isDesktop && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowMap((s) => !s)}
              aria-expanded={showMap}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-stout bg-paper font-semibold text-stout"
            >
              {showMap ? <X className="size-4" aria-hidden="true" /> : <MapIcon className="size-4" aria-hidden="true" />}
              {showMap ? "Hide map" : "Show map"}
            </button>
            {showMap && (
              <div className="h-[420px] overflow-hidden rounded-2xl border border-border">{map}</div>
            )}
          </div>
        )}

        <section aria-labelledby="unrated-heading" className="mt-4 flex flex-col gap-4 rounded-2xl bg-cream p-5 md:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="unrated-heading" className="font-display text-2xl font-bold">
              Waiting for their first three pints
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              A pub needs at least 3 ratings in the last year before it gets an Excellence Index.{" "}
              <span className="font-semibold text-foreground tabular-nums">{unratedNamed.length.toLocaleString("en-GB")}</span>{" "}
              pubs here are still unrated. They show as small dots on the map.
            </p>
          </div>
          {unratedNamed.length > 0 && (
            <ul className="flex flex-col">
              {unratedNamed.slice(0, unratedShown).map((pub) => (
                <li key={pub.slug} className="flex items-center gap-3 border-t border-stout/10 py-3">
                  <PubBadge pub={pub} size={40} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={pubHref(pub)} className="truncate font-display font-semibold hover:underline">
                      {pub.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {pub.area}
                      {showDistance && pub.distanceKm != null ? ` · ${formatDistance(distanceKm(sortOrigin, pub))}` : ""} · {pub.ratingsLastYear} of 3 ratings
                    </span>
                  </div>
                  {isNewOpening(pub) ? (
                    <span className="hidden rounded-full bg-pub px-2.5 py-0.5 text-xs font-semibold text-paper sm:inline-flex">New opening</span>
                  ) : (
                    <NotYetRatedChip className="hidden sm:inline-flex" />
                  )}
                  <Link
                    href={`/rate/?pub=${pub.slug}`}
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-stout px-3.5 text-sm font-semibold text-cream hover:bg-pub"
                  >
                    Rate
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {unratedNamed.length > unratedShown && (
            <button
              type="button"
              onClick={() => setUnratedShown((n) => n + 50)}
              className="inline-flex h-10 w-fit items-center rounded-full border border-stout px-4 text-sm font-semibold"
            >
              Show more pubs
            </button>
          )}
        </section>
      </section>

      {isDesktop && (
        <aside aria-label="Map of ranked pubs" className="w-[480px] shrink-0 xl:w-[560px]">
          <div className="sticky top-24 flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-border">
            <div className="relative flex-1">{map}</div>
            <MapLegend />
          </div>
        </aside>
      )}
    </main>
  )
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-paper px-4 py-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm bg-stout" aria-hidden="true" /> 95+ Exceptional
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm bg-pub" aria-hidden="true" /> 90–94 Gold Standard
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border-[1.5px] border-pub bg-paper" aria-hidden="true" /> 80–89 Highly Rec.
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-stout/30" aria-hidden="true" /> Not yet rated
      </span>
    </div>
  )
}
