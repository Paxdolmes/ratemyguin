// RateMyGuin design tokens, from the v0 brand board.
// Stout and cream carry the pint, pub green is the main action, brass is for awards only.

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

    brand: '#1B5E45', // pub green: main actions, white text 7.7:1
    brandPressed: '#16573F',
    brandTint: '#E2EFE8',
    onBrand: '#FFFFFF',

    cream: '#F6EEDC', // the head
    stout: '#17110D',

    brass: '#D9A93F', // awards, fills only
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

    brand: '#5DBE96',
    brandPressed: '#4CA883',
    brandTint: '#1F3A2E',
    onBrand: '#17110D',

    cream: '#F6EEDC',
    stout: '#17110D',

    brass: '#D9A93F',
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
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
