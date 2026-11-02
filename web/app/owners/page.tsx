"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BarChart3, Check, ClipboardCheck, MessageSquareReply, Search, Store } from "lucide-react"
import { PubBadge } from "@/components/pub/pub-badge"
import {
  claimPub,
  loadPub,
  loadRatings,
  myClaims,
  myPubs,
  pubInsights,
  replyToRating,
  searchPubs,
  updateVenue,
  useSession,
  venueDetails,
  type Claim,
  type Insights,
  type VenueUpdate,
} from "@/lib/live"
import { ACCREDITATIONS, FEATURES, TAGS, pubHref, type AccreditationKey, type FeatureKey, type PintRating, type Pub, type TagKey } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export default function OwnersRoute() {
  return (
    <Suspense>
      <Owners />
    </Suspense>
  )
}

function Owners() {
  const { session, ready } = useSession()
  const claimId = useSearchParams().get("claim")
  const [pubs, setPubs] = useState<Pub[] | null>(null)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (!session) return
    myPubs()
      .then((ps) => {
        setPubs(ps)
        setActive(ps[0]?.slug ?? null)
      })
      .catch(() => setPubs([]))
  }, [session])

  return (
    <main className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-10 md:px-8 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">ratemyGuin for pubs</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.95] md:text-6xl">Pour a better pint. Prove it.</h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
            Claim your pub to keep its details right, show your cellar care, reply to drinkers and see anonymised trends in
            your pour. It&apos;s free, and nothing here can change your score: only pints can.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-8">
        {ready && !session ? (
          <div className="flex max-w-xl flex-col gap-4 rounded-3xl border border-border p-6">
            <h2 className="font-display text-3xl font-semibold">Sign in to claim your pub</h2>
            <p className="text-muted-foreground">We&apos;ll email you a code, then you can claim your pub in a minute.</p>
            <Link href="/sign-in/?next=%2Fowners%2F" className="inline-flex h-12 w-fit items-center rounded-full bg-stout px-6 font-semibold text-cream hover:bg-pub">
              Sign in or sign up
            </Link>
          </div>
        ) : !session || pubs === null ? (
          <div className="h-40 animate-pulse rounded-3xl bg-cream" />
        ) : (
          <>
            {pubs.length > 0 && (
              <>
                {pubs.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {pubs.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => setActive(p.slug)}
                        className={cn(
                          "rounded-full border px-4 py-2 font-display font-semibold",
                          active === p.slug ? "border-stout bg-stout text-cream" : "border-border bg-paper",
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                {active && <Dashboard key={active} pub={pubs.find((p) => p.slug === active)!} userId={session.user.id} />}
              </>
            )}
            <ClaimPanel userId={session.user.id} initial={claimId} hasPubs={pubs.length > 0} />
          </>
        )}
      </section>
    </main>
  )
}

function ClaimPanel({ userId, initial, hasPubs }: { userId: string; initial: string | null; hasPubs: boolean }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [text, setText] = useState("")
  const [results, setResults] = useState<Pub[]>([])
  const [pick, setPick] = useState<Pub | null>(null)
  const [evidence, setEvidence] = useState("")
  const [sent, setSent] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => {
    myClaims(userId).then(setClaims)
    if (initial) loadPub(initial).then((p) => p && setPick(p))
  }, [userId, initial])
  useEffect(() => {
    const t = setTimeout(() => searchPubs(text).then(setResults).catch(() => setResults([])), 250)
    return () => clearTimeout(t)
  }, [text])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pick || evidence.trim().length < 5) return
    setProblem(null)
    try {
      await claimPub(userId, pick.slug, evidence.trim())
      setSent(true)
      myClaims(userId).then(setClaims)
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't send the claim")
    }
  }

  return (
    <div className={cn("flex flex-col gap-5", hasPubs && "border-t border-border pt-8")}>
      <h2 className="font-display text-3xl font-semibold">{hasPubs ? "Claim another pub" : "Claim your pub"}</h2>
      {claims.filter((c) => c.status !== "approved").length > 0 && (
        <ul className="flex flex-col gap-2">
          {claims
            .filter((c) => c.status !== "approved")
            .map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-semibold">{c.pubName}</span>:{" "}
                {c.status === "pending" ? "we're checking your claim, usually within two working days." : "we couldn't verify this claim. Reply to our email to try again."}
              </li>
            ))}
        </ul>
      )}
      {sent ? (
        <p className="flex items-center gap-2 rounded-2xl bg-cream p-4 text-sm">
          <Check className="size-4 text-pub" aria-hidden="true" /> Claim sent. We&apos;ll check it and email you when your dashboard is ready.
        </p>
      ) : (
        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
          {pick ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <PubBadge pub={pick} size={44} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-lg font-semibold">{pick.name}</span>
                <span className="truncate text-sm text-muted-foreground">{pick.address}</span>
              </div>
              <button type="button" onClick={() => setPick(null)} className="text-sm font-semibold text-pub hover:underline">
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-paper px-4">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find your pub" className="w-full bg-transparent outline-none" />
              </div>
              {results.length > 0 && (
                <ul className="flex flex-col overflow-hidden rounded-xl border border-border">
                  {results.slice(0, 6).map((p) => (
                    <li key={p.slug} className="border-t border-border first:border-t-0">
                      <button type="button" onClick={() => setPick(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-cream">
                        <PubBadge pub={p} size={32} />
                        <span className="truncate">
                          <span className="font-semibold">{p.name}</span> <span className="text-sm text-muted-foreground">· {p.address}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">How can we check you run it?</span>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Your name and role, the premises licence number, and a phone number for the pub we can call back."
              className="rounded-xl border border-border bg-paper p-3 outline-none focus-visible:outline-2 focus-visible:outline-pub"
            />
          </label>
          <button
            type="submit"
            disabled={!pick || evidence.trim().length < 5}
            className="inline-flex h-12 w-fit items-center rounded-full bg-stout px-6 font-semibold text-cream hover:bg-pub disabled:opacity-50"
          >
            Send claim
          </button>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
        </form>
      )}
    </div>
  )
}

function Dashboard({ pub, userId }: { pub: Pub; userId: string }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <PubBadge pub={pub} size={64} className="rounded-2xl" />
        <div className="flex flex-col">
          <h2 className="font-display text-4xl font-semibold">{pub.name}</h2>
          <Link href={pubHref(pub)} className="text-sm font-semibold text-pub hover:underline">
            See your public page
          </Link>
        </div>
        <dl className="ml-auto flex gap-6">
          {[
            ["Index", pub.index ?? "–"],
            ["Pint", pub.pintScore ?? "–"],
            ["Pub", pub.pubScore ?? "–"],
            ["Pints (12 mo)", pub.ratingsLastYear],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
              <dd className="font-display text-3xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightsCard pubId={pub.slug} />
        <VenueCard pubId={pub.slug} />
      </div>
      <Replies pub={pub} userId={userId} />
    </div>
  )
}

function Card({ icon: Icon, title, children }: { icon: typeof Store; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-paper p-6">
      <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
        <Icon className="size-5 text-pub" aria-hidden="true" /> {title}
      </h3>
      {children}
    </div>
  )
}

function InsightsCard({ pubId }: { pubId: string }) {
  const [data, setData] = useState<Insights | null>(null)
  useEffect(() => {
    pubInsights(pubId).then(setData).catch(() => {})
  }, [pubId])
  if (!data) return <Card icon={BarChart3} title="Your pour, in trends"><div className="h-32 animate-pulse rounded-xl bg-cream" /></Card>
  const tags = (Object.keys(TAGS) as TagKey[])
    .map((t) => ({ t, now: data.tags_recent[t] ?? 0, before: data.tags_before[t] ?? 0 }))
    .filter((x) => x.now || x.before)
    .sort((a, b) => b.now - a.now)
  const max = Math.max(1, ...data.months.map((m) => m.overall))
  return (
    <Card icon={BarChart3} title="Your pour, in trends">
      <p className="text-sm text-muted-foreground">Anonymised: you see averages and counts, never who said what beyond their public ratings.</p>
      {data.months.length === 0 ? (
        <p className="text-sm">No ratings in the last 12 months yet.</p>
      ) : (
        <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Average overall score by month">
          {data.months.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">{m.overall}</span>
              <div className="w-full rounded-t bg-pub" style={{ height: `${(m.overall / max) * 100}px` }} />
              <span className="text-[10px] text-muted-foreground">{new Date(`${m.month}-01`).toLocaleDateString("en-GB", { month: "short" })}</span>
            </div>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">What drinkers mention (last 90 days vs the 90 before)</span>
          <ul className="flex flex-col gap-1 text-sm">
            {tags.map((x) => (
              <li key={x.t} className="flex items-center justify-between">
                <span className={TAGS[x.t].good ? "text-pub" : "text-destructive"}>{TAGS[x.t].label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {x.now} <span className="text-xs">(was {x.before})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function VenueCard({ pubId }: { pubId: string }) {
  const [v, setV] = useState<VenueUpdate | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    venueDetails(pubId).then(setV)
  }, [pubId])
  if (!v) return <Card icon={ClipboardCheck} title="Venue and cellar care"><div className="h-32 animate-pulse rounded-xl bg-cream" /></Card>
  const toggle = <K extends "owner_features" | "accreditations">(k: K, x: VenueUpdate[K][number]) =>
    setV({ ...v, [k]: (v[k] as string[]).includes(x) ? (v[k] as string[]).filter((y) => y !== x) : [...(v[k] as string[]), x] })
  return (
    <Card icon={ClipboardCheck} title="Venue and cellar care">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          await updateVenue(pubId, v)
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Lines last cleaned</span>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={v.lines_cleaned_on ?? ""}
            onChange={(e) => setV({ ...v, lines_cleaned_on: e.target.value || null })}
            className="h-11 w-fit rounded-xl border border-border bg-paper px-3"
          />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-semibold">Accreditations</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCREDITATIONS) as AccreditationKey[]).map((a) => (
              <Toggle key={a} on={v.accreditations.includes(a)} onClick={() => toggle("accreditations", a)}>
                {ACCREDITATIONS[a]}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-semibold">What you offer</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEATURES) as FeatureKey[]).map((f) => (
              <Toggle key={f} on={v.owner_features.includes(f)} onClick={() => toggle("owner_features", f)}>
                {FEATURES[f]}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Opening hours</span>
          <input
            value={v.opening_hours ?? ""}
            onChange={(e) => setV({ ...v, opening_hours: e.target.value || null })}
            placeholder="Mo-Th 12:00-23:00; Fr-Sa 12:00-00:00; Su 12:00-22:30"
            className="h-11 rounded-xl border border-border bg-paper px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">A note for drinkers</span>
          <textarea
            value={v.venue_note ?? ""}
            onChange={(e) => setV({ ...v, venue_note: e.target.value.slice(0, 280) || null })}
            rows={2}
            placeholder="New cellar cooling fitted in May. Quiz on Tuesdays."
            className="rounded-xl border border-border bg-paper p-3"
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-stout px-5 font-semibold text-cream hover:bg-pub">
            Save details
          </button>
          {saved && <span className="text-sm text-pub">Saved</span>}
        </div>
        <p className="text-xs text-muted-foreground">These details are shown on your page. They never change your score.</p>
      </form>
    </Card>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 font-medium", on ? "border-stout bg-stout text-cream" : "border-border bg-paper hover:bg-cream")}
    >
      {children}
    </button>
  )
}

function Replies({ pub, userId }: { pub: Pub; userId: string }) {
  const [ratings, setRatings] = useState<PintRating[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const load = () => loadRatings(pub.slug).then(setRatings).catch(() => {})
  useEffect(() => {
    load()
  }, [pub.slug]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card icon={MessageSquareReply} title="Reply to drinkers">
      <p className="text-sm text-muted-foreground">Your reply shows under the rating. Explain what you&apos;ve changed; you can&apos;t remove or edit their rating.</p>
      {ratings.length === 0 ? (
        <p className="text-sm">No ratings yet.</p>
      ) : (
        <ul className="flex flex-col">
          {ratings.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 border-t border-border py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">
                  <span className="font-semibold">{r.user}</span> · {r.date}
                </span>
                <span className="font-display text-2xl font-semibold tabular-nums">{r.overall.toFixed(1)}</span>
              </div>
              {r.comment && <p className="text-sm">{r.comment}</p>}
              {r.tags.length > 0 && <p className="text-xs text-muted-foreground">{r.tags.map((t) => TAGS[t]?.label ?? t).join(" · ")}</p>}
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const body = (drafts[r.id] ?? r.reply ?? "").trim()
                  if (!body) return
                  await replyToRating(r.id, pub.slug, userId, body)
                  load()
                }}
              >
                <input
                  value={drafts[r.id] ?? r.reply ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value.slice(0, 1000) })}
                  placeholder="Write a reply"
                  className="h-10 min-w-0 flex-1 rounded-full border border-border bg-paper px-4 text-sm"
                />
                <button type="submit" className="h-10 shrink-0 rounded-full bg-stout px-4 text-sm font-semibold text-cream hover:bg-pub">
                  {r.reply ? "Update" : "Reply"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
