import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lockup } from '@/components/brand';
import { AwardChip, Body, Button, Card, H1, H2, Initials, ScoreBar, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { AWARD_DISCLAIMER, AWARDS, excellenceIndex, INDEX_WEIGHTS } from '@/domain/scores';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

// RateMyGuin for Pubs: the landlord's view of their own pub.
export default function PubDashboard() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { pub, myPubId, live } = useStore();
  const p = myPubId ? pub(myPubId) : undefined;

  if (!p) {
    const signedIn = !live || status === 'ready';
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
        <Lockup pubs size={20} />
        <H1>{signedIn ? 'Claim your pub' : 'Sign in to see your pub'}</H1>
        <Body muted>
          {signedIn
            ? 'Your account isn\'t linked to a pub yet. Ask the RateMyGuin team to link it. Claiming your pub from the app is coming next.'
            : 'See your Excellence Index, what drinkers say about your pour, and reply to reviews.'}
        </Body>
        {signedIn ? null : <Button label="Sign in" onPress={() => router.push('/sign-in')} />}
      </View>
    );
  }
  return <Dashboard pubId={p.id} />;
}

function Dashboard({ pubId }: { pubId: string }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pub, pubs, ratingsFor, replyTo } = useStore();
  const p = pub(pubId)!;
  const s = p.score;
  const ratings = ratingsFor(p.id);

  // Index at the end of each of the last six months.
  const trend = Array.from({ length: 6 }, (_, i) => {
    const end = new Date();
    end.setMonth(end.getMonth() - (5 - i));
    const upto = ratings.filter((r) => Date.parse(r.ratedAt) <= end.getTime());
    return { label: end.toLocaleDateString('en-GB', { month: 'short' }), v: excellenceIndex(upto, { now: end }).index };
  });
  const pts = trend.filter((t) => t.v != null) as { label: string; v: number }[];
  const lo = Math.min(...pts.map((t) => t.v)) - 3;
  const hi = Math.max(...pts.map((t) => t.v)) + 3;

  const nearby = pubs.filter((x) => x.id !== p.id && x.city === p.city && x.score.index != null && (x.distanceM ?? 0) < 4000);
  const nearbyAvg = nearby.length ? Math.round(nearby.reduce((a, x) => a + x.score.index!, 0) / nearby.length) : null;
  const rank = [...nearby, p].sort((a, b) => (b.score.index ?? 0) - (a.score.index ?? 0)).findIndex((x) => x.id === p.id) + 1;

  const pourComplaints = ratings.filter((r) => r.pour <= 6).length;
  const latest = ratings.find((r) => !r.reply && r.note);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14, paddingBottom: 48 }}>
      <Lockup pubs size={20} />
      <H1>{p.name}</H1>

      <Card style={{ backgroundColor: c.brand, borderColor: c.brand, gap: 8 }}>
        <Small style={{ color: c.onBrand, opacity: 0.85 }}>Your Excellence Index</Small>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <H1 style={{ color: c.onBrand, fontSize: 56, lineHeight: 60 }}>{s.index ?? '–'}</H1>
            <Small style={{ color: c.onBrand, marginBottom: 10 }}>/100</Small>
          </View>
          <AwardChip tier={s.award} />
        </View>
        <Small style={{ color: c.onBrand }}>
          {s.ratingCount} pints in the last year · {Math.round(s.verifiedShare * 100)}% verified
        </Small>
      </Card>

      <Card style={{ gap: 10 }}>
        <H2>Score over six months</H2>
        <Svg width="100%" height={90} viewBox="0 0 100 40" preserveAspectRatio="none">
          <Polyline
            points={pts.map((t, i) => `${(i / Math.max(pts.length - 1, 1)) * 96 + 2},${38 - ((t.v - lo) / (hi - lo)) * 34}`).join(' ')}
            fill="none"
            stroke={c.brand}
            strokeWidth={1.5}
          />
          {pts.map((t, i) => (
            <Circle key={i} cx={(i / Math.max(pts.length - 1, 1)) * 96 + 2} cy={38 - ((t.v - lo) / (hi - lo)) * 34} r={1.6} fill={c.brand} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {trend.map((t) => (
            <Small key={t.label}>
              {t.label} {t.v ?? ''}
            </Small>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <H2>What makes up your score</H2>
        <ScoreBar label={`Pour quality · ${INDEX_WEIGHTS.pour * 100}%`} value={s.components.pour} />
        <ScoreBar label={`Taste and temperature · ${INDEX_WEIGHTS.tasteTemperature * 100}%`} value={s.components.tasteTemperature} />
        <ScoreBar label={`Consistency · ${INDEX_WEIGHTS.consistency * 100}%`} value={s.components.consistency} />
        <ScoreBar label={`Atmosphere and service · ${INDEX_WEIGHTS.atmosphereService * 100}%`} value={s.components.atmosphereService} />
        <ScoreBar label={`Value for money · ${INDEX_WEIGHTS.value * 100}%`} value={s.components.value} />
        {pourComplaints > 0 ? (
          <View style={{ backgroundColor: c.warningTint, borderRadius: 12, padding: 10 }}>
            <Small style={{ color: c.warning }}>
              {pourComplaints} {pourComplaints === 1 ? 'drinker' : 'drinkers'} scored your pour 6 or under. Check the two-part pour and line cleaning.
            </Small>
          </View>
        ) : null}
      </Card>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Stat label="Nearby rank" value={`#${rank}`} />
        <Stat label="Nearby average" value={`${nearbyAvg ?? '–'}`} />
        <Stat label="Your pint" value={s.medianPricePence ? `£${(s.medianPricePence / 100).toFixed(2)}` : '–'} />
      </Card>

      {s.award ? (
        <Card style={{ gap: 8, alignItems: 'flex-start' }}>
          <H2>RateMyGuin Awards {new Date().getFullYear() + 1}</H2>
          <Body>
            You&apos;re on track for {AWARDS[s.award].name} ({AWARDS[s.award].range}).
          </Body>
          <Small>{AWARD_DISCLAIMER}</Small>
          <Button kind="secondary" label="Download certificate" onPress={() => {}} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : null}

      {latest ? <Reply rating={latest} onReply={(t) => replyTo(latest.id, t)} /> : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Body style={{ fontFamily: Fonts.display, fontSize: 22, color: c.ink }}>{value}</Body>
      <Small>{label}</Small>
    </View>
  );
}

function Reply({ rating, onReply }: { rating: { id: string; overall: number; note: string; authorName?: string | null }; onReply: (t: string) => Promise<void> }) {
  const c = usePalette();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const who = { name: rating.authorName ?? 'Guest' };
  return (
    <Card style={{ gap: 10 }}>
      <H2>Latest review</H2>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Initials name={who.name} size={34} />
        <Body style={{ flex: 1, fontFamily: 'Jost_600SemiBold' }}>{who.name}</Body>
        <H2>{rating.overall.toFixed(1)}</H2>
      </View>
      <Body>{rating.note}</Body>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Reply publicly…"
        placeholderTextColor={c.inkSubtle}
        style={{ fontFamily: Fonts.body, fontSize: 15, color: c.ink, backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 12 }}
      />
      {error ? <Small style={{ color: c.danger }}>{error}</Small> : null}
      <Button
        label="Post reply"
        disabled={!text.trim()}
        onPress={() => {
          onReply(text.trim())
            .then(() => setText(''))
            .catch((e: Error) => setError(e.message));
        }}
      />
    </Card>
  );
}
