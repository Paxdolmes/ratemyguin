import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, H1, H2, Initials, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth';
import { formatPrice, useStore } from '@/lib/store';

export default function Me() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { myRatings, ratings, me, friends, pub, live } = useStore();
  const { status } = useAuth();
  const friendFeed = ratings.filter((r) => friends.has(r.userId)).slice(0, 8);

  if (live && status !== 'ready') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
        <H1>Your pints, your Passport</H1>
        <Body muted>Sign in to rate pints, collect pubs and climb the rankings.</Body>
        <Button label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Initials name={me?.name ?? 'You'} size={56} />
        <View>
          <H1>@{me?.handle ?? 'you'}</H1>
          <Small>{myRatings.length} pints rated · {friends.size} following</Small>
        </View>
      </View>

      <H2>Your pints</H2>
      {myRatings.length === 0 ? <Body muted>No ratings yet. Your history builds up here.</Body> : null}
      {myRatings.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/card/${r.id}`)}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Body style={{ fontFamily: 'Figtree_700Bold' }}>{pub(r.pubId)?.name ?? 'A pub'}</Body>
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
        const p = pub(r.pubId);
        const who = r.authorName ?? 'A friend';
        if (!p) return null;
        return (
          <Pressable key={r.id} onPress={() => router.push(`/pub/${p.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Initials name={who} size={36} />
              <View style={{ flex: 1 }}>
                <Body numberOfLines={1}>
                  <Body style={{ fontFamily: 'Figtree_700Bold' }}>{who.split(' ')[0]}</Body> rated {p.name}
                </Body>
                <Small numberOfLines={1}>{r.note}</Small>
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </Card>
          </Pressable>
        );
      })}
      {live ? <Button kind="secondary" label="Sign out" onPress={() => void signOut()} /> : null}
    </ScrollView>
  );
}
