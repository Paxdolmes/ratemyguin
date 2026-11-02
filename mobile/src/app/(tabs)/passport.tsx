import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Card, H1, H2, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { badges, uniqueStamps, type Stamp } from '@/domain/passport';
import { ME, PUBS } from '@/lib/demo';
import { useStore } from '@/lib/store';

// Pubs you collected before installing the app, so the demo passport isn't empty.
const SEED: Stamp[] = [
  { pubId: 'p5', city: 'London', country: 'United Kingdom', at: '2026-09-12T20:00:00Z', pubIndex: 95, verified: true },
  { pubId: 'p7', city: 'London', country: 'United Kingdom', at: '2026-10-01T20:00:00Z', pubIndex: 88, verified: true },
  { pubId: 'dub1', city: 'Dublin', country: 'Ireland', at: '2026-08-15T20:00:00Z', pubIndex: 96, verified: true },
];

export default function Passport() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { myRatings, pub } = useStore();
  const stamps = uniqueStamps([
    ...SEED,
    ...myRatings.map((r) => {
      const p = PUBS.find((x) => x.id === r.pubId)!;
      return { pubId: r.pubId, city: p.city, country: p.country, at: r.ratedAt, pubIndex: pub(r.pubId)?.score.index ?? null, verified: r.verification !== 'none' };
    }),
  ]);
  const all = badges(stamps);
  const next = all.find((b) => b.id.startsWith('pubs-') && !b.earnedAt);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 16 }}>
      <Small>@{ME.handle}</Small>
      <H1>Your Guin Passport</H1>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Stat n={stamps.length} label="pubs" />
        <Stat n={new Set(stamps.map((s) => s.city)).size} label="cities" />
        <Stat n={new Set(stamps.map((s) => s.country)).size} label="countries" />
      </Card>
      {next ? (
        <Card style={{ gap: 8 }}>
          <Body style={{ fontFamily: 'Figtree_700Bold' }}>Next: {next.title}</Body>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
            <View style={{ width: `${(next.progress / next.target) * 100}%`, height: 10, backgroundColor: c.brand }} />
          </View>
          <Small>
            {next.progress} of {next.target} verified pubs
          </Small>
        </Card>
      ) : null}
      <H2>Stamps</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stamps.map((s) => {
          const p = PUBS.find((x) => x.id === s.pubId);
          return (
            <Pressable key={s.pubId} disabled={!p} onPress={() => p && router.push(`/pub/${p.id}`)} style={{ width: '31%', aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: s.verified ? c.brand : c.border, borderStyle: s.verified ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Small style={{ textAlign: 'center', color: c.ink, fontFamily: 'Figtree_700Bold' }}>{p?.name.replace(/^The /, '') ?? 'Dublin pub'}</Small>
              <Small style={{ fontSize: 11 }}>{new Date(s.at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</Small>
            </Pressable>
          );
        })}
      </View>
      <H2>Badges</H2>
      {all.map((b) => (
        <Card key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: b.earnedAt ? 1 : 0.55 }}>
          <View>
            <Body style={{ fontFamily: 'Figtree_700Bold' }}>{b.title}</Body>
            <Small>{b.detail}</Small>
          </View>
          <Small style={{ color: b.earnedAt ? c.success : c.inkMuted }}>{b.earnedAt ? 'Earned' : `${b.progress}/${b.target}`}</Small>
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
