import Constants from 'expo-constants';

export type AppVariant = 'drinkers' | 'pubs';

export const appVariant: AppVariant = Constants.expoConfig?.extra?.appVariant === 'pubs' ? 'pubs' : 'drinkers';
