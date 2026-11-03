import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

let sent = 0;

/** Sends a crash report so we hear about problems testers hit. At most 10 per session. */
export function reportError(error: unknown, path?: string) {
  if (!isSupabaseConfigured || sent >= 10) return;
  sent++;
  const e = error instanceof Error ? error : new Error(String(error));
  void supabase
    .from('app_errors')
    .insert({
      source: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      app_version: Constants.expoConfig?.version ?? null,
      message: e.message.slice(0, 500) || 'Unknown error',
      stack: e.stack?.slice(0, 4000) ?? null,
      path: path?.slice(0, 200) ?? null,
    })
    .then(() => {}, () => {});
}

/** Catches errors nothing else handled, then lets React Native carry on as normal. */
export function installCrashReporting() {
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const previous = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    reportError(e, fatal ? 'fatal' : 'global');
    previous(e, fatal);
  });
}
