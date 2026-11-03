"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Award, CalendarDays, Clock, Copy, Crown, ImagePlus, MapPinned, Megaphone, Sparkles, Tag, Trash2 } from "lucide-react"
import { AwardMedallion } from "@/components/brand/award-medallion"
import {
  EVENT_KINDS,
  IRRESPONSIBLE_OFFER,
  OFFER_KINDS,
  addEvent,
  addOffer,
  addPubPhoto,
  bestTimes,
  localComparison,
  pubEvents,
  pubOffers,
  pubPhotos,
  pubPlan,
  qualityAlerts,
  removeEvent,
  removeOffer,
  removePubPhoto,
  setQualityAlerts,
  startPayment,
  type BestTime,
  type EventKind,
  type LocalComparison,
  type Offer,
  type OfferKind,
  type PubEvent,
  type PubPhoto,
  type PubPlan,
  type QualityAlert,
} from "@/lib/live"
import { TAGS, bandFor, pubHref, type Pub, type TagKey } from "@/lib/pubs"
import { cn } from "@/lib/utils"

const PLAN_PRICE = "£25 a month"
const FEATURED_PRICE = "£49 for 7 days"

function Card({ icon: Icon, title, children, className }: { icon: typeof Crown; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-3xl border border-border bg-paper p-6", className)}>
      <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
        <Icon className="size-5 text-pub" aria-hidden="true" /> {title}
      </h3>
      {children}
    </div>
  )
}

function PayButton({ pubId, action, children, dark }: { pubId: string; action: "plan" | "featured" | "portal"; children: React.ReactNode; dark?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setProblem(null)
          try {
            window.location.href = await startPayment(pubId, action)
          } catch (e) {
            const msg = (e as Error).message
            setProblem(msg === "payments_off" ? "Card payments aren't switched on yet. We'll let you know as soon as they are." : msg)
            setBusy(false)
          }
        }}
        className={cn(
          "inline-flex h-12 w-fit items-center gap-2 rounded-full px-6 font-semibold disabled:opacity-60",
          dark ? "bg-pub-light text-stout hover:bg-cream" : "bg-stout text-cream hover:bg-pub",
        )}
      >
        {busy ? "Opening secure checkout…" : children}
      </button>
      {problem && <p className={cn("text-sm", dark ? "text-cream/80" : "text-muted-foreground")}>{problem}</p>}
    </div>
  )
}

/** The paid plan for a pub. Only ever shown in the owner area. */
export function PubPlanSection({ pub }: { pub: Pub }) {
  const [plan, setPlan] = useState<PubPlan | null | undefined>(undefined)
  const paid = useSearchParams().get("paid")
  useEffect(() => {
    let tries = 0
    const load = () =>
      pubPlan(pub.slug).then((p) => {
        setPlan(p)
        // Stripe tells us a moment after checkout, so look again briefly.
        if (!p && paid === "plan" && tries++ < 6) setTimeout(load, 2500)
      })
    load()
  }, [pub.slug, paid])

  if (plan === undefined) return <div className="h-40 animate-pulse rounded-3xl bg-cream" />
  if (!plan) return <Upgrade pub={pub} />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-stout p-6 text-cream md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-pub-light">
            <Crown className="size-4" aria-hidden="true" /> ratemyGuin for Pubs
          </p>
          <p className="font-display text-3xl font-semibold">
            {plan.status === "trialing" ? "Free trial" : plan.status === "past_due" ? "Payment due" : "Active"}
            {plan.currentPeriodEnd && (
              <span className="text-cream/60">
                {" "}
                · {plan.status === "active" ? "renews" : "until"} {new Date(plan.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
              </span>
            )}
          </p>
          <p className="text-sm text-cream/70">Only you and your team see this. Drinkers never see which plan a pub is on.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={plan.alerts}
              onChange={async (e) => {
                const on = e.target.checked
                setPlan({ ...plan, alerts: on })
                await setQualityAlerts(pub.slug, on)
              }}
              className="size-4 accent-[var(--pub-light)]"
            />
            Email me quality alerts
          </label>
          {plan.billing && (
            <PayButton pubId={pub.slug} action="portal" dark>
              Manage billing
            </PayButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AlertsCard pubId={pub.slug} />
        <BestTimesCard pubId={pub.slug} />
        <ComparisonCard pubId={pub.slug} className="lg:col-span-2" />
        <EventsCard pubId={pub.slug} />
        <OffersCard pubId={pub.slug} />
        <PhotosCard pubId={pub.slug} className="lg:col-span-2" />
        <AwardKitCard pub={pub} />
        <FeaturedCard pub={pub} paid={paid === "featured"} />
      </div>
    </div>
  )
}

export function Upgrade({ pub }: { pub: Pub }) {
  const perks: [typeof Crown, string, string][] = [
    [AlertTriangle, "Quality alerts", "An email when your pour or temperature scores dip, so you can check the lines that day."],
    [MapPinned, "Local comparison", "How you rank against the 10 nearest pubs, and what drinkers praise there."],
    [Clock, "Best and worst times", "Which days and hours your pint scores highest, for your rotas."],
    [CalendarDays, "Events and photos", "Quiz nights, live sport and a photo gallery on your pub page."],
    [Tag, "Offers near me", "Up to three offers at a time, shown to drinkers nearby."],
    [Award, "Award kit", "Your badge for menus and your website."],
  ]
  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-stout p-6 text-cream md:p-10">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-pub-light">
          <Crown className="size-4" aria-hidden="true" /> ratemyGuin for Pubs
        </p>
        <h3 className="font-display text-4xl font-semibold">Keep every pint at its best.</h3>
        <p className="max-w-2xl text-cream/70">
          {PLAN_PRICE}, cancel any time. It never changes your score or your place in the table: only pints do.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perks.map(([Icon, title, body]) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-cream/15 p-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-pub-light" aria-hidden="true" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-cream/70">{body}</span>
            </span>
          </li>
        ))}
      </ul>
      <PayButton pubId={pub.slug} action="plan" dark>
        <Crown className="size-4" aria-hidden="true" /> Start ratemyGuin for Pubs
      </PayButton>
    </div>
  )
}

const PART_LABEL: Record<QualityAlert["part"], string> = { pour: "Pour and head", temperature: "Temperature", taste: "Taste", overall: "Overall" }

function AlertsCard({ pubId }: { pubId: string }) {
  const [alerts, setAlerts] = useState<QualityAlert[] | null>(null)
  useEffect(() => {
    qualityAlerts(pubId).then(setAlerts).catch(() => setAlerts([]))
  }, [pubId])
  return (
    <Card icon={AlertTriangle} title="Quality alerts">
      {alerts === null ? (
        <div className="h-20 animate-pulse rounded-xl bg-cream" />
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">All steady. We compare the last two weeks with the three months before and tell you when anything slips.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((a) => (
            <li key={a.part} className="flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-sm">
              <span className="font-semibold">{PART_LABEL[a.part]}</span>
              <span className="tabular-nums">
                {a.recent} <span className="text-muted-foreground">from {a.before} · {a.pints} pints</span>
              </span>
            </li>
          ))}
          <li className="text-xs text-muted-foreground">Worth checking line cleaning, gas pressure and cellar temperature.</li>
        </ul>
      )}
    </Card>
  )
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const SLOTS: BestTime["slot"][] = ["lunch", "afternoon", "evening", "late"]
const SLOT_LABEL = { lunch: "Before 3pm", afternoon: "3 to 6pm", evening: "6 to 9pm", late: "After 9pm" }

function BestTimesCard({ pubId }: { pubId: string }) {
  const [rows, setRows] = useState<BestTime[] | null>(null)
  useEffect(() => {
    bestTimes(pubId).then(setRows).catch(() => setRows([]))
  }, [pubId])
  const cell = (d: number, s: BestTime["slot"]) => rows?.find((r) => r.dow === d && r.slot === s)
  const shown = (rows ?? []).filter((r) => r.pints >= 2)
  const best = [...shown].sort((a, b) => b.overall - a.overall)[0]
  const worst = [...shown].sort((a, b) => a.overall - b.overall)[0]
  return (
    <Card icon={Clock} title="Best and worst times">
      {rows === null ? (
        <div className="h-32 animate-pulse rounded-xl bg-cream" />
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">We need a few more pints across the week to show a pattern.</p>
      ) : (
        <>
          <p className="text-sm">
            Best: <b>{DAYS[best.dow]} {SLOT_LABEL[best.slot].toLowerCase()}</b> ({best.overall})
            {worst !== best && (
              <>
                {" "}· Weakest: <b>{DAYS[worst.dow]} {SLOT_LABEL[worst.slot].toLowerCase()}</b> ({worst.overall})
              </>
            )}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs tabular-nums">
              <thead>
                <tr>
                  <th />
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <th key={d} className="pb-1 font-semibold">{DAYS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((s) => (
                  <tr key={s}>
                    <th className="whitespace-nowrap pr-2 text-left font-medium text-muted-foreground">{SLOT_LABEL[s]}</th>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const c = cell(d, s)
                      const ok = c && c.pints >= 2
                      return (
                        <td key={d} className="p-0.5">
                          <span
                            className="flex h-8 items-center justify-center rounded-md"
                            style={ok ? { background: `color-mix(in oklab, var(--pub-light) ${Math.max(10, (c.overall - 5) * 20)}%, var(--cream))` } : { background: "var(--cream)" }}
                            title={ok ? `${c.pints} pints` : "Not enough pints"}
                          >
                            {ok ? c.overall : ""}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

function ComparisonCard({ pubId, className }: { pubId: string; className?: string }) {
  const [data, setData] = useState<LocalComparison | null>(null)
  useEffect(() => {
    localComparison(pubId).then(setData).catch(() => {})
  }, [pubId])
  const praise = data
    ? (Object.entries(data.praise) as [TagKey, { you: number; nearby: number }][]).sort((a, b) => b[1].nearby - b[1].you - (a[1].nearby - a[1].you))
    : []
  return (
    <Card icon={MapPinned} title="You and your neighbours" className={className}>
      {!data ? (
        <div className="h-40 animate-pulse rounded-xl bg-cream" />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ol className="flex flex-col text-sm">
            {data.pubs.map((p, i) => (
              <li key={p.id} className={cn("flex items-center gap-3 border-t border-border py-2", p.you && "font-semibold text-pub")}>
                <span className="w-5 tabular-nums text-muted-foreground">{p.excellence != null ? i + 1 : "–"}</span>
                <span className="min-w-0 flex-1 truncate">{p.you ? `${p.name} (you)` : p.name}</span>
                <span className="text-xs text-muted-foreground">{p.you ? "" : `${p.metres} m`}</span>
                <span className="w-10 text-right font-display text-lg tabular-nums">{p.excellence ?? "–"}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">What drinkers praise (share of pints, last 6 months)</span>
            {praise.length === 0 ? (
              <p className="text-sm text-muted-foreground">No praise tags nearby yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {praise.map(([t, v]) => (
                  <li key={t} className="flex flex-col gap-1">
                    <span className="flex justify-between">
                      <span>{TAGS[t]?.label ?? t}</span>
                      <span className="tabular-nums text-muted-foreground">
                        you {Math.round(v.you * 100)}% · nearby {Math.round(v.nearby * 100)}%
                      </span>
                    </span>
                    <span className="relative h-1.5 rounded-full bg-cream">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-stout/30" style={{ width: `${Math.min(100, v.nearby * 100)}%` }} />
                      <span className="absolute inset-y-0 left-0 rounded-full bg-pub" style={{ width: `${Math.min(100, v.you * 100)}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function EventsCard({ pubId }: { pubId: string }) {
  const [events, setEvents] = useState<PubEvent[]>([])
  const [kind, setKind] = useState<EventKind>("quiz")
  const [title, setTitle] = useState("")
  const [when, setWhen] = useState("")
  const [problem, setProblem] = useState<string | null>(null)
  const load = () => pubEvents(pubId).then(setEvents)
  useEffect(() => {
    load()
  }, [pubId]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card icon={CalendarDays} title="What's on">
      <p className="text-sm text-muted-foreground">Shown on your pub page.</p>
      <ul className="flex flex-col">
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 border-t border-border py-2 text-sm">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">
              {new Date(e.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
            <button type="button" aria-label={`Remove ${e.title}`} onClick={() => removeEvent(e.id).then(load)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (ev) => {
          ev.preventDefault()
          setProblem(null)
          try {
            await addEvent(pubId, { kind, title: title.trim(), startsAt: new Date(when).toISOString(), note: null })
            setTitle("")
            setWhen("")
            load()
          } catch {
            setProblem("Couldn't add that event. Check the title and time.")
          }
        }}
      >
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)} className="h-11 rounded-xl border border-border bg-paper px-3 text-sm">
            {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
              <option key={k} value={k}>{EVENT_KINDS[k]}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="h-11 rounded-xl border border-border bg-paper px-3 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <input
            required
            minLength={2}
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pub quiz, Six Nations: Ireland v France"
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-paper px-3 text-sm"
          />
          <button type="submit" className="h-11 shrink-0 rounded-full bg-stout px-5 text-sm font-semibold text-cream hover:bg-pub">
            Add
          </button>
        </div>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </form>
    </Card>
  )
}

const WEEK = [1, 2, 3, 4, 5, 6, 0]

function OffersCard({ pubId }: { pubId: string }) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [kind, setKind] = useState<OfferKind>("food")
  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [days, setDays] = useState<number[]>(WEEK)
  const [weeks, setWeeks] = useState(2)
  const [problem, setProblem] = useState<string | null>(null)
  const load = () => pubOffers(pubId).then(setOffers)
  useEffect(() => {
    load()
  }, [pubId]) // eslint-disable-line react-hooks/exhaustive-deps
  const irresponsible = IRRESPONSIBLE_OFFER.test(`${title} ${details}`)
  return (
    <Card icon={Tag} title="Offers near me">
      <p className="text-sm text-muted-foreground">
        Drinkers nearby see these under Offers, always labelled as an offer and never in the rankings. Up to three at a time.
      </p>
      <ul className="flex flex-col">
        {offers.map((o) => (
          <li key={o.id} className="flex items-center gap-3 border-t border-border py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{o.title}</span>
              <span className="block text-xs text-muted-foreground">
                {o.days.length === 7 ? "Every day" : WEEK.filter((d) => o.days.includes(d)).map((d) => DAYS[d]).join(", ")} · until{" "}
                {new Date(o.endsOn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </span>
            <button type="button" aria-label={`Remove ${o.title}`} onClick={() => removeOffer(o.id).then(load)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {offers.length < 3 && (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault()
            setProblem(null)
            if (irresponsible) return
            const end = new Date(Date.now() + weeks * 7 * 86400000 - 86400000).toISOString().slice(0, 10)
            try {
              await addOffer(pubId, { kind, title: title.trim(), details: details.trim() || null, days, endsOn: end })
              setTitle("")
              setDetails("")
              load()
            } catch {
              setProblem("Couldn't post that offer.")
            }
          }}
        >
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as OfferKind)} className="h-11 rounded-xl border border-border bg-paper px-3 text-sm">
              {(Object.keys(OFFER_KINDS) as OfferKind[]).map((k) => (
                <option key={k} value={k}>{OFFER_KINDS[k]}</option>
              ))}
            </select>
            <input
              required
              minLength={3}
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pie and a pint for £15"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-paper px-3 text-sm"
            />
          </div>
          <input
            maxLength={200}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Details (optional): Monday to Thursday, 5 to 7pm"
            className="h-11 rounded-xl border border-border bg-paper px-3 text-sm"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEK.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days.includes(d)}
                onClick={() => setDays(days.includes(d) ? (days.length > 1 ? days.filter((x) => x !== d) : days) : [...days, d])}
                className={cn("h-8 w-11 rounded-full border text-xs font-semibold", days.includes(d) ? "border-stout bg-stout text-cream" : "border-border")}
              >
                {DAYS[d]}
              </button>
            ))}
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="ml-auto h-8 rounded-full border border-border bg-paper px-2 text-xs">
              {[1, 2, 4, 8, 12].map((w) => (
                <option key={w} value={w}>for {w} week{w > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          {irresponsible && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm">
              UK rules don&apos;t allow offers that push people to drink more, like bottomless or buy-some-get-one-free. Try a food deal or a
              fair price on a pint.
            </p>
          )}
          <button type="submit" disabled={irresponsible} className="h-11 w-fit rounded-full bg-stout px-5 text-sm font-semibold text-cream hover:bg-pub disabled:opacity-50">
            Post offer
          </button>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
        </form>
      )}
    </Card>
  )
}

function PhotosCard({ pubId, className }: { pubId: string; className?: string }) {
  const [photos, setPhotos] = useState<PubPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const load = () => pubPhotos(pubId).then(setPhotos)
  useEffect(() => {
    load()
  }, [pubId]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card icon={ImagePlus} title="Photos" className={className}>
      <p className="text-sm text-muted-foreground">Up to 12 photos for your pub page: the bar, the room, the garden.</p>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption ?? ""} className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => removePubPhoto(p).then(load)}
              className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-stout/80 text-cream opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < 12 && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stout/30 text-xs text-muted-foreground hover:bg-cream">
            <ImagePlus className="size-5" aria-hidden="true" />
            {busy ? "Uploading…" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setBusy(true)
                try {
                  await addPubPhoto(pubId, f, null)
                  load()
                } finally {
                  setBusy(false)
                  e.target.value = ""
                }
              }}
            />
          </label>
        )}
      </div>
    </Card>
  )
}

function AwardKitCard({ pub }: { pub: Pub }) {
  const ref = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const band = pub.index != null ? bandFor(pub.index) : "unbanded"
  const tier = band === "exceptional" ? "exceptional" : band === "gold" ? "goldStandard" : band === "recommended" ? "highlyRecommended" : null
  const link = `https://ratemyguin.com${pubHref(pub)}`
  const snippet = `<a href="${link}">See our Guinness rating on ratemyGuin</a>`
  return (
    <Card icon={Award} title="Award kit">
      {tier ? (
        <div className="flex items-center gap-5">
          <div ref={ref}>
            <AwardMedallion tier={tier} variant="gold" size={112} />
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p>Use your badge on menus, the window and your website while you hold it.</p>
            <button
              type="button"
              onClick={() => {
                const svg = ref.current?.querySelector("svg")
                if (!svg) return
                const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg.outerHTML}`], { type: "image/svg+xml" })
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `ratemyguin-${tier}.svg`
                a.click()
              }}
              className="h-10 w-fit rounded-full bg-stout px-4 font-semibold text-cream hover:bg-pub"
            >
              Download badge
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Badges unlock at an Excellence Index of 80 (Highly Recommended), 90 (Gold Standard) and 95 (Exceptional).
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Link from your website</span>
        <div className="flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-cream px-3 py-2.5 text-xs">{snippet}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(snippet).then(() => setCopied(true))}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:bg-cream"
          >
            <Copy className="size-4" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </Card>
  )
}

function FeaturedCard({ pub, paid }: { pub: Pub; paid: boolean }) {
  return (
    <Card icon={Megaphone} title="Our featured pubs">
      <p className="text-sm text-muted-foreground">
        Put {pub.name} in the &ldquo;Our featured pubs&rdquo; strip for {pub.city} for a week. It&apos;s always marked Sponsored, sits apart from
        the rankings and never changes your score.
      </p>
      {paid && (
        <p className="flex items-center gap-2 rounded-xl bg-pub/10 px-3 py-2 text-sm font-semibold text-pub">
          <Sparkles className="size-4" aria-hidden="true" /> Thanks, you&apos;re featured for the next 7 days.
        </p>
      )}
      <PayButton pubId={pub.slug} action="featured">
        <Megaphone className="size-4" aria-hidden="true" /> Feature us · {FEATURED_PRICE}
      </PayButton>
    </Card>
  )
}
