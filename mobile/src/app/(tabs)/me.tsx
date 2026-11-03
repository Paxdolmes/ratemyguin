import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Beer, ChevronRight, Users } from 'lucide-react-native';

import { Body, Button, Card, EmptyState, H1, H2, Initials, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
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
        {status === 'loading' ? null : <Button label="Sign in" onPress={() => router.push('/sign-in')} />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
          {(
            [
              ['Help', 'https://ratemyguin.com/support/'],
              ['Privacy', 'https://ratemyguin.com/privacy/'],
              ['Terms', 'https://ratemyguin.com/terms/'],
            ] as const
          ).map(([label, url]) => (
            <Pressable key={url} accessibilityRole="link" hitSlop={6} onPress={() => void Linking.openURL(url)}>
              <Small style={{ color: c.brand }}>{label}</Small>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Initials name={me?.name ?? 'You'} size={56} />
        <View style={{ flex: 1 }}>
          <H1 style={{ fontSize: 26, lineHeight: 30 }} numberOfLines={1}>
            {me?.name && me.name !== 'You' ? me.name : `@${me?.handle ?? 'you'}`}
          </H1>
          <Small>
            {me?.name && me.name !== 'You' ? `@${me.handle} · ` : ''}
            {myRatings.length} {myRatings.length === 1 ? 'pint' : 'pints'} rated · {friends.size} following
          </Small>
        </View>
      </View>

      <H2>Your pints</H2>
      {myRatings.length === 0 ? (
        <EmptyState icon={<Beer size={22} color={c.inkSubtle} />} title="No pints yet" body="Every pint you rate is kept here, with its card to share." action={{ label: 'Rate a pint', onPress: () => router.push('/rate') }} />
      ) : null}
      {myRatings.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/card/${r.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Body style={{ fontFamily: Fonts.bodySemi }} numberOfLines={1}>
                {pub(r.pubId)?.name ?? 'A pub'}
              </Body>
              <Small>
                {[
                  new Date(r.ratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                  r.pricePence != null ? formatPrice(r.pricePence) : null,
                  r.verification !== 'none' ? 'Verified visit' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Small>
            </View>
            <H2>{r.overall.toFixed(1)}</H2>
            <ChevronRight size={16} color={c.inkSubtle} />
          </Card>
        </Pressable>
      ))}

      <H2>Where friends have been drinking</H2>
      {friendFeed.length === 0 ? <EmptyState icon={<Users size={22} color={c.inkSubtle} />} title="Nothing from friends yet" body="Follow friends on ratemyguin.com and their pints show up here." /> : null}
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
                  <Body style={{ fontFamily: Fonts.bodySemi }}>{who.split(' ')[0]}</Body> rated {p.name}
                </Body>
                {r.note ? <Small numberOfLines={1}>{r.note}</Small> : null}
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </Card>
          </Pressable>
        );
      })}
      {lists.length > 0 ? <H2>Your lists</H2> : null}
      {lists.map((l) => (
        <Card key={l.id} style={{ gap: 6 }}>
          <Body style={{ fontFamily: Fonts.bodySemi }}>{l.name}</Body>
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
              <Pressable key={url} accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Body>{label}</Body>
                <ChevronRight size={16} color={c.inkSubtle} />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Unblock everyone?', "You'll see pints from people you've blocked again.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Unblock', onPress: () => void supabase.rpc('unblock_all').then(() => Alert.alert('Done', "You've unblocked everyone.")) },
                ])
              }
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Body>Unblock everyone</Body>
              <ChevronRight size={16} color={c.inkSubtle} />
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
