import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Habit } from '@/entities/models';
import {
  chunkMonthIntoWeekRows,
  monthAnchorKey,
  monthCompletionPercentDays,
  monthCompletionPercentWeekly,
  monthGridCells,
  monthGridTitleRu,
  parseYearMonthFromKey,
  WEEKDAY_LABELS_SHORT,
  weekdayIndexMondayFirst,
  ymToIndex,
  type MonthGridCell,
} from '@/features/habits/habitCardVisual';
import { useSupabaseConfigured } from '@/config/env';
import { addDays, localDateKey, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { monthHabitQuota } from '@/features/habits/monthCompletionQuota';
import { getSupabase } from '@/lib/supabase';
import { repos } from '@/services/repositories';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { HabitHero } from '@/features/habits/HabitHero';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { useAppTheme } from '@/theme';

/** Локальная палитра экрана: глубокий чёрный + графит, фиолет только акцентом. */
const ACCENT = '#A855F7';
const ACCENT_MUTED = 'rgba(168,85,247,0.45)';
const ACCENT_FILL = 'rgba(168,85,247,0.10)';
const WEEKLY = '#C4B5FD';
const WEEKLY_FILL = 'rgba(196,181,253,0.10)';
const CANVAS_GRAD = ['#020203', '#0A0A10', '#050506'] as const;

type HabitsTab = 'daily' | 'weekly' | 'media';

const HABITS_TAB_OPTIONS: { value: HabitsTab; label: string }[] = [
  { value: 'daily', label: 'Ежедневные' },
  { value: 'weekly', label: 'Еженедельные' },
  { value: 'media', label: 'Медийка и работа' },
];

const HERO_HABIT_IDS = {
  steps: 'seed_steps_10k',
  protein: 'seed_protein_140',
  sleep: 'seed_sleep_0100',
  noComps: 'seed_no_comps',
  noAstro: 'seed_no_tarot_astro',
  reels: 'seed_reels_daily',
  agencySprint: 'seed_agency_sprint_5',
} as const;

function weekdayFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=Sun ... 6=Sat
}

function isAgencySprintDay(dateKey: string): boolean {
  const wd = weekdayFromKey(dateKey);
  return wd === 1 || wd === 2 || wd === 3 || wd === 4 || wd === 6; // пн-чт и сб
}

function heroScoreForDayView(habits: Habit[], dateKey: string): { done: number; total: number } {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const noComps = byId.get(HERO_HABIT_IDS.noComps);

  const doneDaily = (id: string) => Boolean(byId.get(id)?.completionDates?.includes(dateKey));

  const noCompsDoneWithWeeklyAllowance = (): boolean => {
    if (!noComps) return false;
    if (noComps.completionDates?.includes(dateKey)) return true;
    const ws = startOfWeekMondayKey(dateKey);
    let misses = 0;
    let d = ws;
    while (d <= dateKey) {
      if (!noComps.completionDates?.includes(d)) misses++;
      if (misses > 1) return false;
      d = addDays(d, 1);
    }
    return true;
  };

  const checks: { enabled?: () => boolean; done: () => boolean }[] = [
    { done: () => doneDaily(HERO_HABIT_IDS.steps) },
    { done: () => doneDaily(HERO_HABIT_IDS.protein) },
    { done: () => doneDaily(HERO_HABIT_IDS.sleep) },
    { done: () => doneDaily(HERO_HABIT_IDS.noAstro) },
    { done: () => doneDaily(HERO_HABIT_IDS.reels) },
    { done: noCompsDoneWithWeeklyAllowance },
    { enabled: () => isAgencySprintDay(dateKey), done: () => doneDaily(HERO_HABIT_IDS.agencySprint) },
  ];

  let total = 0;
  let done = 0;
  for (const c of checks) {
    if (c.enabled && !c.enabled()) continue;
    total++;
    if (c.done()) done++;
  }
  return { done, total };
}

function streakLabel(h: Habit): string {
  if (h.cadence === 'daily') {
    return h.streak === 1 ? '1 день' : `${h.streak} дн.`;
  }
  return h.streak === 1 ? '1 неделя' : `${h.streak} нед.`;
}

function headlineDate(): string {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function SurfaceCard({
  children,
  glow,
  style,
  padding = true,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  padding?: boolean;
}) {
  const { radius, spacing } = useAppTheme();
  const base = {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glow ? 'rgba(168,85,247,0.22)' : 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(18,18,22,0.92)',
    padding: padding ? spacing.lg : 0,
    ...(Platform.OS === 'web'
      ? {}
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: glow ? 0.5 : 0.38,
          shadowRadius: glow ? 28 : 22,
          elevation: glow ? 10 : 7,
        }),
  };
  return <View style={[base, style]}>{children}</View>;
}

function CheckInControl({
  active,
  onPress,
  variant,
}: {
  active: boolean;
  onPress: () => void;
  variant: 'daily' | 'weekly';
}) {
  const { radius, typography } = useAppTheme();
  const fullWidth = variant === 'daily';
  const isDaily = variant === 'daily';

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fire = useCallback(() => {
    if (Platform.OS !== 'web') {
      scale.value = withSequence(withSpring(0.97, { damping: 16 }), withSpring(1, { damping: 14 }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [onPress, scale]);

  const ctaGradient = isDaily ? (['#9333EA', '#7E22CE'] as const) : (['#8B5CF6', '#6D28D9'] as const);
  const doneBg = isDaily ? 'rgba(168,85,247,0.2)' : 'rgba(196,181,253,0.16)';
  const doneBorder = isDaily ? 'rgba(255,255,255,0.14)' : 'rgba(196,181,253,0.32)';
  const shadowCta = isDaily ? '#9333EA' : '#8B5CF6';

  const labelStyle = {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    color: '#FAFAFC',
  };

  const rowPad = { paddingVertical: 14, paddingHorizontal: fullWidth ? 22 : 18 };
  const minWidthWeekly = fullWidth ? undefined : 164;

  return (
    <Pressable
      onPress={fire}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Отмечено' : 'Отметить'}
      style={({ pressed, hovered }) => [
        {
          borderRadius: radius.lg,
          overflow: 'hidden',
          width: fullWidth ? ('100%' as const) : undefined,
          minWidth: minWidthWeekly,
          alignSelf: fullWidth ? ('stretch' as const) : ('flex-end' as const),
          ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
          ...(Platform.OS !== 'web' && !active
            ? {
                shadowColor: shadowCta,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.38,
                shadowRadius: 18,
                elevation: 8,
              }
            : Platform.OS !== 'web' && active
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 3,
                }
              : {}),
        },
        Platform.OS === 'web' && hovered && !pressed && { opacity: active ? 0.96 : 0.98 },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Animated.View style={animStyle}>
        {active ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...rowPad,
              backgroundColor: doneBg,
              borderWidth: 1,
              borderColor: doneBorder,
            }}
          >
            <Ionicons name="checkmark-circle" size={21} color={isDaily ? '#EDE9FE' : '#E9E5FF'} />
            <Text style={labelStyle}>Отмечено</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[...ctaGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...rowPad,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={labelStyle}>Отметить</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
          </LinearGradient>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** ~30% меньше прежних 10 — баланс «крупно, но не календарь на всю карточку». */
const GRID_ROW_GAP = 7;
const GRID_COL_GAP = 7;

function DailyContributionCell({
  cell,
  todayKey,
  completedSet,
  variant = 'daily',
}: {
  cell: MonthGridCell;
  todayKey: string;
  completedSet: Set<string>;
  variant?: 'daily' | 'weekly';
}) {
  if (!cell.dateKey) {
    return <View style={{ flex: 1, aspectRatio: 1, minWidth: 0 }} />;
  }
  const isFuture = cell.dateKey > todayKey;
  const done = !isFuture && completedSet.has(cell.dateKey);
  const isToday = cell.dateKey === todayKey;
  const isWeekly = variant === 'weekly';
  const fillDone = isWeekly ? '#B794F6' : '#9D4EDD';
  const fillToday = isWeekly ? 'rgba(196,181,253,0.14)' : 'rgba(168,85,247,0.11)';
  const shadowDone = isWeekly ? '#C4B5FD' : '#9D4EDD';
  const shadowRing = isWeekly ? WEEKLY : ACCENT;

  return (
    <View
      style={{ flex: 1, aspectRatio: 1, minWidth: 0, padding: 1.5 }}
      accessibilityLabel={
        isFuture ? 'будущий день' : done ? 'отмечено' : isToday ? 'сегодня' : 'без отметки'
      }
    >
      <View
        style={{
          flex: 1,
          borderRadius: 6,
          backgroundColor: isFuture
            ? 'rgba(255,255,255,0.02)'
            : done
              ? fillDone
              : isToday
                ? fillToday
                : 'rgba(255,255,255,0.055)',
          opacity: isFuture ? 0.32 : 1,
          ...(Platform.OS === 'web'
            ? {}
            : done && !isFuture
              ? {
                  shadowColor: shadowDone,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isToday ? 0.55 : 0.5,
                  shadowRadius: isToday ? 12 : 10,
                  elevation: isToday ? 7 : 6,
                }
              : isToday && !done && !isFuture
                ? {
                    shadowColor: shadowRing,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.45,
                    shadowRadius: 10,
                    elevation: 5,
                  }
                : {}),
        }}
      />
    </View>
  );
}

function HabitCard({
  habit,
  onCheck,
  onUndo,
  onDelete,
  todayKey,
}: {
  habit: Habit;
  onCheck: (dateKey?: string) => void;
  onUndo: (dateKey?: string) => void;
  onDelete: () => void;
  todayKey: string;
}) {
  const { colors, typography, spacing, radius } = useAppTheme();
  const isDaily = habit.cadence === 'daily';
  const accent = isDaily ? ACCENT : WEEKLY;
  const target = habit.weeklyTarget ?? 1;
  const doneWeek = habit.weeklyCompleted ?? 0;
  const progress01 = Math.min(1, doneWeek / target);

  const completedDailySet = useMemo(() => {
    if (!isDaily) return new Set<string>();
    return new Set(habit.completionDates ?? []);
  }, [habit.completionDates, isDaily]);

  const completedWeeklySet = useMemo(() => {
    if (isDaily) return new Set<string>();
    return new Set(habit.completionDates ?? []);
  }, [habit.completionDates, isDaily]);

  const [viewYm, setViewYm] = useState(() => parseYearMonthFromKey(todayKey));
  const gridAnchorKey = useMemo(() => monthAnchorKey(viewYm.y, viewYm.m), [viewYm]);
  const todayYm = useMemo(() => parseYearMonthFromKey(todayKey), [todayKey]);
  const isViewingCurrentMonth = viewYm.y === todayYm.y && viewYm.m === todayYm.m;

  const monthCells = useMemo(() => monthGridCells(gridAnchorKey), [gridAnchorKey]);
  const monthWeekRows = useMemo(() => chunkMonthIntoWeekRows(monthCells), [monthCells]);
  const monthGridTitle = useMemo(() => monthGridTitleRu(gridAnchorKey), [gridAnchorKey]);
  const todayWeekdayIdx = useMemo(() => weekdayIndexMondayFirst(todayKey), [todayKey]);
  const monthPct = useMemo(
    () => monthCompletionPercentDays(habit.completionDates, viewYm.y, viewYm.m, todayKey),
    [habit.completionDates, viewYm.y, viewYm.m, todayKey]
  );
  const monthPctWeekly = useMemo(
    () =>
      !isDaily
        ? monthCompletionPercentWeekly(
            habit.completionDates,
            viewYm.y,
            viewYm.m,
            todayKey,
            habit.weeklyTarget ?? 1
          )
        : 0,
    [isDaily, habit.completionDates, viewYm.y, viewYm.m, todayKey, habit.weeklyTarget]
  );
  const canGoNextMonth = useMemo(
    () => ymToIndex(viewYm.y, viewYm.m) < ymToIndex(todayYm.y, todayYm.m),
    [viewYm, todayYm]
  );
  const canGoPrevMonth = useMemo(() => ymToIndex(viewYm.y, viewYm.m) > ymToIndex(2000, 1), [viewYm]);

  const statusLine = useMemo(() => {
    if (!isDaily) return '';
    return habit.todayDone ? 'Сегодня закрыто' : 'Ждёт отметки сегодня';
  }, [isDaily, habit.todayDone]);

  const needsAttention = isDaily ? !habit.todayDone : !habit.weekQuotaMet;

  const rhythmHint = useMemo(() => {
    if (isDaily) return null;
    if (habit.weekQuotaMet) return null;
    const left = Math.max(0, target - doneWeek);
    return left === 0 ? null : `До цели недели осталось ${left} ${left === 1 ? 'раз' : 'раза'}`;
  }, [doneWeek, habit.weekQuotaMet, isDaily, target]);

  const [expanded, setExpanded] = useState(true);
  const expandedSv = useSharedValue(1);

  const [actionDayKey, setActionDayKey] = useState(todayKey);
  useEffect(() => {
    setActionDayKey(todayKey);
  }, [todayKey]);

  useEffect(() => {
    expandedSv.value = withTiming(expanded ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, expandedSv]);

  const toggleExpand = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded((v) => !v);
  }, []);

  const goPrevMonth = useCallback(() => {
    if (!canGoPrevMonth) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewYm((prev) => {
      let { y, m } = prev;
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      return { y, m };
    });
  }, [canGoPrevMonth]);

  const goNextMonth = useCallback(() => {
    if (!canGoNextMonth) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewYm((prev) => {
      let { y, m } = prev;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      if (ymToIndex(y, m) > ymToIndex(todayYm.y, todayYm.m)) return prev;
      return { y, m };
    });
  }, [canGoNextMonth, todayYm]);

  const expandableAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandedSv.value, [0, 0.18, 1], [0, 0, 1]),
    maxHeight: interpolate(expandedSv.value, [0, 1], [0, 1600]),
    overflow: 'hidden',
  }));

  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandedSv.value, [0, 1], [0, -180])}deg` }],
  }));

  const metaSecondaryStyle = {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  } as const;

  const dailyMetaCompact = (
    <>
      <Text style={[typography.caption, { color: colors.textMuted, opacity: 0.92 }]}>{statusLine}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 }}>
        <Ionicons name="flash-outline" size={14} color="rgba(255,255,255,0.42)" />
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', opacity: 1 }]}>
          Стрик · {streakLabel(habit)}
        </Text>
      </View>
    </>
  );

  const ctaZoneStyle = {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.09)',
  } as const;

  const actionDayUi = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255,255,255,0.035)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          setActionDayKey((k) => addDays(k, -1));
        }}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.78)', fontWeight: '700' }]}>{actionDayKey}</Text>
        {actionDayKey !== todayKey ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setActionDayKey(todayKey);
            }}
            hitSlop={8}
            style={{ marginTop: 4 }}
          >
            <Text style={[typography.caption, { color: ACCENT_MUTED, textDecorationLine: 'underline' }]}>
              вернуться к сегодня
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          // Не блокируем будущее жёстко: можно проскроллить, но чек-ин в будущем смысла не имеет — оставим на усмотрение.
          setActionDayKey((k) => addDays(k, 1));
        }}
        hitSlop={8}
      >
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>
    </View>
  );

  const headerRowStyle = {
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  } as const;

  return (
    <Pressable
      onLongPress={() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Удалить привычку?', habit.name, [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: onDelete,
          },
        ]);
      }}
    >
      <SurfaceCard
        glow={needsAttention}
        style={{
          marginBottom: spacing.md,
          borderLeftWidth: needsAttention ? 2 : 0,
          borderLeftColor: needsAttention ? accent : 'transparent',
        }}
      >
        {isDaily ? (
          <>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }, headerRowStyle]}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(255,255,255,0.045)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.07)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={habit.icon as keyof typeof Ionicons.glyphMap} size={22} color={accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.title2, { color: colors.text }]} numberOfLines={2}>
                  {habit.name}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                    backgroundColor: ACCENT_FILL,
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.22)',
                  }}
                >
                  <Text style={[typography.caption, { color: accent, fontWeight: '700' }]}>каждый день</Text>
                </View>
              </View>
              <Pressable
                onPress={toggleExpand}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={expanded ? 'Свернуть' : 'Показать детали'}
                accessibilityState={{ expanded }}
              >
                <Animated.View style={chevronAnimStyle}>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.38)" />
                </Animated.View>
              </Pressable>
            </View>

            {!expanded ? (
              <View style={{ marginTop: spacing.sm }}>
                <View style={metaSecondaryStyle}>{dailyMetaCompact}</View>
              </View>
            ) : null}

            <Animated.View
              style={expandableAnimStyle}
              pointerEvents={expanded ? 'auto' : 'none'}
            >
              <View
                style={{
                  marginTop: spacing.md,
                  width: '100%',
                  ...(Platform.OS === 'web'
                    ? { maxWidth: 400, alignSelf: 'flex-start' as const }
                    : { alignSelf: 'stretch' }),
                }}
              >
                <View style={{ marginBottom: spacing.sm }}>
                  <Text
                    style={[
                      typography.caption,
                      { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase' },
                    ]}
                  >
                    МЕСЯЦ
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 6,
                      gap: 0,
                    }}
                  >
                    <Pressable
                      onPress={goPrevMonth}
                      disabled={!canGoPrevMonth}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Предыдущий месяц"
                      style={({ pressed }) => ({
                        padding: 4,
                        opacity: !canGoPrevMonth ? 0.2 : pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.55)" />
                    </Pressable>
                    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                      <Text
                        style={[
                          typography.title2,
                          {
                            fontSize: 15,
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.78)',
                            letterSpacing: -0.2,
                            textAlign: 'center',
                          },
                        ]}
                      >
                        {monthGridTitle}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          letterSpacing: 0.2,
                          color: 'rgba(196,181,253,0.88)',
                        }}
                      >
                        {monthPct}%
                      </Text>
                    </View>
                    <Pressable
                      onPress={goNextMonth}
                      disabled={!canGoNextMonth}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Следующий месяц"
                      style={({ pressed }) => ({
                        padding: 4,
                        opacity: !canGoNextMonth ? 0.2 : pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.55)" />
                    </Pressable>
                  </View>
                </View>
                <View
                  style={{
                    width: '100%',
                    borderRadius: radius.xl,
                    padding: spacing.sm,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(168,85,247,0.08)', 'transparent']}
                    style={{ ...StyleSheet.absoluteFillObject, opacity: 0.9 }}
                  />
                  <View style={{ width: '100%', zIndex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        width: '100%',
                        gap: GRID_COL_GAP,
                        marginBottom: GRID_ROW_GAP,
                      }}
                    >
                      {WEEKDAY_LABELS_SHORT.map((label, i) => {
                        const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
                        return (
                          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: isTodayCol ? '700' : '500',
                                letterSpacing: 0.35,
                                color: isTodayCol ? ACCENT : 'rgba(255,255,255,0.32)',
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    {monthWeekRows.map((row, ri) => (
                      <View
                        key={`w-${ri}`}
                        style={{
                          flexDirection: 'row',
                          width: '100%',
                          marginBottom: ri < monthWeekRows.length - 1 ? GRID_ROW_GAP : 0,
                          gap: GRID_COL_GAP,
                        }}
                      >
                        {row.map((cell, ci) => (
                          <DailyContributionCell
                            key={cell.dateKey ?? `pad-${ri}-${ci}`}
                            cell={cell}
                            todayKey={todayKey}
                            completedSet={completedDailySet}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  paddingBottom: spacing.sm,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: 'rgba(255,255,255,0.08)',
                  borderRadius: radius.md,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                {dailyMetaCompact}
              </View>
            </Animated.View>

            <View style={[{ width: '100%' }, ctaZoneStyle]}>
              {actionDayUi}
              <CheckInControl
                active={Boolean(habit.completionDates?.includes(actionDayKey))}
                onPress={() => onCheck(actionDayKey)}
                variant="daily"
              />
            </View>
          </>
        ) : (
          <>
            <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, headerRowStyle]}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(255,255,255,0.045)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.07)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={habit.icon as keyof typeof Ionicons.glyphMap} size={22} color={accent} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[typography.title2, { color: colors.text, flexShrink: 1 }]}
                  numberOfLines={4}
                >
                  {habit.name}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                    backgroundColor: WEEKLY_FILL,
                    borderWidth: 1,
                    borderColor: 'rgba(196,181,253,0.18)',
                  }}
                >
                  <Text style={[typography.caption, { color: accent, fontWeight: '700' }]}>неделя</Text>
                </View>
              </View>

              <Pressable
                onPress={toggleExpand}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={expanded ? 'Свернуть' : 'Показать детали'}
                accessibilityState={{ expanded }}
              >
                <Animated.View style={chevronAnimStyle}>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.38)" />
                </Animated.View>
              </Pressable>
            </View>

            <Animated.View
              style={expandableAnimStyle}
              pointerEvents={expanded ? 'auto' : 'none'}
            >
              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <View style={{ marginBottom: spacing.md }}>
                  <Text
                    style={[
                      typography.caption,
                      { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase' },
                    ]}
                  >
                    МЕСЯЦ
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 6,
                    }}
                  >
                    <Pressable
                      onPress={goPrevMonth}
                      disabled={!canGoPrevMonth}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Предыдущий месяц"
                      style={({ pressed }) => ({
                        padding: 4,
                        opacity: !canGoPrevMonth ? 0.2 : pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.55)" />
                    </Pressable>
                    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          typography.title2,
                          {
                            fontSize: 15,
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.78)',
                            letterSpacing: -0.2,
                            textAlign: 'center',
                          },
                        ]}
                      >
                        {monthGridTitle}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          letterSpacing: 0.2,
                          color: 'rgba(196,181,253,0.88)',
                        }}
                      >
                        {monthPctWeekly}% месяца
                      </Text>
                    </View>
                    <Pressable
                      onPress={goNextMonth}
                      disabled={!canGoNextMonth}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Следующий месяц"
                      style={({ pressed }) => ({
                        padding: 4,
                        opacity: !canGoNextMonth ? 0.2 : pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.55)" />
                    </Pressable>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2 }]}>
                    ЭТА НЕДЕЛЯ
                  </Text>
                  <Text style={[typography.title2, { fontSize: 17, color: colors.text }]}>
                    {doneWeek}/{target}
                  </Text>
                </View>
                <View
                  style={{
                    height: 12,
                    borderRadius: radius.full,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    marginTop: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: `${progress01 * 100}%`,
                      height: '100%',
                      borderRadius: radius.full,
                      backgroundColor: accent,
                    }}
                  />
                </View>

                <View
                  style={{
                    marginTop: spacing.md,
                    width: '100%',
                    borderRadius: radius.xl,
                    padding: spacing.sm,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(196,181,253,0.08)', 'transparent']}
                    style={{ ...StyleSheet.absoluteFillObject, opacity: 0.9 }}
                  />
                  <View style={{ width: '100%', zIndex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        width: '100%',
                        gap: GRID_COL_GAP,
                        marginBottom: GRID_ROW_GAP,
                      }}
                    >
                      {WEEKDAY_LABELS_SHORT.map((label, i) => {
                        const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
                        return (
                          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: isTodayCol ? '700' : '500',
                                letterSpacing: 0.35,
                                color: isTodayCol ? accent : 'rgba(255,255,255,0.32)',
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    {monthWeekRows.map((row, ri) => (
                      <View
                        key={`ww-${ri}`}
                        style={{
                          flexDirection: 'row',
                          width: '100%',
                          marginBottom: ri < monthWeekRows.length - 1 ? GRID_ROW_GAP : 0,
                          gap: GRID_COL_GAP,
                        }}
                      >
                        {row.map((cell, ci) => (
                          <DailyContributionCell
                            key={cell.dateKey ?? `wpad-${ri}-${ci}`}
                            cell={cell}
                            todayKey={todayKey}
                            completedSet={completedWeeklySet}
                            variant="weekly"
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
                {rhythmHint ? (
                  <Text style={[typography.caption, { marginTop: spacing.sm, color: 'rgba(255,255,255,0.42)' }]}>
                    {rhythmHint}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 }}>
                  <Ionicons name="flash-outline" size={14} color="rgba(255,255,255,0.42)" />
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)' }]}>
                    Стрик · {streakLabel(habit)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <View style={[{ width: '100%' }, ctaZoneStyle]}>
              {actionDayUi}
              <CheckInControl
                active={Boolean(habit.completionDates?.includes(actionDayKey))}
                onPress={() => onCheck(actionDayKey)}
                variant="weekly"
              />
              {(habit.completionDates?.includes(actionDayKey) ?? false) ? (
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onUndo(actionDayKey);
                  }}
                  hitSlop={6}
                  style={{ alignSelf: 'center', marginTop: spacing.sm }}
                >
                  <Text style={[typography.caption, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
                    −1 в этот день
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </SurfaceCard>
    </Pressable>
  );
}

export function HabitsScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const habits = useHabitsQuery();

  const checkIn = useMutation({
    mutationFn: ({ id, dateKey }: { id: string; dateKey?: string }) => repos.habits.checkIn(id, dateKey),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const undoWeekly = useMutation({
    mutationFn: ({ id, dateKey }: { id: string; dateKey?: string }) => repos.habits.undoWeekly(id, dateKey),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const removeHabit = useMutation({
    mutationFn: (id: string) => repos.habits.remove(id),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const data = habits.data ?? [];
  const coreDaily = data.filter((h) => h.cadence === 'daily' && h.section !== 'media');
  const coreWeekly = data.filter((h) => h.cadence === 'weekly' && h.section !== 'media');
  const mediaHabits = data.filter((h) => h.section === 'media');

  const [habitsTab, setHabitsTab] = useState<HabitsTab>('daily');

  const todayKey = localDateKey();
  const heroScore = useMemo(() => heroScoreForDayView(data, todayKey), [data, todayKey]);

  const monthStats = useMemo(() => {
    const [y, m] = todayKey.split('-').map(Number);
    return monthHabitQuota(data, y, m);
  }, [data, todayKey]);

  const monthTitleShort = useMemo(() => {
    const [y, m] = todayKey.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [todayKey]);

  const supabaseOn = useSupabaseConfigured;
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAccountEmail(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setAccountEmail(session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#030304' }}>
      <LinearGradient pointerEvents="none" colors={[...CANVAS_GRAD]} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                typography.caption,
                {
                  color: 'rgba(255,255,255,0.42)',
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  marginBottom: spacing.xs,
                },
              ]}
            >
              Ритм
            </Text>
            <Text style={[typography.hero, { fontSize: 34, letterSpacing: -1.1, color: colors.text }]}>
              Привычки
            </Text>
            <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textMuted, opacity: 0.9 }]}>
              {headlineDate()}
            </Text>
            {supabaseOn ? (
              <Link href={'/cloud' as Href} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Аккаунт и синхронизация"
                  style={{ marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4 }}
                >
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>
                    {accountEmail ? `Облако · ${accountEmail}` : 'Войти в облако · синхронизация'}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
          <Link href="/habit-new" asChild>
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 20,
                backgroundColor: pressed ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: pressed ? ACCENT_MUTED : 'rgba(255,255,255,0.1)',
              })}
            >
              <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 14 }}>+ Новая</Text>
            </Pressable>
          </Link>
        </View>

        {data.length > 0 && monthStats.max > 0 ? (
          <View
            style={{
              marginTop: spacing.lg,
              borderRadius: radius.xl,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(201,168,108,0.28)',
              backgroundColor: 'rgba(7,6,11,0.55)',
            }}
          >
            <LinearGradient
              colors={['rgba(212,184,122,0.12)', 'rgba(74,45,92,0.15)', 'rgba(7,6,11,0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: 'rgba(212,184,122,0.95)', letterSpacing: 1.2, marginBottom: spacing.sm },
                ]}
              >
                МЕСЯЦ · {monthTitleShort}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <ProgressRing
                  value01={monthStats.progress01}
                  size={128}
                  stroke={10}
                  label={`${monthStats.percent}`}
                  sublabel="%"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                    Выполнено {monthStats.filled} из {monthStats.max} возможных отметок за месяц по всем
                    привычкам.
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                    Ежедневные считаются по дням, еженедельные — по числу отметок в пределах месяца.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        <HabitHero totalHabits={heroScore.total} doneToday={heroScore.done} />

        {data.length === 0 ? (
          <SurfaceCard
            glow
            style={{
              marginTop: spacing.xl + 8,
              borderColor: 'rgba(168,85,247,0.2)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(168,85,247,0.07)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: radius.xl,
                opacity: 1,
              }}
            />
            <View style={{ position: 'relative', zIndex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(168,85,247,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="sunny-outline" size={22} color={ACCENT} />
                </View>
                <Text
                  style={[
                    typography.caption,
                    { color: 'rgba(255,255,255,0.45)', letterSpacing: 1.6, textTransform: 'uppercase' },
                  ]}
                >
                  Старт
                </Text>
              </View>
              <Text style={[typography.title1, { letterSpacing: -0.35, color: colors.text }]}>С чего начнём?</Text>
              <Text
                style={[
                  typography.body,
                  {
                    marginTop: spacing.md,
                    color: colors.textMuted,
                    opacity: 0.94,
                    lineHeight: 23,
                  },
                ]}
              >
                Каждый день строится из маленьких шагов. Загляни на Сегодня — там твой фокус и главные действия дня.
              </Text>
              <Link href="/day" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Перейти к Сегодня"
                  style={({ pressed, hovered }) => [
                    {
                      marginTop: spacing.lg,
                      borderRadius: radius.lg,
                      overflow: 'hidden',
                      alignSelf: 'stretch',
                      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
                      ...(Platform.OS !== 'web'
                        ? {
                            shadowColor: '#9333EA',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.38,
                            shadowRadius: 18,
                            elevation: 8,
                          }
                        : {}),
                    },
                    Platform.OS === 'web' && hovered && !pressed && { opacity: 0.98 },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <LinearGradient
                    colors={['#9333EA', '#7E22CE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      paddingHorizontal: 22,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <Text
                      style={{
                        ...typography.title2,
                        fontSize: 15,
                        fontWeight: '700',
                        letterSpacing: 0.35,
                        color: '#FAFAFC',
                      }}
                    >
                      Перейти к Сегодня
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
                  </LinearGradient>
                </Pressable>
              </Link>
            </View>
          </SurfaceCard>
        ) : (
          <>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.xl + 10, flexGrow: 0 }}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: 10,
                paddingVertical: 4,
                paddingRight: spacing.sm,
              }}
            >
              {HABITS_TAB_OPTIONS.map((tab) => {
                const active = habitsTab === tab.value;
                return (
                  <Pressable
                    key={tab.value}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.selectionAsync();
                      }
                      setHabitsTab(tab.value);
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: tab.value === 'media' ? 14 : 16,
                      paddingVertical: 11,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      backgroundColor: active
                        ? 'rgba(168,85,247,0.14)'
                        : pressed
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor: active ? ACCENT_MUTED : 'rgba(255,255,255,0.1)',
                      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
                    })}
                  >
                    <Text
                      style={{
                        fontSize: tab.value === 'media' ? 12.5 : 13,
                        fontWeight: active ? '700' : '600',
                        color: active ? '#F5F3FF' : 'rgba(255,255,255,0.55)',
                        letterSpacing: tab.value === 'media' ? -0.2 : 0,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: spacing.lg }}>
              {habitsTab === 'daily' ? (
                coreDaily.length > 0 ? (
                  coreDaily.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      todayKey={todayKey}
                    onCheck={(dateKey) => checkIn.mutate({ id: h.id, dateKey })}
                    onUndo={(dateKey) => undoWeekly.mutate({ id: h.id, dateKey })}
                      onDelete={() => removeHabit.mutate(h.id)}
                    />
                  ))
                ) : (
                  <Text
                    style={[
                      typography.body,
                      { textAlign: 'center', marginTop: spacing.md, color: colors.textMuted, opacity: 0.85 },
                    ]}
                  >
                    В ежедневных пока нет привычек
                  </Text>
                )
              ) : null}

              {habitsTab === 'weekly' ? (
                coreWeekly.length > 0 ? (
                  coreWeekly.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      todayKey={todayKey}
                    onCheck={(dateKey) => checkIn.mutate({ id: h.id, dateKey })}
                    onUndo={(dateKey) => undoWeekly.mutate({ id: h.id, dateKey })}
                      onDelete={() => removeHabit.mutate(h.id)}
                    />
                  ))
                ) : (
                  <Text
                    style={[
                      typography.body,
                      { textAlign: 'center', marginTop: spacing.md, color: colors.textMuted, opacity: 0.85 },
                    ]}
                  >
                    В еженедельных пока нет привычек
                  </Text>
                )
              ) : null}

              {habitsTab === 'media' ? (
                <>
                  <LinearGradient
                    colors={['rgba(168,85,247,0.22)', 'rgba(88,28,135,0.12)', 'rgba(18,16,26,0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: radius.xl,
                      borderWidth: 1,
                      borderColor: 'rgba(168,85,247,0.38)',
                      paddingVertical: spacing.lg,
                      paddingHorizontal: spacing.lg,
                      marginBottom: spacing.md,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.12)', 'rgba(168,85,247,0.2)']}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: radius.lg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.14)',
                        }}
                      >
                        <Ionicons name="megaphone-outline" size={24} color={ACCENT} />
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[
                            typography.hero,
                            {
                              fontSize: 22,
                              letterSpacing: -0.5,
                              lineHeight: 28,
                              color: '#FAFAFC',
                              fontWeight: '700',
                            },
                          ]}
                        >
                          Медийка и работа
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            {
                              marginTop: 6,
                              color: 'rgba(196,181,253,0.72)',
                              letterSpacing: 0.4,
                              lineHeight: 18,
                            },
                          ]}
                        >
                          Отдельный фокус: контент, спринты и публикации
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                  {mediaHabits.length > 0 ? (
                    mediaHabits.map((h) => (
                      <HabitCard
                        key={h.id}
                        habit={h}
                        todayKey={todayKey}
                    onCheck={(dateKey) => checkIn.mutate({ id: h.id, dateKey })}
                    onUndo={(dateKey) => undoWeekly.mutate({ id: h.id, dateKey })}
                        onDelete={() => removeHabit.mutate(h.id)}
                      />
                    ))
                  ) : (
                    <Text
                      style={[
                        typography.body,
                        { textAlign: 'center', marginTop: spacing.sm, color: colors.textMuted, opacity: 0.85 },
                      ]}
                    >
                      Здесь пока нет привычек
                    </Text>
                  )}
                </>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
