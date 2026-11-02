"use client"

import Link from "next/link"
import { Award, BadgeCheck } from "lucide-react"
import { BandChip } from "@/components/band-chip"
import { Trend } from "@/components/trend"
import { PubBadge } from "@/components/pub/pub-badge"
import { bandFor, formatDistance, formatPrice, pubHref, type Pub } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export type LeagueRow = {
  pub: Pub
  score: number
  position: number
  distance?: number
}

export function LeagueTable({
  rows,
  showDistance,
  activeSlug,
  onActivate,
}: {
  rows: LeagueRow[]
  showDistance: boolean
  activeSlug?: string | null
  onActivate?: (slug: string | null) => void
}) {
  return (
    <div className="flex flex-col">
      <div
        aria-hidden="true"
        className="hidden items-center gap-4 border-b-2 border-stout pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:flex"
      >
        <span className="w-9">Pos</span>
        <span className="w-10" />
        <span className="flex-1">Pub</span>
        <span className="w-32">{showDistance ? "Distance" : "Area"}</span>
        <span className="w-48">Excellence Index</span>
        <span className="w-14 text-right">Pints</span>
        <span className="w-16 text-right">Typical</span>
        <span className="w-10 text-right">Trend</span>
      </div>
      <div aria-hidden="true" className="h-0.5 bg-stout md:hidden" />

      <ol className="flex flex-col" aria-label="Pub league table">
        {rows.map((row) => {
          const { pub, score, position } = row
          const band = bandFor(score)
          const active = activeSlug === pub.slug
          const where = showDistance && row.distance !== undefined ? formatDistance(row.distance) : pub.area
          return (
            <li key={pub.slug} className="border-b border-border">
              <Link
                href={pubHref(pub)}
                onMouseEnter={() => onActivate?.(pub.slug)}
                onMouseLeave={() => onActivate?.(null)}
                onFocus={() => onActivate?.(pub.slug)}
                onBlur={() => onActivate?.(null)}
                className={cn(
                  "group flex items-center gap-3 py-3.5 transition-colors md:gap-4 md:py-4",
                  active ? "bg-cream/70" : "hover:bg-cream/50",
                )}
              >
                <span
                  className={cn(
                    "w-9 shrink-0 text-center font-display text-2xl font-bold tabular-nums leading-none md:text-left",
                    position <= 3 ? "text-stout" : "text-muted-foreground",
                  )}
                >
                  <span className="sr-only">Position </span>
                  {position}
                </span>

                <PubBadge pub={pub} size={40} className="hidden sm:inline-flex" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-display text-lg font-semibold leading-tight group-hover:underline group-hover:decoration-pub group-hover:underline-offset-4">
                      {pub.name}
                    </span>
                  </span>
                  {pub.award && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
                      <Award className="size-3.5 shrink-0 text-brass" aria-hidden="true" />
                      <span className="truncate">
                        <span className="sr-only">RateMyGuin Awards: </span>
                        {pub.award}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground md:hidden">
                    <span className="truncate">{where}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatPrice(pub)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{pub.ratingsLastYear} pints</span>
                  </span>
                </span>

                <span className="hidden w-32 truncate text-sm text-muted-foreground md:block">{where}</span>

                <span className="flex shrink-0 flex-col items-end gap-1 md:w-48 md:flex-row md:items-center md:gap-3">
                  <span className="flex items-baseline gap-1.5 md:min-w-12">
                    <span className="font-display text-2xl font-bold tabular-nums leading-none md:text-[28px]">{score}</span>
                    <Trend delta={pub.trend} className="text-xs md:hidden" />
                  </span>
                  <BandChip band={band} size="xs" className="md:text-xs" />
                </span>

                <span className="hidden w-14 text-right text-sm tabular-nums md:block">
                  <span className="inline-flex items-center gap-1">
                    {pub.ratingsLastYear}
                    {pub.verifiedShare > 0.75 && (
                      <BadgeCheck className="size-3.5 text-pub" aria-label="Mostly verified ratings" />
                    )}
                  </span>
                </span>
                <span className="hidden w-16 text-right text-sm font-medium tabular-nums md:block">{formatPrice(pub)}</span>
                <span className="hidden w-10 justify-end md:flex">
                  <Trend delta={pub.trend} />
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
