import type { Metadata } from "next"
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Privacy policy · ratemyGuin" }

export default function Privacy() {
  return (
    <LegalPage eyebrow="Privacy" title="Your data, plainly." updated="3 November 2026">
      <p>
        ratemyGuin is an independent guide to the Guinness in London&apos;s pubs and beyond. This page explains what we collect, why, and what
        you can do about it. We are the data controller under UK GDPR. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Your account:</b> your email address, name and handle. When you sign up we ask your date of birth to check you&apos;re 18 or over, then keep only the fact that you confirmed it, not the date.</li>
        <li><b>Your ratings:</b> scores, tags, notes, the date of your visit, and any photo you add. These are public unless you rate anonymously or make your profile private.</li>
        <li><b>Where you rated from:</b> when you rate, your phone or browser shares its location once so we can check you were at the pub (within 75 metres). We store that point with the rating to mark it verified and never show it to anyone.</li>
        <li><b>Your lists, follows and blocks.</b></li>
        <li><b>If you run a pub:</b> your claim details, venue updates, replies, and, if you pay for ratemyGuin for Pubs, billing details handled by Stripe. We never see your card number.</li>
        <li><b>Technical data:</b> the basics any website receives, such as your IP address and browser, kept briefly by our hosting providers for security.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the service you asked for: your account, your ratings and the rankings (contract).</li>
        <li>To keep rankings fair, for example spotting fake or repeated ratings (legitimate interests).</li>
        <li>To check you&apos;re 18 or over (legal obligation and legitimate interests).</li>
        <li>To email you sign-in codes and, if you run a pub on our paid plan, quality alerts you can turn off.</li>
      </ul>
      <p>We don&apos;t sell your data, we don&apos;t run third-party adverts, and pubs never see who you are beyond what you made public.</p>

      <h2>Who helps us</h2>
      <ul>
        <li>Supabase (database and sign-in, hosted in London)</li>
        <li>Cloudflare (website hosting)</li>
        <li>Resend (sign-in and alert emails)</li>
        <li>Stripe (payments from pubs only)</li>
        <li>OpenStreetMap (map tiles; your browser fetches these directly)</li>
        <li>Expo and Apple (to deliver the iPhone app)</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>For as long as you have an account. When you delete your account, your profile, ratings, photos, lists and follows are deleted straight away. Backups roll off within 30 days.</p>

      <h2>Your rights</h2>
      <p>
        You can see, correct, download or delete your data, object to how we use it, or ask us to restrict it. Most of this you can do yourself in
        Passport, and you can delete your account under Passport, Account. For anything else, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        If you&apos;re not happy with our answer you can complain to the Information Commissioner&apos;s Office at ico.org.uk.
      </p>

      <h2>Children</h2>
      <p>ratemyGuin is for people aged 18 and over. If we learn that an account belongs to someone younger, we delete it.</p>
    </LegalPage>
  )
}
