import { Stack } from 'expo-router';

import { privateColors } from '@/theme/privateTokens';

export default function PrivateLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: privateColors.bgElevated },
        headerTintColor: privateColors.accent,
        headerTitleStyle: { color: privateColors.text, fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: privateColors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="periods" options={{ title: 'Периоды' }} />
      <Stack.Screen name="relationships" options={{ title: 'Отношения' }} />
      <Stack.Screen name="flirt" options={{ title: 'Окна флирта' }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
    </Stack>
  );
}
