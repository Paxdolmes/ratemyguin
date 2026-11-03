import type { Metadata } from "next"
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Terms · ratemyGuin" }

export default function Terms() {
  return (
    <LegalPage eyebrow="Terms" title="The house rules." updated="3 November 2026">
      <p>By using ratemyGuin you agree to these terms. If you don&apos;t agree, please don&apos;t use it.</p>

      <h2>Who can use it</h2>
      <p>You must be 18 or over and live somewhere it&apos;s legal for you to drink alcohol. One account per person.</p>

      <h2>Rating fairly</h2>
      <ul>
        <li>Only rate pints you&apos;ve actually had, at the pub you&apos;re rating, and only one rating per visit.</li>
        <li>Don&apos;t rate a pub you own, work at or are paid by, or a direct competitor.</li>
        <li>Don&apos;t post anything abusive, discriminatory, illegal, or that names or shows staff or other drinkers without their permission.</li>
        <li>Photos should be of the pint or the pub. No people&apos;s faces without their agreement.</li>
      </ul>
      <p>We may hide or remove ratings and photos that break these rules, and close accounts that keep breaking them. You can report any rating or photo, and block anyone.</p>

      <h2>Your content</h2>
      <p>You keep ownership of what you post. You give us a free, worldwide licence to show it on ratemyGuin and to use it in rankings and awards. That licence ends when you delete it or your account, except where it&apos;s already part of a published ranking.</p>

      <h2>Rankings, offers and featured pubs</h2>
      <p>
        Rankings and awards are independent and based only on drinkers&apos; ratings. No pub can pay to change its score or its place. &ldquo;Our featured
        pubs&rdquo; are paid placements and are always marked Sponsored. Offers are posted by pubs or found on their own websites; always check with the
        pub. ratemyGuin is not affiliated with, endorsed or sponsored by Guinness or Diageo.
      </p>

      <h2>Drink responsibly</h2>
      <p>ratemyGuin is about quality, not quantity. Don&apos;t drink and drive, know your limits, and visit drinkaware.co.uk for advice.</p>

      <h2>Pubs on ratemyGuin for Pubs</h2>
      <p>The paid plan is billed monthly through Stripe and you can cancel any time from the owner area; it runs to the end of the period you&apos;ve paid for. Featured weeks are paid in advance and not refundable once they start.</p>

      <h2>The legal bit</h2>
      <p>
        We do our best to keep ratemyGuin accurate and running, but we provide it as it is. Nothing in these terms limits liability that can&apos;t be
        limited by law. These terms are governed by the law of England and Wales. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  )
}
