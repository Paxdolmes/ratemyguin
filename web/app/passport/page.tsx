"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, Flag, Plus, Trophy } from "lucide-react"
import { myProfile, myStamps, useSession, type Stamp as StampRow } from "@/lib/live"
import { cn } from "@/lib/utils"

const PUB_BADGES = [10, 25, 50, 100]

function Stamp({ name, area, date, score, index }: { name: string; area: string; date: string; score: number | null; index: number }) {
  const tilt = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "rotate-1", "-rotate-2"][index % 6]
  const tone = index % 3 === 0 ? "border-pub text-pub" : index % 3 === 1 ? "border-stout text-stout" : "border-stout/60 text-stout/80"
  return (
    <li className="flex items-center justify-center">
      <div
        className={cn(
          "flex aspect-square w-full max-w-44 flex-col items-center justify-center gap-1 rounded-full border-[3px] border-double p-3 text-center",
          tilt,
          tone,
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{area}</span>
        <span className="font-display text-sm font-semibold leading-tight text-balance md:text-base">{name}</span>
        {score !== null && <span className="font-display text-lg font-bold tabular-nums leading-none">{score}</span>}
        <span className="text-[10px] font-medium tabular-nums opacity-70">{date}</span>
      </div>
    </li>
  )
}

function Badge({
  icon: Icon,
  title,
  current,
  target,
}: {
  icon: typeof Trophy
  title: string
  current: number
  target: number
}) {
  const done = current >= target
  const pct = Math.min(100, (current / target) * 100)
  return (
    <li className={cn("flex flex-col gap-4 rounded-2xl p-5", done ? "bg-stout text-cream" : "border border-border bg-paper")}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            done ? "bg-pub-light text-stout" : "bg-cream text-muted-foreground",
          )}
          aria-hidden="true"
        >
          <Icon className="size-6" />
        </span>
        <span className={cn("text-xs font-semibold", done ? "text-pub-light" : "text-muted-foreground")}>
          {done ? "Earned" : `${target - current} to go`}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg font-bold leading-tight">{title}</span>
        <span className={cn("text-sm tabular-nums", done ? "text-cream/70" : "text-muted-foreground")}>
          {Math.min(current, target)} of {target}
        </span>
      </div>
      <div
        className={cn("h-2 overflow-hidden rounded-full", done ? "bg-cream/15" : "bg-cream")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(current, target)}
        aria-label={title}
      >
        <div className={cn("h-full rounded-full", done ? "bg-pub-light" : "bg-pub")} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

export default function PassportPage() {
  const { session, ready } = useSession()
  const [stamps, setStamps] = useState<StampRow[]>([])
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    if (!session) return
    myStamps(session.user.id).then(setStamps).catch(() => {})
    myProfile(session.user.id).then((p) => setName(p?.display_name ?? null)).catch(() => {})
  }, [session])

  if (ready && !session)
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">Guin Passport</p>
        <h1 className="font-display text-5xl font-semibold leading-[0.95]">A stamp for every pub you rate.</h1>
        <p className="text-muted-foreground">Collect pubs, cities and countries, and earn badges along the way. Sign in to start yours.</p>
        <Link href="/sign-in/?next=%2Fpassport%2F" className="inline-flex h-12 w-fit items-center rounded-full bg-stout px-6 font-semibold text-cream hover:bg-pub">
          Sign in or sign up
        </Link>
      </main>
    )

  const TOTAL_PUBS = stamps.length
  const CITIES_VISITED = new Set(stamps.map((s) => s.city)).size
  const COUNTRIES_VISITED = new Set(stamps.map((s) => s.country)).size
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const emptySlots = Math.max(0, 18 - stamps.length)
  const next = PUB_BADGES.find((b) => b > TOTAL_PUBS) ?? 100

  return (
    <main className="flex flex-col">
      <section className="bg-pub text-paper">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-14">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">Guin Passport{name ? ` · ${name}` : ""}</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.92] md:text-7xl">
              {TOTAL_PUBS} pubs stamped.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-paper/80 text-pretty">
              {next - TOTAL_PUBS} more for the {next}-pub badge. Every pub you rate a pint in earns a stamp.
            </p>
          </div>
          <dl className="flex gap-8 md:gap-12">
            {[
              { label: "Pubs", value: TOTAL_PUBS },
              { label: "Cities", value: CITIES_VISITED },
              { label: "Countries", value: COUNTRIES_VISITED },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="text-xs uppercase tracking-[0.14em] text-paper/70">{s.label}</dt>
                <dd className="font-display text-5xl font-semibold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
        <h2 className="font-display text-3xl font-semibold">Badges</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {PUB_BADGES.map((t) => (
            <Badge key={t} icon={Trophy} title={`${t} pubs`} current={TOTAL_PUBS} target={t} />
          ))}
          <Badge icon={Building2} title="5 cities" current={CITIES_VISITED} target={5} />
          <Badge icon={Flag} title="3 countries" current={COUNTRIES_VISITED} target={3} />
        </ul>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 md:px-8">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-stout pb-3">
          <h2 className="font-display text-3xl font-semibold">Stamps</h2>
          <span className="text-sm text-muted-foreground">
            Showing {stamps.length} of {TOTAL_PUBS}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {stamps.map((s, i) => (
            <Stamp key={s.pubId} name={s.name} area={s.city} date={fmt(s.at)} score={s.index} index={i} />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <li key={`empty-${i}`} className="flex items-center justify-center">
              {i === 0 ? (
                <Link
                  href="/rate/"
                  className="flex aspect-square w-full max-w-44 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-pub text-pub hover:bg-pub/5"
                >
                  <Plus className="size-6" aria-hidden="true" />
                  <span className="text-sm font-semibold">Next stamp</span>
                </Link>
              ) : (
                <div className="aspect-square w-full max-w-44 rounded-full border-2 border-dashed border-stout/15" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
