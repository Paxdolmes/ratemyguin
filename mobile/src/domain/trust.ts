// Verified ratings and anti-fraud: was the rater really at the pub, and how much
// should their rating count?

import { clamp, type Verification } from './scores.ts';

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function distanceMetres(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** How close a phone must be to the pub, and how sure of its position, to count as a visit. */
export const VISIT_RADIUS_M = 75;
export const MAX_GPS_ACCURACY_M = 60;

export type Fix = LatLng & { accuracyM: number; at: string };

export function verifyVisit(pub: LatLng, fix: Fix | null): { verified: boolean; reason: string } {
  if (!fix) return { verified: false, reason: 'No location shared' };
  if (fix.accuracyM > MAX_GPS_ACCURACY_M) return { verified: false, reason: 'Location too rough to confirm' };
  const d = distanceMetres(pub, fix) - fix.accuracyM / 2;
  if (d > VISIT_RADIUS_M) return { verified: false, reason: `You're ${Math.round(d)} m from the pub` };
  return { verified: true, reason: 'Verified visit' };
}

export type RaterHistory = {
  ratingsCount: number;
  accountAgeDays: number;
  verifiedShare: number; // 0–1, of their past ratings
  /** Ratings of theirs that moderators removed as fake. */
  removedCount: number;
  /** Does this rater own or work at the pub? Their ratings of it never count. */
  isPubStaff: boolean;
};

/**
 * Reviewer credibility weight for one rating, 0–2.
 * New, unverified accounts count for a little; seasoned, verified raters count double.
 */
export function reviewerWeight(h: RaterHistory, verification: Verification): number {
  if (h.isPubStaff) return 0;
  if (h.removedCount >= 3) return 0;
  let w = verification === 'gps_receipt' ? 1.25 : verification === 'gps' ? 1 : 0.4;
  // Experience: up to +40% over the first 50 ratings.
  w *= 1 + 0.4 * Math.min(h.ratingsCount, 50) / 50;
  // Fresh accounts are discounted for their first month.
  if (h.accountAgeDays < 30) w *= 0.6 + 0.4 * (h.accountAgeDays / 30);
  // Raters who usually verify are trusted a little more.
  w *= 0.85 + 0.3 * h.verifiedShare;
  // Each removed fake halves what's left.
  w *= 0.5 ** h.removedCount;
  return Math.round(clamp(w, 0, 2) * 100) / 100;
}

/** Same pub, same person: one pint rating every 3 hours, so a session is one vote. */
export const SAME_PUB_COOLDOWN_H = 3;
/** Faster than this between two verified pubs means a spoofed location. */
export const MAX_PLAUSIBLE_KMH = 120;

export type PriorRating = { pubId: string; at: string; location: LatLng | null };

export type FraudCheck = { ok: true } | { ok: false; reason: string };

export function checkNewRating(
  next: { pubId: string; at: string; location: LatLng | null },
  previous: PriorRating[],
): FraudCheck {
  const t = Date.parse(next.at);
  for (const p of previous) {
    const dtH = (t - Date.parse(p.at)) / 3_600_000;
    if (p.pubId === next.pubId && dtH >= 0 && dtH < SAME_PUB_COOLDOWN_H) {
      return { ok: false, reason: 'You rated this pub in the last 3 hours. One rating a visit.' };
    }
  }
  const latest = previous
    .filter((p) => p.location && Date.parse(p.at) <= t)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (latest?.location && next.location) {
    const hours = Math.max((t - Date.parse(latest.at)) / 3_600_000, 1 / 60);
    const kmh = distanceMetres(latest.location, next.location) / 1000 / hours;
    if (kmh > MAX_PLAUSIBLE_KMH) return { ok: false, reason: 'That location jump looks impossible. Try again from the pub.' };
  }
  // More than 12 pints rated in a day is a crawl gone wrong or a bot.
  const dayAgo = t - 86_400_000;
  if (previous.filter((p) => Date.parse(p.at) > dayAgo).length >= 12) {
    return { ok: false, reason: "That's a lot of pints for one day. Try again tomorrow." };
  }
  return { ok: true };
}
