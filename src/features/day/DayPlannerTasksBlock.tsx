import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { addDays } from '@/features/habits/habitLogic';
import {
  adjustPlannerCompletedCount,
  listPlannerTasks,
  updatePlannerTask,
} from '@/features/tasks/plannerApi';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { invalidatePlannerWeekQueries } from '@/features/tasks/plannerWeekInvalidation';
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

  const toggleMut = useMutation({
    mutationFn: async ({
      id,
      next,
      wasDone,
      dayKey,
    }: {
      id: string;
      next: boolean;
      wasDone: boolean;
      dayKey: string;
    }) => {
      const row = await updatePlannerTask(id, { is_done: next });
      if (!wasDone && next) await adjustPlannerCompletedCount(1);
      if (wasDone && !next) await adjustPlannerCompletedCount(-1);
      return { row, dayKey };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, vars.dayKey] });
      const previous = qc.getQueryData<PlannerTaskRow[]>([...PLANNER_TASKS_QUERY_KEY, vars.dayKey]);
      if (previous) {
        qc.setQueryData(
          [...PLANNER_TASKS_QUERY_KEY, vars.dayKey],
          sortPlannerTasksForDisplay(
            previous.map((t) => (t.id === vars.id ? { ...t, is_done: vars.next } : t))
          )
        );
      }
      return { previous } as { previous: PlannerTaskRow[] | undefined };
    },
    onError: (e, vars, ctx) => {
      const p = ctx as { previous: PlannerTaskRow[] | undefined } | undefined;
      if (p?.previous) qc.setQueryData([...PLANNER_TASKS_QUERY_KEY, vars.dayKey], p.previous);
      alertInfo('Задача', e.message);
    },
    onSuccess: ({ row, dayKey }) => {
      qc.setQueryData<PlannerTaskRow[]>([...PLANNER_TASKS_QUERY_KEY, dayKey], (old) => {
        if (!old) return [row];
        return sortPlannerTasksForDisplay(old.map((t) => (t.id === row.id ? row : t)));
      });
      if (row.is_week_focus) invalidatePlannerWeekQueries(qc, dayKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
    },
  });

  const deferMut = useMutation({
    mutationFn: async ({ id, fromDay }: { id: string; fromDay: string }) => {
      const next = addDays(fromDay, 1);
      await updatePlannerTask(id, { day_date: next });
      return { fromDay, toDay: next };
    },
    onSuccess: ({ fromDay, toDay }) => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, fromDay] });
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, toDay] });
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (e: Error) => alertInfo('Перенос', e.message),
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
                deferBusy={deferMut.isPending}
                onToggle={() =>
                  toggleMut.mutate({
                    id: t.id,
                    next: !t.is_done,
                    wasDone: t.is_done,
                    dayKey: viewDateKey,
                  })
                }
                onDeferNext={() => deferMut.mutate({ id: t.id, fromDay: t.day_date })}
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
  deferBusy,
  onToggle,
  onDeferNext,
}: {
  task: PlannerTaskRow;
  isLast: boolean;
  canToggle: boolean;
  deferBusy: boolean;
  onToggle: () => void;
  onDeferNext: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  const done = task.is_done;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: spacing.md,
        paddingRight: 6,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        opacity: !canToggle ? 0.92 : 1,
      }}
    >
      <Pressable
        disabled={!canToggle}
        onPress={onToggle}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          opacity: pressed ? 0.88 : 1,
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
                marginBottom: task.is_focus ? 2 : 2,
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
      </Pressable>
      <Pressable
        onPress={onDeferNext}
        disabled={deferBusy}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="На следующий день"
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.65 : deferBusy ? 0.4 : 1,
          ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
        })}
      >
        <Ionicons name="arrow-forward-circle-outline" size={24} color="rgba(52,211,153,0.95)" />
      </Pressable>
    </View>
  );
}
