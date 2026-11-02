import { Tabs } from 'expo-router';
import { Beer, Compass, Stamp, Trophy, User } from 'lucide-react-native';

import { Fonts, usePalette } from '@/constants/theme';

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.inkSubtle,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: Fonts.bodySemi, fontSize: 11 },
      }}>
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
      <Tabs.Screen name="rate" options={{ title: 'Rate', tabBarIcon: ({ color, size }) => <Beer color={color} size={size} /> }} />
      <Tabs.Screen name="passport" options={{ title: 'Passport', tabBarIcon: ({ color, size }) => <Stamp color={color} size={size} /> }} />
      <Tabs.Screen name="leaderboards" options={{ title: 'Rankings', tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
