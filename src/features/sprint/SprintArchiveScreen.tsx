import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sprintEndDateKey } from '@/features/sprint/sprint.logic';
import type { Sprint } from '@/features/sprint/sprint.types';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';

function formatRange(s: Sprint): string {
  const end = sprintEndDateKey(s);
  return `${s.startDate.replace(/^\d{4}-/, '')} — ${end.replace(/^\d{4}-/, '')}`;
}

export function SprintArchiveScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sprints = useSprintStore((st) => st.sprints);

  const completed = useMemo(
    () => sprints.filter((s) => s.status === 'completed').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sprints]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#030304', paddingTop: insets.top + 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ paddingVertical: 8, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ ...typography.body, color: colors.text, fontWeight: '600' }}>Назад</Text>
        </Pressable>
      </View>

      <Text
        style={{
          ...typography.title1,
          fontSize: 22,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
          color: colors.text,
        }}
      >
        Прошлые спринты
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
        Только просмотр: цели и прогресс зафиксированы на момент завершения.
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 24 }}>
        {completed.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>Пока нет завершённых спринтов.</Text>
        ) : (
          completed.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/sprint-detail/${s.id}` as Href)}
              style={({ pressed }) => ({
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'rgba(14,14,18,0.88)',
                padding: spacing.md,
                marginBottom: spacing.sm,
              })}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }} numberOfLines={2}>
                {s.title}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                {formatRange(s)} · {s.durationDays} дн.
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(168,85,247,0.85)', marginTop: 8 }}>
                Целей: {s.goals.length}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
