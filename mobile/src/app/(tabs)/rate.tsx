import { router } from 'expo-router';
import { MapPin, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, EmptyState, H1, H2, SearchField, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { VISIT_RADIUS_M } from '@/domain/trust';
import { formatDistance, useStore, type PubWithScore } from '@/lib/store';

const NEARBY = 15;

// Which pub are you in? Nearest first, so the usual answer is one tap; search for the rest.
export default function RateTab() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pubs, searchPubs } = useStore();
  const near = useMemo(() => [...pubs].filter((p) => p.distanceM != null).sort((a, b) => a.distanceM! - b.distanceM!), [pubs]);
  const [closest, ...rest] = near;
  const here = closest && closest.distanceM! <= VISIT_RADIUS_M * 2;

  const [query, setQuery] = useState('');
  const [found, setFound] = useState<PubWithScore[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let current = true;
    const t = setTimeout(() => void searchPubs(q).then((r) => current && setFound(r)), 250);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [query, searchPubs]);
  const searching = query.trim().length >= 2;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <H1>Rate your pint</H1>
      <Body muted>Rate from the pub and your rating counts as a verified visit.</Body>
      {closest && !searching ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} color={c.brand} />
            <Small style={{ color: c.brand, fontFamily: Fonts.bodySemi }}>{here ? "You're at" : 'Nearest pub'}</Small>
          </View>
          <H2>{closest.name}</H2>
          <Small>{[closest.neighbourhood, formatDistance(closest.distanceM)].filter(Boolean).join(' · ')}</Small>
          <Button label="Rate a pint here" onPress={() => router.push(`/rate/${closest.id}`)} />
        </Card>
      ) : null}
      <H2>{searching ? 'Pubs found' : 'Somewhere else?'}</H2>
      <SearchField
        value={query}
        onChange={(q) => {
          setQuery(q);
          if (q.trim().length < 2) setFound(null);
        }}
        placeholder="Search for the pub"
      />
      {searching ? (
        <>
          {found === null ? <ActivityIndicator color={c.brand} /> : null}
          {found?.map((p) => <PubPick key={p.id} pub={p} />)}
          {found?.length === 0 ? <EmptyState icon={<Search size={22} color={c.inkSubtle} />} title={`No pubs called "${query.trim()}"`} body="Check the spelling, or try part of the name." /> : null}
        </>
      ) : (
        <>
          {rest.slice(0, NEARBY).map((p) => (
            <PubPick key={p.id} pub={p} />
          ))}
          {rest.length > NEARBY ? <Small style={{ textAlign: 'center' }}>Not listed? Search for it above.</Small> : null}
        </>
      )}
    </ScrollView>
  );
}

function PubPick({ pub }: { pub: PubWithScore }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rate a pint at ${pub.name}`}
      onPress={() => router.push(`/rate/${pub.id}`)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.surfaceMuted : c.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: c.border })}>
      <View style={{ flex: 1 }}>
        <Body style={{ fontFamily: Fonts.bodySemi }} numberOfLines={1}>
          {pub.name}
        </Body>
        <Small numberOfLines={1}>{[pub.neighbourhood, formatDistance(pub.distanceM)].filter(Boolean).join(' · ')}</Small>
      </View>
      <View style={{ backgroundColor: c.surfaceMuted, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Body style={{ fontFamily: Fonts.bodySemi, fontSize: 14 }}>Rate</Body>
      </View>
    </Pressable>
  );
}
