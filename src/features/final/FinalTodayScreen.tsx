import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarEvent, Habit } from '@/entities/models';
import { useDayOverview } from '@/hooks/useDayOverview';
import { usePersistedFinalEventDone } from '@/hooks/usePersistedFinalEventDone';
import { repos } from '@/services/repositories';
import { isMeetingLikeEvent, isWorkBlockEvent } from '@/shared/calendarEventHints';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { useAppTheme } from '@/theme';

const BG_GRADIENT = ['#1A0F28', '#0D0814', '#07060B'] as const;
const BG_GRADIENT_LIGHT = ['#EDE8FF', '#E8EAFF', '#F5F6FA'] as const;

const ACCENT_WORK = '#F97316';
const ACCENT_MEET = '#8B5CF6';
const ACCENT_HABIT = '#22C55E';

function hourMoscow(): number {
  const now = new Date();
  const h = parseInt(
    now.toLocaleString('en-GB', { timeZone: 'Europe/Moscow', hour: 'numeric', hour12: false }),
    10
  );
  return Number.isFinite(h) ? h : now.getUTCHours();
}

function greetingMoscow(): string {
  const h = hourMoscow();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 17) return 'Добрый день';
  if (h >= 17 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function todayRu() {
  const d = new Date();
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return { weekday, date };
}

function habitSubtitle(h: Habit): string | undefined {
  if (h.cadence === 'weekly' && h.weeklyTarget != null) {
    const done = h.weeklyCompleted ?? 0;
    return `${done}/${h.weeklyTarget} на неделе`;
  }
  return undefined;
}

function EventDoneRow({
  ev,
  accent,
  done,
  onToggle,
}: {
  ev: CalendarEvent;
  accent: string;
  done: boolean;
  onToggle: () => void;
}) {
  const { colors, typography, spacing, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderWidth: 1,
        borderColor: done ? `${accent}55` : colors.border,
        marginBottom: spacing.sm,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: done ? accent : colors.border,
          backgroundColor: done ? `${accent}33` : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        }}
      >
        {done ? <Ionicons name="checkmark" size={18} color={accent} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.text }]} numberOfLines={2}>
          {ev.title}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
          {formatTime(ev.start)} — {formatTime(ev.end)}
        </Text>
      </View>
    </Pressable>
  );
}

function HabitRow({ h }: { h: Habit }) {
  const { colors, typography, spacing } = useAppTheme();
  const sub = habitSubtitle(h);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={22} color={ACCENT_HABIT} />
      <View style={{ marginLeft: spacing.md, flex: 1 }}>
        <Text style={[typography.body, { color: colors.text }]}>{h.name}</Text>
        {sub ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{sub}</Text>
        ) : null}
      </View>
      {h.todayDone ? (
        <Ionicons name="checkmark-circle" size={22} color={ACCENT_HABIT} />
      ) : (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 1.5,
            borderColor: colors.border,
          }}
        />
      )}
    </View>
  );
}

export function FinalTodayScreen() {
  const { colors, typography, spacing, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const dateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { todayEvents, isLoading: eventsLoading } = useDayOverview(dateKey);
  const { isDone, toggle, ready: doneReady } = usePersistedFinalEventDone(dateKey);
  const habitsQ = useQuery({ queryKey: ['habits'], queryFn: () => repos.habits.list() });

  const { weekday, date } = useMemo(() => todayRu(), []);
  const greeting = useMemo(() => greetingMoscow(), []);

  const workBlocks = useMemo(
    () => (todayEvents ?? []).filter((e) => isWorkBlockEvent(e)),
    [todayEvents]
  );
  const meetings = useMemo(
    () => (todayEvents ?? []).filter((e) => isMeetingLikeEvent(e)),
    [todayEvents]
  );

  const bgGradient = useMemo(() => (isLight ? BG_GRADIENT_LIGHT : BG_GRADIENT), [isLight]);

  const loading = eventsLoading || !doneReady || habitsQ.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[...bgGradient]} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            typography.caption,
            { color: colors.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.xs },
          ]}
        >
          Финал
        </Text>
        <Text style={[typography.hero, { fontSize: 32, letterSpacing: -0.5, color: colors.text }]}>
          {greeting}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
          {weekday}, {date}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginTop: spacing.md, lineHeight: 20 },
          ]}
        >
          Один экран дня: работа и созвоны из календаря, привычки — без XP. Отметь, что уже сделано.
        </Text>

        {loading ? (
          <GlassCard style={{ marginTop: spacing.xl, alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
          </GlassCard>
        ) : (
          <>
            <GlassCard style={{ marginTop: spacing.xl }}>
              <SectionHeader title="Работа" />
              <Text
                style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md, marginTop: -4 }]}
              >
                Слоты из календаря (не созвоны)
              </Text>
              {workBlocks.length === 0 ? (
                <Text style={[typography.body, { color: colors.textMuted }]}>Нет рабочих блоков на сегодня</Text>
              ) : (
                workBlocks.map((ev) => (
                  <EventDoneRow
                    key={ev.id}
                    ev={ev}
                    accent={ACCENT_WORK}
                    done={isDone(ev.id)}
                    onToggle={() => void toggle(ev.id)}
                  />
                ))
              )}
            </GlassCard>

            <GlassCard style={{ marginTop: spacing.lg }}>
              <SectionHeader title="Созвоны" />
              <Text
                style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md, marginTop: -4 }]}
              >
                Звонки и встречи
              </Text>
              {meetings.length === 0 ? (
                <Text style={[typography.body, { color: colors.textMuted }]}>Созвонов нет</Text>
              ) : (
                meetings.map((ev) => (
                  <EventDoneRow
                    key={ev.id}
                    ev={ev}
                    accent={ACCENT_MEET}
                    done={isDone(ev.id)}
                    onToggle={() => void toggle(ev.id)}
                  />
                ))
              )}
            </GlassCard>

            <GlassCard style={{ marginTop: spacing.lg }}>
              <SectionHeader title="Привычки" />
              <Text
                style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md, marginTop: -4 }]}
              >
                Ритм дня
              </Text>
              {(habitsQ.data ?? []).map((h) => (
                <HabitRow key={h.id} h={h} />
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}
