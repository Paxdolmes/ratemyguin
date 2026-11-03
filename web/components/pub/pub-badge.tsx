"use client"

import { useState } from "react"
import type { Pub } from "@/lib/pubs"
import { cn } from "@/lib/utils"

/** The pub's logo when we have one, otherwise a stout-and-cream monogram. */
export function PubBadge({ pub, size = 44, className }: { pub: Pick<Pub, "name" | "logoUrl" | "imageUrl">; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  const src = !broken ? (pub.logoUrl ?? pub.imageUrl) : null
  const words = pub.name.replace(/^the\s+/i, "").split(/\s+/).filter((w) => /^\p{L}/u.test(w))
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase()
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-stout/10", src ? "bg-white" : "bg-stout", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn("size-full", pub.logoUrl ? "object-contain p-1" : "object-cover")} />
      ) : (
        <>
          <span className="absolute inset-x-0 top-0 h-[28%] bg-cream" />
          <span className="relative mt-[18%] font-display font-semibold text-cream" style={{ fontSize: size * 0.36 }}>
            {initials}
          </span>
        </>
      )}
    </span>
  )
}
