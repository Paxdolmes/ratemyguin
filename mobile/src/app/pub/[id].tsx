import { router, Stack, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Clock, MapPin } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { AwardChip, Body, Button, Card, H1, H2, IndexScore, Initials, ScoreBar, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { AWARD_DISCLAIMER, AWARDS, MIN_RATINGS_FOR_INDEX } from '@/domain/scores';
import { PEOPLE } from '@/lib/demo';
import { formatDistance, formatPrice, useStore } from '@/lib/store';

export default function PubProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePalette();
  const { pub, ratingsFor } = useStore();
  const p = pub(id);
  if (!p) return <Body>Pub not found.</Body>;
  const s = p.score;
  const ratings = ratingsFor(p.id).slice(0, 12);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={{ gap: 6 }}>
        <H1>{p.name}</H1>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color={c.inkMuted} />
          <Small>
            {p.address}, {p.neighbourhood} · {formatDistance(p.distanceM)}
          </Small>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color={c.inkMuted} />
          <Small>
            {p.hours} · {p.atmosphere} · Pint {formatPrice(s.medianPricePence)}
          </Small>
        </View>
      </View>

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

      <Button label="Rate a pint here" onPress={() => router.push(`/rate/${p.id}`)} />

      <H2>Latest pints</H2>
      {ratings.map((r) => {
        const who = PEOPLE.find((x) => x.id === r.userId);
        const name = r.anonymous ? 'Anonymous' : (who?.name ?? 'You');
        return (
          <Card key={r.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Initials name={name} size={34} />
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: 'Figtree_700Bold' }}>{name}</Body>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {r.verification !== 'none' ? <BadgeCheck size={13} color={c.success} /> : null}
                  <Small>
                    {r.verification !== 'none' ? 'Verified visit · ' : ''}
                    {new Date(r.ratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {r.pricePence ? ` · ${formatPrice(r.pricePence)}` : ''}
                  </Small>
                </View>
              </View>
              <H2>{r.overall.toFixed(1)}</H2>
            </View>
            <Body>{r.note}</Body>
            <Small>
              Pour {r.pour} · Head {r.head} · Taste {r.taste} · Temp {r.temperature} · Texture {r.texture}
            </Small>
            {r.reply ? (
              <View style={{ backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 10 }}>
                <Small style={{ color: c.ink }}>Reply from {p.name}: {r.reply}</Small>
              </View>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}
