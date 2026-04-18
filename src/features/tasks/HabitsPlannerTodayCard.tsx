import { useQuery } from '@tanstack/react-query';
import { type Href, Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { listPlannerTasks } from '@/features/tasks/plannerApi';
import { PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { sortPlannerTasksForDisplay } from '@/features/tasks/plannerSort';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const ACCENT = '#F97316';

type Props = {
  todayKey: string;
  userId: string | null;
};

export function HabitsPlannerTodayCard({ todayKey, userId }: Props) {
  const { colors, typography, spacing, radius } = useAppTheme();
  const supabaseOn = useSupabaseConfigured;
  const enabled = Boolean(supabaseOn && userId);

  const q = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, todayKey],
    queryFn: () => listPlannerTasks(todayKey),
    enabled,
  });

  const sorted = sortPlannerTasksForDisplay(q.data ?? []);

  if (!supabaseOn) return null;

  return (
    <View style={{ marginTop: spacing.xl + 4 }}>
      <View style={{ marginBottom: spacing.sm }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 1.4,
            color: 'rgba(249,115,22,0.9)',
            textTransform: 'uppercase',
          }}
        >
          Задачи на сегодня
        </Text>
        <Text style={[typography.title2, { marginTop: 4, color: colors.text, fontWeight: '900' }]}>
          Синхрон с «Задачи»
        </Text>
        {!userId ? (
          <Text style={{ marginTop: 6, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
            Войди в облако — список подтянется с вкладки «Задачи».
          </Text>
        ) : null}
      </View>

      <AppSurfaceCard
        style={{
          borderWidth: 1,
          borderColor: 'rgba(249,115,22,0.35)',
          overflow: 'hidden',
        }}
      >
        {q.isLoading ? (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : sorted.length === 0 ? (
          <Text style={{ padding: spacing.md, fontSize: 14, color: colors.textMuted, lineHeight: 21 }}>
            На сегодня нет задач. Добавь на вкладке «Задачи» — здесь обновится автоматически.
          </Text>
        ) : (
          <View style={{ paddingVertical: spacing.xs }}>
            {sorted.map((t, i) => (
              <PlannerTaskLine key={t.id} task={t} isLast={i === sorted.length - 1} />
            ))}
          </View>
        )}

        <Link href={'/tasks' as Href} asChild>
          <Pressable
            style={{
              paddingVertical: 12,
              paddingHorizontal: spacing.md,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: ACCENT }}>Открыть «Задачи» →</Text>
          </Pressable>
        </Link>
      </AppSurfaceCard>
    </View>
  );
}

function PlannerTaskLine({ task, isLast }: { task: PlannerTaskRow; isLast: boolean }) {
  const { colors, spacing } = useAppTheme();
  const done = task.is_done;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: done ? 0 : 2,
          borderColor: 'rgba(249,115,22,0.45)',
          backgroundColor: done ? ACCENT : 'transparent',
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {task.is_focus ? (
          <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 1, color: ACCENT, marginBottom: 2 }}>
            ФОКУС ДНЯ
          </Text>
        ) : null}
        {task.is_week_focus ? (
          <Text
            style={{
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1,
              color: 'rgba(245,158,11,0.95)',
              marginBottom: 2,
            }}
          >
            ФОКУС НЕДЕЛИ
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            textDecorationLine: done ? 'line-through' : 'none',
            opacity: done ? 0.55 : 1,
          }}
          numberOfLines={2}
        >
          {task.title}
        </Text>
      </View>
    </View>
  );
}
