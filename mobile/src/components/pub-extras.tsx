import { CalendarDays, Tag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { Body, Card, H2, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Offer = { id: string; title: string; details: string | null; days: number[]; ends_on: string };
type PubEvent = { id: string; title: string; starts_at: string };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const UUID = /^[0-9a-f-]{36}$/i;

/** Offers, events and photos the pub has posted. Nothing shows when there are none. */
export function PubExtras({ pubId }: { pubId: string }) {
  const c = usePalette();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [events, setEvents] = useState<PubEvent[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !UUID.test(pubId)) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('offers').select('id,title,details,days,ends_on').eq('pub_id', pubId).lte('starts_on', today).gte('ends_on', today)
      .then(({ data }) => setOffers((data ?? []) as Offer[]), () => {});
    supabase.from('pub_events').select('id,title,starts_at').eq('pub_id', pubId).gte('starts_at', new Date(Date.now() - 6 * 3600000).toISOString())
      .order('starts_at').limit(6).then(({ data }) => setEvents((data ?? []) as PubEvent[]), () => {});
    supabase.from('pub_photos').select('path').eq('pub_id', pubId).order('created_at', { ascending: false })
      .then(({ data }) => setPhotos(((data ?? []) as { path: string }[]).map((p) => supabase.storage.from('pub-photos').getPublicUrl(p.path).data.publicUrl)), () => {});
  }, [pubId]);

  return (
    <>
      {offers.map((o) => (
        <Card key={o.id} style={{ gap: 4, flexDirection: 'row' }}>
          <Tag size={18} color={c.brand} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Small style={{ color: c.brand, fontFamily: Fonts.bodySemi, letterSpacing: 1 }}>OFFER FROM THE PUB</Small>
            <Body style={{ fontFamily: Fonts.display, fontSize: 20 }}>{o.title}</Body>
            {o.details ? <Body>{o.details}</Body> : null}
            <Small>
              {o.days.length === 7 ? 'Every day' : WEEK.filter((d) => o.days.includes(d)).map((d) => DAYS[d]).join(', ')} · until{' '}
              {new Date(o.ends_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Small>
          </View>
        </Card>
      ))}
      {events.length > 0 ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={18} color={c.brand} />
            <Body style={{ fontFamily: Fonts.bodySemi }}>What&apos;s on</Body>
          </View>
          {events.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 10 }}>
              <Small style={{ width: 96 }}>
                {new Date(e.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </Small>
              <Body style={{ flex: 1 }}>{e.title}</Body>
            </View>
          ))}
        </Card>
      ) : null}
      {photos.length > 0 ? (
        <View style={{ gap: 8 }}>
          <H2>Inside the pub</H2>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((u) => (
              <Image key={u} source={{ uri: u }} style={{ width: 160, height: 160, borderRadius: 14, backgroundColor: c.surfaceMuted }} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}
