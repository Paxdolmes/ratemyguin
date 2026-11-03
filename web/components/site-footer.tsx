import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { Seal } from "@/components/brand/seal"

export function SiteFooter() {
  return (
    <footer className="bg-stout text-cream">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex max-w-md flex-col gap-3">
          <Logo tone="onDark" size="sm" />
          <p className="text-sm leading-relaxed text-cream/70">
            Rating London&apos;s pints, and beyond. An independent, community-run guide to the pint. ratemyGuin is not affiliated with, endorsed or
            sponsored by Guinness or Diageo. No pub can pay for a place in the table.
          </p>
        </div>
        <Seal size={112} tone="black" className="hidden shrink-0 md:block" />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/80">
          <Link href="/" className="hover:text-cream">Rankings</Link>
          <Link href="/map" className="hover:text-cream">Map</Link>
          <Link href="/passport" className="hover:text-cream">Passport</Link>
          <Link href="/scoring" className="hover:text-cream">How scoring works</Link>
          <Link href="/rate" className="hover:text-cream">Rate a pint</Link>
          <Link href="/offers/" className="hover:text-cream">Offers near me</Link>
          <Link href="/owners/" className="hover:text-cream">For pubs</Link>
          <Link href="/support/" className="hover:text-cream">Help</Link>
          <Link href="/privacy/" className="hover:text-cream">Privacy</Link>
          <Link href="/terms/" className="hover:text-cream">Terms</Link>
        </nav>
      </div>
      <div className="border-t border-cream/10">
        <p className="mx-auto max-w-[1440px] px-4 py-4 text-xs text-cream/50 md:px-8">
          © 2026 ratemyGuin. Please drink responsibly.
        </p>
      </div>
    </footer>
  )
}
