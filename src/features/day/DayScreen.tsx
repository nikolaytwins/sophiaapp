import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import type { Habit } from '@/entities/models';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { NikolayDayMoneyHeroCards, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
import { DayDateCalendarModal } from '@/features/day/DayDateCalendarModal';
import { DayPlannerTasksBlock } from '@/features/day/DayPlannerTasksBlock';
import { DayWeekFocusStrip } from '@/features/day/DayWeekFocusStrip';
import { DayJournalAccordion } from '@/features/day/DayJournalAccordion';
import { journalEntryHasContent } from '@/features/day/dayJournal.logic';
import type { JournalMoodId } from '@/features/day/dayJournal.types';
import { WEEKDAY_SHORT_RU, getWeekDayKeys, habitDoneOnDate } from '@/features/day/dayHabitUi';
import { DayHabitTimelineList } from '@/features/day/DayHabitTimelineList';
import { HabitCounterRingCard } from '@/features/habits/HabitCounterRingCard';
import { HabitHero } from '@/features/habits/HabitHero';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { journalEntryHasFieldContent } from '@/features/day/dayJournal.logic';
import type { HarmfulDayChoice } from '@/features/habits/habitsPersistReducer';
import {
  optimisticApplyCheckIn,
  optimisticApplyCounterDelta,
  optimisticApplyHarmfulChoice,
} from '@/features/habits/optimisticHabitsList';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { listPlannerTasks } from '@/features/tasks/plannerApi';
import { PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { findJournalHabit, habitIsDiaryLinked } from '@/features/journal/journalHabit';
import { getSupabase } from '@/lib/supabase';
import { repos } from '@/services/repositories';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { useSprintStore } from '@/stores/sprint.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const HABITS_HREF = '/habits' as Href;
const HABITS_MANAGE_HREF = '/profile?tab=habits' as Href;

const COUNTER_RING_COLORS = ['#A855F7', '#7C3AED', '#38BDF8', '#F472B6'] as const;

/** Акцент полосы дней и календаря — фирменный фиолетовый. */
const DAY_ACCENT = '#A855F7';
const DAY_ACCENT_TEXT_ON_FILL = '#FAFAFC';

/** Порог «lg» (как Tailwind) только для веб-десктопа. Мобильная вёрстка не меняется. */
const DAY_SCREEN_LG_MIN_WIDTH = 1024;
const DAY_SCREEN_CONTENT_MAX_WIDTH = 1440;
/** горизонтальные отступы контента на десктопе (~px-8) */
const DAY_SCREEN_DESKTOP_PADDING_X = 32;

function greetingForHour(h: number): string {
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  return 'Добрый вечер';
}

function formatHeaderDateLine(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const withYear = dateKey.slice(0, 4) !== todayKey.slice(0, 4);
  const s = dt.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayOfMonthNum(dateKey: string): string {
  return String(Number(dateKey.split('-')[2]));
}

function displayNameFromSession(session: {
  user?: { email?: string | null; user_metadata?: Record<string, unknown> };
} | null): string {
  const meta = session?.user?.user_metadata;
  const raw = meta?.full_name ?? meta?.name;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().split(/\s+/)[0] ?? 'ты';
  }
  const email = session?.user?.email;
  if (email && email.includes('@')) return email.split('@')[0] ?? 'ты';
  return 'ты';
}

export function DayScreen() {
  const { colors, spacing, brand, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const habits = useHabitsQuery();
  const journalDoc = useDayJournalStore((s) => s.doc);
  const setMood = useDayJournalStore((s) => s.setMood);
  const setEnergy = useDayJournalStore((s) => s.setEnergy);
  const todayKey = localDateKey();
  const [viewDateKey, setViewDateKey] = useState(todayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState('ты');
  const supabaseOn = useSupabaseConfigured;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopLayout = Platform.OS === 'web' && windowWidth >= DAY_SCREEN_LG_MIN_WIDTH;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAccountEmail(null);
      setUserId(null);
      setGreetingName('ты');
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setAccountEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      setGreetingName(displayNameFromSession(session));
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      setGreetingName(displayNameFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  const isNikolay = isNikolayPrimaryAccount(accountEmail);
  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const nikolayMoneyGoals = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );

  const data = habits.data ?? [];

  const counterHabits = useMemo(
    () => data.filter((h) => h.cadence === 'daily' && h.checkInKind === 'counter'),
    [data]
  );
  const timelineHabits = useMemo(
    () =>
      data.filter(
        (h) => !(h.cadence === 'daily' && h.checkInKind === 'counter') && !habitIsDiaryLinked(h)
      ),
    [data]
  );
  const counterRitual = useMemo(
    () => counterHabits.filter((h) => h.required !== false),
    [counterHabits]
  );
  const counterPool = useMemo(
    () => (counterRitual.length > 0 ? counterRitual : counterHabits),
    [counterHabits, counterRitual]
  );
  const counterDoneCount = useMemo(
    () => counterPool.filter((h) => habitDoneOnDate(h, viewDateKey)).length,
    [counterPool, viewDateKey]
  );
  const counterBadgeTotal = counterPool.length;

  const pickMood = useCallback((dateKey: string, mood: JournalMoodId | null) => {
    setMood(dateKey, mood);
  }, [setMood]);

  const pickEnergy = useCallback((dateKey: string, energy: JournalMoodId | null) => {
    setEnergy(dateKey, energy);
  }, [setEnergy]);

  const checkIn = useMutation({
    mutationFn: ({ id, dateKey: dk }: { id: string; dateKey?: string }) => repos.habits.checkIn(id, dk),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [...HABITS_QUERY_KEY] });
      const previous = qc.getQueryData<Habit[]>([...HABITS_QUERY_KEY]);
      const dk = vars.dateKey ?? todayKey;
      if (previous) {
        qc.setQueryData([...HABITS_QUERY_KEY], optimisticApplyCheckIn(previous, vars.id, dk, todayKey));
      }
      return { previous } as { previous: Habit[] | undefined };
    },
    onError: (_err, _vars, ctx) => {
      const p = ctx as { previous: Habit[] | undefined } | undefined;
      if (p?.previous) qc.setQueryData([...HABITS_QUERY_KEY], p.previous);
    },
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const removeHabit = useMutation({
    mutationFn: (id: string) => repos.habits.remove(id),
    onSuccess: (list, id) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
      useSprintStore.getState().removeHabitFromAllGoalLinks(id);
    },
  });

  const adjustCounter = useMutation({
    mutationFn: ({ id, dateKey, delta }: { id: string; dateKey: string; delta: 1 | -1 }) =>
      repos.habits.adjustCounter(id, dateKey, delta),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [...HABITS_QUERY_KEY] });
      const previous = qc.getQueryData<Habit[]>([...HABITS_QUERY_KEY]);
      if (previous) {
        qc.setQueryData(
          [...HABITS_QUERY_KEY],
          optimisticApplyCounterDelta(previous, vars.id, vars.dateKey, vars.delta, todayKey)
        );
      }
      return { previous } as { previous: Habit[] | undefined };
    },
    onError: (_err, _vars, ctx) => {
      const p = ctx as { previous: Habit[] | undefined } | undefined;
      if (p?.previous) qc.setQueryData([...HABITS_QUERY_KEY], p.previous);
    },
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const setHarmfulChoice = useMutation({
    mutationFn: ({
      id,
      dateKey,
      choice,
    }: {
      id: string;
      dateKey: string;
      choice: HarmfulDayChoice;
    }) => repos.habits.setHarmfulDayChoice(id, dateKey, choice),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [...HABITS_QUERY_KEY] });
      const previous = qc.getQueryData<Habit[]>([...HABITS_QUERY_KEY]);
      if (previous) {
        qc.setQueryData(
          [...HABITS_QUERY_KEY],
          optimisticApplyHarmfulChoice(previous, vars.id, vars.dateKey, vars.choice, todayKey)
        );
      }
      return { previous } as { previous: Habit[] | undefined };
    },
    onError: (_err, _vars, ctx) => {
      const p = ctx as { previous: Habit[] | undefined } | undefined;
      if (p?.previous) qc.setQueryData([...HABITS_QUERY_KEY], p.previous);
    },
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const onHabitIcon = useCallback(
    (h: Habit) => {
      if (viewDateKey > todayKey) return;
      if (h.analyticsHeatMode === 'negative') return;
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      checkIn.mutate({ id: h.id, dateKey: viewDateKey });
    },
    [checkIn, viewDateKey]
  );

  const onHarmfulChoice = useCallback(
    (h: Habit, dateKey: string, choice: HarmfulDayChoice) => {
      if (dateKey > todayKey) return;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setHarmfulChoice.mutate({ id: h.id, dateKey, choice });
    },
    [setHarmfulChoice, todayKey]
  );

  const goPrevDay = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewDateKey((k) => addDays(k, -1));
  }, []);

  const goNextDay = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewDateKey((k) => {
      const n = addDays(k, 1);
      return n > todayKey ? k : n;
    });
  }, [todayKey]);

  const isViewingToday = viewDateKey === todayKey;
  const shouldShowJournalReminder =
    new Date().getHours() >= 19 &&
    isViewingToday &&
    !journalEntryHasContent(journalDoc.entries[todayKey], journalDoc.fields);

  const weekDayKeys = useMemo(() => getWeekDayKeys(viewDateKey), [viewDateKey]);
  const hourGreeting = greetingForHour(new Date().getHours());

  const ritualScoreViewDay = useMemo(() => {
    const list = data.filter((h) => h.required !== false);
    const entry = journalDoc.entries[viewDateKey];
    const done = list.filter((h) => {
      if (!habitIsDiaryLinked(h)) return habitDoneOnDate(h, viewDateKey);
      return (
        habitDoneOnDate(h, viewDateKey) &&
        journalEntryHasFieldContent(entry, journalDoc.fields)
      );
    }).length;
    return { done, total: list.length };
  }, [data, journalDoc.entries, journalDoc.fields, viewDateKey]);

  const plannerTasksQ = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, viewDateKey],
    queryFn: () => listPlannerTasks(viewDateKey),
    enabled: Boolean(supabaseOn && userId),
  });

  const heroScore = useMemo(() => {
    const tasks = plannerTasksQ.data ?? [];
    const taskDone = tasks.filter((t) => t.is_done).length;
    const taskTotal = tasks.length;
    return {
      done: ritualScoreViewDay.done + taskDone,
      total: ritualScoreViewDay.total + taskTotal,
    };
  }, [plannerTasksQ.data, ritualScoreViewDay.done, ritualScoreViewDay.total]);

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: isDesktopLayout ? DAY_SCREEN_DESKTOP_PADDING_X : spacing.lg + 4,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            width: '100%',
            ...(isDesktopLayout
              ? { maxWidth: DAY_SCREEN_CONTENT_MAX_WIDTH, alignSelf: 'center' }
              : {}),
          }}
        >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: 1.4,
                color: isLight ? colors.textMuted : 'rgba(196,181,253,0.85)',
                textTransform: 'uppercase',
              }}
            >
              Твой день
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 26,
                fontWeight: '900',
                letterSpacing: -0.6,
                color: colors.text,
              }}
              numberOfLines={2}
            >
              {hourGreeting},{' '}
              <Text style={{ color: brand.primary }}>{greetingName}</Text>
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: '600',
                color: colors.textMuted,
              }}
              numberOfLines={2}
            >
              {formatHeaderDateLine(viewDateKey, todayKey)}
              {isViewingToday ? ' · сегодня' : ''}
            </Text>
          </View>
          <HeaderProfileAvatar marginTop={4} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: spacing.md,
          }}
        >
          <Pressable
            onPress={goPrevDay}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Предыдущий день"
            style={{ paddingVertical: 6, paddingHorizontal: 4 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {weekDayKeys.map((dk, i) => {
              const selected = dk === viewDateKey;
              const future = dk > todayKey;
              const label = WEEKDAY_SHORT_RU[i] ?? '';
              return (
                <Pressable
                  key={dk}
                  disabled={future}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setViewDateKey(dk);
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: selected
                      ? isLight
                        ? brand.primary
                        : DAY_ACCENT
                      : isLight
                        ? 'rgba(15,17,24,0.04)'
                        : 'rgba(255,255,255,0.06)',
                    borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                    borderColor: 'rgba(255,255,255,0.08)',
                    opacity: future ? 0.35 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${dayOfMonthNum(dk)}`}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: selected ? DAY_ACCENT_TEXT_ON_FILL : colors.textMuted,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {dayOfMonthNum(dk)}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 9,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: selected ? 'rgba(250,250,252,0.75)' : colors.textMuted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setCalendarOpen(true);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Открыть календарь"
            style={{
              paddingVertical: 8,
              paddingHorizontal: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.45)',
              backgroundColor: 'rgba(168,85,247,0.12)',
            }}
          >
            <Ionicons name="calendar-outline" size={22} color={DAY_ACCENT} />
          </Pressable>
          <Pressable
            onPress={goNextDay}
            disabled={viewDateKey >= todayKey}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Следующий день"
            style={{ paddingVertical: 6, paddingHorizontal: 4, opacity: viewDateKey >= todayKey ? 0.28 : 1 }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <DayDateCalendarModal
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          todayKey={todayKey}
          selectedDateKey={viewDateKey}
          onSelectDate={setViewDateKey}
        />

        <HabitHero
          doneCount={heroScore.done}
          totalCount={heroScore.total}
          isTodayContext={viewDateKey === todayKey}
        />

        {isNikolay ? (
          <NikolayDayMoneyHeroCards
            sprintId={activeSprint?.id ?? null}
            chinaGoal={nikolayMoneyGoals.china}
            cushionGoal={nikolayMoneyGoals.cushion}
            desktopTwoColumn={isDesktopLayout}
          />
        ) : null}

        <DayWeekFocusStrip viewDateKey={viewDateKey} todayKey={todayKey} userId={userId} />
        <DayPlannerTasksBlock viewDateKey={viewDateKey} todayKey={todayKey} userId={userId} />

        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  color: 'rgba(196,181,253,0.9)',
                  textTransform: 'uppercase',
                }}
              >
                Привычки
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 19,
                  fontWeight: '900',
                  letterSpacing: -0.4,
                  color: colors.text,
                }}
              >
                Привычки дня
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Link href={HABITS_MANAGE_HREF} asChild>
                <Pressable
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 2,
                    opacity: pressed ? 0.85 : 1,
                    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: brand.primarySoft }}>Привычки</Text>
                </Pressable>
              </Link>
              <Link href={HABITS_HREF} asChild>
                <Pressable
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 2,
                    opacity: pressed ? 0.85 : 1,
                    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: brand.primarySoft }}>Аналитика</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {counterHabits.length > 0 ? (
            <View style={{ marginBottom: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: colors.textMuted,
                  }}
                >
                  Счётчики
                </Text>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: colors.textMuted,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {counterDoneCount}/{counterBadgeTotal}
                  </Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ flexDirection: 'row', gap: 12, paddingRight: 8, paddingBottom: 4 }}
              >
                {counterHabits.map((h, i) => (
                  <HabitCounterRingCard
                    key={h.id}
                    habit={h}
                    viewDateKey={viewDateKey}
                    todayKey={todayKey}
                    compact
                    ringSize={100}
                    progressColor={COUNTER_RING_COLORS[i % COUNTER_RING_COLORS.length]!}
                    onDelta={(d) => adjustCounter.mutate({ id: h.id, dateKey: viewDateKey, delta: d })}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <DayHabitTimelineList
            habits={timelineHabits}
            loading={habits.isLoading}
            emptyHint={
              timelineHabits.length === 0 && counterHabits.length > 0
                ? 'Обычные привычки добавь через «Привычки» в шапке блока.'
                : 'Пока нет привычек — нажми «Привычки» справа и создай новую.'
            }
            viewDateKey={viewDateKey}
            todayKey={todayKey}
            onToggle={onHabitIcon}
            onHarmfulChoice={onHarmfulChoice}
            onRequestDelete={(h) => removeHabit.mutate(h.id)}
            journalRow={{
              viewDateKey,
              todayKey,
              entry: journalDoc.entries[viewDateKey],
              fields: journalDoc.fields,
              journalHabit: findJournalHabit(data),
            }}
          />
        </View>

        <DayJournalAccordion
          viewDateKey={viewDateKey}
          todayKey={todayKey}
          sessionEmail={accountEmail}
          linkMoodToScreenDay
          onMoodStripChangeDay={setViewDateKey}
          onPickMood={(dk, mood) => void pickMood(dk, mood)}
          onPickEnergy={(dk, energy) => void pickEnergy(dk, energy)}
        />

        {shouldShowJournalReminder ? (
          <AppSurfaceCard glow style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
              Вечер — не забудь дневник
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textMuted }}>
              Раскрой плашку «Дневник» ниже и заполни поля за сегодня.
            </Text>
          </AppSurfaceCard>
        ) : null}
        </View>
      </ScrollView>
    </ScreenCanvas>
  );
}
