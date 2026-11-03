// Loads pubs from OpenStreetMap into the live database through the Supabase
// Management API. Usage: SUPABASE_ACCESS_TOKEN=… PROJECT_REF=… node osm-pubs.mjs london
// Data © OpenStreetMap contributors, ODbL.

const AREAS = {
  // south, west, north, east
  london: { bbox: [51.28, -0.51, 51.70, 0.33], city: 'London', country: 'United Kingdom' },
  dublin: { bbox: [53.22, -6.45, 53.43, -6.04], city: 'Dublin', country: 'Ireland' },
  manchester: { bbox: [53.39, -2.35, 53.55, -2.12], city: 'Manchester', country: 'United Kingdom' },
};

const areaKey = process.argv[2] ?? 'london';
const area = AREAS[areaKey];
if (!area) throw new Error(`Unknown area ${areaKey}`);
const { SUPABASE_ACCESS_TOKEN: token, PROJECT_REF: ref } = process.env;
if (!token || !ref) throw new Error('Set SUPABASE_ACCESS_TOKEN and PROJECT_REF');

const [s, w, n, e] = area.bbox;
const query = `[out:json][timeout:180];(node["amenity"="pub"](${s},${w},${n},${e});way["amenity"="pub"](${s},${w},${n},${e}););out center tags;`;
// The public Overpass servers are often busy, so try a few with backoff.
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
async function overpass() {
  let last;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = SERVERS[attempt % SERVERS.length];
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'ratemyguin-seed/1.0' },
        body: new URLSearchParams({ data: query }),
      });
      if (r.ok) return r;
      last = `${url} ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } catch (err) {
      last = `${url}: ${err.message}`;
    }
    const wait = 5000 * 2 ** attempt;
    console.log(`Overpass busy (${last.split('\n')[0]}), retrying in ${wait / 1000}s`);
    await new Promise((ok) => setTimeout(ok, wait));
  }
  throw new Error(`Overpass failed: ${last}`);
}
const res = await overpass();
const { elements } = await res.json();

const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const rows = [];
for (const el of elements) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!t.name || lat == null || lon == null) continue;
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const address = street || t['addr:place'] || t['addr:postcode'] || area.city;
  const hood = t['addr:suburb'] || t['addr:district'] || t['addr:neighbourhood'] || null;
  const website = t.website || t['contact:website'] || null;
  const brand = t.brand || t.operator || null;
  const commons = t.wikimedia_commons?.startsWith('File:') ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(t.wikimedia_commons.slice(5))}?width=800` : null;
  const image = t.image?.startsWith('http') ? t.image : commons;
  const yes = (k) => t[k] && t[k] !== 'no';
  const features = [
    (yes('beer_garden') || t.outdoor_seating === 'yes' || t.garden === 'yes') && 'beer_garden',
    (yes('food') || t.cuisine || t.kitchen === 'yes') && 'food',
    (t.tv === 'yes' || yes('sport:tv') || /football|soccer|rugby/.test(t.sport ?? '')) && 'sport',
    (t.music === 'no' || t.tv === 'no') && 'quiet',
    t.wheelchair === 'yes' && 'step_free',
  ].filter(Boolean);
  const opened = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(t.start_date ?? '') ? `${t.start_date}-01-01`.slice(0, 10) : null;
  rows.push(`(${q(t.name)}, ${q(address)}, ${q(hood)}, ${q(area.city)}, ${q(area.country)}, 'SRID=4326;POINT(${lon} ${lat})', ${q(`${el.type}/${el.id}`)}, ${q(t.opening_hours)}, ${q(website)}, ${q(brand)}, ${q(t['brand:wikidata'])}, ${q(image)}, array[${features.map(q).join(',')}]::text[], ${q(opened)})`);
}
console.log(`${rows.length} named pubs found in ${area.city}`);

for (let i = 0; i < rows.length; i += 500) {
  const sql = `insert into public.pubs (name, address, neighbourhood, city, country, location, osm_id, opening_hours, website, brand, brand_wikidata, image_url, osm_features, opened_on) values
${rows.slice(i, i + 500).join(',\n')}
on conflict (osm_id) do update set name = excluded.name, address = excluded.address,
  neighbourhood = coalesce(excluded.neighbourhood, pubs.neighbourhood), location = excluded.location,
  opening_hours = coalesce(pubs.opening_hours, excluded.opening_hours),
  website = coalesce(excluded.website, pubs.website), brand = coalesce(excluded.brand, pubs.brand),
  brand_wikidata = coalesce(excluded.brand_wikidata, pubs.brand_wikidata), image_url = coalesce(pubs.image_url, excluded.image_url),
  osm_features = excluded.osm_features, opened_on = coalesce(excluded.opened_on, pubs.opened_on);`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  console.log(`Loaded ${Math.min(i + 500, rows.length)} of ${rows.length}`);
}
