import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Check, ChevronRight } from 'lucide-react-native';

import { Fonts, Radius, usePalette } from '@/constants/theme';
import { AWARDS, type AwardTier } from '@/domain/scores';

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return <Text style={[{ fontFamily: Fonts.display, fontSize: 30, lineHeight: 34, color: c.ink, letterSpacing: -0.5 }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return <Text style={[{ fontFamily: Fonts.displayBold, fontSize: 20, lineHeight: 24, color: c.ink }, style]}>{children}</Text>;
}

export function Body({ children, muted, style, numberOfLines }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const c = usePalette();
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: Fonts.body, fontSize: 15, lineHeight: 21, color: muted ? c.inkMuted : c.ink }, style]}>
      {children}
    </Text>
  );
}

export function Small({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const c = usePalette();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.inkMuted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return <View style={[{ backgroundColor: c.surface, borderRadius: Radius.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = 'primary', disabled, style }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary'; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: primary ? (pressed ? c.brandPressed : c.brand) : c.surfaceMuted,
          borderRadius: Radius.pill,
          paddingVertical: 15,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 16, color: primary ? c.onBrand : c.ink }}>{label}</Text>
    </Pressable>
  );
}

/** A pill. With `toggle`, it shows a tick when on, so it's clear a second tap turns it off. */
export function Chip({ label, active, onPress, tone, toggle }: { label: string; active?: boolean; onPress?: () => void; tone?: 'success'; toggle?: boolean }) {
  const c = usePalette();
  const bg = tone === 'success' ? c.successTint : active ? c.ink : c.surfaceMuted;
  const fg = tone === 'success' ? c.success : active ? c.bg : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={toggle ? 'checkbox' : 'button'}
      accessibilityState={toggle ? { checked: Boolean(active) } : { selected: Boolean(active) }}
      hitSlop={6}
      style={{ backgroundColor: bg, borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {toggle && active ? <Check size={14} color={fg} strokeWidth={3} /> : null}
      <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 13, color: fg }}>{label}</Text>
    </Pressable>
  );
}

/** Pick exactly one option, like iOS's segmented control. */
export function Segmented<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = usePalette();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.surfaceMuted, borderRadius: Radius.pill, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: on ? c.surface : 'transparent', borderWidth: on ? StyleSheet.hairlineWidth : 0, borderColor: c.border }}>
            <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: on ? c.ink : c.inkMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A tappable row that goes somewhere, e.g. Offers near me. */
export function LinkRow({ label, hint, icon, onPress }: { label: string; hint?: string; icon?: ReactNode; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.surfaceMuted : c.surface, borderRadius: Radius.lg, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border })}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: c.ink }} numberOfLines={1}>{label}</Text>
        {hint ? <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: c.inkMuted }} numberOfLines={1}>{hint}</Text> : null}
      </View>
      <ChevronRight size={16} color={c.inkSubtle} />
    </Pressable>
  );
}

export function Initials({ name, size = 40 }: { name: string; size?: number }) {
  const c = usePalette();
  const letters = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: size * 0.38, color: '#17110D' }}>{letters}</Text>
    </View>
  );
}

/** The Excellence Index as a big number, or "New" when there aren't enough ratings. */
export function IndexScore({ value, size = 'md' }: { value: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const c = usePalette();
  const fs = size === 'lg' ? 56 : size === 'md' ? 26 : 18;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={{ fontFamily: Fonts.display, fontSize: fs, lineHeight: fs * 1.05, color: c.ink }}>{value ?? 'New'}</Text>
      {value != null ? <Text style={{ fontFamily: Fonts.bodySemi, fontSize: fs * 0.38, color: c.inkMuted, marginBottom: fs * 0.12, marginLeft: 2 }}>/100</Text> : null}
    </View>
  );
}

export function AwardChip({ tier }: { tier: AwardTier | null }) {
  const c = usePalette();
  if (!tier) return null;
  const style = {
    exceptional: { bg: c.stout, fg: c.brass, border: c.brass },
    gold: { bg: c.brass, fg: c.stout, border: c.brass },
    recommended: { bg: c.brandTint, fg: c.brand, border: c.brandTint },
  }[tier];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: style.bg, borderColor: style.border, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: style.fg }}>{AWARDS[tier].name}</Text>
    </View>
  );
}

/** A 0–10 bar for sub-scores. */
export function ScoreBar({ label, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  const c = usePalette();
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: c.ink }}>{label}</Text>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: c.ink }}>{value == null ? '–' : value.toFixed(1)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: c.brand }} />
      </View>
    </View>
  );
}

/** Pick a score from 0 to 10 in half points: tap a segment, or nudge with − and +. */
export function ScorePicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const c = usePalette();
  const step = (d: number) => onChange(Math.max(0, Math.min(10, value + d)));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 15, color: c.ink }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Stepper label="−" onPress={() => step(-0.5)} />
          <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: c.ink, minWidth: 34, textAlign: 'center' }}>{value.toFixed(1)}</Text>
          <Stepper label="+" onPress={() => step(0.5)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <Pressable key={i} accessibilityLabel={`${label} ${i + 1}`} onPress={() => onChange(i + 1)} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: i + 1 <= value ? c.brand : i + 0.5 <= value ? c.brandTint : c.surfaceMuted }} />
        ))}
      </View>
    </View>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 18, color: c.ink, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}
