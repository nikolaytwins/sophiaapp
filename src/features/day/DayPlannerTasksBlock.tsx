import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import {
  adjustPlannerCompletedCount,
  listPlannerTasks,
  updatePlannerTask,
} from '@/features/tasks/plannerApi';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { PLANNER_STATS_QUERY_KEY, PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { sortPlannerTasksForDisplay } from '@/features/tasks/plannerSort';
import { alertInfo } from '@/shared/lib/confirmAction';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const ACCENT = '#F97316';

type Props = {
  viewDateKey: string;
  todayKey: string;
  userId: string | null;
};

export function DayPlannerTasksBlock({ viewDateKey, todayKey, userId }: Props) {
  const { colors, typography, spacing } = useAppTheme();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const enabled = Boolean(supabaseOn && userId);
  const isToday = viewDateKey === todayKey;

  const q = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, viewDateKey],
    queryFn: () => listPlannerTasks(viewDateKey),
    enabled,
  });

  const invalidateDay = () => {
    void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, viewDateKey] });
  };

  const toggleMut = useMutation({
    mutationFn: async ({ id, next, wasDone }: { id: string; next: boolean; wasDone: boolean }) => {
      await updatePlannerTask(id, { is_done: next });
      if (!wasDone && next) await adjustPlannerCompletedCount(1);
      if (wasDone && !next) await adjustPlannerCompletedCount(-1);
    },
    onSuccess: () => {
      invalidateDay();
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
    },
    onError: (e: Error) => alertInfo('Задача', e.message),
  });

  const sorted = sortPlannerTasksForDisplay(q.data ?? []);

  if (!supabaseOn) return null;

  return (
    <View style={{ marginBottom: spacing.lg }}>
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
          План дня
        </Text>
        <Text style={[typography.title2, { marginTop: 4, color: colors.text, fontWeight: '900' }]}>
          Задачи дня
        </Text>
        {!userId ? (
          <Text style={{ marginTop: 6, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
            Войди в облако — список подтянется с вкладки «Задачи».
          </Text>
        ) : !isToday ? (
          <Text style={{ marginTop: 6, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
            Задачи на выбранную дату.
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
            {isToday
              ? 'На сегодня нет задач. Добавь на вкладке «Задачи» — здесь обновится автоматически.'
              : 'На этот день задач нет.'}
          </Text>
        ) : (
          <View style={{ paddingVertical: spacing.xs }}>
            {sorted.map((t, i) => (
              <PlannerTaskLine
                key={t.id}
                task={t}
                isLast={i === sorted.length - 1}
                canToggle={isToday || viewDateKey < todayKey}
                onToggle={() =>
                  toggleMut.mutate({ id: t.id, next: !t.is_done, wasDone: t.is_done })
                }
              />
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

function PlannerTaskLine({
  task,
  isLast,
  canToggle,
  onToggle,
}: {
  task: PlannerTaskRow;
  isLast: boolean;
  canToggle: boolean;
  onToggle: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  const done = task.is_done;
  return (
    <Pressable
      disabled={!canToggle}
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        opacity: !canToggle ? 0.92 : pressed ? 0.88 : 1,
        ...(Platform.OS === 'web' && canToggle ? { cursor: 'pointer' as const } : {}),
      })}
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
            ФОКУС
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
    </Pressable>
  );
}
