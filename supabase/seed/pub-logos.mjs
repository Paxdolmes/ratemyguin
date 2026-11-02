// Finds a logo (and a photo where there is one) for pubs that have a website or a brand.
// - Brands (Fuller's, Young's, Wetherspoon…): the logo on their Wikidata entry.
// - Pub websites: an image marked as the logo, else the site's app icon, else its share image.
// Owners can replace these once they claim their pub.
// Usage: SUPABASE_ACCESS_TOKEN=… PROJECT_REF=… node pub-logos.mjs [limit]

const { SUPABASE_ACCESS_TOKEN: token, PROJECT_REF: ref } = process.env;
if (!token || !ref) throw new Error('Set SUPABASE_ACCESS_TOKEN and PROJECT_REF');
const limit = Number(process.argv[2] ?? 1500);

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const UA = 'RateMyGuinBot/1.0 (+https://ratemyguin.com)';

async function get(url, ms = 8000) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r;
}

const brandLogos = new Map();
async function wikidataLogo(qid) {
  if (!/^Q\d+$/.test(qid ?? '')) return null;
  if (brandLogos.has(qid)) return brandLogos.get(qid);
  let logo = null;
  try {
    const j = await (await get(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).json();
    const file = j.entities?.[qid]?.claims?.P154?.[0]?.mainsnak?.datavalue?.value;
    if (file) logo = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=256`;
  } catch {}
  brandLogos.set(qid, logo);
  return logo;
}

const attr = (tag, name) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
function abs(u, base) {
  try {
    const url = new URL(u.replace(/&amp;/g, '&'), base);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

async function siteImages(website) {
  let base = website.startsWith('http') ? website : `https://${website}`;
  const r = await get(base);
  base = r.url;
  const html = (await r.text()).slice(0, 400_000);
  const tags = (re) => [...html.matchAll(re)].map((m) => m[0]);
  const imgs = tags(/<img\b[^>]*>/gi);
  const logoImg = imgs.find((t) => /logo/i.test(`${attr(t, 'class') ?? ''} ${attr(t, 'alt') ?? ''} ${attr(t, 'src') ?? ''} ${attr(t, 'id') ?? ''}`) && !/\.gif(\?|$)/i.test(attr(t, 'src') ?? ''));
  const links = tags(/<link\b[^>]*>/gi);
  const touch = links.find((t) => /apple-touch-icon/i.test(attr(t, 'rel') ?? ''));
  const metas = tags(/<meta\b[^>]*>/gi);
  const og = metas.find((t) => /og:image$/i.test(attr(t, 'property') ?? attr(t, 'name') ?? ''));
  const src = (t, a) => (t ? abs(attr(t, a) ?? '', base) : null);
  const logo = src(logoImg, 'src') ?? src(touch, 'href');
  const photo = src(og, 'content');
  return { logo: logo ?? photo, photo };
}

const pubs = await sql(`select id, name, website, brand_wikidata, image_url from public.pubs
  where logo_checked_at is null and (website is not null or brand_wikidata is not null)
  order by (website is null), name limit ${limit}`);
console.log(`Looking for logos for ${pubs.length} pubs`);

let found = 0;
const updates = [];
async function work(p) {
  let logo = null;
  let photo = null;
  if (p.website) {
    try {
      ({ logo, photo } = await siteImages(p.website));
    } catch {}
  }
  if (!logo) logo = await wikidataLogo(p.brand_wikidata);
  if (logo) found++;
  updates.push(`(${q(p.id)}::uuid, ${q(logo)}, ${q(p.image_url ? null : photo)})`);
}

const queue = [...pubs];
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (queue.length) await work(queue.shift());
  }),
);

for (let i = 0; i < updates.length; i += 300) {
  await sql(`update public.pubs p set logo_url = coalesce(v.logo, p.logo_url), image_url = coalesce(p.image_url, v.photo), logo_checked_at = now()
    from (values ${updates.slice(i, i + 300).join(',')}) as v(id, logo, photo) where p.id = v.id;`);
}
const [stats] = await sql(`select count(*) filter (where logo_url is not null) as logos, count(*) filter (where image_url is not null) as photos,
  count(*) filter (where website is not null) as websites, count(*) as pubs from public.pubs`);
console.log(`Found ${found} logos this run. Totals: ${JSON.stringify(stats)}`);
