import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, H1, H2, Initials, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { deleteAccount, signOut, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatPrice, useStore } from '@/lib/store';

export default function Me() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { myRatings, ratings, me, friends, pub, live } = useStore();
  const { status } = useAuth();
  const friendFeed = ratings.filter((r) => friends.has(r.userId)).slice(0, 8);
  const [lists, setLists] = useState<{ id: string; name: string; pubs: { id: string; name: string }[] }[]>([]);
  useEffect(() => {
    if (!live || status !== 'ready') return;
    supabase
      .from('lists')
      .select('id,name,list_pubs(pub_id,pubs(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        type Row = { id: string; name: string; list_pubs: { pub_id: string; pubs: { name: string } | null }[] };
        setLists(((data ?? []) as unknown as Row[]).map((l) => ({ id: l.id, name: l.name, pubs: l.list_pubs.map((p) => ({ id: p.pub_id, name: p.pubs?.name ?? 'A pub' })) })));
      }, () => {});
  }, [live, status]);
  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      "This deletes your profile, every rating and photo you've added, your lists and who you follow. It can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAccount().catch(() => Alert.alert('Something went wrong', 'Please try again, or email hello@ratemyguin.com.')),
        },
      ],
    );

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
              <Body style={{ fontFamily: 'Jost_600SemiBold' }}>{pub(r.pubId)?.name ?? 'A pub'}</Body>
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
                  <Body style={{ fontFamily: 'Jost_600SemiBold' }}>{who.split(' ')[0]}</Body> rated {p.name}
                </Body>
                <Small numberOfLines={1}>{r.note}</Small>
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </Card>
          </Pressable>
        );
      })}
      {lists.length > 0 ? <H2>Your lists</H2> : null}
      {lists.map((l) => (
        <Card key={l.id} style={{ gap: 6 }}>
          <Body style={{ fontFamily: 'Jost_600SemiBold' }}>{l.name}</Body>
          {l.pubs.length === 0 ? <Small>No pubs yet. Save pubs from the website for now.</Small> : null}
          {l.pubs.map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/pub/${p.id}`)}>
              <Body style={{ color: c.brand }}>{p.name}</Body>
            </Pressable>
          ))}
        </Card>
      ))}

      {live ? (
        <>
          <H2>Account</H2>
          <Card style={{ gap: 12 }}>
            {(
              [
                ['Help and contact', 'https://ratemyguin.com/support/'],
                ['Privacy policy', 'https://ratemyguin.com/privacy/'],
                ['Terms', 'https://ratemyguin.com/terms/'],
              ] as const
            ).map(([label, url]) => (
              <Pressable key={url} accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
                <Body style={{ color: c.brand }}>{label}</Body>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => void supabase.rpc('unblock_all').then(() => Alert.alert('Done', "You've unblocked everyone."))}
            >
              <Body style={{ color: c.brand }}>Unblock everyone</Body>
            </Pressable>
          </Card>
          <Button kind="secondary" label="Sign out" onPress={() => void signOut()} />
          <Pressable accessibilityRole="button" onPress={confirmDelete} style={{ alignSelf: 'center', padding: 8 }}>
            <Body style={{ color: c.danger }}>Delete my account</Body>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}
