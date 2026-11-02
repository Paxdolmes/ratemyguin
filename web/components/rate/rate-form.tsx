"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Camera, Check, Search, Stamp, X } from "lucide-react"
import { RatingSlider } from "./rating-slider"
import { VerifyCard, type VerifyState } from "./verify-card"
import { PubBadge } from "@/components/pub/pub-badge"
import { loadPub, searchPubs, submitRating, useSession } from "@/lib/live"
import { TAGS, currencyFor, distanceKm, pubHref, type Pub, type TagKey } from "@/lib/pubs"

const PARTS = [
  { key: "pour", label: "Pour", hint: "Two-part pour, left to settle" },
  { key: "head", label: "Head", hint: "Tight, domed, about 18–20 mm" },
  { key: "texture", label: "Texture", hint: "Creamy, smooth, laces the glass" },
  { key: "taste", label: "Taste", hint: "Fresh, roasty, no off notes" },
  { key: "temperature", label: "Temperature", hint: "Properly chilled, not numbing" },
] as const

type PartKey = (typeof PARTS)[number]["key"]

function PubPicker({ onPick }: { onPick: (p: Pub) => void }) {
  const [text, setText] = useState("")
  const [results, setResults] = useState<Pub[]>([])
  const [here, setHere] = useState<{ lat: number; lng: number } | undefined>()
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {}, { timeout: 8000 })
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      searchPubs(text, here).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [text, here])
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="pub-search" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Which pub?
      </label>
      <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-paper px-4 focus-within:outline-2 focus-within:outline-pub">
        <Search className="size-5 text-muted-foreground" aria-hidden="true" />
        <input
          id="pub-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by pub name"
          autoComplete="off"
          className="w-full bg-transparent font-display text-xl font-bold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal"
        />
      </div>
      {results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-border">
          {!text && <li className="bg-cream px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Near you</li>}
          {results.slice(0, 8).map((p) => (
            <li key={p.slug} className="border-t border-border first:border-t-0">
              <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream/60">
                <PubBadge pub={p} size={36} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display font-semibold">{p.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {p.area}
                    {p.distanceKm != null && here ? ` · ${Math.round(p.distanceKm * 1000)} m` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function RateForm({ initialSlug }: { initialSlug?: string }) {
  const { session, ready } = useSession()
  const [pub, setPub] = useState<Pub | null>(null)
  const [parts, setParts] = useState<Record<PartKey, number>>({
    pour: 8,
    head: 8,
    texture: 8,
    taste: 8,
    temperature: 8,
  })
  const [overall, setOverall] = useState(8)
  const [price, setPrice] = useState("")
  const [note, setNote] = useState("")
  const [tags, setTags] = useState<TagKey[]>([])
  const today = new Date().toISOString().slice(0, 10)
  const [visitedOn, setVisitedOn] = useState(today)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const toggleTag = (t: TagKey) => setTags((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]))
  const pickPhoto = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" })
  const [fix, setFix] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (initialSlug) loadPub(initialSlug).then((p) => p && setPub(p)).catch(() => {})
  }, [initialSlug])

  const cur = currencyFor(pub?.city ?? "London")
  const priceNum = Number(price)
  const priceValid = price === "" || (Number.isFinite(priceNum) && priceNum > 1 && priceNum < 30)

  const changePub = (next: Pub) => {
    setPub(next)
    setVerify({ status: "idle" })
    setFix(null)
  }

  const checkLocation = () => {
    if (!pub) return
    if (!("geolocation" in navigator)) {
      setVerify({ status: "unavailable" })
      return
    }
    setVerify({ status: "checking" })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setFix({ ...here, accuracy: pos.coords.accuracy })
        const metres = Math.round(distanceKm(here, pub) * 1000)
        setVerify(metres <= 75 ? { status: "verified" } : { status: "far", metres })
      },
      () => setVerify({ status: "unavailable" }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const submit = async () => {
    if (!pub || !session) return
    setBusy(true)
    setProblem(null)
    try {
      await submitRating(session.user.id, {
        pubId: pub.slug,
        overall,
        ...parts,
        pricePence: price ? Math.round(priceNum * 100) : null,
        note,
        fix,
        tags,
        visitedOn,
        photo,
      })
      setSubmitted(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setProblem(/profile|foreign key/i.test(msg) ? "Finish setting up your account first (pick a handle on the sign-in page)." : msg)
    } finally {
      setBusy(false)
    }
  }

  if (ready && !session) {
    return (
      <div className="flex max-w-xl flex-col gap-4 rounded-3xl bg-cream p-6 md:p-8">
        <h2 className="font-display text-3xl font-semibold">Sign in to rate a pint</h2>
        <p className="text-muted-foreground">We&apos;ll email you a code. No password, and it takes about 30 seconds.</p>
        <Link
          href={`/sign-in/?next=${encodeURIComponent(`/rate/${initialSlug ? `?pub=${initialSlug}` : ""}`)}`}
          className="inline-flex h-12 w-fit items-center rounded-full bg-stout px-6 font-semibold text-cream hover:bg-pub"
        >
          Sign in or sign up
        </Link>
      </div>
    )
  }

  if (!pub) return <PubPicker onPick={changePub} />

  if (submitted) {
    const verified = verify.status === "verified"
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-10 text-center" role="status">
        <span className="flex size-24 items-center justify-center rounded-full border-4 border-dashed border-pub text-pub">
          <Stamp className="size-10" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-4xl font-semibold text-balance">Pint logged at {pub.name}</h2>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            {verified
              ? "Verified at the pub, so it carries full weight. A new stamp is in your Guin Passport."
              : "Saved as unverified, so it carries less weight in the Index. A new stamp is in your Guin Passport."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={pubHref(pub)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-stout px-5 font-semibold text-cream hover:bg-pub"
          >
            Back to {pub.name}
          </Link>
          <Link
            href="/passport/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-stout px-5 font-semibold text-stout hover:bg-cream"
          >
            Open passport
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12"
      onSubmit={(e) => {
        e.preventDefault()
        if (priceValid) void submit()
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
          <PubBadge pub={pub} size={52} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-display text-2xl font-bold">{pub.name}</span>
            <span className="truncate text-sm text-muted-foreground">{pub.address}</span>
          </div>
          <button type="button" onClick={() => setPub(null)} className="text-sm font-semibold text-pub hover:underline">
            Change
          </button>
        </div>

        <VerifyCard state={verify} onCheck={checkLocation} />

        <fieldset className="flex flex-col gap-6">
          <legend className="mb-4 font-display text-2xl font-bold">The pint, part by part</legend>
          {PARTS.map((p) => (
            <RatingSlider
              key={p.key}
              label={p.label}
              hint={p.hint}
              value={parts[p.key]}
              onChange={(v) => setParts((prev) => ({ ...prev, [p.key]: v }))}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-display text-2xl font-bold">Why that score?</legend>
          <p className="-mt-2 text-sm text-muted-foreground">Optional. Tap anything that applies.</p>
          {[true, false].map((good) => (
            <div key={String(good)} className="flex flex-wrap gap-2">
              {(Object.keys(TAGS) as TagKey[])
                .filter((t) => TAGS[t].good === good)
                .map((t) => {
                  const on = tags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTag(t)}
                      className={
                        on
                          ? good
                            ? "rounded-full border border-pub bg-pub px-3 py-1.5 text-sm font-medium text-paper"
                            : "rounded-full border border-destructive bg-destructive px-3 py-1.5 text-sm font-medium text-paper"
                          : "rounded-full border border-border bg-paper px-3 py-1.5 text-sm font-medium hover:bg-cream"
                      }
                    >
                      {TAGS[t].label}
                    </button>
                  )
                })}
            </div>
          ))}
        </fieldset>
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:w-[400px] lg:shrink-0">
        <div className="flex flex-col gap-6 rounded-3xl bg-cream p-6">
          <RatingSlider label="Overall" hint="Your gut verdict on the pint" value={overall} onChange={setOverall} emphasis />

          <div className="flex flex-col gap-2 border-t border-stout/15 pt-5">
            <label htmlFor="price" className="font-display text-base font-semibold">
              Price paid
            </label>
            <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-paper px-4 focus-within:outline-2 focus-within:outline-pub">
              <span className="font-display text-xl font-bold text-muted-foreground">{cur}</span>
              <input
                id="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="6.40"
                aria-invalid={!priceValid}
                aria-describedby="price-hint"
                className="w-full bg-transparent font-display text-xl font-bold tabular-nums outline-none"
              />
            </div>
            <span id="price-hint" className="text-xs text-muted-foreground">
              {priceValid ? "Optional, but it powers the value score." : "Enter the price of the pint, e.g. 6.40"}
            </span>
          </div>

          <div className="flex flex-col gap-2 border-t border-stout/15 pt-5">
            <span className="font-display text-base font-semibold">Photo of the pint</span>
            {preview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your pint" className="h-40 w-28 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => pickPhoto(null)}
                  className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-stout text-cream"
                  aria-label="Remove photo"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stout/30 bg-paper text-sm font-semibold hover:bg-cream">
                <Camera className="size-4" aria-hidden="true" />
                Add a photo
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-stout/15 pt-5">
            <label htmlFor="visited" className="font-display text-base font-semibold">
              When was it?
            </label>
            <input
              id="visited"
              type="date"
              value={visitedOn}
              max={today}
              min={new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)}
              onChange={(e) => setVisitedOn(e.target.value || today)}
              className="h-12 rounded-xl border border-border bg-paper px-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-pub"
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-stout/15 pt-5">
            <label htmlFor="note" className="font-display text-base font-semibold">
              A line about it
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="Proper two-part pour, dome on the head…"
              className="rounded-xl border border-border bg-paper p-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-pub"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!priceValid || busy}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-pub font-display text-lg font-bold text-paper transition-colors hover:bg-stout disabled:opacity-50"
        >
          <Check className="size-5" aria-hidden="true" />
          {busy ? "Saving…" : verify.status === "verified" ? "Submit verified rating" : "Submit rating"}
        </button>
        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}
      </div>
    </form>
  )
}
