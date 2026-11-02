import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lockup } from '@/components/brand';
import { PubMap } from '@/components/map';
import { AwardChip, Body, Chip, H1, H2, IndexScore, Initials, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { formatDistance, formatPrice, useStore, type PubWithScore } from '@/lib/store';

type Sort = 'near' | 'best' | 'cheapest';
const ATMOS = ['Any', 'Traditional', 'Cosy', 'Lively', 'Sports'] as const;
const SCOPES = ['Near me', 'Fulham', 'London', 'United Kingdom'] as const;

export default function Discover() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pubs, here, loading, error } = useStore();
  const [sort, setSort] = useState<Sort>('best');
  const [atmos, setAtmos] = useState<(typeof ATMOS)[number]>('Any');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('Near me');
  const [minScore, setMinScore] = useState(0);

  const list = useMemo(() => {
    let l: PubWithScore[] = pubs;
    if (scope === 'Near me') l = l.filter((p) => (p.distanceM ?? 0) <= 5000);
    else if (scope === 'Fulham') l = l.filter((p) => p.neighbourhood === 'Fulham');
    else if (scope === 'London') l = l.filter((p) => p.city === 'London');
    else l = l.filter((p) => p.country === 'United Kingdom');
    if (atmos !== 'Any') l = l.filter((p) => p.atmosphere === atmos);
    if (minScore) l = l.filter((p) => (p.score.index ?? 0) >= minScore);
    return [...l].sort((a, b) =>
      sort === 'near'
        ? (a.distanceM ?? 0) - (b.distanceM ?? 0)
        : sort === 'cheapest'
          ? (a.score.medianPricePence ?? 9999) - (b.score.medianPricePence ?? 9999)
          : (b.score.index ?? -1) - (a.score.index ?? -1),
    );
  }, [pubs, sort, atmos, scope, minScore]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
        <Lockup />
        <Small style={{ marginTop: 10 }}>Fulham, London</Small>
        <H1>The best pint near you</H1>
      </View>
      <PubMap pubs={list} here={here} onPick={(id) => router.push(`/pub/${id}`)} />
      <View style={{ padding: 20, gap: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SCOPES.map((s) => (
            <Chip key={s} label={s} active={scope === s} onPress={() => setScope(s)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Best rated" active={sort === 'best'} onPress={() => setSort('best')} />
          <Chip label="Nearest" active={sort === 'near'} onPress={() => setSort('near')} />
          <Chip label="Cheapest" active={sort === 'cheapest'} onPress={() => setSort('cheapest')} />
          <Chip label={minScore ? '90+ only' : 'Any score'} active={minScore > 0} onPress={() => setMinScore(minScore ? 0 : 90)} />
          {ATMOS.slice(1).map((a) => (
            <Chip key={a} label={a} active={atmos === a} onPress={() => setAtmos(atmos === a ? 'Any' : a)} />
          ))}
        </ScrollView>
        <H2>{list.length} pubs</H2>
        {list.map((p, i) => (
          <PubRow key={p.id} pub={p} rank={sort === 'best' ? i + 1 : null} />
        ))}
        {error ? <Body style={{ color: c.danger }}>Couldn&apos;t load pubs: {error}</Body> : null}
        {list.length === 0 && !error ? <Body muted>{loading ? 'Finding pubs near you…' : 'No pubs match those filters yet.'}</Body> : null}
      </View>
    </ScrollView>
  );
}

export function PubRow({ pub, rank }: { pub: PubWithScore; rank: number | null }) {
  const c = usePalette();
  return (
    <Pressable onPress={() => router.push(`/pub/${pub.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: c.border }}>
      <Initials name={pub.name.replace(/^The /, '')} size={44} />
      <View style={{ flex: 1, gap: 3 }}>
        <Body style={{ fontFamily: 'Figtree_700Bold' }} numberOfLines={1}>
          {rank ? `${rank}. ` : ''}
          {pub.name}
        </Body>
        <Small>
          {pub.neighbourhood} · {formatDistance(pub.distanceM)} · {formatPrice(pub.score.medianPricePence)}
        </Small>
        <AwardChip tier={pub.score.award} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <IndexScore value={pub.score.index} />
        <Small>{pub.score.ratingCount} pints</Small>
      </View>
    </Pressable>
  );
}
