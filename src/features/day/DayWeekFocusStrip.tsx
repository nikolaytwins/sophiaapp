import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { type Href, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';
import { startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { listMergedWeekFocus } from '@/features/tasks/plannerApi';
import type { PlannerWeekFocusListItem } from '@/features/tasks/planner.types';
import { PLANNER_WEEK_FOCUS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const FLAME = '#F59E0B';
const FLAME_SOFT = 'rgba(245,158,11,0.22)';

function shortWeekdayRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const idx = day === 0 ? 6 : day - 1;
  return WEEKDAY_SHORT_RU[idx] ?? '';
}

type Props = {
  viewDateKey: string;
  todayKey: string;
  userId: string | null;
};

export function DayWeekFocusStrip({ viewDateKey, todayKey, userId }: Props) {
  const { colors, typography, spacing } = useAppTheme();
  const supabaseOn = useSupabaseConfigured;
  const enabled = Boolean(supabaseOn && userId);
  const weekMonday = startOfWeekMondayKey(viewDateKey);

  const q = useQuery({
    queryKey: [...PLANNER_WEEK_FOCUS_QUERY_KEY, weekMonday],
    queryFn: () => listMergedWeekFocus(viewDateKey),
    enabled,
  });

  if (!supabaseOn || !userId) return null;

  const items = q.data ?? [];
  if (!q.isLoading && items.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ marginBottom: spacing.sm }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 1.4,
            color: 'rgba(245,158,11,0.95)',
            textTransform: 'uppercase',
          }}
        >
          Фокус недели
        </Text>
        <Text style={[typography.title2, { marginTop: 4, color: colors.text, fontWeight: '900' }]}>
          Перед глазами
        </Text>
      </View>

      <LinearGradient
        colors={['rgba(245,158,11,0.45)', 'rgba(168,85,247,0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 2 }}
      >
        <AppSurfaceCard
          style={{
            borderWidth: 0,
            overflow: 'hidden',
            backgroundColor: 'rgba(14,14,18,0.96)',
          }}
        >
          {q.isLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={FLAME} />
            </View>
          ) : (
            <View style={{ paddingVertical: spacing.xs }}>
              {items.map((item, i) => (
                <WeekFocusRow
                  key={item.kind === 'task' ? `t-${item.task.id}` : `s-${item.row.id}`}
                  item={item}
                  isLast={i === items.length - 1}
                  todayKey={todayKey}
                />
              ))}
            </View>
          )}

          <Link href={'/tasks' as Href} asChild>
            <Pressable
              style={{
                paddingVertical: 11,
                paddingHorizontal: spacing.md,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.08)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: FLAME }}>Настроить в «Задачи»</Text>
              <Ionicons name="chevron-forward" size={18} color={FLAME} />
            </Pressable>
          </Link>
        </AppSurfaceCard>
      </LinearGradient>
    </View>
  );
}

function WeekFocusRow({
  item,
  isLast,
  todayKey,
}: {
  item: PlannerWeekFocusListItem;
  isLast: boolean;
  todayKey: string;
}) {
  const { colors, spacing } = useAppTheme();
  const done = item.kind === 'task' ? item.task.is_done : item.row.is_done;
  const title = item.kind === 'task' ? item.task.title : item.row.title;
  const isTask = item.kind === 'task';
  const dateChip = isTask
    ? `${shortWeekdayRu(item.task.day_date)} ${item.task.day_date.slice(5)}`
    : 'Неделя';
  const isToday = isTask && item.task.day_date === todayKey;
  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 10,
          backgroundColor: FLAME_SOFT,
          borderWidth: 1,
          borderColor: 'rgba(245,158,11,0.35)',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '900', color: FLAME, fontVariant: ['tabular-nums'] }}>
          {dateChip}
        </Text>
        {isToday ? (
          <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(245,158,11,0.85)', marginTop: 2 }}>сегодня</Text>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: colors.text,
            lineHeight: 21,
            textDecorationLine: done ? 'line-through' : 'none',
            opacity: done ? 0.55 : 1,
          }}
          numberOfLines={3}
        >
          {title}
        </Text>
      </View>
      <Ionicons name="flame" size={20} color={FLAME} style={{ marginTop: 2 }} />
    </View>
  );
}
