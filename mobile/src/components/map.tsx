// A flat map: light street lines, a river, and pins showing each pub's Index.
// Stands in for a live map (react-native-maps / MapLibre) until that's added.

import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Fonts, usePalette } from '@/constants/theme';
import type { PubWithScore } from '@/lib/store';

type Props = { pubs: PubWithScore[]; here: { lat: number; lng: number }; height?: number; onPick: (id: string) => void };

export function PubMap({ pubs, here, height = 280, onPick }: Props) {
  const c = usePalette();
  const pts = [...pubs, here];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.004;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * 100;

  return (
    <View style={{ height, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x="62" y="8" width="20" height="16" rx="3" fill={c.brandTint} />
        <Path d="M0 82 C 25 76, 40 92, 60 84 S 90 70, 100 78 L100 90 C 88 84, 70 98, 55 94 S 20 90, 0 94 Z" fill="#CFE0EA" opacity={0.8} />
        {[12, 30, 47, 66].map((v) => (
          <Path key={`h${v}`} d={`M0 ${v} L100 ${v + 6}`} stroke={c.border} strokeWidth={1.2} />
        ))}
        {[18, 41, 58, 80].map((v) => (
          <Path key={`v${v}`} d={`M${v} 0 L${v - 8} 100`} stroke={c.border} strokeWidth={1.2} />
        ))}
        <Circle cx={x(here.lng)} cy={y(here.lat)} r={2.4} fill={c.brand} opacity={0.25} />
        <Circle cx={x(here.lng)} cy={y(here.lat)} r={1.2} fill={c.brand} />
      </Svg>
      {pubs.map((p) => {
        const tier = p.score.award;
        const bg = tier === 'exceptional' ? c.stout : tier === 'gold' ? c.brass : c.surface;
        const fg = tier === 'exceptional' ? c.brass : tier === 'gold' ? c.stout : c.ink;
        return (
          <Pressable
            key={p.id}
            accessibilityLabel={`${p.name}, ${p.score.index ?? 'new'}`}
            onPress={() => onPick(p.id)}
            style={{ position: 'absolute', left: `${x(p.lng)}%`, top: `${y(p.lat)}%`, transform: [{ translateX: -20 }, { translateY: -30 }], alignItems: 'center' }}>
            <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, minWidth: 40, alignItems: 'center', borderWidth: 1, borderColor: c.border }}>
              <Text style={{ fontFamily: Fonts.display, fontSize: 14, color: fg }}>{p.score.index ?? 'New'}</Text>
            </View>
            <View style={{ width: 8, height: 8, backgroundColor: bg, transform: [{ rotate: '45deg' }], marginTop: -5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: c.border }} />
          </Pressable>
        );
      })}
    </View>
  );
}
