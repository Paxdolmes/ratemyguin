"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { BadgeCheck, ChevronLeft, MapPin, Plus, ShieldAlert } from "lucide-react"
import { AwardChip, BandChip } from "@/components/band-chip"
import { BreakdownBars } from "@/components/pub/breakdown-bars"
import { PubBadge } from "@/components/pub/pub-badge"
import { RatingCard } from "@/components/pub/rating-card"
import { ScoreDial } from "@/components/pub/score-dial"
import { Sparkline } from "@/components/pub/sparkline"
import { Trend } from "@/components/trend"
import { cityMedianPrice, cityPosition, loadPub, loadRatings } from "@/lib/live"
import { MIN_RATINGS, bandFor, currencyFor, excellenceIndex, formatPrice, isRated, monthlyTrend, timeAgo, TAGS, type PintRating, type Pub, type TagKey } from "@/lib/pubs"

export default function PubPageRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <PubPage />
    </Suspense>
  )
}

function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-8 md:px-8" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-cream" />
      <div className="h-72 animate-pulse rounded-3xl bg-cream" />
    </main>
  )
}

function PubPage() {
  const id = useSearchParams().get("id") ?? ""
  const [pub, setPub] = useState<Pub | null | undefined>(undefined)
  const [ratings, setRatings] = useState<PintRating[]>([])
  const [position, setPosition] = useState(0)
  const [median, setMedian] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    loadPub(id)
      .then(async (p) => {
        if (!live) return
        setPub(p)
        if (!p) return
        document.title = `${p.name} · ratemyGuin`
        const [r, pos, med] = await Promise.all([loadRatings(p.slug), cityPosition(p), cityMedianPrice(p.city)])
        if (!live) return
        setRatings(r)
        setPosition(pos)
        setMedian(med)
      })
      .catch(() => live && setPub(null))
    return () => {
      live = false
    }
  }, [id])

  if (pub === undefined) return <Loading />
  if (pub === null)
    return (
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-16 md:px-8">
        <h1 className="font-display text-4xl font-semibold">Pub not found</h1>
        <Link href="/" className="font-semibold text-pub hover:underline">
          Back to the rankings
        </Link>
      </main>
    )

  const score = excellenceIndex(pub)
  const rated = isRated(pub)
  const band = bandFor(score)
  const diff = pub.price != null && median != null ? pub.price - median : null
  const cur = currencyFor(pub.city)
  const trend = monthlyTrend(ratings)
  const tagCounts = Object.entries(
    ratings.flatMap((r) => r.tags).reduce<Record<string, number>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) as [TagKey, number][]

  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 md:px-8 md:pt-8">
        <Link href="/" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {pub.city} rankings
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex flex-1 flex-col justify-between gap-6 rounded-3xl bg-cream p-6 md:p-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {rated && position > 0 && (
                  <span className="rounded-full bg-stout px-2.5 py-0.5 text-xs font-semibold text-cream">
                    No. {position} in {pub.city}
                  </span>
                )}
                {pub.award && <AwardChip label={pub.award} />}
              </div>
              <div className="flex items-center gap-4">
                <PubBadge pub={pub} size={72} className="rounded-2xl" />
                <h1 className="font-display text-5xl font-semibold leading-[0.92] text-balance md:text-7xl">
                  {pub.name}
                </h1>
              </div>
              <p className="flex items-start gap-1.5 text-base text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {pub.address}
                  {pub.area !== pub.city ? `, ${pub.area}` : ""}
                </span>
              </p>
              {(pub.website || pub.brand) && (
                <p className="flex flex-wrap items-center gap-3 text-sm">
                  {pub.brand && <span className="rounded-full bg-paper px-2.5 py-0.5 font-medium">{pub.brand}</span>}
                  {pub.website && (
                    <a href={pub.website.startsWith("http") ? pub.website : `https://${pub.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-pub hover:underline">
                      Pub website
                    </a>
                  )}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-3 gap-4 border-t border-stout/15 pt-6">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Pints rated (12 mo)</dt>
                <dd className="font-display text-2xl font-bold tabular-nums md:text-3xl">{pub.ratingsLastYear}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Typical price</dt>
                <dd className="flex flex-col">
                  <span className="font-display text-2xl font-bold tabular-nums md:text-3xl">{formatPrice(pub)}</span>
                  {pub.priceUpdatedAt && <span className="text-xs text-muted-foreground">Reported {timeAgo(pub.priceUpdatedAt)}</span>}
                  {diff != null && (
                    <span className="text-xs text-muted-foreground">
                      {Math.abs(diff) < 0.05 ? "At city median" : `${cur}${Math.abs(diff).toFixed(2)} ${diff < 0 ? "under" : "over"} median`}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Verified</dt>
                <dd className="flex items-center gap-1 font-display text-2xl font-bold tabular-nums md:text-3xl">
                  {rated ? `${Math.round(pub.verifiedShare * 100)}%` : "—"}
                  {rated && <BadgeCheck className="size-5 text-pub" aria-hidden="true" />}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-stout p-6 text-cream md:p-8 lg:w-[400px]">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cream/60">Excellence Index</span>
              {rated && <Trend delta={pub.trend} className="text-pub-light" />}
            </div>
            <ScoreDial score={score} />
            {(pub.pintScore != null || pub.pubScore != null) && (
              <dl className="grid w-full grid-cols-2 divide-x divide-cream/15 rounded-2xl border border-cream/15">
                <div className="flex flex-col items-center gap-0.5 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/60">Pint</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums text-pub-light">{pub.pintScore ?? "–"}</dd>
                  <span className="text-[11px] text-cream/50">the glass alone</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/60">Pub</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums">{pub.pubScore ?? "–"}</dd>
                  <span className="text-[11px] text-cream/50">room and service</span>
                </div>
              </dl>
            )}
            {pub.underReview && (
              <p className="flex items-center gap-2 rounded-xl bg-cream/10 px-3 py-2 text-xs text-cream/80">
                <ShieldAlert className="size-4 shrink-0 text-pub-light" aria-hidden="true" />
                A sudden burst of ratings is being checked. The score may change.
              </p>
            )}
            {rated ? (
              <BandChip band={band} size="md" onDark />
            ) : (
              <p className="text-center text-sm leading-relaxed text-cream/70 text-pretty">
                {pub.ratingsLastYear} of {MIN_RATINGS} ratings needed in the last year.{" "}
                {MIN_RATINGS - pub.ratingsLastYear === 1
                  ? "One more pint and it's on the table."
                  : `${MIN_RATINGS - pub.ratingsLastYear} more pints and it's on the table.`}
              </p>
            )}
            <Link
              href={`/rate/?pub=${pub.slug}`}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pub-light font-semibold text-stout transition-colors hover:bg-cream"
            >
              <Plus className="size-4" aria-hidden="true" />
              Rate a pint here
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-10 md:px-8 md:py-14 lg:flex-row lg:gap-16">
        <div className="flex flex-col gap-10 lg:w-[420px] lg:shrink-0">
          {tagCounts.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-bold">What drinkers say</h2>
              <ul className="flex flex-wrap gap-2">
                {tagCounts.map(([t, n]) => (
                  <li
                    key={t}
                    className={
                      TAGS[t]?.good
                        ? "rounded-full bg-pub/10 px-3 py-1 text-sm font-medium text-pub"
                        : "rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive"
                    }
                  >
                    {TAGS[t]?.label ?? t} <span className="tabular-nums opacity-70">× {n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rated ? (
            <>
              <div className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-bold">Score breakdown</h2>
                  <Link href="/scoring/" className="text-sm font-medium text-pub hover:underline">
                    How it works
                  </Link>
                </div>
                <BreakdownBars components={pub.components} />
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="font-display text-2xl font-bold">Consistency</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Monthly Excellence Index. A flatter line means the same pint every visit.
                </p>
                {trend.length >= 2 ? <Sparkline data={trend} /> : <p className="text-sm text-muted-foreground">The line appears after two months of ratings.</p>}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-stout/25 p-6">
              <h2 className="font-display text-2xl font-bold">No breakdown yet</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We only publish an Excellence Index once a pub has {MIN_RATINGS} or more ratings in the last 12 months, so
                one bad night can&apos;t sink a pub and one good one can&apos;t crown it.
              </p>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-stout pb-3">
            <h2 className="font-display text-2xl font-bold">Recent pints</h2>
            <span className="text-sm text-muted-foreground">
              {ratings.length} {ratings.length === 1 ? "pint" : "pints"} in the last year
            </span>
          </div>
          {ratings.length > 0 ? (
            <div className="flex flex-col">
              {ratings.map((r, i) => (
                <RatingCard key={r.id} rating={r} index={i} city={pub.city} ownerName={pub.ownerName} pubName={pub.name} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody has rated a pint here yet. Be the first.</p>
          )}
        </div>
      </section>
    </main>
  )
}
