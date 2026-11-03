"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Tag, X } from "lucide-react"
import { EVENT_KINDS, pubEvents, pubOffers, pubPhotos, type Offer, type PubEvent, type PubPhoto } from "@/lib/live"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEK = [1, 2, 3, 4, 5, 6, 0]

export function offerDays(days: number[]) {
  if (days.length === 7) return "Every day"
  return WEEK.filter((d) => days.includes(d)).map((d) => DAYS[d]).join(", ")
}

/** Offers, events and photos a pub has posted. Shows nothing when there are none. */
export function PubExtras({ pubId }: { pubId: string }) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [events, setEvents] = useState<PubEvent[]>([])
  const [photos, setPhotos] = useState<PubPhoto[]>([])
  const [open, setOpen] = useState<PubPhoto | null>(null)
  useEffect(() => {
    pubOffers(pubId).then(setOffers).catch(() => {})
    pubEvents(pubId).then(setEvents).catch(() => {})
    pubPhotos(pubId).then(setPhotos).catch(() => {})
  }, [pubId])

  return (
    <>
      {offers.length > 0 && (
        <div className="flex flex-col gap-3">
          {offers.map((o) => (
            <div key={o.id} className="flex gap-3 rounded-2xl bg-cream p-4">
              <Tag className="mt-1 size-4 shrink-0 text-pub" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pub">Offer from the pub</span>
                <span className="font-display text-xl font-semibold">{o.title}</span>
                {o.details && <span className="text-sm">{o.details}</span>}
                <span className="text-xs text-muted-foreground">
                  {offerDays(o.days)} · until {new Date(o.endsOn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <CalendarDays className="size-5 text-pub" aria-hidden="true" /> What&apos;s on
          </h2>
          <ul className="flex flex-col">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 border-t border-border py-2.5 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  {new Date(e.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  <span className="block text-xs">{new Date(e.startsAt).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}</span>
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{e.title}</span>
                  <span className="text-xs text-muted-foreground">{EVENT_KINDS[e.kind]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Inside the pub</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpen(p)} className="aspect-square overflow-hidden rounded-xl bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? "Photo from the pub"} loading="lazy" className="size-full object-cover transition-transform hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-stout/90 p-4" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-cream/10 text-cream">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt={open.caption ?? "Photo from the pub"} className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </>
  )
}
