import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Habit } from '@/entities/models';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import {
  NikolayDayMoneyHeroCards,
  NikolayDayMutedReminders,
  pickNikolayMoneyProgressGoals,
} from '@/features/accounts/nikolayHabitsUi';
import { journalEntryHasContent } from '@/features/day/dayJournal.logic';
import { WEEKDAY_SHORT_RU, getWeekDayKeys, habitDoneOnDate } from '@/features/day/dayHabitUi';
import { DayHabitTimelineList } from '@/features/day/DayHabitTimelineList';
import { HabitCounterRingCard } from '@/features/habits/HabitCounterRingCard';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { getSupabase } from '@/lib/supabase';
import { repos } from '@/services/repositories';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { useSprintStore } from '@/stores/sprint.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const HABITS_HREF = '/habits' as Href;

const SOPHIA_MASCOT = require('../../../assets/images/sophia-day-mascot.png');

const COUNTER_RING_COLORS = ['#A855F7', '#84CC16', '#38BDF8', '#F472B6'] as const;

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
  const todayKey = localDateKey();
  const [viewDateKey, setViewDateKey] = useState(todayKey);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState('ты');

  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const nikolayMoneyGoals = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAccountEmail(null);
      setGreetingName('ты');
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setAccountEmail(session?.user?.email ?? null);
      setGreetingName(displayNameFromSession(session));
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email ?? null);
      setGreetingName(displayNameFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  const isNikolay = isNikolayPrimaryAccount(accountEmail);

  const data = habits.data ?? [];

  const counterHabits = useMemo(
    () => data.filter((h) => h.cadence === 'daily' && h.checkInKind === 'counter'),
    [data]
  );
  const timelineHabits = useMemo(
    () => data.filter((h) => !(h.cadence === 'daily' && h.checkInKind === 'counter')),
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

  const checkIn = useMutation({
    mutationFn: ({ id, dateKey: dk }: { id: string; dateKey?: string }) => repos.habits.checkIn(id, dk),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const undoWeekly = useMutation({
    mutationFn: ({ id, dateKey: dk }: { id: string; dateKey?: string }) => repos.habits.undoWeekly(id, dk),
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
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const onHabitIcon = useCallback(
    (h: Habit) => {
      if (viewDateKey > todayKey) return;
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (h.cadence === 'daily') {
        checkIn.mutate({ id: h.id, dateKey: viewDateKey });
        return;
      }
      if (habitDoneOnDate(h, viewDateKey)) {
        undoWeekly.mutate({ id: h.id, dateKey: viewDateKey });
      } else {
        checkIn.mutate({ id: h.id, dateKey: viewDateKey });
      }
    },
    [checkIn, todayKey, undoWeekly, viewDateKey]
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

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl + 8,
          paddingBottom: insets.bottom + 148,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 26,
                fontWeight: '800',
                letterSpacing: -0.6,
                color: colors.text,
              }}
              numberOfLines={2}
            >
              {hourGreeting}, {greetingName}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 15,
                fontWeight: '600',
                color: colors.textMuted,
              }}
              numberOfLines={2}
            >
              {formatHeaderDateLine(viewDateKey, todayKey)}
              {isViewingToday ? ' · сегодня' : ''}
            </Text>
          </View>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isLight ? colors.border : 'rgba(255,255,255,0.14)',
              backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.06)',
            }}
          >
            <Image source={SOPHIA_MASCOT} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: spacing.lg,
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
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: selected
                      ? isLight
                        ? colors.text
                        : 'rgba(247,244,250,0.94)'
                      : isLight
                        ? 'rgba(15,17,24,0.04)'
                        : 'rgba(255,255,255,0.06)',
                    opacity: future ? 0.35 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${dayOfMonthNum(dk)}`}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: selected ? (isLight ? '#F7F4FA' : '#0B0A0E') : colors.textMuted,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {dayOfMonthNum(dk)}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: selected ? (isLight ? 'rgba(247,244,250,0.72)' : 'rgba(11,10,14,0.55)') : colors.textMuted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

        {shouldShowJournalReminder ? (
          <AppSurfaceCard glow style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
              Заполни дневник сегодня
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
              Уже вечер. Зайди во вкладку «Дневник» и зафиксируй основные моменты дня.
            </Text>
          </AppSurfaceCard>
        ) : null}

        {isNikolay ? (
          <>
            <NikolayDayMoneyHeroCards chinaGoal={nikolayMoneyGoals.china} cushionGoal={nikolayMoneyGoals.cushion} />
            <NikolayDayMutedReminders />
          </>
        ) : null}

        {counterHabits.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
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
                  fontSize: 18,
                  fontWeight: '800',
                  letterSpacing: -0.4,
                  color: colors.text,
                }}
              >
                Чекины
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
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: -0.4,
              color: colors.text,
            }}
          >
            Ритм дня
          </Text>
          <Link href={HABITS_HREF} asChild>
            <Pressable
              style={({ pressed }) => ({
                paddingVertical: 4,
                paddingHorizontal: 2,
                opacity: pressed ? 0.85 : 1,
                ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: brand.primarySoft }}>Все</Text>
            </Pressable>
          </Link>
        </View>

        <DayHabitTimelineList
          habits={timelineHabits}
          loading={habits.isLoading}
          emptyHint={
            timelineHabits.length === 0 && counterHabits.length > 0
              ? 'Счётчики — в блоке «Чекины» выше. Обычные привычки добавь во вкладке «Привычки».'
              : 'Пока нет привычек — добавь на вкладке «Привычки».'
          }
          viewDateKey={viewDateKey}
          todayKey={todayKey}
          onToggle={onHabitIcon}
          onRequestDelete={(h) => removeHabit.mutate(h.id)}
        />
      </ScrollView>
    </ScreenCanvas>
  );
}
