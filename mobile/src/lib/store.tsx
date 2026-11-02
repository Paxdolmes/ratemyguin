// App state: pubs, ratings and who's signed in.
// Demo mode (no Supabase keys) runs on sample data in memory. Live mode reads the
// pub_directory and public_ratings views and writes ratings through row level security;
// the database sets each rating's verification and weight itself.

import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { excellenceIndex, median, type AwardTier, type IndexBreakdown, type PintRating } from '@/domain/scores';
import { checkNewRating, distanceMetres, reviewerWeight, verifyVisit, type Fix } from '@/domain/trust';
import { useAuth } from './auth';
import { demoRatings, FRIENDS, ME, MY_PUB_ID, PEOPLE, PUBS, type Person, type Pub } from './demo';
import { isSupabaseConfigured, supabase } from './supabase';

export type Rating = PintRating & {
  note: string;
  photoUri?: string | null;
  anonymous?: boolean;
  reply?: string | null;
  authorName?: string | null;
  authorHandle?: string | null;
};

export type PubWithScore = Pub & { score: IndexBreakdown; distanceM: number | null };

type NewRating = Omit<Rating, 'id' | 'userId' | 'ratedAt' | 'verification' | 'weight'> & { fix: Fix | null };

type Result = { ok: true; rating: Rating } | { ok: false; reason: string };

type Store = {
  live: boolean;
  loading: boolean;
  error: string | null;
  ratings: Rating[];
  pubs: PubWithScore[];
  pub: (id: string) => PubWithScore | undefined;
  ratingsFor: (pubId: string) => Rating[];
  loadPub: (id: string) => Promise<void>;
  myRatings: Rating[];
  me: Person | null;
  people: Person[];
  friends: Set<string>;
  myPubId: string | null;
  addRating: (r: NewRating) => Promise<Result>;
  replyTo: (ratingId: string, text: string) => Promise<void>;
  here: { lat: number; lng: number };
  refresh: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

// Until the phone shares its location: Fulham Broadway.
const FULHAM = { lat: 51.4802, lng: -0.1953 };

export function StoreProvider({ children }: { children: ReactNode }) {
  return isSupabaseConfigured ? <LiveStore>{children}</LiveStore> : <DemoStore>{children}</DemoStore>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

// ── Demo ─────────────────────────────────────────────────────────────────

function DemoStore({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<Rating[]>(() =>
    demoRatings().map((r) => {
      const who = PEOPLE.find((p) => p.id === r.userId);
      return { ...r, authorName: who?.name ?? null, authorHandle: who?.handle ?? null };
    }),
  );

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
      distanceM: Math.round(distanceMetres(FULHAM, p)),
    }));
  }, [ratings]);

  const addRating = useCallback<Store['addRating']>(
    async (input) => {
      const pub = PUBS.find((p) => p.id === input.pubId);
      if (!pub) return { ok: false, reason: 'Pub not found' };
      const now = new Date().toISOString();
      const mine = ratings.filter((r) => r.userId === ME.id);
      const check = checkNewRating(
        { pubId: pub.id, at: now, location: input.fix },
        mine.map((r) => ({ pubId: r.pubId, at: r.ratedAt, location: null })),
      );
      if (!check.ok) return check;
      const verification = verifyVisit(pub, input.fix).verified ? 'gps' : 'none';
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
      const rating: Rating = { ...rest, id: `me-${Date.now()}`, userId: ME.id, ratedAt: now, verification, weight, authorName: 'You', authorHandle: ME.handle };
      setRatings((rs) => [rating, ...rs]);
      return { ok: true, rating };
    },
    [ratings],
  );

  const replyTo = useCallback(async (ratingId: string, text: string) => {
    setRatings((rs) => rs.map((r) => (r.id === ratingId ? { ...r, reply: text } : r)));
  }, []);

  const value = useMemo<Store>(
    () => ({
      live: false,
      loading: false,
      error: null,
      ratings,
      pubs,
      pub: (id) => pubs.find((p) => p.id === id),
      ratingsFor: (pubId) => ratings.filter((r) => r.pubId === pubId),
      loadPub: async () => {},
      myRatings: ratings.filter((r) => r.userId === ME.id),
      me: ME,
      people: [...PEOPLE, ME],
      friends: FRIENDS,
      myPubId: MY_PUB_ID,
      addRating,
      replyTo,
      here: FULHAM,
      refresh: async () => {},
    }),
    [ratings, pubs, addRating, replyTo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ── Live (Supabase) ──────────────────────────────────────────────────────

type DirectoryRow = {
  id: string;
  name: string;
  address: string;
  neighbourhood: string | null;
  city: string;
  country: string;
  atmosphere: Pub['atmosphere'] | null;
  opening_hours: string | null;
  lat: number;
  lng: number;
  rating_count: number;
  verified_share: number | null;
  average_overall: number | null;
  pour: number | null;
  taste_temperature: number | null;
  consistency: number | null;
  atmosphere_service: number | null;
  value: number | null;
  median_price_pence: number | null;
  excellence_index: number | null;
  award: AwardTier | null;
};

type RatingRow = {
  id: string;
  pub_id: string;
  user_id: string | null;
  overall: number;
  taste: number;
  temperature: number;
  head: number;
  texture: number;
  pour: number;
  atmosphere: number | null;
  price_pence: number | null;
  note: string | null;
  photo_path: string | null;
  verification: PintRating['verification'];
  rated_at: string;
  display_name: string | null;
  handle: string | null;
  anonymous: boolean;
  reply: string | null;
};

const num = (v: unknown) => (v == null ? null : Number(v));

function toPub(r: DirectoryRow, here: { lat: number; lng: number }): PubWithScore {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    neighbourhood: r.neighbourhood ?? r.city,
    city: r.city,
    country: r.country,
    lat: r.lat,
    lng: r.lng,
    atmosphere: r.atmosphere ?? 'Traditional',
    hours: r.opening_hours ?? 'Hours not listed',
    distanceM: Math.round(distanceMetres(here, r)),
    score: {
      index: r.excellence_index,
      ratingCount: r.rating_count,
      verifiedShare: num(r.verified_share) ?? 0,
      averageOverall: num(r.average_overall),
      medianPricePence: r.median_price_pence,
      award: r.award,
      components: {
        pour: num(r.pour),
        tasteTemperature: num(r.taste_temperature),
        consistency: num(r.consistency),
        atmosphereService: num(r.atmosphere_service),
        value: num(r.value),
      },
    },
  };
}

function toRating(r: RatingRow): Rating {
  return {
    id: r.id,
    pubId: r.pub_id,
    userId: r.user_id ?? 'anonymous',
    overall: Number(r.overall),
    taste: Number(r.taste),
    temperature: Number(r.temperature),
    head: Number(r.head),
    texture: Number(r.texture),
    pour: Number(r.pour),
    atmosphere: num(r.atmosphere),
    pricePence: r.price_pence,
    ratedAt: r.rated_at,
    verification: r.verification,
    weight: 1, // set and kept by the database; not exposed
    note: r.note ?? '',
    photoUri: r.photo_path,
    anonymous: r.anonymous,
    reply: r.reply,
    authorName: r.display_name,
    authorHandle: r.handle,
  };
}

const RATING_COLUMNS =
  'id, pub_id, user_id, overall, taste, temperature, head, texture, pour, atmosphere, price_pence, note, photo_path, verification, rated_at, display_name, handle, anonymous, reply';

/** Pubs near here, the latest ratings, and the pubs those ratings mention. */
async function fetchHome(here: { lat: number; lng: number }) {
  const near = await supabase.rpc('pub_directory_near', { p_lat: here.lat, p_lng: here.lng, p_radius_m: 3000 });
  const recent = await supabase.from('public_ratings').select(RATING_COLUMNS).order('rated_at', { ascending: false }).limit(200);
  const pubs = (near.data ?? []) as DirectoryRow[];
  const ratings = (recent.data ?? []) as RatingRow[];
  const missing = [...new Set(ratings.map((r) => r.pub_id))].filter((id) => !pubs.some((p) => p.id === id)).slice(0, 150);
  if (missing.length) {
    const extra = await supabase.from('pub_directory').select('*').in('id', missing);
    pubs.push(...((extra.data ?? []) as DirectoryRow[]));
  }
  const err = near.error ?? recent.error;
  return { pubs, ratings, error: err ? err.message : null };
}

function LiveStore({ children }: { children: ReactNode }) {
  const { profile, status } = useAuth();
  const [here, setHere] = useState(FULHAM);
  const [pubRows, setPubRows] = useState<Map<string, DirectoryRow>>(new Map());
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [myPubId, setMyPubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mergePubs = (rows: DirectoryRow[]) =>
    setPubRows((m) => {
      const next = new Map(m);
      for (const r of rows) next.set(r.id, r);
      return next;
    });
  const mergeRatings = (rows: RatingRow[]) =>
    setRatings((m) => {
      const next = new Map(m);
      for (const r of rows) next.set(r.id, toRating(r));
      return next;
    });

  // Where am I? Ask once; Fulham until then.
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // Stay on the default.
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    const home = await fetchHome(here);
    setError(home.error);
    mergePubs(home.pubs);
    mergeRatings(home.ratings);
    setLoading(false);
  }, [here]);

  useEffect(() => {
    let current = true;
    fetchHome(here).then((home) => {
      if (!current) return;
      setError(home.error);
      mergePubs(home.pubs);
      mergeRatings(home.ratings);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [here]);

  // The signed-in person's own ratings, who they follow and the pubs they run.
  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    (async () => {
      const mine = await supabase.from('public_ratings').select(RATING_COLUMNS).eq('user_id', profile.id).order('rated_at', { ascending: false });
      if (mine.data) mergeRatings(mine.data as RatingRow[]);
      const f = await supabase.from('follows').select('followee').eq('follower', profile.id);
      if (f.data) setFollowing(new Set(f.data.map((x) => x.followee as string)));
      const staff = await supabase.rpc('my_pubs');
      const first = (staff.data as string[] | null)?.[0] ?? null;
      setMyPubId(first);
      if (first) {
        const p = await supabase.from('pub_directory').select('*').eq('id', first);
        if (p.data) mergePubs(p.data as DirectoryRow[]);
        const r = await supabase.from('public_ratings').select(RATING_COLUMNS).eq('pub_id', first).order('rated_at', { ascending: false }).limit(300);
        if (r.data) mergeRatings(r.data as RatingRow[]);
      }
    })();
  }, [status, profile]);

  const loadPub = useCallback(async (id: string) => {
    const [p, r] = await Promise.all([
      supabase.from('pub_directory').select('*').eq('id', id),
      supabase.from('public_ratings').select(RATING_COLUMNS).eq('pub_id', id).order('rated_at', { ascending: false }).limit(50),
    ]);
    if (p.data) mergePubs(p.data as DirectoryRow[]);
    if (r.data) mergeRatings(r.data as RatingRow[]);
  }, []);

  const addRating = useCallback<Store['addRating']>(
    async (input) => {
      if (!profile) return { ok: false, reason: 'Sign in to rate a pint.' };
      const { data, error: e } = await supabase
        .from('ratings')
        .insert({
          pub_id: input.pubId,
          user_id: profile.id,
          overall: input.overall,
          taste: input.taste,
          temperature: input.temperature,
          head: input.head,
          texture: input.texture,
          pour: input.pour,
          atmosphere: input.atmosphere ?? null,
          price_pence: input.pricePence ?? null,
          note: input.note || null,
          anonymous: Boolean(input.anonymous),
          fix: input.fix ? `SRID=4326;POINT(${input.fix.lng} ${input.fix.lat})` : null,
          fix_accuracy_m: input.fix?.accuracyM ?? null,
        })
        .select('id')
        .single();
      if (e) return { ok: false, reason: e.message };
      const row = await supabase.from('public_ratings').select(RATING_COLUMNS).eq('id', data.id).single();
      if (row.error) return { ok: false, reason: row.error.message };
      mergeRatings([row.data as RatingRow]);
      void loadPub(input.pubId);
      return { ok: true, rating: toRating(row.data as RatingRow) };
    },
    [profile, loadPub],
  );

  const replyTo = useCallback(
    async (ratingId: string, text: string) => {
      if (!profile || !myPubId) return;
      const { error: e } = await supabase.from('pub_responses').insert({ rating_id: ratingId, pub_id: myPubId, author: profile.id, body: text });
      if (e) throw e;
      setRatings((m) => {
        const next = new Map(m);
        const r = next.get(ratingId);
        if (r) next.set(ratingId, { ...r, reply: text });
        return next;
      });
    },
    [profile, myPubId],
  );

  const value = useMemo<Store>(() => {
    const pubs = [...pubRows.values()].map((r) => toPub(r, here));
    const list = [...ratings.values()].sort((a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt));
    const me = profile ? { id: profile.id, name: profile.displayName, handle: profile.handle, city: '' } : null;
    const people = new Map<string, Person>();
    for (const r of list) if (r.authorName && r.userId !== 'anonymous') people.set(r.userId, { id: r.userId, name: r.authorName, handle: r.authorHandle ?? '', city: '' });
    if (me) people.set(me.id, me);
    return {
      live: true,
      loading,
      error,
      ratings: list,
      pubs,
      pub: (id) => pubs.find((p) => p.id === id),
      ratingsFor: (pubId) => list.filter((r) => r.pubId === pubId),
      loadPub,
      myRatings: me ? list.filter((r) => r.userId === me.id) : [],
      me,
      people: [...people.values()],
      friends: following,
      myPubId,
      addRating,
      replyTo,
      here,
      refresh,
    };
  }, [pubRows, ratings, here, profile, loading, error, loadPub, following, myPubId, addRating, replyTo, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const formatPrice = (pence: number | null | undefined) => (pence == null ? '–' : `£${(pence / 100).toFixed(2)}`);
export const formatDistance = (m: number | null) => (m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
