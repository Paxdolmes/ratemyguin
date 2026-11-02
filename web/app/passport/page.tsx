"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BadgeCheck, Building2, Camera, Compass, Flag, MapPinned, MessageSquareText, Plus, Trophy } from "lucide-react"
import { myDiary, myProfile, myStamps, useSession, type DiaryEntry, type Stamp as StampRow } from "@/lib/live"
import { Diary } from "@/components/passport/diary"
import { Friends } from "@/components/passport/friends"
import { Lists } from "@/components/passport/lists"
import { cn } from "@/lib/utils"

const PUB_BADGES = [10, 25, 50, 100]
const TABS = ["Stamps", "Badges", "Diary", "Lists", "Friends"] as const
type Tab = (typeof TABS)[number]

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
  const [diary, setDiary] = useState<DiaryEntry[]>([])
  const [tab, setTab] = useState<Tab>("Stamps")
  useEffect(() => {
    const h = window.location.hash.slice(1)
    const t = TABS.find((x) => x.toLowerCase() === h)
    if (t) setTab(t)
  }, [])
  useEffect(() => {
    if (!session) return
    myStamps(session.user.id).then(setStamps).catch(() => {})
    myDiary(session.user.id).then(setDiary).catch(() => {})
    myProfile(session.user.id).then((p) => setName(p?.display_name ?? null)).catch(() => {})
  }, [session])

  if (ready && !session)
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">Guin Passport</p>
        <h1 className="font-display text-5xl font-semibold leading-[0.95]">A stamp for every pub you rate.</h1>
        <p className="text-muted-foreground">Collect pubs and neighbourhoods, keep a pint diary, save lists and follow friends. Sign in to start yours.</p>
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
  const HOODS = new Set(stamps.map((s) => s.hood).filter(Boolean)).size
  const VERIFIED = stamps.filter((s) => s.verified).length
  const PHOTOS = diary.filter((d) => d.photoUrl).length
  const HELPFUL = diary.filter((d) => (d.note?.length ?? 0) >= 20 || d.tags.length >= 2).length
  const DUBLIN = stamps.some((s) => s.city === "Dublin") ? 1 : 0

  return (
    <main className="flex flex-col">
      <section className="bg-cream text-stout">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-14">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">Guin Passport{name ? ` · ${name}` : ""}</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.92] md:text-7xl">
              {TOTAL_PUBS} pubs stamped.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-stout/70 text-pretty">
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
                <dt className="text-xs uppercase tracking-[0.14em] text-pub">{s.label}</dt>
                <dd className="font-display text-5xl font-semibold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <nav aria-label="Passport" className="sticky top-16 z-10 border-b border-border bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] gap-1 overflow-x-auto px-4 md:px-8">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                history.replaceState(null, "", `#${t.toLowerCase()}`)
              }}
              aria-current={tab === t ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors",
                tab === t ? "border-pub text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {tab === "Badges" && (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
        <p className="max-w-2xl text-sm text-muted-foreground">Badges reward variety and helpful reviews, never how much you drink.</p>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Badge icon={BadgeCheck} title="First verified pint" current={VERIFIED} target={1} />
          {PUB_BADGES.map((t) => (
            <Badge key={t} icon={Trophy} title={`${t} different pubs`} current={TOTAL_PUBS} target={t} />
          ))}
          <Badge icon={MapPinned} title="5 neighbourhoods" current={HOODS} target={5} />
          <Badge icon={Compass} title="12 neighbourhoods" current={HOODS} target={12} />
          <Badge icon={Camera} title="5 pint photos" current={PHOTOS} target={5} />
          <Badge icon={MessageSquareText} title="10 helpful reviews" current={HELPFUL} target={10} />
          <Badge icon={Building2} title="3 cities" current={CITIES_VISITED} target={3} />
          <Badge icon={Flag} title="The Dublin pilgrimage" current={DUBLIN} target={1} />
        </ul>
      </section>
      )}

      {tab === "Stamps" && (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
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
      )}

      {session && tab !== "Stamps" && tab !== "Badges" && (
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 md:px-8 md:py-14">
          {tab === "Diary" && <Diary userId={session.user.id} />}
          {tab === "Lists" && <Lists userId={session.user.id} />}
          {tab === "Friends" && <Friends userId={session.user.id} />}
        </section>
      )}
    </main>
  )
}
