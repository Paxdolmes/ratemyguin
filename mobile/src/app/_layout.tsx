import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold } from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { installCrashReporting, reportError } from '@/lib/crash';
import { StoreProvider } from '@/lib/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});
installCrashReporting();

/** Shown instead of a white screen if a page crashes; the error is reported. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => reportError(error, 'screen'), [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#FBF8F1' }}>
      <Text style={{ fontSize: 22, fontWeight: '600', color: '#17110D' }}>Something went wrong</Text>
      <Text style={{ color: '#5b5048', textAlign: 'center' }}>{"We've been told about it. Try again in a moment."}</Text>
      <Pressable accessibilityRole="button" onPress={() => void retry()} style={{ backgroundColor: '#17110D', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ color: '#F6EEDC', fontWeight: '600' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
  });
  const ready = loaded || Boolean(error);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: c.brand, background: c.bg, card: c.surface, text: c.ink, border: c.border } };

  return (
    <AuthProvider>
      <StoreProvider>
        <ThemeProvider value={theme}>
          <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTintColor: c.ink, headerTitleStyle: { fontFamily: 'Jost_600SemiBold' }, headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pubs" options={{ headerShown: false }} />
            <Stack.Screen name="pub/[id]" options={{ title: '' }} />
            <Stack.Screen name="offers" options={{ title: 'Offers near me' }} />
            <Stack.Screen name="new" options={{ title: 'New openings' }} />
            <Stack.Screen name="rate/[pubId]" options={{ presentation: 'modal', title: 'Rate your pint' }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: '' }} />
            <Stack.Screen name="card/[ratingId]" options={{ presentation: 'modal', title: 'Share your pint' }} />
          </Stack>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
