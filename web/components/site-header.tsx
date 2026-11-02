"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, Plus, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { supabase, useSession } from "@/lib/live"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Rankings" },
  { href: "/map", label: "Map" },
  { href: "/passport", label: "Passport" },
  { href: "/scoring", label: "How scoring works" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const { session } = useSession()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/pub") : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-[1100] border-b border-cream/10 bg-stout text-cream">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 md:px-8">
        <Link href="/" aria-label="ratemyGuin home" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo onDark />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium text-cream/70 transition-colors hover:text-cream",
                isActive(item.href) && "bg-cream/10 text-pub-light",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {session ? (
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-cream hover:bg-cream/10 md:inline-flex"
            >
              Sign out
            </button>
          ) : (
            <Link href="/sign-in/" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-cream hover:bg-cream/10 md:inline-flex">
              Sign in
            </Link>
          )}
          <Link
            href="/rate"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pub-light px-4 text-sm font-semibold text-stout shadow-sm transition-colors hover:bg-cream"
            onClick={() => setOpen(false)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Rate a pint
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-cream hover:bg-cream/10 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-cream/10 bg-stout px-4 pb-4 md:hidden">
          <ul className="flex flex-col">
            {[...NAV, ...(session ? [] : [{ href: "/sign-in/", label: "Sign in" }])].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex border-b border-cream/10 py-3.5 font-display text-lg font-semibold",
                    isActive(item.href) ? "text-pub-light" : "text-cream",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
