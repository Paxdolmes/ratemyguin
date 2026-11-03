import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Body, Button, Card, Chip, H1, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Opening = {
  id: string; name: string; address: string | null; neighbourhood: string | null; status: 'open' | 'coming_soon';
  opened_label: string; blurb: string | null; source_name: string; source_url: string; pub_id: string | null;
};

export default function NewOpenings() {
  const c = usePalette();
  const [tab, setTab] = useState<'open' | 'coming_soon'>('open');
  const [list, setList] = useState<Opening[] | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return setList([]);
    supabase
      .from('openings')
      .select('id,name,address,neighbourhood,status,opened_label,blurb,source_name,source_url,pub_id')
      .order('sort_on', { ascending: false })
      .then(({ data }) => setList((data ?? []) as Opening[]), () => setList([]));
  }, []);
  const shown = (list ?? []).filter((o) => o.status === tab);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: 'New openings' }} />
      <H1>New pubs, first pints</H1>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Just opened" active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip label="Coming soon" active={tab === 'coming_soon'} onPress={() => setTab('coming_soon')} />
      </View>
      {list === null ? <Body muted>Loading…</Body> : null}
      {shown.map((o) => (
        <Card key={o.id} style={{ gap: 6 }}>
          <Small style={{ color: c.brand, fontFamily: Fonts.bodySemi }}>
            {o.opened_label}
            {o.neighbourhood ? ` · ${o.neighbourhood}` : ''}
          </Small>
          <Body style={{ fontFamily: Fonts.display, fontSize: 24 }}>{o.name}</Body>
          {o.blurb ? <Body>{o.blurb}</Body> : null}
          {o.address ? <Small>{o.address}</Small> : null}
          {o.pub_id ? <Button label={o.status === 'open' ? 'Rate the first pint' : 'See the pub'} onPress={() => router.push(`/pub/${o.pub_id}`)} /> : null}
          <Pressable onPress={() => void Linking.openURL(o.source_url)}>
            <Small>Via {o.source_name}</Small>
          </Pressable>
        </Card>
      ))}
    </ScrollView>
  );
}
