// The RateMyGuin mark, direction A "The Tick" from the v0 brand board:
// a pint with a cream head and a tick in the body. Paths copied from docs/brand/direction-a.svg.

import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Fonts, usePalette } from '@/constants/theme';

const STOUT = '#17110D';
const PORTER = '#2B1E17';
const CREAM = '#F6EEDC';
const BRASS = '#D9A93F';

type Tone = 'light' | 'dark' | 'pubs';

export function Mark({ size = 32, tone }: { size?: number; tone?: Tone }) {
  const c = usePalette();
  const t: Tone = tone ?? (c.bg === STOUT ? 'dark' : 'light');
  const line = t === 'dark' ? CREAM : STOUT;
  const body = t === 'dark' ? PORTER : STOUT;
  const tick = t === 'pubs' ? BRASS : CREAM;
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Path d="M6.8 11.5H29.2L26.8 31.2Q26.6 33 24.8 33H11.2Q9.4 33 9.2 31.2Z" fill={body} stroke={line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M6.8 11.5L6 6C6 3 9 2 11 3C12.5 1.2 16 1 18 2.5C20 1.2 23.5 1.5 25 3C27.5 2 30 3.5 30 6L29.2 11.5Z" fill={CREAM} stroke={line} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12.5 21.5L16.5 25.5L24 17" fill="none" stroke={tick} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Lockup({ pubs, size = 22 }: { pubs?: boolean; size?: number }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Mark size={size * 1.3} tone={pubs ? 'pubs' : undefined} />
      <Text style={{ fontFamily: Fonts.display, fontSize: size, color: c.ink, letterSpacing: -0.5 }}>
        <Text style={{ fontFamily: Fonts.displayBold }}>ratemy</Text>guin
      </Text>
      {pubs ? (
        <View style={{ backgroundColor: c.brand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: c.onBrand }}>for pubs</Text>
        </View>
      ) : null}
    </View>
  );
}
