"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { PubBadge } from "@/components/pub/pub-badge"
import { openings, recentlyOpenedPubs, type Opening } from "@/lib/live"
import { pubHref, type Pub } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export default function NewOpeningsPage() {
  const [list, setList] = useState<Opening[] | null>(null)
  const [osm, setOsm] = useState<Pub[]>([])
  const [tab, setTab] = useState<"open" | "coming_soon">("open")
  useEffect(() => {
    openings().then(setList).catch(() => setList([]))
    recentlyOpenedPubs().then(setOsm).catch(() => {})
  }, [])
  const named = new Set((list ?? []).map((o) => o.pubId).filter(Boolean))
  const extra = osm.filter((p) => !named.has(p.slug))
  const shown = (list ?? []).filter((o) => o.status === tab)
  const soon = (list ?? []).filter((o) => o.status === "coming_soon").length

  return (
    <main className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-10 md:px-8 md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">New openings</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.95] md:text-6xl">New pubs, first pints.</h1>
          <p className="max-w-2xl text-muted-foreground text-pretty">
            London&apos;s newest pubs and the ones about to open. Be among the first to rate the Guinness and put them on the table.
          </p>
          <div className="flex gap-2 pt-2" role="tablist">
            {(
              [
                ["open", "Just opened"],
                ["coming_soon", `Coming soon${soon ? ` (${soon})` : ""}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold", tab === k ? "border-stout bg-stout text-cream" : "border-stout/20 bg-paper")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8">
        {list === null ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-cream" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      o.status === "open" ? "bg-pub text-paper" : "border border-pub text-pub",
                    )}
                  >
                    {o.label}
                  </span>
                  {o.area && <span className="text-xs text-muted-foreground">{o.area}</span>}
                </div>
                <h2 className="font-display text-3xl font-semibold leading-tight">{o.name}</h2>
                {o.blurb && <p className="text-sm leading-relaxed">{o.blurb}</p>}
                {o.address && <p className="text-xs text-muted-foreground">{o.address}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  {o.pubId ? (
                    <Link href={pubHref({ slug: o.pubId })} className="inline-flex h-10 items-center rounded-full bg-stout px-4 text-sm font-semibold text-cream hover:bg-pub">
                      {o.status === "open" ? "Rate the first pint" : "See the pub"}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">{o.status === "open" ? "Not on our map yet" : "We'll add it when it opens"}</span>
                  )}
                  <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-pub">
                    Via {o.sourceName} <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "open" && extra.length > 0 && (
          <section aria-labelledby="osm-new" className="flex flex-col gap-3">
            <h2 id="osm-new" className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Sparkles className="size-5 text-pub" aria-hidden="true" /> Also new on the map
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {extra.map((p) => (
                <li key={p.slug}>
                  <Link href={pubHref(p)} className="flex items-center gap-3 rounded-2xl border border-border bg-paper p-3 hover:bg-cream">
                    <PubBadge pub={p} size={44} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-lg font-semibold">{p.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {p.area}
                        {p.openedOn ? ` · ${new Date(p.openedOn).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-xs text-muted-foreground">
          Gathered from Time Out, Londonist, Hot Dinners and OpenStreetMap. Opening a pub? <Link href="/owners/" className="font-semibold text-pub hover:underline">Tell us</Link>.
        </p>
      </section>
    </main>
  )
}
