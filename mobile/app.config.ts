import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, two store apps. Pick with APP_VARIANT=drinkers|pubs (default drinkers).
const variant = process.env.APP_VARIANT === 'pubs' ? 'pubs' : 'drinkers';

const VARIANTS = {
  drinkers: {
    name: 'ratemyGuin',
    slug: 'ratemyguin',
    scheme: 'ratemyguin',
    bundleId: 'com.ratemyguin.app',
    tile: '#14100C',
    easProjectId: 'd2021972-3a1d-41c6-83d0-081081259f40',
  },
  pubs: {
    name: 'ratemyGuin for Pubs',
    slug: 'ratemyguin-pubs',
    scheme: 'ratemyguinpubs',
    bundleId: 'com.ratemyguin.pubs',
    tile: '#F1E6CF',
    easProjectId: '', // created on the first pubs build
  },
} as const;

const v = VARIANTS[variant];

// Shown when the phone asks for location. Covers both uses, as Apple requires.
const LOCATION_WHY = 'ratemyGuin uses your location to show the pubs nearest you, and to check you are in the pub when you rate so your rating counts as a verified visit.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: v.name,
  slug: v.slug,
  owner: 'ratemyguin',
  scheme: v.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: v.bundleId,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_WHY,
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
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 110, backgroundColor: '#17110D' }],
    [
      'expo-location',
      { locationWhenInUsePermission: LOCATION_WHY },
    ],
    ['expo-image-picker', { photosPermission: 'Add a photo of your pint to your rating.', cameraPermission: 'Take a photo of your pint.' }],
  ],
  experiments: { typedRoutes: false },
  extra: { appVariant: variant, ...(v.easProjectId ? { eas: { projectId: v.easProjectId } } : {}) },
});
