import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold } from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});

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
          <Stack screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontFamily: 'Jost_600SemiBold' }, headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pubs" options={{ headerShown: false }} />
            <Stack.Screen name="pub/[id]" options={{ title: '' }} />
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
