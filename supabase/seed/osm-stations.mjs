// Loads London's Tube, Overground, Elizabeth line, DLR, tram and rail stations from
// OpenStreetMap, for "nearest station" on each pub. Usage as osm-pubs.mjs.
// Data © OpenStreetMap contributors, ODbL.

const { SUPABASE_ACCESS_TOKEN: token, PROJECT_REF: ref } = process.env;
if (!token || !ref) throw new Error('Set SUPABASE_ACCESS_TOKEN and PROJECT_REF');

const [s, w, n, e] = [51.28, -0.51, 51.70, 0.33];
const query = `[out:json][timeout:180];(
  nwr["railway"="station"](${s},${w},${n},${e});
  nwr["railway"="halt"](${s},${w},${n},${e});
  node["railway"="tram_stop"]["network"~"Tramlink"](${s},${w},${n},${e});
);out center tags;`;
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let res, last;
for (let attempt = 0; attempt < 6 && !res; attempt++) {
  const url = SERVERS[attempt % SERVERS.length];
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'ratemyguin-seed/1.0' }, body: new URLSearchParams({ data: query }) });
    if (r.ok) res = r;
    else last = `${url} ${r.status}`;
  } catch (err) {
    last = `${url}: ${err.message}`;
  }
  if (!res) await new Promise((ok) => setTimeout(ok, 5000 * 2 ** attempt));
}
if (!res) throw new Error(`Overpass failed: ${last}`);
const { elements } = await res.json();

const kindOf = (t) => {
  const net = `${t.network ?? ''};${t.operator ?? ''};${t.line ?? ''}`;
  if (t.station === 'subway' || /Underground/i.test(net)) return 'tube';
  if (/Elizabeth/i.test(net)) return 'elizabeth';
  if (/Docklands|DLR/i.test(net)) return 'dlr';
  if (/Overground/i.test(net)) return 'overground';
  if (t.railway === 'tram_stop' || /Tramlink/i.test(net)) return 'tram';
  return 'rail';
};
const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
// A station is often mapped twice (a point and an outline), so keep one per name and line type.
const seen = new Set();
const rows = [];
for (const el of [...elements].sort((a, b) => (a.type === 'node' ? 0 : 1) - (b.type === 'node' ? 0 : 1))) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!el.tags?.name || lat == null || lon == null) continue;
  const name = el.tags.name.replace(/ (Underground|Rail|DLR) Station$/i, '').replace(/ Station$/i, '');
  const kind = kindOf(el.tags);
  if (seen.has(`${name}|${kind}`)) continue;
  seen.add(`${name}|${kind}`);
  rows.push(`(${q(name)}, ${q(kind)}, 'SRID=4326;POINT(${lon} ${lat})', ${q(`${el.type}/${el.id}`)})`);
}
console.log(`${rows.length} stations found`);

for (let i = 0; i < rows.length; i += 500) {
  const sql = `insert into public.stations (name, kind, location, osm_id) values ${rows.slice(i, i + 500).join(',\n')}
on conflict (osm_id) do update set name = excluded.name, kind = excluded.kind, location = excluded.location;`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}
console.log('Stations loaded');
