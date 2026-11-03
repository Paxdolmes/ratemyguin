// Sign-in with an email and a one-time code (Supabase Auth). Guests can look
// around; rating, replying and the Passport need an account.
// Without Supabase keys the apps stay in demo mode and skip sign-in.

import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

export type Profile = { id: string; handle: string; displayName: string };

/**
 * demo: no backend · loading: reading the saved session · signed-out: a guest
 * needs-profile: signed in for the first time, no handle yet · ready: signed in
 */
export type AuthStatus = 'demo' | 'loading' | 'signed-out' | 'needs-profile' | 'ready';

type AuthState = { status: AuthStatus; session: Session | null; profile: Profile | null; refresh: () => Promise<void> };

const AuthContext = createContext<AuthState>({ status: 'demo', session: null, profile: null, refresh: async () => {} });

export const useAuth = () => useContext(AuthContext);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id, handle, display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, handle: data.handle, displayName: data.display_name } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'demo');

  const settle = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setStatus('signed-out');
      return;
    }
    try {
      const p = await loadProfile(s.user.id);
      setProfile(p);
      setStatus(p ? 'ready' : 'needs-profile');
    } catch {
      setStatus('needs-profile');
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => settle(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void settle(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [settle]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await settle(data.session);
  }, [settle]);

  return <AuthContext.Provider value={{ status, session, profile, refresh }}>{children}</AuthContext.Provider>;
}

/** For actions that need an account: opens sign-in for guests and returns false. */
export function useAccountGate() {
  const { status } = useAuth();
  return useCallback(() => {
    if (status === 'demo' || status === 'ready') return true;
    router.push('/sign-in');
    return false;
  }, [status]);
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' });
  if (error) throw error;
}

export const handleProblem = (h: string) =>
  /^[a-z0-9_]{3,20}$/.test(h) ? null : 'Use 3 to 20 lower-case letters, numbers or underscores.';

export async function createProfile(handle: string, displayName: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please sign in again.');
  const { error } = await supabase.from('profiles').insert({
    id: data.user.id,
    handle: handle.trim().toLowerCase(),
    display_name: displayName.trim(),
    adult_confirmed_at: new Date().toISOString(),
  });
  if (error?.code === '23505') throw new Error('That handle is taken. Try another.');
  if (error) throw error;
}

/** Removes the person's photos, then their account and everything linked to it. */
export async function deleteAccount() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Please sign in again.');
  const { data: files } = await supabase.storage.from('pint-photos').list(data.user.id, { limit: 1000 });
  if (files?.length) await supabase.storage.from('pint-photos').remove(files.map((f) => `${data.user!.id}/${f.name}`));
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function signOut() {
  await supabase.auth.signOut();
}
