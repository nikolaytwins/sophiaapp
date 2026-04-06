import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { habitCadenceLabel } from '@/features/day/dayHabitUi';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { repos } from '@/services/repositories';
import { useSprintStore } from '@/stores/sprint.store';
import { confirmDestructive } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

const VIOLET = '#A855F7';
export const HABIT_NEW_HREF = '/habit-new' as Href;

type Props = {
  /** Отступ снизу под таббар / safe area */
  paddingBottom?: number;
};

export function HabitsManagePanel({ paddingBottom = 24 }: Props) {
  const { colors, typography, spacing, radius } = useAppTheme();
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
  const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  return (
    <View style={{ paddingBottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={[typography.body, { color: colors.textMuted, flex: 1, lineHeight: 22, paddingRight: spacing.md }]}>
          Удаление синхронизируется с Днём, спринтом и аналитикой.
        </Text>
        <Pressable
          onPress={() => router.push(HABIT_NEW_HREF)}
          style={StyleSheet.flatten([
            {
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              backgroundColor: 'rgba(168,85,247,0.2)',
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.45)',
            },
            webCursor,
          ])}
        >
          <Text style={{ color: VIOLET, fontWeight: '800', fontSize: 14 }}>+ Добавить</Text>
        </Pressable>
      </View>

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
          <Pressable
            onPress={() => router.push(HABIT_NEW_HREF)}
            style={StyleSheet.flatten([
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
            ])}
          >
            <Text style={{ color: VIOLET, fontWeight: '800' }}>Создать привычку</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {data.map((h, index) => (
            <View
              key={h.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                marginBottom: index < data.length - 1 ? spacing.sm : 0,
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
                  marginRight: spacing.md,
                }}
              >
                <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={22} color={VIOLET} />
              </View>
              <View style={{ flex: 1, minWidth: 0, marginRight: spacing.sm }}>
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
                style={({ pressed }) =>
                  StyleSheet.flatten([
                    styles.trashBtn,
                    webCursor,
                    { opacity: pressed ? 0.75 : 1 },
                  ])
                }
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

      <Pressable
        onPress={() => router.push(HABIT_NEW_HREF)}
        style={StyleSheet.flatten([
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
        ])}
      >
        <Text style={{ color: VIOLET, fontWeight: '800', fontSize: 16 }}>+ Новая привычка</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  trashBtn: {
    padding: 8,
  },
});
