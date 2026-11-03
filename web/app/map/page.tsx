import type { Metadata } from "next"
import { FullMapView } from "@/components/map/full-map-view"

export const metadata: Metadata = {
  title: "Map",
  description: "Every rated pint on one map, plus thousands of pubs still waiting for their first score.",
}

export default function MapPage() {
  return (
    <main>
      <FullMapView />
    </main>
  )
}
