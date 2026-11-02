import { BadgeCheck, MapPinOff, MessageSquareReply } from "lucide-react"
import { currencyFor, type City, type PintRating } from "@/lib/pubs"

const SUBS: { key: keyof PintRating; label: string }[] = [
  { key: "pour", label: "Pour" },
  { key: "head", label: "Head" },
  { key: "texture", label: "Texture" },
  { key: "taste", label: "Taste" },
  { key: "temperature", label: "Temp" },
]

function PintPhoto({ seed }: { seed: number }) {
  const headHeight = 16 + (seed % 3) * 4
  return (
    <div
      className="flex h-28 w-20 shrink-0 flex-col overflow-hidden rounded-lg bg-stout md:h-32 md:w-24"
      role="img"
      aria-label="Pint photo"
    >
      <div className="bg-cream" style={{ height: `${headHeight}%` }} />
      <div className="flex flex-1 items-end justify-center pb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-cream/40">Photo</span>
      </div>
    </div>
  )
}

export function RatingCard({
  rating,
  index,
  city,
  ownerName,
  pubName,
}: {
  rating: PintRating
  index: number
  city: City
  ownerName?: string
  pubName: string
}) {
  return (
    <article className="flex flex-col gap-4 border-b border-border py-6 first:pt-0">
      <div className="flex gap-4">
        <PintPhoto seed={index} />
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
                  {rating.date}
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
          <p className="text-sm leading-relaxed text-pretty">{rating.comment}</p>
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
