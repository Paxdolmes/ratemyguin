// The ratemyGuin mark: a simple stout-glass silhouette with a cream head and a fine
// gold outline, and the serif wordmark "ratemyGuin". Same glass as the website.

import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { Fonts, usePalette } from '@/constants/theme';

const STOUT = '#17110D';
const CREAM = '#F6EEDC';
const GILT = '#D4A94A';
const GOLD = '#8A6516';
const GLASS = 'M7.2 3 H32.8 C33.3 9 34.2 17 34.2 24 C34.2 38 30.3 50 29.4 58 L29.4 59.6 Q29.4 61 28.0 61 H12.0 Q10.6 61 10.6 59.6 L10.6 58 C9.7 50 5.8 38 5.8 24 C5.8 17 6.7 9 7.2 3 Z';

type Tone = 'light' | 'dark' | 'pubs';

/** Glass is drawn on a 40 x 64 grid; size is the height. */
export function Mark({ size = 32, tone }: { size?: number; tone?: Tone }) {
  const c = usePalette();
  const t: Tone = tone ?? (c.bg === STOUT ? 'dark' : 'light');
  const line = t === 'light' ? STOUT : GILT;
  const stroke = size >= 80 ? 1.1 : size >= 40 ? 1.7 : 2.4;
  return (
    <Svg width={(size * 40) / 64} height={size} viewBox="0 0 40 64">
      <Defs>
        <ClipPath id="glass">
          <Path d={GLASS} />
        </ClipPath>
      </Defs>
      <Path d={GLASS} fill={STOUT} />
      <Rect x={0} y={0} width={40} height={10} fill={CREAM} clipPath="url(#glass)" />
      <Path d={GLASS} fill="none" stroke={line} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  );
}

export function Lockup({ pubs, size = 24 }: { pubs?: boolean; size?: number }) {
  const c = usePalette();
  const dark = c.bg === STOUT;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Mark size={size * 1.25} tone={pubs ? 'pubs' : undefined} />
      <Text style={{ fontFamily: Fonts.displayBold, fontSize: size, color: c.ink }}>
        ratemy<Text style={{ color: dark ? GILT : GOLD }}>Guin</Text>
      </Text>
      {pubs ? (
        <View style={{ backgroundColor: c.brand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 12, color: c.onBrand }}>for pubs</Text>
        </View>
      ) : null}
    </View>
  );
}
