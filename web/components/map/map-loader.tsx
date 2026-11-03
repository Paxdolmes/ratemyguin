"use client"

import dynamic from "next/dynamic"
import type { PubMapProps } from "./pub-map"

const PubMap = dynamic(() => import("./pub-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-cream text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export function MapLoader(props: PubMapProps) {
  return <PubMap {...props} />
}
