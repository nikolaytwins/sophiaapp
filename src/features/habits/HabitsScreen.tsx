import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  monthCompletionPercentDaysForHabit,
  monthCompletionPercentWeekly,
  monthGridCells,
  monthGridTitleRu,
  parseYearMonthFromKey,
  weekdayIndexMondayFirst,
  ymToIndex,
} from '@/features/habits/habitCardVisual';
import { useSupabaseConfigured } from '@/config/env';
import { addDays, counterCountOnDate, localDateKey } from '@/features/habits/habitLogic';
import { getSupabase } from '@/lib/supabase';
import { FinanceAnalyticsTabPanel } from '@/features/finance/FinanceAnalyticsTabPanel';
import { HabitsMonthlyCompletionsChart } from '@/features/habits/HabitsMonthlyCompletionsChart';
import { HabitCounterRingCard } from '@/features/habits/HabitCounterRingCard';
import { HabitMonthCalendar } from '@/features/habits/HabitMonthCalendar';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { JournalMoodCalendarPanel } from '@/features/journal/JournalMoodCalendarPanel';
import { AppSurfaceCard as SurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { confirmDestructive } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

/** Локальная палитра экрана: глубокий чёрный + графит, фиолет только акцентом. */
const ACCENT = '#A855F7';
const ACCENT_MUTED = 'rgba(168,85,247,0.45)';
const ACCENT_FILL = 'rgba(168,85,247,0.10)';
const WEEKLY = '#C4B5FD';
const WEEKLY_FILL = 'rgba(196,181,253,0.10)';

/** Только веб-десктоп: плотная сетка карточек аналитики (аналог `lg:` / чуть шире — 3 колонки). */
const HABITS_ANALYTICS_LG_MIN = 1024;
const HABITS_ANALYTICS_3COL_MIN = 1200;
const HABITS_ANALYTICS_GRID_GAP = 24;

/** Дневник — только на экране «День»; эта привычка не дублирует календарь в аналитике. */
const HABIT_ID_HIDDEN_ON_ANALYTICS_PAGE = 'nikolay_journal_braindump';
function headlineDate(): string {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
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

function HabitCard({
  habit,
  readOnly,
  variant = 'default',
  /** В сетке на десктопе: без нижнего отступа карточки, календарь на ширину плитки. */
  analyticsGridTile = false,
  onCheck,
  onUndo,
  onDelete,
  onToggleRequired,
  onAdjustCounter,
  onHarmfulChoice,
  todayKey,
}: {
  habit: Habit;
  readOnly?: boolean;
  /** Экран «Аналитика»: без аккордеона и стриков. */
  variant?: 'default' | 'analytics';
  analyticsGridTile?: boolean;
  onCheck?: (dateKey?: string) => void;
  onUndo?: (dateKey?: string) => void;
  onDelete?: () => void;
  onToggleRequired?: () => void;
  onAdjustCounter?: (id: string, dateKey: string, delta: 1 | -1) => void;
  /** Для привычек с analyticsHeatMode === 'negative'. */
  onHarmfulChoice?: (habitId: string, dateKey: string, choice: 'harmful' | 'clean' | 'clear') => void;
  todayKey: string;
}) {
  const { colors, typography, spacing, radius } = useAppTheme();
  const analyticsUi = variant === 'analytics';
  const isDaily = habit.cadence === 'daily';
  const isNegativeDaily = isDaily && habit.analyticsHeatMode === 'negative';
  const isCounterDaily = isDaily && habit.checkInKind === 'counter' && habit.dailyTarget != null;
  const accent = isDaily ? ACCENT : WEEKLY;
  const target = habit.weeklyTarget ?? 1;
  const doneWeek = habit.weeklyCompleted ?? 0;
  const progress01 = Math.min(1, doneWeek / target);

  const completedDailySet = useMemo(() => {
    if (!isDaily) return new Set<string>();
    if (isNegativeDaily) return new Set(habit.completionDates ?? []);
    if (isCounterDaily && habit.dailyTarget != null) {
      const s = new Set<string>();
      for (const [k, v] of Object.entries(habit.countsByDate ?? {})) {
        if (v >= habit.dailyTarget) s.add(k);
      }
      return s;
    }
    return new Set(habit.completionDates ?? []);
  }, [habit.completionDates, habit.countsByDate, habit.dailyTarget, isCounterDaily, isDaily, isNegativeDaily]);

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
    () =>
      isNegativeDaily
        ? monthCompletionPercentDays(habit.completionDates, viewYm.y, viewYm.m, todayKey)
        : monthCompletionPercentDaysForHabit(habit, viewYm.y, viewYm.m, todayKey),
    [habit, isNegativeDaily, viewYm.y, viewYm.m, todayKey]
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

  const [actionDayKey, setActionDayKey] = useState(todayKey);
  useEffect(() => {
    setActionDayKey(todayKey);
  }, [todayKey]);

  const harmfulOnAction = Boolean(habit.completionDates?.includes(actionDayKey));
  const cleanOnAction = Boolean(habit.explicitCleanDates?.includes(actionDayKey));

  const statusLine = useMemo(() => {
    if (!isDaily) return '';
    if (isNegativeDaily) {
      if (harmfulOnAction) return 'Отмечено: был срыв (мучное / фастфуд / алкоголь)';
      if (cleanOnAction) return 'Чистый день';
      return 'Отметь «да» или «нет» за выбранный день';
    }
    if (isCounterDaily && habit.dailyTarget != null) {
      const c = counterCountOnDate(habit.countsByDate, todayKey);
      return c >= habit.dailyTarget ? 'Цель дня выполнена' : `${c} из ${habit.dailyTarget} сегодня`;
    }
    return habit.todayDone ? 'Сегодня закрыто' : 'Ждёт отметки сегодня';
  }, [
    actionDayKey,
    cleanOnAction,
    habit.countsByDate,
    habit.dailyTarget,
    habit.todayDone,
    harmfulOnAction,
    isCounterDaily,
    isDaily,
    isNegativeDaily,
    todayKey,
  ]);

  const needsAttention = readOnly
    ? false
    : isNegativeDaily
      ? !(harmfulOnAction || cleanOnAction)
      : isDaily
        ? !habit.todayDone
        : !habit.weekQuotaMet;

  const confirmDelete = useCallback(() => {
    if (readOnly || !onDelete) return;
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    confirmDestructive({
      title: 'Удалить привычку?',
      message: `«${habit.name}» исчезнет везде. Связи целей со спринтом сбросятся.`,
      onConfirm: onDelete,
    });
  }, [habit.name, onDelete, readOnly]);

  const rhythmHint = useMemo(() => {
    if (isDaily) return null;
    if (habit.weekQuotaMet) return null;
    const left = Math.max(0, target - doneWeek);
    return left === 0 ? null : `До цели недели осталось ${left} ${left === 1 ? 'раз' : 'раза'}`;
  }, [doneWeek, habit.weekQuotaMet, isDaily, target]);

  const [expanded, setExpanded] = useState(true);
  const expandedSv = useSharedValue(1);

  const effectiveExpanded = analyticsUi || expanded;

  useEffect(() => {
    expandedSv.value = withTiming(effectiveExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [effectiveExpanded, expandedSv]);

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
    <Pressable onLongPress={readOnly ? undefined : confirmDelete}>
      <SurfaceCard
        glow={needsAttention}
        style={{
          marginBottom: analyticsUi && analyticsGridTile ? 0 : spacing.md,
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
                  <Text style={[typography.caption, { color: accent, fontWeight: '700' }]}>
                    {isCounterDaily && habit.dailyTarget != null
                      ? `счётчик · ${habit.dailyTarget}×`
                      : isNegativeDaily
                        ? 'да / нет'
                        : 'каждый день'}
                  </Text>
                </View>
              </View>
              {!readOnly && onToggleRequired ? (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    onToggleRequired();
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={habit.required ? 'Не учитывать в ритме дня' : 'В ритме дня'}
                >
                  <Ionicons
                    name={habit.required ? 'star' : 'star-outline'}
                    size={22}
                    color={habit.required ? accent : 'rgba(255,255,255,0.28)'}
                  />
                </Pressable>
              ) : null}
              {!readOnly ? (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить привычку"
                >
                  <Ionicons name="trash-outline" size={21} color="rgba(248,113,113,0.88)" />
                </Pressable>
              ) : null}
              {!analyticsUi ? (
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
              ) : null}
            </View>

            {!effectiveExpanded ? (
              <View style={{ marginTop: spacing.sm }}>
                <View style={metaSecondaryStyle}>{dailyMetaCompact}</View>
              </View>
            ) : null}

            <Animated.View
              style={expandableAnimStyle}
              pointerEvents={effectiveExpanded ? 'auto' : 'none'}
            >
              <View
                style={{
                  marginTop: spacing.md,
                  width: '100%',
                  ...(Platform.OS === 'web'
                    ? analyticsGridTile
                      ? { maxWidth: '100%' as const, alignSelf: 'stretch' as const }
                      : { maxWidth: 400, alignSelf: 'flex-start' as const }
                    : { alignSelf: 'stretch' }),
                }}
              >
                <HabitMonthCalendar
                  monthTitle={monthGridTitle}
                  monthStatLine={
                    isNegativeDaily
                      ? `${monthPct}% дней со срывом`
                      : readOnly
                        ? undefined
                        : `${monthPct}% за месяц`
                  }
                  monthWeekRows={monthWeekRows}
                  completedSet={completedDailySet}
                  heatMode={isNegativeDaily ? 'negative' : 'default'}
                  todayKey={todayKey}
                  isViewingCurrentMonth={isViewingCurrentMonth}
                  todayWeekdayIdx={todayWeekdayIdx}
                  canGoPrevMonth={canGoPrevMonth}
                  canGoNextMonth={canGoNextMonth}
                  onPrevMonth={goPrevMonth}
                  onNextMonth={goNextMonth}
                />
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

            {!readOnly ? (
              <View style={[{ width: '100%' }, ctaZoneStyle]}>
                {actionDayUi}
                {isCounterDaily && habit.dailyTarget != null ? (
                  <HabitCounterRingCard
                    habit={habit}
                    viewDateKey={actionDayKey}
                    todayKey={todayKey}
                    onDelta={(d) => onAdjustCounter?.(habit.id, actionDayKey, d)}
                    ringSize={analyticsGridTile ? 96 : 124}
                    progressColor={accent}
                  />
                ) : isNegativeDaily ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onHarmfulChoice?.(habit.id, actionDayKey, 'harmful');
                        }}
                        style={{
                          flex: 1,
                          minHeight: 48,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: harmfulOnAction ? 'rgba(220,38,38,0.35)' : 'rgba(220,38,38,0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(248,113,113,0.55)',
                        }}
                      >
                        <Text style={{ fontWeight: '900', color: '#FECACA', fontSize: 15 }}>Да, было</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onHarmfulChoice?.(habit.id, actionDayKey, 'clean');
                        }}
                        style={{
                          flex: 1,
                          minHeight: 48,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: cleanOnAction ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1,
                          borderColor: 'rgba(74,222,128,0.45)',
                        }}
                      >
                        <Text style={{ fontWeight: '900', color: '#BBF7D0', fontSize: 15 }}>Нет</Text>
                      </Pressable>
                    </View>
                    {harmfulOnAction || cleanOnAction ? (
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          onHarmfulChoice?.(habit.id, actionDayKey, 'clear');
                        }}
                        style={{ alignSelf: 'center', paddingVertical: 6 }}
                      >
                        <Text style={[typography.caption, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
                          Сбросить день
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <CheckInControl
                    active={Boolean(habit.completionDates?.includes(actionDayKey))}
                    onPress={() => onCheck?.(actionDayKey)}
                    variant="daily"
                  />
                )}
              </View>
            ) : null}
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

              {!readOnly && onToggleRequired ? (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    onToggleRequired();
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={habit.required ? 'Не учитывать в ритме дня' : 'В ритме дня'}
                >
                  <Ionicons
                    name={habit.required ? 'star' : 'star-outline'}
                    size={22}
                    color={habit.required ? accent : 'rgba(255,255,255,0.28)'}
                  />
                </Pressable>
              ) : null}
              {!readOnly ? (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить привычку"
                >
                  <Ionicons name="trash-outline" size={21} color="rgba(248,113,113,0.88)" />
                </Pressable>
              ) : null}
              {!analyticsUi ? (
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
              ) : null}
            </View>

            <Animated.View
              style={expandableAnimStyle}
              pointerEvents={effectiveExpanded ? 'auto' : 'none'}
            >
              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: 'rgba(255,255,255,0.08)',
                  width: '100%',
                  ...(Platform.OS === 'web'
                    ? analyticsGridTile
                      ? { maxWidth: '100%' as const, alignSelf: 'stretch' as const }
                      : { maxWidth: 400, alignSelf: 'flex-start' as const }
                    : { alignSelf: 'stretch' }),
                }}
              >
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

                <View style={{ marginTop: spacing.md, width: '100%' }}>
                  <HabitMonthCalendar
                    monthTitle={monthGridTitle}
                    monthStatLine={readOnly ? undefined : `${monthPctWeekly}% за месяц`}
                    monthWeekRows={monthWeekRows}
                    completedSet={completedWeeklySet}
                    todayKey={todayKey}
                    isViewingCurrentMonth={isViewingCurrentMonth}
                    todayWeekdayIdx={todayWeekdayIdx}
                    canGoPrevMonth={canGoPrevMonth}
                    canGoNextMonth={canGoNextMonth}
                    onPrevMonth={goPrevMonth}
                    onNextMonth={goNextMonth}
                  />
                </View>
                {rhythmHint ? (
                  <Text style={[typography.caption, { marginTop: spacing.sm, color: 'rgba(255,255,255,0.42)' }]}>
                    {rhythmHint}
                  </Text>
                ) : null}
              </View>
            </Animated.View>

            {!readOnly ? (
              <View style={[{ width: '100%' }, ctaZoneStyle]}>
                {actionDayUi}
                <CheckInControl
                  active={Boolean(habit.completionDates?.includes(actionDayKey))}
                  onPress={() => onCheck?.(actionDayKey)}
                  variant="weekly"
                />
                {(habit.completionDates?.includes(actionDayKey) ?? false) ? (
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onUndo?.(actionDayKey);
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
            ) : null}
          </>
        )}
      </SurfaceCard>
    </Pressable>
  );
}

function AnalyticsHabitsGrid({
  habits,
  todayKey,
  gridColumns,
}: {
  habits: Habit[];
  todayKey: string;
  gridColumns: 1 | 2 | 3;
}) {
  if (habits.length === 0) return null;
  const useGrid = gridColumns > 1;
  return (
    <View
      style={
        useGrid
          ? {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: HABITS_ANALYTICS_GRID_GAP,
            }
          : undefined
      }
    >
      {habits.map((h) => (
        <View
          key={h.id}
          style={
            useGrid
              ? {
                  width: gridColumns === 3 ? '31%' : '47%',
                  flexGrow: 1,
                  minWidth: gridColumns === 3 ? 200 : 240,
                }
              : { width: '100%' }
          }
        >
          <HabitCard
            variant="analytics"
            readOnly
            habit={h}
            todayKey={todayKey}
            analyticsGridTile={useGrid}
          />
        </View>
      ))}
    </View>
  );
}

export function HabitsScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const habits = useHabitsQuery();

  const analyticsGridColumns = useMemo((): 1 | 2 | 3 => {
    if (Platform.OS !== 'web' || windowWidth < HABITS_ANALYTICS_LG_MIN) return 1;
    if (windowWidth >= HABITS_ANALYTICS_3COL_MIN) return 3;
    return 2;
  }, [windowWidth]);

  const data = habits.data ?? [];
  const pageHabits = useMemo(
    () => data.filter((h) => h.id !== HABIT_ID_HIDDEN_ON_ANALYTICS_PAGE),
    [data]
  );
  const coreDaily = pageHabits.filter((h) => h.cadence === 'daily' && h.section !== 'media');
  const coreWeekly = pageHabits.filter((h) => h.cadence === 'weekly' && h.section !== 'media');
  const mediaHabits = pageHabits.filter((h) => h.section === 'media');

  const todayKey = localDateKey();

  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focusMood =
    params.focus === 'mood' || (Array.isArray(params.focus) && params.focus[0] === 'mood');
  const [moodPanelY, setMoodPanelY] = useState<number | null>(null);
  const [analyticsSection, setAnalyticsSection] = useState<'habits' | 'finance'>('habits');

  useEffect(() => {
    if (!focusMood || moodPanelY == null) return;
    const t = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, moodPanelY - 16), animated: true });
    });
    return () => cancelAnimationFrame(t);
  }, [focusMood, moodPanelY]);

  const supabaseOn = useSupabaseConfigured;
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAccountEmail(null);
      setUserId(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setAccountEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const showDailyEmptyHint =
    coreDaily.length === 0 && (mediaHabits.length === 0 || coreWeekly.length > 0);
  const showWeeklyEmptyHint =
    coreWeekly.length === 0 && (mediaHabits.length === 0 || coreDaily.length > 0);

  return (
    <ScreenCanvas>
      <ScrollView
        ref={scrollRef}
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
              Аналитика
            </Text>
            <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textMuted, opacity: 0.9 }]}>
              {headlineDate()}
            </Text>
            <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
              {supabaseOn ? (
                <Link href={'/profile?tab=settings' as Href} asChild>
                  <Pressable accessibilityRole="button" accessibilityLabel="Настройки и аккаунт" style={{ paddingVertical: 4 }}>
                    <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>
                      {accountEmail ? `Настройки · ${accountEmail}` : 'Настройки · войти в аккаунт'}
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
              <Link href={'/profile?tab=habits' as Href} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Управление привычками"
                  style={{ paddingVertical: 4, marginTop: supabaseOn ? 6 : 0 }}
                >
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>Управление привычками</Text>
                </Pressable>
              </Link>
            </View>
          </View>
          <HeaderProfileAvatar marginTop={4} />
        </View>

        <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SegmentedControl
            value={analyticsSection}
            onChange={setAnalyticsSection}
            options={[
              { value: 'habits', label: 'Привычки' },
              { value: 'finance', label: 'Финансы' },
            ]}
          />
        </View>

        {analyticsSection === 'finance' ? (
          <FinanceAnalyticsTabPanel userId={userId} />
        ) : (
          <>
            <JournalMoodCalendarPanel onLayoutRoot={setMoodPanelY} />

            {pageHabits.length > 0 ? <HabitsMonthlyCompletionsChart habits={pageHabits} /> : null}

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
            <View style={{ marginTop: spacing.xl + 10 }}>
              <Text
                style={[
                  typography.hero,
                  {
                    fontSize: 30,
                    letterSpacing: -0.95,
                    color: colors.text,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                Привычки
              </Text>

              {mediaHabits.length > 0 ? (
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
                  <AnalyticsHabitsGrid habits={mediaHabits} todayKey={todayKey} gridColumns={analyticsGridColumns} />
                </>
              ) : null}

              {coreDaily.length > 0 ? (
                <AnalyticsHabitsGrid habits={coreDaily} todayKey={todayKey} gridColumns={analyticsGridColumns} />
              ) : showDailyEmptyHint ? (
                <Text
                  style={[
                    typography.body,
                    { textAlign: 'center', marginTop: spacing.md, color: colors.textMuted, opacity: 0.85 },
                  ]}
                >
                  В ежедневных пока нет привычек
                </Text>
              ) : null}

              {coreWeekly.length > 0 ? (
                <AnalyticsHabitsGrid habits={coreWeekly} todayKey={todayKey} gridColumns={analyticsGridColumns} />
              ) : showWeeklyEmptyHint ? (
                <Text
                  style={[
                    typography.body,
                    { textAlign: 'center', marginTop: spacing.md, color: colors.textMuted, opacity: 0.85 },
                  ]}
                >
                  В еженедельных пока нет привычек
                </Text>
              ) : null}

            </View>
          </>
        )}
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
