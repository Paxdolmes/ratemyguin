import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export function SiteFooter() {
  return (
    <footer className="bg-stout text-cream">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex max-w-md flex-col gap-3">
          <Logo onDark />
          <p className="text-sm leading-relaxed text-cream/70">
            An independent, community-run guide to the pint. RateMyGuin is not affiliated with, endorsed or
            sponsored by Guinness or Diageo. No pub can pay for a place in the table.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/80">
          <Link href="/" className="hover:text-cream">Rankings</Link>
          <Link href="/map" className="hover:text-cream">Map</Link>
          <Link href="/passport" className="hover:text-cream">Passport</Link>
          <Link href="/scoring" className="hover:text-cream">How scoring works</Link>
          <Link href="/rate" className="hover:text-cream">Rate a pint</Link>
        </nav>
      </div>
      <div className="border-t border-cream/10">
        <p className="mx-auto max-w-[1440px] px-4 py-4 text-xs text-cream/50 md:px-8">
          © 2026 RateMyGuin. Please drink responsibly.
        </p>
      </div>
    </footer>
  )
}
