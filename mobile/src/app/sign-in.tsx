import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, TextInput, View } from 'react-native';

import { Lockup } from '@/components/brand';
import { Body, Button, H1, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { createProfile, handleProblem, isEmail, sendCode, useAuth, verifyCode } from '@/lib/auth';
import { appVariant } from '@/lib/variant';
import { isAdult } from '@/domain/age';

const RESEND_AFTER_S = 60; // Supabase allows one code per email a minute

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Email, then the code we email them, then a handle the first time. */
export default function SignIn() {
  const c = usePalette();
  const { status, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const adult = isAdult(Number(dob.y), Number(dob.m), Number(dob.d));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // Signed in: go back to what they were doing, e.g. the rating they were posting.
  useEffect(() => {
    if (status !== 'ready' && status !== 'demo') return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [status]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function run(step: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  const field = { fontFamily: Fonts.bodySemi, fontSize: 17, color: c.ink, backgroundColor: c.surfaceMuted, borderRadius: 14, padding: 14 } as const;

  let title: string;
  let body: string;
  let content: React.ReactNode;
  if (status === 'needs-profile') {
    title = 'Pick your handle';
    body = appVariant === 'pubs' ? 'This is how your replies are signed.' : 'Friends find you by it, and it goes on your pint cards.';
    const problem = handle ? handleProblem(handle) : null;
    content = (
      <>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={c.inkSubtle} autoComplete="name" style={field} />
        <TextInput value={handle} onChangeText={(t) => setHandle(t.toLowerCase())} placeholder="handle" placeholderTextColor={c.inkSubtle} autoCapitalize="none" autoCorrect={false} style={field} />
        {problem ? <Small>{problem}</Small> : null}
        <Body style={{ fontFamily: Fonts.bodySemi }}>Date of birth</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['d', 'DD', 2],
              ['m', 'MM', 2],
              ['y', 'YYYY', 4],
            ] as const
          ).map(([k, ph, len]) => (
            <TextInput
              key={k}
              value={dob[k]}
              onChangeText={(t) => setDob({ ...dob, [k]: t.replace(/\D/g, '').slice(0, len) })}
              placeholder={ph}
              placeholderTextColor={c.inkSubtle}
              keyboardType="number-pad"
              maxLength={len}
              accessibilityLabel={k === 'd' ? 'Day of birth' : k === 'm' ? 'Month of birth' : 'Year of birth'}
              style={[field, { flex: len === 4 ? 2 : 1, textAlign: 'center' }]}
            />
          ))}
        </View>
        {dob.y.length === 4 && !adult ? <Small>Sorry, ratemyGuin is only for people aged 18 and over.</Small> : <Small>We only check you're 18 or over. We don't keep your date of birth.</Small>}
        <Small>
          By continuing you agree to our{' '}
          <Text style={{ color: c.brand }} onPress={() => void Linking.openURL('https://ratemyguin.com/terms/')}>terms</Text> and{' '}
          <Text style={{ color: c.brand }} onPress={() => void Linking.openURL('https://ratemyguin.com/privacy/')}>privacy policy</Text>.
        </Small>
        <Button
          label="Continue"
          disabled={busy || name.trim().length < 2 || !handle || Boolean(problem) || !adult}
          onPress={() =>
            run(async () => {
              await createProfile(handle, name);
              await refresh();
            })
          }
        />
      </>
    );
  } else if (sentTo) {
    title = 'Check your email';
    body = `We sent a code to ${sentTo}.`;
    content = (
      <>
        <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} placeholder="Code" placeholderTextColor={c.inkSubtle} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} style={field} />
        <Button label="Sign in" disabled={busy || code.length < 6} onPress={() => run(() => verifyCode(sentTo, code))} />
        <Button
          kind="secondary"
          label={wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          disabled={busy || wait > 0}
          onPress={() =>
            run(async () => {
              await sendCode(sentTo);
              setWait(RESEND_AFTER_S);
            })
          }
        />
      </>
    );
  } else {
    title = 'Sign in or sign up';
    body = "We'll email you a code. No password needed.";
    content = (
      <>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={c.inkSubtle} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={field} />
        <Button
          label="Email me a code"
          disabled={busy || !isEmail(email)}
          onPress={() =>
            run(async () => {
              await sendCode(email);
              setSentTo(email.trim().toLowerCase());
              setWait(RESEND_AFTER_S);
            })
          }
        />
      </>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Lockup pubs={appVariant === 'pubs'} />
      <View style={{ gap: 6, marginTop: 12 }}>
        <H1>{title}</H1>
        <Body muted>{body}</Body>
      </View>
      {content}
      {error ? <Body style={{ color: c.danger }}>{error}</Body> : null}
      <Small>You must be 18 or over to use RateMyGuin.</Small>
    </ScrollView>
  );
}
