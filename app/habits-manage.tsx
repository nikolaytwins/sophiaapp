import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitsManagePanel, HABIT_NEW_HREF } from '@/features/habits/HabitsManagePanel';
import { useAppTheme } from '@/theme';

const VIOLET = '#A855F7';

/**
 * Отдельный маршрут сохранён для старых ссылок; новый вход — Настройки → вкладка «Привычки».
 */
export default function HabitsManageScreen() {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const screenOptions = useMemo(
    () => ({
      headerShown: true as const,
      headerTitle: 'Привычки',
      headerBackTitle: 'Назад',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable
          onPress={() => router.push(HABIT_NEW_HREF)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Добавить привычку"
          style={Platform.OS === 'web' ? { paddingHorizontal: 12, paddingVertical: 8, cursor: 'pointer' } : { padding: 8 }}
        >
          <Text style={{ color: VIOLET, fontWeight: '700', fontSize: 16 }}>+ Добавить</Text>
        </Pressable>
      ),
    }),
    [colors.bg, colors.text, router]
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl * 2,
        }}
      >
        <HabitsManagePanel />
      </ScrollView>
    </>
  );
}
