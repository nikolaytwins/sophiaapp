import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goalDone, sprintElapsedDayIndex, sprintEndDateKey } from '@/features/sprint/sprint.logic';
import { SPRINT_SPHERE_LABEL, type SprintGoal, type SprintSphere } from '@/features/sprint/sprint.types';
import { localDateKey } from '@/features/habits/habitLogic';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';

const SPHERE_ORDER: SprintSphere[] = ['relationships', 'energy', 'work'];

export function SprintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sprint = useSprintStore((st) => st.sprints.find((s) => s.id === id));

  const bySphere = useMemo(() => {
    if (!sprint) return null;
    const m: Record<SprintSphere, SprintGoal[]> = {
      relationships: [],
      energy: [],
      work: [],
    };
    for (const g of sprint.goals) {
      m[g.sphere].push(g);
    }
    for (const k of SPHERE_ORDER) {
      m[k].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return m;
  }, [sprint]);

  const todayKey = localDateKey();
  const dayIdx = sprint
    ? sprintElapsedDayIndex(sprint.startDate, todayKey, sprint.durationDays)
    : 0;

  if (!sprint) {
    return (
      <View style={{ flex: 1, backgroundColor: '#030304', paddingTop: insets.top, justifyContent: 'center', padding: spacing.lg }}>
        <Text style={{ color: colors.textMuted }}>Спринт не найден.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#A855F7', fontWeight: '600' }}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const endKey = sprintEndDateKey(sprint);
  const doneGoals = sprint.goals.filter(goalDone).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#030304', paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ paddingVertical: 8, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ ...typography.body, color: colors.text, fontWeight: '600' }}>Назад</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{sprint.title}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>
          {sprint.startDate} — {endKey} · {sprint.durationDays} дн.
        </Text>
        {sprint.status === 'active' ? (
          <Text style={{ fontSize: 14, color: 'rgba(168,85,247,0.9)', marginTop: 8 }}>
            День {Math.max(1, dayIdx)} из {sprint.durationDays}
          </Text>
        ) : (
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
            Завершён{sprint.endedAt ? ` · ${new Date(sprint.endedAt).toLocaleDateString('ru-RU')}` : ''}
          </Text>
        )}
        {sprint.summaryNote ? (
          <View
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Заметка</Text>
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>{sprint.summaryNote}</Text>
          </View>
        ) : null}

        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Выполнено целей: {doneGoals} / {sprint.goals.length}
        </Text>

        {bySphere &&
          SPHERE_ORDER.map((sphere) => {
            const goals = bySphere[sphere];
            if (goals.length === 0) return null;
            return (
              <View key={sphere} style={{ marginBottom: spacing.lg }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    color: 'rgba(255,255,255,0.38)',
                    marginBottom: 10,
                  }}
                >
                  {SPRINT_SPHERE_LABEL[sphere].toUpperCase()}
                </Text>
                {goals.map((g) => (
                  <View
                    key={g.id}
                    style={{
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.07)',
                      backgroundColor: 'rgba(14,14,18,0.88)',
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{g.title}</Text>
                    {g.kind === 'progress' && g.target != null && g.current != null ? (
                      <>
                        <View
                          style={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            marginTop: 10,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (g.current / g.target) * 100)}%`,
                              backgroundColor: goalDone(g) ? 'rgba(134,239,172,0.85)' : 'rgba(168,85,247,0.75)',
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
                          {g.current} / {g.target}
                          {goalDone(g) ? ' · выполнено' : ''}
                        </Text>
                        {g.habitLinks.length > 0 ? (
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>
                            Связь с привычкой настроена ({g.habitLinks.length})
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={{ fontSize: 14, color: goalDone(g) ? 'rgba(134,239,172,0.95)' : colors.textMuted, marginTop: 8 }}>
                        {goalDone(g) ? 'Выполнено' : 'Не отмечено'}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}
