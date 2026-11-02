// Web map: real streets (CARTO Positron tiles from OpenStreetMap data) with clustered pins.
// Rated pubs get a pin showing their Index, coloured by band; unrated pubs are small dots.
// Leaflet is loaded from a CDN on first use so it never touches the native bundles.

import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { usePalette } from '@/constants/theme';
import type { PubWithScore } from '@/lib/store';

type Props = { pubs: PubWithScore[]; here: { lat: number; lng: number }; height?: number | `${number}%`; onPick: (id: string) => void };

/* eslint-disable @typescript-eslint/no-explicit-any */
type Leaflet = any;

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';
const CLUSTER = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist';

let loading: Promise<Leaflet> | null = null;
function loadLeaflet(): Promise<Leaflet> {
  if (loading) return loading;
  const css = (href: string) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  };
  const js = (src: string) =>
    new Promise<void>((ok, fail) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => ok();
      s.onerror = () => fail(new Error(`Couldn't load ${src}`));
      document.head.appendChild(s);
    });
  css(`${LEAFLET}/leaflet.css`);
  css(`${CLUSTER}/MarkerCluster.css`);
  loading = js(`${LEAFLET}/leaflet.js`)
    .then(() => js(`${CLUSTER}/leaflet.markercluster.js`))
    .then(() => (window as any).L);
  return loading;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export function PubMap({ pubs, here, height = 320, onPick }: Props) {
  const c = usePalette();
  const box = useRef<any>(null);
  const map = useRef<{ L: Leaflet; map: Leaflet; layer: Leaflet; me: Leaflet } | null>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      const el = box.current as unknown as HTMLElement | null;
      if (cancelled || !el || map.current) return;
      const m = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([here.lat, here.lng], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'rmg-tiles',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      // Calm the standard map colours down to the paper-and-stout palette.
      const st = document.createElement('style');
      st.textContent = '.rmg-tiles{filter:grayscale(.85) sepia(.25) brightness(1.04) contrast(.92)}';
      document.head.appendChild(st);
      const layer = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        iconCreateFunction: (cl: Leaflet) =>
          L.divIcon({
            className: '',
            html: `<div style="width:38px;height:38px;border-radius:19px;background:${c.stout};color:${c.cream};display:flex;align-items:center;justify-content:center;font:700 13px Figtree_700Bold,Figtree,sans-serif;border:3px solid ${c.cream};box-shadow:0 2px 6px rgba(0,0,0,.25)">${cl.getChildCount()}</div>`,
            iconSize: [38, 38],
          }),
      });
      m.addLayer(layer);
      const me = L.circleMarker([here.lat, here.lng], { radius: 7, color: '#fff', weight: 3, fillColor: c.brand, fillOpacity: 1 }).addTo(m);
      map.current = { L, map: m, layer, me };
      setTimeout(() => m.invalidateSize(), 0);
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.map.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const cur = map.current;
    if (!cur) return;
    const { L, layer } = cur;
    layer.clearLayers();
    const markers = pubs.map((p) => {
      const idx = p.score.index;
      let html: string;
      let size: [number, number];
      if (idx == null) {
        html = `<div title="${esc(p.name)}" style="width:12px;height:12px;border-radius:6px;background:${c.inkSubtle};border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)"></div>`;
        size = [12, 12];
      } else {
        const tier = p.score.award;
        const bg = tier === 'exceptional' ? c.stout : tier === 'gold' ? c.brass : tier === 'recommended' ? c.brand : '#fff';
        const fg = tier === 'exceptional' ? c.brass : tier === 'gold' ? c.stout : tier === 'recommended' ? '#fff' : c.ink;
        html = `<div style="transform:translate(-50%,-100%);position:absolute;left:50%;top:50%;display:flex;flex-direction:column;align-items:center"><div style="background:${bg};color:${fg};padding:3px 9px;border-radius:10px;font:800 14px 'BricolageGrotesque_800ExtraBold',sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.25);border:1px solid rgba(0,0,0,.08)">${idx}</div><div style="width:8px;height:8px;background:${bg};transform:rotate(45deg);margin-top:-5px"></div></div>`;
        size = [1, 1];
      }
      const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html, iconSize: size }), title: p.name, riseOnHover: true });
      mk.bindTooltip(`<b>${esc(p.name)}</b><br/>${idx == null ? 'Not yet rated' : `Excellence Index ${idx}`}`, { direction: 'top', offset: [0, -14] });
      mk.on('click', () => pick.current(p.id));
      return mk;
    });
    layer.addLayers(markers);
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubs]);

  useEffect(() => {
    const cur = map.current;
    if (!cur) return;
    cur.map.setView([here.lat, here.lng]);
    cur.me.setLatLng([here.lat, here.lng]);
  }, [here.lat, here.lng]);

  return <View ref={box} style={{ height, width: '100%', backgroundColor: c.surfaceMuted, zIndex: 0 }} />;
}
