// RateMyGuin design tokens, from the v0 brand board.
// Black (stout), cream and Guinness-style gold. Gold is the main action; deep gold on light, bright gold on dark.

import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    bg: '#FBF8F1', // paper
    surface: '#FFFFFF',
    surfaceMuted: '#F2EDE2',
    ink: '#17110D', // stout
    inkMuted: '#6B6153',
    inkSubtle: '#7A6F5E',
    border: '#E3DBCB',

    brand: '#8A6516', // deep gold: main actions, white text 5:1
    brandPressed: '#755512',
    brandTint: '#F3E9D2',
    onBrand: '#FFFFFF',

    cream: '#F6EEDC', // the head
    stout: '#17110D',

    brass: '#D4A94A', // awards, fills only
    brassText: '#8F6310',
    brassTint: '#F7EBCB',

    success: '#2F7A2A',
    successTint: '#E3F0DF',
    warning: '#A85A00',
    warningTint: '#FBEBD4',
    danger: '#B3261E',
    dangerTint: '#F9E1DE',
  },
  dark: {
    bg: '#17110D',
    surface: '#211812',
    surfaceMuted: '#2B1E17',
    ink: '#F6EEDC',
    inkMuted: '#B8AC97',
    inkSubtle: '#8E826E',
    border: '#3A2D24',

    brand: '#D4A94A',
    brandPressed: '#C29736',
    brandTint: '#3A2C12',
    onBrand: '#17110D',

    cream: '#F6EEDC',
    stout: '#17110D',

    brass: '#D4A94A',
    brassText: '#F2B34A',
    brassTint: '#3A2C12',

    success: '#8BC34A',
    successTint: '#24321A',
    warning: '#F2B34A',
    warningTint: '#3A2C12',
    danger: '#EE8B82',
    dangerTint: '#3C1E1B',
  },
} as const;

export type Palette = { [K in keyof (typeof Colors)['light']]: string };

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}

export const Fonts = {
  display: 'CormorantGaramond_700Bold',
  displayBold: 'CormorantGaramond_600SemiBold',
  body: 'Jost_400Regular',
  bodyMedium: 'Jost_500Medium',
  bodySemi: 'Jost_600SemiBold',
  bodyBold: 'Jost_700Bold',
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
