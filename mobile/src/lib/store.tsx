// App state for demo mode: pubs, ratings and the signed-in drinker's passport.
// With Supabase keys the same shape comes from the pub_scores view and public_ratings.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { excellenceIndex, median, type IndexBreakdown, type PintRating } from '@/domain/scores';
import { checkNewRating, distanceMetres, reviewerWeight, verifyVisit, type Fix } from '@/domain/trust';
import { demoRatings, ME, PUBS, type Pub } from './demo';

export type Rating = PintRating & { note: string; photoUri?: string | null; anonymous?: boolean; reply?: string | null };

export type PubWithScore = Pub & { score: IndexBreakdown; distanceM: number | null };

type NewRating = Omit<Rating, 'id' | 'userId' | 'ratedAt' | 'verification' | 'weight'> & { fix: Fix | null };

type Store = {
  ratings: Rating[];
  pubs: PubWithScore[];
  pub: (id: string) => PubWithScore | undefined;
  ratingsFor: (pubId: string) => Rating[];
  myRatings: Rating[];
  addRating: (r: NewRating) => { ok: true; rating: Rating } | { ok: false; reason: string };
  replyTo: (ratingId: string, text: string) => void;
  here: { lat: number; lng: number };
};

const Ctx = createContext<Store | null>(null);

// Demo "you are here": Fulham Broadway.
const HERE = { lat: 51.4802, lng: -0.1953 };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<Rating[]>(() => demoRatings());

  const pubs = useMemo(() => {
    const byCity = new Map<string, number[]>();
    for (const r of ratings) {
      const city = PUBS.find((p) => p.id === r.pubId)?.city ?? '';
      if (r.pricePence != null) byCity.set(city, [...(byCity.get(city) ?? []), r.pricePence]);
    }
    return PUBS.map((p) => ({
      ...p,
      score: excellenceIndex(
        ratings.filter((r) => r.pubId === p.id),
        { localMedianPence: median(byCity.get(p.city) ?? []) },
      ),
      distanceM: Math.round(distanceMetres(HERE, p)),
    }));
  }, [ratings]);

  const addRating = useCallback<Store['addRating']>(
    (input) => {
      const pub = PUBS.find((p) => p.id === input.pubId);
      if (!pub) return { ok: false, reason: 'Pub not found' };
      const now = new Date().toISOString();
      const mine = ratings.filter((r) => r.userId === ME.id);
      const check = checkNewRating(
        { pubId: pub.id, at: now, location: input.fix },
        mine.map((r) => ({ pubId: r.pubId, at: r.ratedAt, location: null })),
      );
      if (!check.ok) return check;
      const visit = verifyVisit(pub, input.fix);
      const verification = visit.verified ? 'gps' : 'none';
      const weight = reviewerWeight(
        {
          ratingsCount: mine.length,
          accountAgeDays: 120,
          verifiedShare: mine.length ? mine.filter((r) => r.verification !== 'none').length / mine.length : 0,
          removedCount: 0,
          isPubStaff: false,
        },
        verification,
      );
      const { fix: _fix, ...rest } = input;
      const rating: Rating = { ...rest, id: `me-${Date.now()}`, userId: ME.id, ratedAt: now, verification, weight };
      setRatings((rs) => [rating, ...rs]);
      return { ok: true, rating };
    },
    [ratings],
  );

  const replyTo = useCallback((ratingId: string, text: string) => {
    setRatings((rs) => rs.map((r) => (r.id === ratingId ? { ...r, reply: text } : r)));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ratings,
      pubs,
      pub: (id) => pubs.find((p) => p.id === id),
      ratingsFor: (pubId) => ratings.filter((r) => r.pubId === pubId),
      myRatings: ratings.filter((r) => r.userId === ME.id),
      addRating,
      replyTo,
      here: HERE,
    }),
    [ratings, pubs, addRating, replyTo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

export const formatPrice = (pence: number | null | undefined) => (pence == null ? '–' : `£${(pence / 100).toFixed(2)}`);
export const formatDistance = (m: number | null) => (m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
