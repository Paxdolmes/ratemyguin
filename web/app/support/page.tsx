import type { Metadata } from "next"
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Help · ratemyGuin" }

const FAQ: [string, React.ReactNode][] = [
  ["How do I sign in?", "Enter your email and we'll send you a code. There's no password to remember."],
  ["Why does it ask for my location when I rate?", "To check you're at the pub (within 75 metres). Verified ratings count for more in the rankings. You can still rate without it, but the rating counts for less."],
  ["Why isn't my local in the table?", "A pub needs three ratings in the last 12 months before it gets an Excellence Index. Get two friends to rate it too."],
  ["How do I report or block someone?", "On any rating, tap “Report or block”. Two reports hide a photo until we've checked it."],
  ["How do I delete my account?", <>In Passport, open the Account tab and choose “Delete my account”. Everything you&apos;ve added is deleted straight away.</>],
  ["I run a pub. How do I claim it?", <>Go to <a href="/owners/">For pubs</a> and search for your pub. Claims are checked by a person before they&apos;re approved.</>],
  ["Can a pub pay to rank higher?", "No. Scores come only from drinkers' ratings. Featured pubs are paid placements, always marked Sponsored, and kept apart from the rankings."],
]

export default function Support() {
  return (
    <LegalPage eyebrow="Help" title="Questions, answered.">
      {FAQ.map(([q, a]) => (
        <section key={q} className="flex flex-col gap-1 border-b border-border pb-4">
          <h2 className="!mt-2 !text-xl">{q}</h2>
          <p>{a}</p>
        </section>
      ))}
      <h2>Still stuck?</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and a person will get back to you, usually within two working days.
      </p>
    </LegalPage>
  )
}
