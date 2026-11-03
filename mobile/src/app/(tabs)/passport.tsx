import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stamp as StampIcon } from 'lucide-react-native';

import { Body, Button, Card, EmptyState, H1, H2, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { badges, uniqueStamps, type Stamp } from '@/domain/passport';
import { useStore } from '@/lib/store';

// Pubs you collected before installing the app, so the demo passport isn't empty.
const DEMO_SEED: Stamp[] = [
  { pubId: 'p5', city: 'London', country: 'United Kingdom', at: '2026-09-12T20:00:00Z', pubIndex: 95, verified: true },
  { pubId: 'p7', city: 'London', country: 'United Kingdom', at: '2026-10-01T20:00:00Z', pubIndex: 88, verified: true },
  { pubId: 'dub1', city: 'Dublin', country: 'Ireland', at: '2026-08-15T20:00:00Z', pubIndex: 96, verified: true },
];

export default function Passport() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { myRatings, pub, me, live } = useStore();
  const { status } = useAuth();
  const stamps = uniqueStamps([
    ...(live ? [] : DEMO_SEED),
    ...myRatings.flatMap((r) => {
      const p = pub(r.pubId);
      return p ? [{ pubId: r.pubId, city: p.city, country: p.country, at: r.ratedAt, pubIndex: p.score.index, verified: r.verification !== 'none' }] : [];
    }),
  ]);
  // Earned badges first, newest first; then the ones still to get.
  const when = (b: { earnedAt: string | null }) => (b.earnedAt ? Date.parse(b.earnedAt) || 1 : 0);
  const all = badges(stamps).sort((a, b) => when(b) - when(a));
  const next = all.find((b) => b.id.startsWith('pubs-') && !b.earnedAt);

  if (live && status !== 'ready') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
        <H1>Your Guin Passport</H1>
        <Body muted>Every pub you rate earns a stamp. Collect pubs, cities and countries, and unlock badges for exploring.</Body>
        {status === 'loading' ? null : <Button label="Sign in to start collecting" onPress={() => router.push('/sign-in')} />}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 16, paddingBottom: 40 }}>
      <Small>@{me?.handle ?? 'you'}</Small>
      <H1>Your Guin Passport</H1>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Stat n={stamps.length} label="pubs" />
        <Stat n={new Set(stamps.map((s) => s.city)).size} label="cities" />
        <Stat n={new Set(stamps.map((s) => s.country)).size} label="countries" />
      </Card>
      {next ? (
        <Card style={{ gap: 8 }}>
          <Body style={{ fontFamily: Fonts.bodySemi }}>Next badge: {next.title}</Body>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
            <View style={{ width: `${(next.progress / next.target) * 100}%`, height: 10, backgroundColor: c.brand }} />
          </View>
          <Small>
            {next.progress} of {next.target} verified pubs
          </Small>
        </Card>
      ) : null}
      <H2>Stamps</H2>
      {stamps.length === 0 ? (
        <EmptyState
          icon={<StampIcon size={22} color={c.inkSubtle} />}
          title="No stamps yet"
          body="Rate a pint at any pub to collect your first stamp. Rate from inside the pub and it's a verified stamp."
          action={{ label: 'Rate a pint', onPress: () => router.push('/rate') }}
        />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stamps.map((s) => {
          const p = pub(s.pubId);
          return (
            <Pressable key={s.pubId} disabled={!p} onPress={() => p && router.push(`/pub/${p.id}`)} style={{ width: '31%', aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: s.verified ? c.brand : c.border, borderStyle: s.verified ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Small numberOfLines={2} style={{ textAlign: 'center', color: c.ink, fontFamily: Fonts.bodySemi }}>
                {p?.name.replace(/^The /, '') ?? `A pub in ${s.city}`}
              </Small>
              <Small style={{ fontSize: 11 }}>{new Date(s.at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</Small>
            </Pressable>
          );
        })}
      </View>
      <H2>Badges</H2>
      {all.map((b) => (
        <Card key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: b.earnedAt ? 1 : 0.6 }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontFamily: Fonts.bodySemi }}>{b.title}</Body>
            <Small>{b.detail}</Small>
          </View>
          <Small style={{ color: b.earnedAt ? c.brand : c.inkMuted, fontFamily: Fonts.bodySemi }}>{b.earnedAt ? 'Earned' : `${b.progress}/${b.target}`}</Small>
        </Card>
      ))}
    </ScrollView>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <H1>{n}</H1>
      <Small>{label}</Small>
    </View>
  );
}
