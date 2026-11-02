"use client"

import { useMemo } from "react"
import { MapLoader } from "@/components/map/map-loader"
import type { Pub } from "@/lib/pubs"

const NONE: [number, number][] = []

/** A small map of one pub, for the pub page. */
export function PubMiniMap({ pub, rated }: { pub: Pub; rated: boolean }) {
  const pubs = useMemo(() => (rated ? [pub] : []), [pub, rated])
  const center = useMemo<[number, number]>(() => [pub.lat, pub.lng], [pub.lat, pub.lng])
  return (
    <div className="h-56 overflow-hidden rounded-2xl border border-stout/10 md:h-64" aria-label={`Map showing ${pub.name}`}>
      <MapLoader pubs={pubs} unrated={NONE} center={center} zoom={16} activeSlug={pub.slug} focus={rated ? null : center} />
    </div>
  )
}
