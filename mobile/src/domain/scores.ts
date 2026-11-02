// The RateMyGuin Excellence Index and the rules behind it.
// Pure functions only, so the app, the tests and (mirrored in SQL) the database agree.

export const SUB_SCORES = ['taste', 'temperature', 'head', 'texture', 'pour'] as const;
export type SubScore = (typeof SUB_SCORES)[number];

export const SUB_SCORE_LABELS: Record<SubScore, string> = {
  taste: 'Taste',
  temperature: 'Temperature',
  head: 'Head',
  texture: 'Texture',
  pour: 'Pour',
};

/** One pint, as rated. All scores are 0–10 (half points allowed). */
export type PintRating = {
  id: string;
  pubId: string;
  userId: string;
  overall: number;
  taste: number;
  temperature: number;
  head: number;
  texture: number;
  pour: number;
  /** Atmosphere and service, 0–10. Optional: not everyone wants to judge the room. */
  atmosphere?: number | null;
  /** Price paid in pence. */
  pricePence?: number | null;
  ratedAt: string; // ISO timestamp
  verification: Verification;
  /** Reviewer credibility weight, 0–2 (see reviewerWeight). */
  weight: number;
};

export type Verification = 'none' | 'gps' | 'gps_receipt';

/** Proposed starting weights for the Index. Could be refined through customer research. */
export const INDEX_WEIGHTS = {
  pour: 0.4, // pour quality: pour + head + texture, the craft of the barman
  tasteTemperature: 0.2,
  consistency: 0.15,
  atmosphereService: 0.15,
  value: 0.1,
} as const;

/** Ratings needed before a pub gets a public Index, and before it can win an award. */
export const MIN_RATINGS_FOR_INDEX = 3;
export const MIN_RATINGS_FOR_AWARD = 10;

/** Only the last year counts: a pint from two landlords ago tells you nothing. */
export const INDEX_WINDOW_DAYS = 365;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function validateRating(r: Pick<PintRating, 'overall' | SubScore> & { atmosphere?: number | null; pricePence?: number | null }): string | null {
  for (const key of ['overall', ...SUB_SCORES] as const) {
    const v = r[key];
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 10) return `${key} must be between 0 and 10`;
    if (Math.round(v * 2) !== v * 2) return `${key} must be in half points`;
  }
  if (r.atmosphere != null && (r.atmosphere < 0 || r.atmosphere > 10)) return 'atmosphere must be between 0 and 10';
  if (r.pricePence != null && (r.pricePence < 100 || r.pricePence > 3000)) return 'price looks wrong';
  return null;
}

/** Weighted mean, ignoring weightless entries. Returns null when nothing counts. */
function wmean(pairs: [value: number, weight: number][]): number | null {
  let s = 0;
  let w = 0;
  for (const [v, wt] of pairs) {
    if (wt <= 0) continue;
    s += v * wt;
    w += wt;
  }
  return w > 0 ? s / w : null;
}

/**
 * Consistency, 0–10: a pub that pours 8s every time beats one that swings 4 to 10.
 * Weighted standard deviation of overall scores; a spread of 3 points or more scores 0.
 */
export function consistencyScore(ratings: Pick<PintRating, 'overall' | 'weight'>[]): number | null {
  const counted = ratings.filter((r) => r.weight > 0);
  if (counted.length < 2) return null;
  const mean = wmean(counted.map((r) => [r.overall, r.weight]))!;
  const variance = wmean(counted.map((r) => [(r.overall - mean) ** 2, r.weight]))!;
  const sd = Math.sqrt(variance);
  return clamp(10 - (sd / 3) * 10, 0, 10);
}

/**
 * Value for money, 0–10, from the price against the local median.
 * At the median scores 7; 25% cheaper scores 10; 50% dearer scores 0.
 * Quality is already counted elsewhere, so this is price alone.
 */
export function valueScore(pricePence: number, localMedianPence: number): number {
  if (localMedianPence <= 0) return 7;
  const ratio = pricePence / localMedianPence;
  if (ratio <= 1) return clamp(7 + ((1 - ratio) / 0.25) * 3, 0, 10);
  return clamp(7 - ((ratio - 1) / 0.5) * 7, 0, 10);
}

export type IndexBreakdown = {
  /** 0–100, or null when there aren't enough ratings yet. */
  index: number | null;
  ratingCount: number;
  verifiedShare: number; // 0–1
  /** Each component on 0–10, for the breakdown bars. */
  components: {
    pour: number | null;
    tasteTemperature: number | null;
    consistency: number | null;
    atmosphereService: number | null;
    value: number | null;
  };
  averageOverall: number | null;
  medianPricePence: number | null;
  award: AwardTier | null;
};

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Prior that a pub's score is shrunk towards while it has few ratings, so one
 * enthusiastic regular can't put a pub at the top. Equivalent to this many
 * full-weight ratings at the prior value.
 */
export const PRIOR_STRENGTH = 5;
export const PRIOR_INDEX = 70;

export function excellenceIndex(
  allRatings: PintRating[],
  opts: { now?: Date; localMedianPence?: number | null } = {},
): IndexBreakdown {
  const now = opts.now ?? new Date();
  const cutoff = now.getTime() - INDEX_WINDOW_DAYS * 86_400_000;
  const ratings = allRatings.filter((r) => r.weight > 0 && Date.parse(r.ratedAt) >= cutoff);

  const pourCraft = wmean(ratings.map((r) => [(r.pour * 2 + r.head + r.texture) / 4, r.weight]));
  const tasteTemp = wmean(ratings.map((r) => [(r.taste + r.temperature) / 2, r.weight]));
  const consistency = consistencyScore(ratings);
  const atmos = wmean(ratings.filter((r) => r.atmosphere != null).map((r) => [r.atmosphere!, r.weight]));
  const prices = ratings.map((r) => r.pricePence).filter((p): p is number => p != null);
  const medianPrice = median(prices);
  const localMedian = opts.localMedianPence ?? medianPrice;
  const value = medianPrice != null && localMedian != null ? valueScore(medianPrice, localMedian) : null;

  const components = {
    pour: pourCraft,
    tasteTemperature: tasteTemp,
    consistency,
    atmosphereService: atmos,
    value,
  };

  // Missing components (no atmosphere votes, no prices) fall back to the pour-and-taste
  // average rather than dragging the pub down for what nobody reported.
  const fallback = wmean([
    [pourCraft ?? 0, pourCraft == null ? 0 : 2],
    [tasteTemp ?? 0, tasteTemp == null ? 0 : 1],
  ]);
  let raw: number | null = null;
  if (fallback != null) {
    raw =
      (INDEX_WEIGHTS.pour * (pourCraft ?? fallback) +
        INDEX_WEIGHTS.tasteTemperature * (tasteTemp ?? fallback) +
        INDEX_WEIGHTS.consistency * (consistency ?? fallback) +
        INDEX_WEIGHTS.atmosphereService * (atmos ?? fallback) +
        INDEX_WEIGHTS.value * (value ?? fallback)) *
      10;
  }

  const totalWeight = ratings.reduce((s, r) => s + r.weight, 0);
  let index: number | null = null;
  if (raw != null && ratings.length >= MIN_RATINGS_FOR_INDEX) {
    index = Math.round((raw * totalWeight + PRIOR_INDEX * PRIOR_STRENGTH) / (totalWeight + PRIOR_STRENGTH));
  }

  const verified = ratings.filter((r) => r.verification !== 'none').length;
  return {
    index,
    ratingCount: ratings.length,
    verifiedShare: ratings.length ? verified / ratings.length : 0,
    components,
    averageOverall: (() => {
      const a = wmean(ratings.map((r) => [r.overall, r.weight]));
      return a == null ? null : round1(a);
    })(),
    medianPricePence: medianPrice,
    award: index != null && ratings.length >= MIN_RATINGS_FOR_AWARD ? awardFor(index) : null,
  };
}

// ── Awards ────────────────────────────────────────────────────────────────

export type AwardTier = 'exceptional' | 'gold' | 'recommended';

export const AWARDS: Record<AwardTier, { name: string; range: string; blurb: string; min: number }> = {
  exceptional: { name: 'Exceptional', range: '95–100', blurb: 'Outstanding overall experience', min: 95 },
  gold: { name: 'Gold Standard', range: '90–94', blurb: 'Consistently excellent', min: 90 },
  recommended: { name: 'Highly Recommended', range: '80–89', blurb: 'A very good pint', min: 80 },
};

export const AWARD_DISCLAIMER = 'Independent award. Not official Guinness recognition.';

export function awardFor(index: number): AwardTier | null {
  if (index >= 95) return 'exceptional';
  if (index >= 90) return 'gold';
  if (index >= 80) return 'recommended';
  return null;
}
