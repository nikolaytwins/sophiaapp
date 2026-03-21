import 'react-native-gesture-handler';

import { Buffer } from 'buffer';
// react-native-svg и др. ожидают полифилл Node `buffer` в Metro
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppProviders } from '@/providers/AppProviders';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(private)" />
          <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
