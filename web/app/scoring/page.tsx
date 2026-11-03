import type { Metadata } from "next"
import Link from "next/link"
import { AwardMedallion } from "@/components/brand/award-medallion"
import { BadgeCheck, CalendarClock, Flag, Gauge, GlassWater, Scale, ShieldCheck, Users } from "lucide-react"
import { BandChip } from "@/components/band-chip"
import { COMPONENT_LABELS, WEIGHTS, bandFor, weightedIndex, type Components } from "@/lib/pubs"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "How scoring works",
  description:
    "How the ratemyGuin Excellence Index is calculated: 40% pour, 20% taste and temperature, 15% consistency, 15% atmosphere and service, 10% value.",
}

const SEGMENT_STYLE: Record<keyof Components, string> = {
  pour: "bg-stout text-cream",
  taste: "bg-pub text-paper",
  consistency: "bg-pub-light text-stout",
  atmosphere: "bg-cream text-stout",
  value: "bg-paper text-stout border border-stout/20",
}

const LONG_COPY: Record<keyof Components, string> = {
  pour: "The heart of it. Was it a proper two-part pour, left to settle? Is the head a tight, domed 18–20 mm? Is the texture creamy all the way down?",
  taste: "Fresh lines, the right gas mix and a pint served properly chilled, not numbingly cold or lukewarm.",
  consistency: "How much a pub's ratings vary across visits. The same great pint on a Tuesday afternoon and a Saturday match day scores highest.",
  atmosphere: "The room and the people behind the bar. Patience at the tap counts for more than fancy fit-outs.",
  value: "Price paid against the city median. A great pint at £5.90 in London beats a great pint at £7.40.",
}

const BANDS = [
  { band: "exceptional" as const, range: "95–100", copy: "The pint people cross the city for. Rare, and hard to hold on to." },
  { band: "gold" as const, range: "90–94", copy: "A benchmark pint, reliably poured right. Worth a detour." },
  { band: "recommended" as const, range: "80–89", copy: "A genuinely good pint. You'd happily make it your local." },
]

const FAIRNESS = [
  {
    icon: BadgeCheck,
    title: "Verified at the pub",
    copy: "Rate with your phone's location on and within 75 m of the pub and the pint counts as verified. Verified ratings carry more weight.",
  },
  {
    icon: CalendarClock,
    title: "Recent pints count most",
    copy: "Only the last 12 months count, and a rating from six months ago carries half the weight of one from today. No pub can live off an old reputation.",
  },
  {
    icon: Users,
    title: "Three pints minimum",
    copy: "No score until a pub has 3 ratings in the year, and no award until it has 10. New pubs start close to 70 and earn their way up.",
  },
  {
    icon: Scale,
    title: "Credibility weighting",
    copy: "Established raters count for more than brand-new accounts. One rating per pub every 3 hours, and impossible journeys between pubs are blocked.",
  },
  {
    icon: Gauge,
    title: "Harsh and generous raters",
    copy: "If someone always scores a point above everyone else at the same pubs, we take that point back off. The score reflects the pint, not the person.",
  },
  {
    icon: Flag,
    title: "Suspicious activity",
    copy: "Anyone can report a rating. A sudden burst of ratings flags a pub as under review, and moderators remove fakes.",
  },
  {
    icon: GlassWater,
    title: "Pint score and Pub score",
    copy: "Every pub shows a Pint score for the glass alone and a Pub score for the room and service, so a great atmosphere can't hide a poor pint.",
  },
  {
    icon: ShieldCheck,
    title: "Independent",
    copy: "Pub staff can't rate their own pub, and nobody can pay for a placing. We're not affiliated with Guinness or Diageo.",
  },
]

// A made-up pub to show the sums. Real pubs get their numbers from their ratings.
const EXAMPLE = { name: "An example pub", components: { pour: 98, taste: 97, consistency: 96, atmosphere: 93, value: 88 } as Components }

export default function ScoringPage() {
  const keys = Object.keys(WEIGHTS) as (keyof Components)[]
  const example = EXAMPLE
  const exampleScore = weightedIndex(example.components)

  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pb-14 pt-10 md:px-8 md:pt-16">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub">How scoring works</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.92] text-balance md:text-7xl">
            One number for the whole pint.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            The Excellence Index scores every rated pub out of 100. Five components, weighted by what matters most in the
            glass.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex h-20 w-full overflow-hidden rounded-2xl md:h-28" role="img" aria-label="Excellence Index weighting: Pour 40%, Taste and temperature 20%, Consistency 15%, Atmosphere and service 15%, Value 10%">
            {keys.map((key) => (
              <div
                key={key}
                className={cn("flex flex-col justify-between p-2.5 md:p-4", SEGMENT_STYLE[key])}
                style={{ width: `${WEIGHTS[key] * 100}%` }}
              >
                <span className="font-display text-xl font-semibold tabular-nums leading-none md:text-4xl">
                  {Math.round(WEIGHTS[key] * 100)}
                  <span className="text-sm md:text-xl">%</span>
                </span>
                <span className="hidden truncate text-sm font-medium md:block">{COMPONENT_LABELS[key].label}</span>
              </div>
            ))}
          </div>

          <ul className="grid grid-cols-1 gap-x-8 gap-y-6 pt-4 md:grid-cols-2 lg:grid-cols-5">
            {keys.map((key) => (
              <li key={key} className="flex flex-col gap-2 border-t-2 border-stout pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("size-3 rounded-sm", SEGMENT_STYLE[key])} aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold">{COMPONENT_LABELS[key].label}</h2>
                  <span className="ml-auto font-display text-lg font-bold tabular-nums text-muted-foreground">
                    {Math.round(WEIGHTS[key] * 100)}%
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{LONG_COPY[key]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-stout text-cream">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-14 md:px-8 lg:flex-row lg:gap-16">
          <div className="flex flex-col gap-3 lg:w-96 lg:shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pub-light">Worked example</p>
            <h2 className="font-display text-4xl font-semibold leading-none">{example.name}</h2>
            <p className="text-sm leading-relaxed text-cream/70">
              Each component is scored out of 100 from the pub&apos;s ratings, multiplied by its weight, then added up.
            </p>
            <p className="text-xs text-cream/50">
              Real Index scores also start from a neutral 70 until a pub has enough ratings, so a couple of pints can&apos;t send it
              straight to the top.
            </p>
          </div>
          <div className="flex flex-1 flex-col">
            {keys.map((key) => (
              <div key={key} className="flex items-baseline gap-4 border-b border-cream/10 py-3 tabular-nums">
                <span className="flex-1 text-sm md:text-base">{COMPONENT_LABELS[key].label}</span>
                <span className="w-24 text-right text-sm text-cream/60">
                  {example.components[key]} × {WEIGHTS[key].toFixed(2)}
                </span>
                <span className="w-16 text-right font-display text-lg font-bold">
                  {(example.components[key] * WEIGHTS[key]).toFixed(1)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-5">
              <span className="flex-1 font-display text-lg font-bold">Excellence Index</span>
              <BandChip band={bandFor(exampleScore)} onDark />
              <span className="font-display text-5xl font-semibold tabular-nums">{exampleScore}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-14 md:px-8">
        <h2 className="font-display text-4xl font-semibold">The bands</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {BANDS.map((b) => (
            <li key={b.band} className="flex flex-col gap-3 rounded-2xl border border-border p-5">
              <span className="font-display text-4xl font-semibold tabular-nums">{b.range}</span>
              <BandChip band={b.band} className="w-fit" />
              <p className="text-sm leading-relaxed text-muted-foreground">{b.copy}</p>
            </li>
          ))}
          <li className="flex flex-col gap-3 rounded-2xl border border-dashed border-stout/30 p-5">
            <span className="font-display text-4xl font-semibold text-muted-foreground">—</span>
            <span className="w-fit rounded-full border border-dashed border-stout/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Not yet rated
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fewer than 3 ratings in the last year. Most of London&apos;s 3,600+ pubs are here — go and change that.
            </p>
          </li>
        </ul>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-14 md:px-8">
        <h2 className="font-display text-4xl font-semibold">Verification and fairness</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {FAIRNESS.map((f) => (
            <li key={f.title} className="flex flex-col gap-2">
              <f.icon className="size-6 text-pub" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{f.copy}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-8">
        <div className="flex flex-col gap-8 rounded-3xl border border-pub/25 bg-cream p-6 text-stout md:p-10 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center justify-center gap-3 sm:gap-5">
            <AwardMedallion tier="highlyRecommended" variant="gold" size={104} />
            <AwardMedallion tier="exceptional" variant="gold" size={136} />
            <AwardMedallion tier="goldStandard" variant="gold" size={104} />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">The ratemyGuin Awards</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-pretty text-stout/75">
              Once a pub has 10 or more ratings, its band becomes an award: Exceptional, Gold Standard or Highly Recommended.
              Pubs can&apos;t enter, nominate or pay. The awards are independent and not official Guinness recognition.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-stout px-5 font-semibold text-cream hover:bg-pub"
          >
            See the rankings
          </Link>
        </div>
      </section>
    </main>
  )
}
