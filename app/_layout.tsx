import 'react-native-gesture-handler';

import { Buffer } from 'buffer';
// react-native-svg и др. ожидают полифилл Node `buffer` в Metro
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppProviders } from '@/providers/AppProviders';
import { ThemedStatusBar } from '@/shared/ui/ThemedStatusBar';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedStatusBar />
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sprint-archive" />
          <Stack.Screen name="sprint-settings" />
          <Stack.Screen name="sprint-detail/[id]" />
          <Stack.Screen name="journal-settings" />
          <Stack.Screen name="journal-mood-stats" />
          <Stack.Screen name="(private)" />
          <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
          <Stack.Screen name="cloud" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="tasks-backlog" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen
            name="habit-new"
            options={{
              /** Web: modal часто перехватывает hit-testing поверх формы. */
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              /**
               * Web: контент стека должен быть выше любых «утекших» слоёв (например таббар с большим z-index
               * у родительского (tabs)), иначе клики не доходят до Pressable внутри экрана.
               */
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
          <Stack.Screen
            name="habit-edit"
            options={{
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
          <Stack.Screen
            name="finance-detail"
            options={{
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
          <Stack.Screen
            name="finance-category-settings"
            options={{
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
          <Stack.Screen
            name="finance-planned-expenses"
            options={{
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
          <Stack.Screen
            name="personal-targets"
            options={{
              presentation: Platform.OS === 'web' ? 'card' : 'modal',
              contentStyle:
                Platform.OS === 'web'
                  ? { flex: 1, zIndex: 10000, position: 'relative' as const }
                  : undefined,
            }}
          />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
