"use client"

import { useState } from "react"
import { BadgeCheck, Flag, MapPinOff, MessageSquareReply } from "lucide-react"
import { blockRatingAuthor, reportRating, useSession } from "@/lib/live"
import { TAGS, currencyFor, type City, type PintRating } from "@/lib/pubs"

const SUBS: { key: keyof PintRating; label: string }[] = [
  { key: "pour", label: "Pour" },
  { key: "head", label: "Head" },
  { key: "texture", label: "Texture" },
  { key: "taste", label: "Taste" },
  { key: "temperature", label: "Temp" },
]

function ReportLink({ id }: { id: string }) {
  const { session } = useSession()
  const [state, setState] = useState<"idle" | "open" | "sent" | "blocked">("idle")
  if (!session) return null
  if (state === "blocked") return <span className="text-xs text-muted-foreground">Blocked. You won&apos;t see their pints after a refresh.</span>
  if (state === "sent") return <span className="text-xs text-muted-foreground">Thanks, we&apos;ll take a look.</span>
  if (state === "idle")
    return (
      <button type="button" onClick={() => setState("open")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Flag className="size-3" aria-hidden="true" /> Report or block
      </button>
    )
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Why?</span>
      {(
        [
          ["fake", "Looks fake"],
          ["not_there", "Wasn't there"],
          ["staff", "Pub staff"],
          ["offensive", "Offensive"],
          ["photo", "Bad photo"],
        ] as const
      ).map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => reportRating(id, k).then(() => setState("sent")).catch(() => setState("sent"))}
          className="rounded-full border border-border px-2 py-0.5 hover:bg-cream"
        >
          {l}
        </button>
      ))}
      <button
        type="button"
        onClick={() => blockRatingAuthor(id).then(() => setState("blocked")).catch(() => setState("sent"))}
        className="rounded-full border border-destructive/40 px-2 py-0.5 text-destructive hover:bg-destructive/10"
      >
        Block this person
      </button>
    </span>
  )
}

export function RatingCard({
  rating,
  city,
  ownerName,
  pubName,
}: {
  rating: PintRating
  index?: number
  city: City
  ownerName?: string
  pubName: string
}) {
  return (
    <article className="flex flex-col gap-4 border-b border-border py-6 first:pt-0">
      <div className="flex gap-4">
        {rating.photoUrl && (
          <a href={rating.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rating.photoUrl} alt={`Pint at ${pubName}`} loading="lazy" className="h-28 w-20 rounded-lg object-cover md:h-32 md:w-24" />
          </a>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-bold text-stout"
                aria-hidden="true"
              >
                {rating.initials}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{rating.user}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {rating.visitedOn
                    ? new Date(rating.visitedOn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : rating.date}
                  <span aria-hidden="true">·</span>
                  {rating.verified ? (
                    <span className="inline-flex items-center gap-0.5 font-medium text-pub">
                      <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified at the pub
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPinOff className="size-3.5" aria-hidden="true" /> Not verified
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-0.5">
              <span className="font-display text-3xl font-bold tabular-nums leading-none">{rating.overall.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
          </div>
          {rating.comment && <p className="text-sm leading-relaxed text-pretty">{rating.comment}</p>}
          {rating.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
              {rating.tags.map((t) => (
                <li
                  key={t}
                  className={
                    TAGS[t]?.good
                      ? "rounded-full bg-pub/10 px-2 py-0.5 text-xs font-medium text-pub"
                      : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                  }
                >
                  {TAGS[t]?.label ?? t}
                </li>
              ))}
            </ul>
          )}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {SUBS.map((s) => (
              <div key={s.key} className="flex gap-1">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-semibold tabular-nums">{(rating[s.key] as number).toFixed(1)}</dd>
              </div>
            ))}
            {rating.price != null && (
              <div className="flex gap-1">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-semibold tabular-nums">
                  {currencyFor(city)}
                  {rating.price.toFixed(2)}
                </dd>
              </div>
            )}
          </dl>
          <ReportLink id={rating.id} />
        </div>
      </div>

      {rating.reply && (
        <div className="ml-0 flex gap-3 rounded-xl bg-cream p-4 md:ml-28">
          <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-pub" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">
              {ownerName ?? "The landlord"}, {pubName}{" "}
              <span className="font-medium text-muted-foreground">· Pub owner reply</span>
            </span>
            <p className="text-sm leading-relaxed text-pretty">{rating.reply}</p>
          </div>
        </div>
      )}
    </article>
  )
}
