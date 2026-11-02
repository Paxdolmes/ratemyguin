"use client"

import "leaflet/dist/leaflet.css"
import "react-leaflet-cluster/dist/assets/MarkerCluster.css"
import L from "leaflet"
import Link from "next/link"
import { useEffect, useMemo, useRef } from "react"
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import { BAND_LABEL, bandFor, excellenceIndex, formatPrice, pubHref, type Pub } from "@/lib/pubs"

export type PubMapProps = {
  pubs: Pub[]
  unrated: [number, number, string?, string?][] // lat, lng, pub id, name
  center: [number, number]
  zoom: number
  activeSlug?: string | null
  onSelect?: (slug: string) => void
  userLocation?: { lat: number; lng: number } | null
  /** Highlights one spot, such as the pub on its own page. */
  focus?: [number, number] | null
}

function pinIcon(score: number, active: boolean) {
  const band = bandFor(score)
  return L.divIcon({
    className: "",
    html: `<div class="rmg-pin rmg-pin--${band}${active ? " rmg-pin--active" : ""}" aria-label="${score} ${BAND_LABEL[band]}">${score}</div>`,
    iconSize: [36, 30],
    iconAnchor: [18, 30],
    popupAnchor: [0, -28],
  })
}

function clusterIcon(cluster: L.MarkerCluster) {
  const markers = cluster.getAllChildMarkers()
  const best = Math.max(
    ...markers.map((m) => (m.options as L.MarkerOptions & { score?: number }).score ?? 0),
  )
  return L.divIcon({
    className: "",
    html: `<div class="rmg-cluster"><span>${markers.length}</span><small>top ${best}</small></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:999px;background:var(--pub-light);border:3px solid var(--paper);box-shadow:0 0 0 6px color-mix(in oklab, var(--pub-light) 30%, transparent)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function UnratedLayer({ points, onSelect }: { points: [number, number, string?, string?][]; onSelect?: (id: string) => void }) {
  const map = useMap()
  useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 })
    const group = L.layerGroup()
    for (const [lat, lng, id, name] of points) {
      const dot = L.circleMarker([lat, lng], {
        renderer,
        radius: 3.5,
        stroke: true,
        color: "#FBF8F1",
        weight: 1,
        fillColor: "#17110D",
        fillOpacity: 0.45,
        interactive: Boolean(id),
      })
      if (id) {
        if (name) dot.bindTooltip(`${name.replace(/</g, "&lt;")} · not yet rated`, { direction: "top" })
        dot.on("click", () => onSelect?.(id))
      }
      dot.addTo(group)
    }
    group.addTo(map)
    return () => {
      group.remove()
    }
  }, [map, points, onSelect])
  return null
}

function ViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    map.flyTo(center, zoom, { duration: 0.8 })
  }, [map, center, zoom])
  return null
}

function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

export default function PubMap({ pubs, unrated, center, zoom, activeSlug, onSelect, userLocation, focus }: PubMapProps) {
  const rated = useMemo(
    () =>
      pubs
        .map((p) => ({ pub: p, score: excellenceIndex(p) }))
        .filter((x): x is { pub: Pub; score: number } => x.score !== null),
    [pubs],
  )

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      preferCanvas
      className="size-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="rmg-tiles"
        maxZoom={19}
      />
      <UnratedLayer points={unrated} onSelect={onSelect} />
      {focus && (
        <CircleMarker
          center={focus}
          radius={11}
          pathOptions={{ color: "#17110D", weight: 3, fillColor: "#D4A94A", fillOpacity: 1 }}
        />
      )}
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={44}
        disableClusteringAtZoom={15}
        iconCreateFunction={clusterIcon}
      >
        {rated.map(({ pub, score }) => (
          <Marker
            key={pub.slug}
            position={[pub.lat, pub.lng]}
            icon={pinIcon(score, activeSlug === pub.slug)}
            zIndexOffset={activeSlug === pub.slug ? 1000 : score}
            title={`${pub.name}, ${score}`}
            {...({ score } as object)}
            eventHandlers={{ click: () => onSelect?.(pub.slug) }}
          >
            <Popup>
              <div className="flex min-w-44 flex-col gap-1">
                <span className="font-display text-base font-bold leading-tight text-stout">{pub.name}</span>
                <span className="text-xs text-muted-foreground">
                  {pub.area} · {formatPrice(pub)}
                </span>
                <span className="text-xs font-medium text-stout">
                  {score} · {BAND_LABEL[bandFor(score)]}
                </span>
                <Link href={pubHref(pub)} className="mt-1 text-xs font-semibold text-pub underline-offset-2 hover:underline">
                  View pub
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} title="You are here" />}
      <ViewController center={center} zoom={zoom} />
      <SizeWatcher />
    </MapContainer>
  )
}
