import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Card, H1, H2, Initials, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { FRIENDS, ME, PEOPLE, PUBS } from '@/lib/demo';
import { formatPrice, useStore } from '@/lib/store';

export default function Me() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { myRatings, ratings } = useStore();
  const friendFeed = ratings.filter((r) => FRIENDS.has(r.userId)).slice(0, 8);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Initials name="You" size={56} />
        <View>
          <H1>@{ME.handle}</H1>
          <Small>{myRatings.length} pints rated · {FRIENDS.size} friends</Small>
        </View>
      </View>

      <H2>Your pints</H2>
      {myRatings.length === 0 ? <Body muted>No ratings yet. Your history builds up here.</Body> : null}
      {myRatings.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/card/${r.id}`)}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Body style={{ fontFamily: 'Figtree_700Bold' }}>{PUBS.find((p) => p.id === r.pubId)?.name}</Body>
              <Small>
                {new Date(r.ratedAt).toLocaleDateString('en-GB')} · {formatPrice(r.pricePence)} · {r.verification !== 'none' ? 'Verified' : 'Unverified'}
              </Small>
            </View>
            <H2>{r.overall.toFixed(1)}</H2>
          </Card>
        </Pressable>
      ))}

      <H2>Where friends have been drinking</H2>
      {friendFeed.map((r) => {
        const who = PEOPLE.find((p) => p.id === r.userId)!;
        const pub = PUBS.find((p) => p.id === r.pubId)!;
        return (
          <Pressable key={r.id} onPress={() => router.push(`/pub/${pub.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Initials name={who.name} size={36} />
              <View style={{ flex: 1 }}>
                <Body numberOfLines={1}>
                  <Body style={{ fontFamily: 'Figtree_700Bold' }}>{who.name.split(' ')[0]}</Body> rated {pub.name}
                </Body>
                <Small numberOfLines={1}>{r.note}</Small>
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
