/**
 * RateMyGuin brand tokens.
 * Plain object, no imports, no framework types: copy straight into Expo / React Native.
 * Independent brand. Not affiliated with Guinness or Diageo.
 */
export const brand = {
  name: 'RateMyGuin',
  pubsName: 'RateMyGuin for Pubs',
  wordmark: 'ratemyguin',
  disclaimer: 'Independent award. Not official Guinness recognition.',

  color: {
    /** Raw brand colours, same in light and dark. */
    base: {
      stout: '#17110D', // black body
      porter: '#2B1E17', // deep porter brown, raised dark surfaces
      head: '#F6EEDC', // cream head
      paper: '#FBF8F1', // light app background
      pubGreen: '#1B5E45', // signature accent / primary (light mode)
      pubGreenLight: '#5DBE96', // primary on dark surfaces
      brass: '#D9A93F', // award metal, scores
      brassDeep: '#8F6310', // brass for text on light surfaces
    },

    light: {
      background: '#FBF8F1',
      surface: '#FFFFFF',
      surfaceAlt: '#F2EDE2',
      border: '#E3DBCB',
      text: '#17110D',
      textMuted: '#6B6153',
      primary: '#1B5E45',
      onPrimary: '#FFFFFF',
      accent: '#D9A93F',
      onAccent: '#17110D',
      success: '#2F7A2A',
      warning: '#A85A00',
      danger: '#B3261E',
      onStatus: '#FFFFFF',
    },

    dark: {
      background: '#17110D',
      surface: '#211812',
      surfaceAlt: '#2B1E17',
      border: '#3A2D24',
      text: '#F6EEDC',
      textMuted: '#B8AC97',
      primary: '#5DBE96',
      onPrimary: '#17110D',
      accent: '#D9A93F',
      onAccent: '#17110D',
      success: '#8BC34A',
      warning: '#F2B34A',
      danger: '#EE8B82',
      onStatus: '#17110D',
    },

    neutral: {
      50: '#FBF8F1',
      100: '#F2EDE2',
      200: '#E3DBCB',
      400: '#A39A88',
      600: '#6B6153',
      800: '#3A3128',
      900: '#17110D',
    },

    /** Flat map colours for the Near me screen. */
    map: {
      land: '#F1ECDF',
      park: '#DCE5CF',
      water: '#CFE0E6',
      road: '#FFFFFF',
      minorRoad: '#E3DBCB',
    },
  },

  /** Award tiers. Seal / ring / text colours are fixed so the badge looks the same everywhere. */
  awards: {
    exceptional: {
      label: 'Exceptional',
      range: '95-100',
      seal: '#17110D',
      ring: '#D9A93F',
      text: '#F6EEDC',
      title: '#D9A93F',
    },
    goldStandard: {
      label: 'Gold Standard',
      range: '90-94',
      seal: '#D9A93F',
      ring: '#17110D',
      text: '#17110D',
      title: '#17110D',
    },
    highlyRecommended: {
      label: 'Highly Recommended',
      range: '80-89',
      seal: '#1B5E45',
      ring: '#F6EEDC',
      text: '#F6EEDC',
      title: '#F6EEDC',
    },
  },

  /** Display = Bricolage Grotesque, body = Figtree (both on Google Fonts / @expo-google-fonts). */
  type: {
    family: {
      display: 'Bricolage Grotesque',
      body: 'Figtree',
    },
    expoFont: {
      displayBold: 'BricolageGrotesque_700Bold',
      displayExtraBold: 'BricolageGrotesque_800ExtraBold',
      bodyRegular: 'Figtree_400Regular',
      bodyMedium: 'Figtree_500Medium',
      bodySemiBold: 'Figtree_600SemiBold',
      bodyBold: 'Figtree_700Bold',
    },
    scale: {
      scoreXL: { font: 'display', size: 96, lineHeight: 96, weight: 800, tracking: -3 },
      scoreL: { font: 'display', size: 64, lineHeight: 64, weight: 800, tracking: -2 },
      display: { font: 'display', size: 44, lineHeight: 48, weight: 800, tracking: -1 },
      h1: { font: 'display', size: 32, lineHeight: 36, weight: 800, tracking: -0.6 },
      h2: { font: 'display', size: 24, lineHeight: 28, weight: 700, tracking: -0.3 },
      h3: { font: 'display', size: 18, lineHeight: 24, weight: 700, tracking: -0.1 },
      bodyL: { font: 'body', size: 17, lineHeight: 26, weight: 400, tracking: 0 },
      body: { font: 'body', size: 15, lineHeight: 22, weight: 400, tracking: 0 },
      label: { font: 'body', size: 13, lineHeight: 18, weight: 600, tracking: 0.2 },
      caption: { font: 'body', size: 12, lineHeight: 16, weight: 500, tracking: 0.2 },
    },
  },

  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999, appIcon: 0.225 }, // appIcon = fraction of tile width
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },

  /** Excellence Index weighting (out of 100). */
  excellenceIndex: [
    { key: 'pour', label: 'Pour', weight: 40 },
    { key: 'tasteTemp', label: 'Taste & temperature', weight: 20 },
    { key: 'consistency', label: 'Consistency', weight: 15 },
    { key: 'atmosphere', label: 'Atmosphere & service', weight: 15 },
    { key: 'value', label: 'Value', weight: 10 },
  ],
} as const

export type BrandTheme = Record<keyof (typeof brand.color)['light'], string>
export type AwardTier = keyof typeof brand.awards

