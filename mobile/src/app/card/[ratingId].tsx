import { router, useLocalSearchParams } from 'expo-router';
import { Share, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Body, Button } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { SUB_SCORE_LABELS, SUB_SCORES } from '@/domain/scores';
import { ME, PUBS } from '@/lib/demo';
import { useStore } from '@/lib/store';

const STOUT = '#17110D';
const CREAM = '#F6EEDC';
const GREEN = '#5DBE96';

// The shareable pint card: always stout and cream, whatever the phone's theme.
// TODO: render to an image (react-native-view-shot) for Instagram stories.
export default function PintCard() {
  const { ratingId } = useLocalSearchParams<{ ratingId: string }>();
  const { ratings } = useStore();
  const r = ratings.find((x) => x.id === ratingId);
  if (!r) return <Body>Rating not found.</Body>;
  const pub = PUBS.find((p) => p.id === r.pubId)!;

  const share = () =>
    Share.share({ message: `${r.overall.toFixed(1)}/10 for the Guinness at ${pub.name}. Rated on RateMyGuin.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0A07', padding: 20, gap: 16, justifyContent: 'center' }}>
      <View style={{ aspectRatio: 1080 / 1350, borderRadius: 24, overflow: 'hidden', backgroundColor: STOUT }}>
        <View style={{ backgroundColor: CREAM, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 13, color: STOUT, opacity: 0.7 }}>{pub.neighbourhood}, {pub.city}</Text>
          <Text style={{ fontFamily: Fonts.display, fontSize: 28, color: STOUT }}>{pub.name}</Text>
        </View>
        <Svg width="100%" height={18} viewBox="0 0 100 10" preserveAspectRatio="none">
          <Path d="M0 0 H100 V4 C 90 10, 80 0, 70 5 S 50 10, 40 5 S 20 0, 10 6 S 2 4, 0 6 Z" fill={CREAM} />
        </Svg>
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 96, lineHeight: 100, color: CREAM }}>{r.overall.toFixed(1)}</Text>
            <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 22, color: CREAM, opacity: 0.6, marginBottom: 16 }}>/10</Text>
          </View>
          <View style={{ gap: 6 }}>
            {SUB_SCORES.map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: CREAM, width: 96 }}>{SUB_SCORE_LABELS[k]}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#2E241C' }}>
                  <View style={{ width: `${r[k] * 10}%`, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                </View>
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: CREAM, width: 30, textAlign: 'right' }}>{r[k].toFixed(1)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: CREAM, opacity: 0.8 }}>{r.anonymous ? 'Anonymous' : `@${ME.handle}`}{r.verification !== 'none' ? ' · Verified visit' : ''}</Text>
            <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: CREAM }}>
              ratemy<Text style={{ color: GREEN }}>guin</Text>
            </Text>
          </View>
        </View>
      </View>
      <Button label="Share" onPress={share} />
      <Button kind="secondary" label="Done" onPress={() => router.back()} />
    </View>
  );
}
