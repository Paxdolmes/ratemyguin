import { router, Stack, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Beer, Clock, Footprints, MapPin, TrainFront } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PubMiniMap } from '@/components/map';
import { PubExtras } from '@/components/pub-extras';
import { AwardChip, Body, Button, Card, EmptyState, H1, H2, IndexScore, Initials, ScoreBar, ScreenMessage, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { FEATURES, TAGS, type FeatureKey, type TagKey } from '@/domain/tags';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AWARD_DISCLAIMER, AWARDS, MIN_RATINGS_FOR_INDEX } from '@/domain/scores';
import { formatDistance, formatPrice, useStore } from '@/lib/store';

/** Apple asks every app with user content to let people report it and block its author. */
function reportOrBlock(ratingId: string) {
  const report = (reason: string) =>
    supabase
      .from('rating_reports')
      .insert({ rating_id: ratingId, reason })
      .then(({ error }) => Alert.alert(error ? 'Please sign in to report' : "Thanks, we'll take a look."));
  Alert.alert('Report or block', 'What is wrong with this rating?', [
    { text: 'Looks fake', onPress: () => void report('fake') },
    { text: 'Offensive', onPress: () => void report('offensive') },
    { text: 'Bad photo', onPress: () => void report('photo') },
    {
      text: 'Block this person',
      style: 'destructive',
      onPress: () =>
        void supabase
          .rpc('block_rating_author', { p_rating: ratingId })
          .then(({ error }) => Alert.alert(error ? 'Please sign in to block' : "Blocked. You won't see their pints any more.")),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export default function PubProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pub, ratingsFor, loadPub } = useStore();
  const [looked, setLooked] = useState(false);
  useEffect(() => {
    void loadPub(id).finally(() => setLooked(true));
  }, [id, loadPub]);
  const p = pub(id);
  const [stations, setStations] = useState<{ name: string; walk_minutes: number }[]>([]);
  useEffect(() => {
    if (!p) return;
    supabase
      .rpc('nearest_stations', { p_lat: p.lat, p_lng: p.lng })
      .then(({ data }) => setStations((data ?? []) as { name: string; walk_minutes: number }[]), () => {});
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <ScreenMessage loading={!looked} message={looked ? "We couldn't find this pub." : undefined} />;
  const s = p.score;
  const ratings = ratingsFor(p.id).slice(0, 12);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 120 + insets.bottom }}>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {p.logoUrl || p.imageUrl ? (
            <Image source={{ uri: (p.logoUrl ?? p.imageUrl)! }} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: c.surfaceMuted }} resizeMode="contain" />
          ) : null}
          <H1 style={{ flex: 1 }}>{p.name}</H1>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color={c.inkMuted} />
          <Small style={{ flex: 1 }}>{[[p.address, p.neighbourhood].filter(Boolean).join(', '), formatDistance(p.distanceM)].filter(Boolean).join(' · ')}</Small>
        </View>
        {p.hours || p.atmosphere || s.medianPricePence != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={c.inkMuted} />
            <Small style={{ flex: 1 }}>{[p.hours, p.atmosphere, s.medianPricePence != null ? `Pint ${formatPrice(s.medianPricePence)}` : null].filter(Boolean).join(' · ')}</Small>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <PubMiniMap pub={p} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="link"
            hitSlop={6}
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? `http://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`
                  : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`,
              )
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Footprints size={16} color={c.brand} />
            <Text style={{ fontFamily: Fonts.bodySemi, color: c.brand }}>Walking directions</Text>
          </Pressable>
          {stations.map((st) => (
            <View key={st.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TrainFront size={14} color={c.inkMuted} />
              <Small>
                {st.name} · {st.walk_minutes} min walk
              </Small>
            </View>
          ))}
        </View>
      </View>
      {p.features && p.features.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {p.features.map((f) => (
            <View key={f} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Small style={{ color: c.ink }}>{FEATURES[f as FeatureKey] ?? f}</Small>
            </View>
          ))}
        </View>
      ) : null}

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 4 }}>
            <Small>Excellence Index</Small>
            <IndexScore value={s.index} size="lg" />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <AwardChip tier={s.award} />
            {s.award ? <Small>{AWARDS[s.award].blurb}</Small> : null}
          </View>
        </View>
        {p.pintScore != null || p.pubScore != null ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              ['Pint', p.pintScore, 'the glass alone'],
              ['Pub', p.pubScore, 'room and service'],
            ].map(([k, v, sub]) => (
              <View key={k as string} style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 8 }}>
                <Small>{k as string}</Small>
                <Text style={{ fontFamily: Fonts.display, fontSize: 30, color: k === 'Pint' ? c.brand : c.ink }}>{v ?? '–'}</Text>
                <Small>{sub as string}</Small>
              </View>
            ))}
          </View>
        ) : null}
        {s.index == null ? <Body muted>Needs {MIN_RATINGS_FOR_INDEX} ratings for a score. Be one of the first.</Body> : null}
        <Small>
          {s.ratingCount} pints in the last year · {Math.round(s.verifiedShare * 100)}% verified visits
        </Small>
        <ScoreBar label="Pour quality · 40%" value={s.components.pour} />
        <ScoreBar label="Taste and temperature · 20%" value={s.components.tasteTemperature} />
        <ScoreBar label="Consistency · 15%" value={s.components.consistency} />
        <ScoreBar label="Atmosphere and service · 15%" value={s.components.atmosphereService} />
        <ScoreBar label="Value for money · 10%" value={s.components.value} />
        {s.award ? <Small>{AWARD_DISCLAIMER}</Small> : null}
      </Card>

      <PubExtras pubId={p.id} />

      {p.venueNote || p.linesCleanedOn ? (
        <Card style={{ gap: 6 }}>
          <Body style={{ fontFamily: Fonts.bodySemi }}>From the pub</Body>
          {p.venueNote ? <Body>{p.venueNote}</Body> : null}
          {p.linesCleanedOn ? <Small>Lines last cleaned {new Date(p.linesCleanedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Small> : null}
        </Card>
      ) : null}

      <H2>Latest pints</H2>
      {ratings.length === 0 ? (
        <EmptyState icon={<Beer size={22} color={c.inkSubtle} />} title="No pints rated here yet" body={`Be the first. ${MIN_RATINGS_FOR_INDEX} ratings give ${p.name} its Excellence Index.`} />
      ) : null}
      {ratings.map((r) => {
        const name = r.anonymous ? 'Anonymous' : (r.authorName ?? 'A drinker');
        return (
          <Card key={r.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Initials name={name} size={34} />
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: 'Jost_600SemiBold' }}>{name}</Body>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {r.verification !== 'none' ? <BadgeCheck size={13} color={c.brand} /> : null}
                  <Small>
                    {r.verification !== 'none' ? 'Verified visit · ' : ''}
                    {new Date(r.ratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {r.pricePence ? ` · ${formatPrice(r.pricePence)}` : ''}
                  </Small>
                </View>
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </View>
            {r.photoUri ? <Image source={{ uri: r.photoUri }} style={{ width: '100%', height: 220, borderRadius: 12 }} resizeMode="cover" /> : null}
            {r.note ? <Body>{r.note}</Body> : null}
            {r.tags && r.tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {r.tags.map((t) => {
                  const tag = TAGS[t as TagKey];
                  return (
                    <View key={t} style={{ backgroundColor: tag?.good ? c.brandTint : c.dangerTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Small style={{ color: tag?.good ? c.brand : c.danger }}>{tag?.label ?? t}</Small>
                    </View>
                  );
                })}
              </View>
            ) : null}
            <Small>
              Pour {r.pour} · Head {r.head} · Taste {r.taste} · Temp {r.temperature} · Texture {r.texture}
            </Small>
            {r.reply ? (
              <View style={{ backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 10 }}>
                <Small style={{ color: c.ink }}>Reply from {p.name}: {r.reply}</Small>
              </View>
            ) : null}
            {isSupabaseConfigured && /^[0-9a-f-]{36}$/i.test(r.id) ? (
              <Pressable accessibilityRole="button" onPress={() => reportOrBlock(r.id)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                <Small>Report or block</Small>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 4, backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.border }}>
        <Button label="Rate a pint here" onPress={() => router.push(`/rate/${p.id}`)} />
      </View>
    </View>
  );
}
