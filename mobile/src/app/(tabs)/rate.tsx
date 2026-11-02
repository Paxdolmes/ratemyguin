import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, H1, H2, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { formatDistance, useStore } from '@/lib/store';

// Which pub are you in? Nearest first, so the usual answer is one tap.
export default function RateTab() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pubs } = useStore();
  const near = [...pubs].sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  const [closest, ...rest] = near;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 16 }}>
      <H1>Rate your pint</H1>
      <Body muted>Rate from the pub and your rating counts as a verified visit.</Body>
      {closest ? (
        <Card style={{ gap: 10 }}>
          <Small>You look like you&apos;re at</Small>
          <H2>{closest.name}</H2>
          <Small>
            {closest.neighbourhood} · {formatDistance(closest.distanceM)}
          </Small>
          <Button label="Rate a pint here" onPress={() => router.push(`/rate/${closest.id}`)} />
        </Card>
      ) : null}
      <H2>Somewhere else?</H2>
      {rest.map((p) => (
        <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontFamily: 'Figtree_700Bold' }}>{p.name}</Body>
            <Small>
              {p.neighbourhood} · {formatDistance(p.distanceM)}
            </Small>
          </View>
          <Button kind="secondary" label="Rate" onPress={() => router.push(`/rate/${p.id}`)} style={{ paddingHorizontal: 20, paddingVertical: 10 }} />
        </Card>
      ))}
    </ScrollView>
  );
}
