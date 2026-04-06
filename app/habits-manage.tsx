import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Stack, type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { habitCadenceLabel } from '@/features/day/dayHabitUi';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { repos } from '@/services/repositories';
import { useSprintStore } from '@/stores/sprint.store';
import { confirmDestructive } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

const VIOLET = '#A855F7';
const HABIT_NEW = '/habit-new' as Href;

export default function HabitsManageScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const habits = useHabitsQuery();

  const remove = useMutation({
    mutationFn: (id: string) => repos.habits.remove(id),
    onSuccess: (list, id) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
      useSprintStore.getState().removeHabitFromAllGoalLinks(id);
    },
  });

  const data = habits.data ?? [];

  const screenOptions = useMemo(
    () => ({
      headerShown: true as const,
      headerTitle: 'Привычки',
      headerBackTitle: 'Назад',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerRight: () => (
        <Link href={HABIT_NEW} asChild>
          <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Добавить привычку">
            <Text style={{ color: VIOLET, fontWeight: '700', fontSize: 16 }}>+ Добавить</Text>
          </Pressable>
        </Link>
      ),
    }),
    [colors.bg, colors.text]
  );

  const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

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
        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg }]}>
          Удаление синхронизируется с Днём, спринтом и аналитикой. Связи целей со спринтом для этой привычки
          сбрасываются.
        </Text>

        {habits.isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={VIOLET} />
          </View>
        ) : data.length === 0 ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={[typography.title2, { color: colors.text }]}>Пока пусто</Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 22 }]}>
              Создай первую привычку — она появится на экране «День».
            </Text>
            <Link href={HABIT_NEW} asChild>
              <Pressable
                style={[
                  {
                    marginTop: spacing.md,
                    paddingVertical: 14,
                    borderRadius: radius.md,
                    backgroundColor: 'rgba(168,85,247,0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.45)',
                    alignItems: 'center',
                  },
                  webCursor,
                ]}
              >
                <Text style={{ color: VIOLET, fontWeight: '800' }}>Создать привычку</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {data.map((h) => (
              <View
                key={h.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: 'rgba(168,85,247,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={22} color={VIOLET} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.title2, { color: colors.text }]} numberOfLines={2}>
                    {h.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={1}>
                    {habitCadenceLabel(h)}
                    {h.section === 'media' ? ' · медийка' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    confirmDestructive({
                      title: 'Удалить привычку?',
                      message: `«${h.name}» будет удалена везде.`,
                      onConfirm: () => remove.mutate(h.id),
                    })
                  }
                  disabled={remove.isPending}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Удалить ${h.name}`}
                  style={({ pressed }) => [styles.trashBtn, webCursor, { opacity: pressed ? 0.75 : 1 }]}
                >
                  {remove.isPending && remove.variables === h.id ? (
                    <ActivityIndicator color="rgba(248,113,113,0.9)" size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={22} color="rgba(248,113,113,0.9)" />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Link href={HABIT_NEW} asChild>
          <Pressable
            style={[
              {
                marginTop: spacing.xl,
                paddingVertical: 16,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(168,85,247,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.4)',
                alignItems: 'center',
              },
              webCursor,
            ]}
          >
            <Text style={{ color: VIOLET, fontWeight: '800', fontSize: 16 }}>+ Новая привычка</Text>
          </Pressable>
        </Link>

        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/day'))}
          style={[{ marginTop: spacing.md, alignItems: 'center', paddingVertical: 8 }, webCursor]}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Закрыть</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  trashBtn: {
    padding: 8,
  },
});
