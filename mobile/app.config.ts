import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, two store apps. Pick with APP_VARIANT=drinkers|pubs (default drinkers).
const variant = process.env.APP_VARIANT === 'pubs' ? 'pubs' : 'drinkers';

const VARIANTS = {
  drinkers: {
    name: 'RateMyGuin',
    slug: 'ratemyguin',
    scheme: 'ratemyguin',
    bundleId: 'com.ratemyguin.app',
    tile: '#14100C',
  },
  pubs: {
    name: 'RateMyGuin for Pubs',
    slug: 'ratemyguin-pubs',
    scheme: 'ratemyguinpubs',
    bundleId: 'com.ratemyguin.pubs',
    tile: '#F1E6CF',
  },
} as const;

const v = VARIANTS[variant];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: v.name,
  slug: v.slug,
  owner: 'ratemyguin',
  scheme: v.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: v.bundleId,
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'RateMyGuin checks you are in the pub so your rating counts as a verified visit.',
    },
  },
  android: {
    package: v.bundleId,
    adaptiveIcon: { backgroundColor: v.tile },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: { bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      { locationWhenInUsePermission: 'RateMyGuin checks you are in the pub so your rating counts as a verified visit.' },
    ],
    ['expo-image-picker', { photosPermission: 'Add a photo of your pint to your rating.', cameraPermission: 'Take a photo of your pint.' }],
  ],
  experiments: { typedRoutes: false },
  extra: { appVariant: variant },
});
