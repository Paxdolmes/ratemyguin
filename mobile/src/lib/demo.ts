// Demo mode: sample pubs, people and ratings so both apps run with no backend.
// Pub names are made up; they are not real London pubs.

import type { PintRating, Verification } from '@/domain/scores';

export type Pub = {
  id: string;
  name: string;
  address: string;
  neighbourhood: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  atmosphere: 'Lively' | 'Cosy' | 'Sports' | 'Traditional';
  hours: string;
};

export type Person = { id: string; name: string; handle: string; city: string };

export const ME: Person = { id: 'me', name: 'You', handle: 'you', city: 'London' };

export const PEOPLE: Person[] = [
  { id: 'u1', name: 'Aoife Byrne', handle: 'aoife', city: 'London' },
  { id: 'u2', name: 'Ben Carter', handle: 'bencarter', city: 'London' },
  { id: 'u3', name: 'Ciarán Walsh', handle: 'ciaran', city: 'Dublin' },
  { id: 'u4', name: 'Dee Okafor', handle: 'deeo', city: 'London' },
  { id: 'u5', name: 'Eimear Doyle', handle: 'eimear', city: 'London' },
  { id: 'u6', name: 'Finn Murphy', handle: 'finn', city: 'Manchester' },
  { id: 'u7', name: 'Grace Lee', handle: 'gracel', city: 'London' },
  { id: 'u8', name: 'Hugh Kelly', handle: 'hughk', city: 'London' },
];

export const FRIENDS = new Set(['u1', 'u2', 'u4']);

export const PUBS: Pub[] = [
  { id: 'p1', name: 'The Settle Inn', address: '14 Munster Rd', neighbourhood: 'Fulham', city: 'London', country: 'United Kingdom', lat: 51.4795, lng: -0.2052, atmosphere: 'Traditional', hours: '12:00–23:00' },
  { id: 'p2', name: 'The Black & Cream', address: '3 Lillie Rd', neighbourhood: 'Fulham', city: 'London', country: 'United Kingdom', lat: 51.4842, lng: -0.2010, atmosphere: 'Cosy', hours: '12:00–23:30' },
  { id: 'p3', name: 'The Two-Part Pour', address: '88 Kings Rd', neighbourhood: 'Chelsea', city: 'London', country: 'United Kingdom', lat: 51.4876, lng: -0.1702, atmosphere: 'Lively', hours: '11:00–00:00' },
  { id: 'p4', name: 'The Porter House', address: '21 New Kings Rd', neighbourhood: 'Parsons Green', city: 'London', country: 'United Kingdom', lat: 51.4741, lng: -0.1990, atmosphere: 'Sports', hours: '12:00–23:00' },
  { id: 'p5', name: 'The Quiet Corner', address: '5 Elm Row', neighbourhood: 'Kilburn', city: 'London', country: 'United Kingdom', lat: 51.5475, lng: -0.1937, atmosphere: 'Traditional', hours: '12:00–23:00' },
  { id: 'p6', name: 'The Creamy Head', address: '40 Camden High St', neighbourhood: 'Camden', city: 'London', country: 'United Kingdom', lat: 51.5390, lng: -0.1426, atmosphere: 'Lively', hours: '12:00–01:00' },
  { id: 'p7', name: 'The Long Settle', address: '2 Wapping Lane', neighbourhood: 'Wapping', city: 'London', country: 'United Kingdom', lat: 51.5046, lng: -0.0583, atmosphere: 'Cosy', hours: '12:00–23:00' },
  { id: 'p8', name: 'The Stout Heart', address: '77 Stoke Newington Ch St', neighbourhood: 'Stoke Newington', city: 'London', country: 'United Kingdom', lat: 51.5626, lng: -0.0794, atmosphere: 'Cosy', hours: '16:00–23:30' },
];

// A deterministic pseudo-random so the demo looks the same every time.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Each pub's "true" quality and price; ratings scatter around it. */
const PROFILE: Record<string, { q: number; pour: number; spread: number; price: number; n: number }> = {
  p1: { q: 9.4, pour: 9.7, spread: 0.4, price: 610, n: 46 },
  p2: { q: 9.1, pour: 9.3, spread: 0.5, price: 640, n: 38 },
  p3: { q: 8.4, pour: 8.6, spread: 0.9, price: 720, n: 29 },
  p4: { q: 7.2, pour: 6.8, spread: 1.4, price: 650, n: 22 },
  p5: { q: 9.6, pour: 9.8, spread: 0.3, price: 580, n: 51 },
  p6: { q: 7.9, pour: 8.0, spread: 1.1, price: 690, n: 18 },
  p7: { q: 8.8, pour: 9.0, spread: 0.6, price: 660, n: 25 },
  p8: { q: 8.9, pour: 9.1, spread: 0.6, price: 630, n: 7 },
};

const NOTES = [
  'Proper settle, glass left to rest. Perfect.',
  'Bit warm tonight but the head was spot on.',
  'Creamy, cold, clean glass. Best in the area.',
  'Rushed the pour, big bubbles. Still decent.',
  'Barman knows what he is doing. Worth the trip.',
  'Lovely dome on top, tasted fresh.',
];

const half = (n: number) => Math.max(0, Math.min(10, Math.round(n * 2) / 2));

export function demoRatings(now = new Date()): (PintRating & { note: string })[] {
  const out: (PintRating & { note: string })[] = [];
  const r = rng(42);
  let id = 0;
  for (const pub of PUBS) {
    const p = PROFILE[pub.id];
    for (let i = 0; i < p.n; i++) {
      const jitter = () => (r() - 0.5) * 2 * p.spread;
      const base = p.q + jitter();
      const person = PEOPLE[Math.floor(r() * PEOPLE.length)];
      const verification: Verification = r() < 0.75 ? (r() < 0.2 ? 'gps_receipt' : 'gps') : 'none';
      const daysAgo = Math.floor(r() * 300);
      out.push({
        id: `d${++id}`,
        pubId: pub.id,
        userId: person.id,
        overall: half(base),
        taste: half(base + jitter() * 0.5),
        temperature: half(base - 0.2 + jitter() * 0.5),
        head: half(p.pour + jitter() * 0.5),
        texture: half((p.pour + base) / 2 + jitter() * 0.5),
        pour: half(p.pour + jitter() * 0.5),
        atmosphere: r() < 0.7 ? half(base - 0.3 + jitter()) : null,
        pricePence: r() < 0.85 ? p.price + Math.round((r() - 0.5) * 4) * 10 : null,
        ratedAt: new Date(now.getTime() - daysAgo * 86_400_000 - Math.floor(r() * 6) * 3_600_000).toISOString(),
        verification,
        weight: verification === 'none' ? 0.45 : verification === 'gps' ? 1.15 : 1.4,
        note: NOTES[Math.floor(r() * NOTES.length)],
      });
    }
  }
  return out.sort((a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt));
}

/** The demo pub that "RateMyGuin for Pubs" signs in as. */
export const MY_PUB_ID = 'p2';
