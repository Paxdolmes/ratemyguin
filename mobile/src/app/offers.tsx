import { router, Stack } from 'expo-router';
import { Footprints, Tag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Body, Card, H1, Segmented, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Offer = {
  id: string; pub_id: string; pub_name: string; neighbourhood: string | null; title: string; details: string | null; days: number[];
  metres: number; lat: number; lng: number; source: 'pub' | 'web'; source_url: string | null; today: boolean;
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const RADII = [1000, 3000, 10000];

export default function Offers() {
  const c = usePalette();
  const { here } = useStore();
  const [radius, setRadius] = useState(3000);
  const [offers, setOffers] = useState<Offer[] | null>(isSupabaseConfigured ? null : []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .rpc('offers_near', { p_lat: here.lat, p_lng: here.lng, p_metres: radius })
      .then(({ data }) => setOffers((data ?? []) as Offer[]), () => setOffers([]));
  }, [here.lat, here.lng, radius]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: 'Offers near me' }} />
      <H1>Deals from pubs nearby</H1>
      <Small>Posted by pubs or found on their own websites. Offers never affect the rankings.</Small>
      <Small style={{ fontFamily: Fonts.bodySemi, color: c.ink }}>How far will you go?</Small>
      <Segmented options={RADII.map((r) => ({ value: String(r), label: `${r / 1000} km` }))} value={String(radius)} onChange={(v) => setRadius(Number(v))} />
      {offers === null ? <Body muted>Loading…</Body> : null}
      {offers?.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 24 }}>
          <Tag size={22} color={c.inkSubtle} />
          <Body muted style={{ textAlign: 'center' }}>{radius < 10000 ? 'No offers this close yet. Try a wider distance.' : 'No offers nearby yet. Check back soon.'}</Body>
        </Card>
      ) : null}
      {offers?.map((o) => (
        <Pressable key={o.id} onPress={() => router.push(`/pub/${o.pub_id}`)}>
          <Card style={{ flexDirection: 'row', gap: 10 }}>
            <Tag size={18} color={c.brand} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Small style={{ color: c.brand, fontFamily: Fonts.bodySemi }}>
                {o.today ? 'TODAY · ' : ''}
                {o.days.length === 7 ? 'Every day' : WEEK.filter((d) => o.days.includes(d)).map((d) => DAYS[d]).join(', ')}
              </Small>
              <Body style={{ fontFamily: Fonts.display, fontSize: 21 }}>{o.title}</Body>
              {o.details ? <Body>{o.details}</Body> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Body style={{ fontFamily: Fonts.bodySemi }}>{o.pub_name}</Body>
                <Footprints size={14} color={c.inkMuted} />
                <Small>{Math.max(1, Math.round((o.metres * 1.2) / 80))} min walk</Small>
              </View>
              {o.source === 'web' && o.source_url ? (
                <Pressable onPress={() => void Linking.openURL(o.source_url!)} hitSlop={6}>
                  <Small>{"Found on the pub's website. Check with the pub before you go."}</Small>
                </Pressable>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
