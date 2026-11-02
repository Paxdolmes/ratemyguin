// The Guinness Passport: pubs collected, badges earned, explorer points.

export type Stamp = { pubId: string; city: string; country: string; at: string; pubIndex: number | null; verified: boolean };

export const PUB_MILESTONES = [10, 25, 50, 100] as const;

export type Badge = { id: string; title: string; detail: string; earnedAt: string | null; progress: number; target: number };

/** Distinct pubs, keeping the first verified visit (or first visit) to each. */
export function uniqueStamps(stamps: Stamp[]): Stamp[] {
  const sorted = [...stamps].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const byPub = new Map<string, Stamp>();
  for (const s of sorted) {
    const have = byPub.get(s.pubId);
    if (!have || (!have.verified && s.verified)) byPub.set(s.pubId, s);
  }
  return [...byPub.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function badges(stamps: Stamp[]): Badge[] {
  const pubs = uniqueStamps(stamps).filter((s) => s.verified);
  const out: Badge[] = PUB_MILESTONES.map((n) => ({
    id: `pubs-${n}`,
    title: `${n} pubs`,
    detail: `Rate a pint in ${n} different pubs`,
    earnedAt: pubs.length >= n ? pubs[n - 1].at : null,
    progress: Math.min(pubs.length, n),
    target: n,
  }));
  const seenCity = new Map<string, string>();
  const seenCountry = new Map<string, string>();
  for (const s of pubs) {
    if (!seenCity.has(s.city)) seenCity.set(s.city, s.at);
    if (!seenCountry.has(s.country)) seenCountry.set(s.country, s.at);
  }
  for (const [city, at] of seenCity) out.push({ id: `city-${city}`, title: city, detail: `First verified pint in ${city}`, earnedAt: at, progress: 1, target: 1 });
  for (const [country, at] of seenCountry) out.push({ id: `country-${country}`, title: country, detail: `First verified pint in ${country}`, earnedAt: at, progress: 1, target: 1 });
  const goldPubs = pubs.filter((s) => (s.pubIndex ?? 0) >= 90).length;
  out.push({ id: 'gold-hunter', title: 'Gold hunter', detail: 'Visit 5 Gold Standard or better pubs', earnedAt: goldPubs >= 5 ? 'earned' : null, progress: Math.min(goldPubs, 5), target: 5 });
  return out;
}

/**
 * Explorer points for the monthly rankings. New verified pubs score most, so the
 * leaderboard rewards exploring, not drinking: 10 for a new pub, +5 if it's
 * Gold Standard or better, 2 for a repeat verified visit, 0 unverified.
 */
export function explorerPoints(stampsThisMonth: Stamp[], everVisitedBefore: Set<string>): number {
  let pts = 0;
  const seen = new Set(everVisitedBefore);
  for (const s of [...stampsThisMonth].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (!s.verified) continue;
    if (seen.has(s.pubId)) {
      pts += 2;
    } else {
      seen.add(s.pubId);
      pts += 10 + ((s.pubIndex ?? 0) >= 90 ? 5 : 0);
    }
  }
  return pts;
}

export type LeaderRow = { userId: string; name: string; points: number };

export function rankLeaderboard(rows: LeaderRow[]): (LeaderRow & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  let rank = 0;
  let prev = Number.NaN;
  return sorted.map((r, i) => {
    if (r.points !== prev) rank = i + 1;
    prev = r.points;
    return { ...r, rank };
  });
}
