// Proof of concept: visits London pubs' own websites and saves the text around any
// offers or deals, for a person (or Claude) to read and turn into offers.
// Usage: SUPABASE_ACCESS_TOKEN=… PROJECT_REF=… node scrape-offers.mjs out.jsonl [limit]
// Respects robots.txt, identifies itself, and only reads a pub's own website.
import { writeFileSync } from 'node:fs';

const [out = 'offer-pages.jsonl', limitArg = '2000'] = process.argv.slice(2);
const { SUPABASE_ACCESS_TOKEN: token, PROJECT_REF: ref } = process.env;
const UA = 'ratemyGuin-offers/0.1 (+https://ratemyguin.com)';

const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ query: `select id, name, website, neighbourhood from public.pubs where city = 'London' and website is not null order by random() limit ${Number(limitArg)}` }),
});
const pubs = await r.json();
console.log(`${pubs.length} pubs with websites`);

const KEY = /(offer|deal|special|happy hour|quiz|£\s?\d|half price|% off|two for|2 for|pie|roast|burger|steak night|curry night|wings|bottomless|live music|comedy|karaoke|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i;
const LINK = /(offer|deal|special|whats-?on|what-s-on|events?|happening|food|kitchen)/i;

async function get(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null;
    return { url: res.url, html: (await res.text()).slice(0, 800000) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function allowed(origin, path) {
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return true;
    let applies = false;
    const rules = [];
    for (const line of (await res.text()).split('\n')) {
      const [k, ...v] = line.split(':');
      const key = k.trim().toLowerCase();
      const val = v.join(':').trim();
      if (key === 'user-agent') applies = val === '*' || /ratemyguin/i.test(val);
      else if (applies && key === 'disallow' && val) rules.push(val);
    }
    return !rules.some((d) => path.startsWith(d));
  } catch {
    return true;
  }
}

const text = (html) =>
  html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&pound;/g, '£').replace(/&#163;/g, '£').replace(/&#8217;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

// Only the lines that look like offers, with a little context.
function snippets(t) {
  const lines = t.split('\n').map((l) => l.trim()).filter((l) => l.length > 3 && l.length < 400);
  const keep = new Set();
  lines.forEach((l, i) => {
    if (KEY.test(l)) for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 1); j++) keep.add(j);
  });
  return [...keep].sort((a, b) => a - b).map((i) => lines[i]).join('\n').slice(0, 2500);
}

async function visit(pub) {
  let site = pub.website.trim();
  if (!/^https?:/i.test(site)) site = `https://${site}`;
  let origin;
  try { origin = new URL(site).origin; } catch { return null; }
  if (!(await allowed(origin, new URL(site).pathname))) return { ...pub, robots: true, pages: [] };
  const home = await get(site);
  if (!home) return null;
  const pages = [{ url: home.url, text: snippets(text(home.html)) }];
  const links = [...home.html.matchAll(/href="([^"#]+)"/gi)]
    .map((m) => { try { return new URL(m[1], home.url); } catch { return null; } })
    .filter((u) => u && u.origin === new URL(home.url).origin && LINK.test(u.pathname))
    .map((u) => u.href);
  for (const link of [...new Set(links)].slice(0, 3)) {
    if (!(await allowed(origin, new URL(link).pathname))) continue;
    const p = await get(link);
    if (p) pages.push({ url: p.url, text: snippets(text(p.html)) });
  }
  return { ...pub, pages: pages.filter((p) => p.text) };
}

const results = [];
let i = 0;
await Promise.all(Array.from({ length: 16 }, async () => {
  while (i < pubs.length) {
    const pub = pubs[i++];
    const res = await visit(pub);
    if (res?.pages?.length) results.push(res);
  }
}));
writeFileSync(out, results.map((x) => JSON.stringify(x)).join('\n'));
console.log(`${results.length} pubs with offer-like text saved to ${out}`);
