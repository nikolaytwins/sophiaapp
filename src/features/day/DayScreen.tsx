import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Habit } from '@/entities/models';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { NikolayDayFocusPanel, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
import { journalEntryHasContent } from '@/features/day/dayJournal.logic';
import { DayHabitGrid } from '@/features/day/DayHabitGrid';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';
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

function formatScreenDayPrimary(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const withYear = dateKey.slice(0, 4) !== todayKey.slice(0, 4);
  return dt.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}

function formatScreenWeekday(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const w = dt.toLocaleDateString('ru-RU', { weekday: 'long' });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function DayScreen() {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const habits = useHabitsQuery();
  const journalDoc = useDayJournalStore((s) => s.doc);
  const todayKey = localDateKey();
  const [viewDateKey, setViewDateKey] = useState(todayKey);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const nikolayMoneyGoals = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );

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

  const isNikolay = isNikolayPrimaryAccount(accountEmail);

  const data = habits.data ?? [];

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
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Pressable
            onPress={goPrevDay}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Предыдущий день"
            style={{ paddingVertical: 4, paddingHorizontal: 2 }}
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                letterSpacing: -0.5,
                color: colors.text,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {formatScreenDayPrimary(viewDateKey, todayKey)}
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontSize: 14,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {formatScreenWeekday(viewDateKey)}
              {isViewingToday ? ' · сегодня' : ''}
            </Text>
          </View>
          <Pressable
            onPress={goNextDay}
            disabled={viewDateKey >= todayKey}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Следующий день"
            style={{ paddingVertical: 4, paddingHorizontal: 2, opacity: viewDateKey >= todayKey ? 0.28 : 1 }}
          >
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        {shouldShowJournalReminder ? (
          <AppSurfaceCard glow style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
              Заполни дневник сегодня
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.68)' }}>
              Уже вечер. Зайди во вкладку «Дневник» и зафиксируй основные моменты дня.
            </Text>
          </AppSurfaceCard>
        ) : null}

        {isNikolay ? (
          <NikolayDayFocusPanel chinaGoal={nikolayMoneyGoals.china} cushionGoal={nikolayMoneyGoals.cushion} />
        ) : null}

        <DayHabitGrid
          habits={data}
          loading={habits.isLoading}
          emptyHint="Пока нет привычек — добавь на вкладке «Привычки»."
          viewDateKey={viewDateKey}
          todayKey={todayKey}
          onToggle={onHabitIcon}
          onRequestDelete={(h) => removeHabit.mutate(h.id)}
        />
      </ScrollView>
    </ScreenCanvas>
  );
}
