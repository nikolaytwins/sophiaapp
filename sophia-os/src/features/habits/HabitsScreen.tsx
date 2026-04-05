import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Habit } from '@/entities/models';
import { repos } from '@/services/repositories';
import { isRemoteHabitsConfigured } from '@/services/repositories/remote-habits-repository';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { useAppTheme } from '@/theme';
import { localCalendarDateKey } from '@/utils/calendar-date';

const SPRINT_STORAGE_KEY = 'sophia_sprint_checks_v1';

function categoryLabel(category: string | null | undefined): string | null {
  if (category === 'money') return '💰 Деньги';
  if (category === 'body') return '⚡ Тело / энергия';
  if (category === 'life') return '🧠 Жизнь';
  return null;
}

function reminderColors(
  variant: 'info' | 'warning' | 'danger',
  colors: ReturnType<typeof useAppTheme>['colors'],
  isLight: boolean
) {
  if (variant === 'warning') {
    return {
      border: isLight ? 'rgba(217,119,6,0.45)' : 'rgba(251,191,36,0.35)',
      bg: isLight ? 'rgba(254,243,199,0.35)' : 'rgba(120,53,15,0.25)',
      title: isLight ? '#b45309' : '#fcd34d',
    };
  }
  if (variant === 'danger') {
    return {
      border: isLight ? 'rgba(220,38,38,0.4)' : 'rgba(248,113,113,0.35)',
      bg: isLight ? 'rgba(254,226,226,0.4)' : 'rgba(127,29,29,0.25)',
      title: isLight ? '#b91c1c' : '#fca5a5',
    };
  }
  return {
    border: colors.borderStrong,
    bg: colors.accentSoft,
    title: colors.accent,
  };
}

export function HabitsScreen() {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const dateKey = localCalendarDateKey();

  const habitsQuery = useQuery({
    queryKey: ['habitsSnapshot', dateKey],
    queryFn: () => repos.habits.list(dateKey),
  });

  const [sprintDone, setSprintDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(SPRINT_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const p = JSON.parse(raw) as Record<string, boolean>;
          if (p && typeof p === 'object') setSprintDone(p);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, []);

  const persistSprint = useCallback(async (next: Record<string, boolean>) => {
    setSprintDone(next);
    await AsyncStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleHabit = useMutation({
    mutationFn: ({
      habitId,
      opts,
    }: {
      habitId: string;
      opts?: { bump?: 1 | -1; setCount?: number };
    }) => repos.habits.toggle(habitId, dateKey, opts),
    onSuccess: (next) => {
      qc.setQueryData(['habitsSnapshot', dateKey], next);
    },
  });

  const saveReflection = useMutation({
    mutationFn: (note: string) => repos.habits.saveReflection(note, dateKey),
    onSuccess: (next) => {
      qc.setQueryData(['habitsSnapshot', dateKey], next);
    },
  });

  const [reflectionDraft, setReflectionDraft] = useState('');
  useEffect(() => {
    const n = habitsQuery.data?.dailyReflection?.note ?? '';
    setReflectionDraft(n);
  }, [habitsQuery.data?.dailyReflection?.note]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        icon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        check: {
          width: 36,
          height: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkOn: {
          backgroundColor: colors.success,
          borderColor: colors.success,
        },
        errorText: { marginTop: spacing.sm, color: colors.danger },
        northStar: {
          borderRadius: radius.xl,
          borderWidth: 2,
          borderColor: colors.accent,
          padding: spacing.lg,
          backgroundColor: isLight ? 'rgba(91,75,255,0.06)' : 'rgba(212,184,122,0.12)',
          marginTop: spacing.lg,
        },
        northBadge: {
          ...typography.caption,
          color: colors.accent,
          fontWeight: '800',
          letterSpacing: 1,
        },
        northTitle: {
          ...typography.hero,
          fontSize: 26,
          marginTop: spacing.xs,
        },
        countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        countBtn: {
          width: 40,
          height: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
        },
        countTxt: {
          ...typography.title2,
          minWidth: 28,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        },
      }),
    [colors, isLight, radius, spacing, typography]
  );

  const onToggle = (habitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleHabit.mutate({ habitId });
  };

  const onCountDelta = (habitId: string, bump: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleHabit.mutate({ habitId, opts: { bump } });
  };

  const data = habitsQuery.data;
  const habits = data?.habits ?? [];
  const manifest = data?.manifest;

  const grouped = useMemo(() => {
    const out: { header: string | null; items: Habit[] }[] = [];
    let curHeader: string | null = null;
    let bucket: Habit[] = [];
    const flush = () => {
      if (bucket.length) out.push({ header: curHeader, items: [...bucket] });
      bucket = [];
    };
    for (const h of habits) {
      const lbl = categoryLabel(h.category ?? null);
      if (lbl !== curHeader) {
        flush();
        curHeader = lbl;
      }
      bucket.push(h);
    }
    flush();
    if (out.length === 0 && habits.length) out.push({ header: null, items: habits });
    return out;
  }, [habits]);

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={typography.caption}>Ритм</Text>
      <Text style={typography.hero}>Привычки</Text>
      <Text style={[typography.body, { marginTop: spacing.sm }]}>
        {isRemoteHabitsConfigured()
          ? 'Чекины и дневник сохраняются на сервере (Twinworks).'
          : 'Локальный режим: задай EXPO_PUBLIC_SOPHIA_HABITS_API_BASE для продакшена.'}
      </Text>

      {manifest ? (
        <View style={styles.northStar}>
          <Text style={styles.northBadge}>{manifest.northStar.badge.toUpperCase()}</Text>
          <Text style={styles.northTitle}>{manifest.northStar.title}</Text>
          <Text style={[typography.body, { marginTop: spacing.sm, color: colors.textMuted }]}>
            {manifest.northStar.subtitle}
          </Text>
          <Text
            style={[
              typography.title2,
              { marginTop: spacing.md, color: colors.accent, fontWeight: '700' },
            ]}
          >
            {manifest.northStar.amountLine}
          </Text>
        </View>
      ) : null}

      {manifest?.reminders.map((r) => {
        const rc = reminderColors(r.variant, colors, isLight);
        return (
          <GlassCard key={r.id} style={{ marginTop: spacing.md }}>
            <View
              style={{
                borderLeftWidth: 4,
                borderLeftColor: rc.title,
                paddingLeft: spacing.md,
              }}
            >
              <Text style={[typography.title2, { color: rc.title }]}>{r.title}</Text>
              <Text style={[typography.body, { marginTop: spacing.xs, color: colors.textMuted }]}>
                {r.body}
              </Text>
            </View>
          </GlassCard>
        );
      })}

      {manifest?.sprintGoals?.length ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Цели спринта" />
          <View style={{ gap: spacing.sm }}>
            {manifest.sprintGoals.map((g) => {
              const done = !!sprintDone[g.id];
              return (
                <GlassCard key={g.id}>
                  <Pressable
                    onPress={() => void persistSprint({ ...sprintDone, [g.id]: !done })}
                    style={styles.habitRow}
                  >
                    <View style={[styles.check, done && styles.checkOn]}>
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={done ? (isLight ? '#FFFFFF' : '#0A0B0F') : colors.textMuted}
                      />
                    </View>
                    <Text style={[typography.title2, { flex: 1 }]}>{g.title}</Text>
                  </Pressable>
                </GlassCard>
              );
            })}
          </View>
        </View>
      ) : null}

      {habitsQuery.isError ? (
        <Text style={styles.errorText}>
          Не удалось загрузить привычки. Проверь API и авторизацию.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader title="Сегодня" />
        <View style={{ gap: spacing.sm }}>
          {grouped.map((block, bi) => (
            <View key={bi}>
              {block.header ? (
                <Text
                  style={[
                    typography.caption,
                    {
                      marginBottom: spacing.sm,
                      marginTop: bi > 0 ? spacing.md : 0,
                      color: colors.textMuted,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {block.header}
                </Text>
              ) : null}
              {block.items.map((h) => (
                <GlassCard key={h.id}>
                  {h.trackMode === 'count' ? (
                    <View style={{ paddingVertical: spacing.xs }}>
                      <View style={styles.habitRow}>
                        <View style={styles.icon}>
                          <Ionicons
                            name={h.icon as keyof typeof Ionicons.glyphMap}
                            size={20}
                            color={colors.accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={typography.title2}>{h.name}</Text>
                          {h.subtitle ? (
                            <Text style={[typography.caption, { marginTop: 4 }]}>
                              {h.subtitle}
                            </Text>
                          ) : null}
                          <Text style={[typography.caption, { marginTop: 4 }]}>
                            Сегодня: {h.todayCount ?? 0} / цель от {h.countMin ?? 3} · streak {h.streak}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.countRow,
                          { marginTop: spacing.md, justifyContent: 'flex-end' },
                        ]}
                      >
                        <Pressable
                          style={styles.countBtn}
                          onPress={() => onCountDelta(h.id, -1)}
                          disabled={toggleHabit.isPending}
                        >
                          <Ionicons name="remove" size={22} color={colors.text} />
                        </Pressable>
                        <Text style={styles.countTxt}>{h.todayCount ?? 0}</Text>
                        <Pressable
                          style={styles.countBtn}
                          onPress={() => onCountDelta(h.id, 1)}
                          disabled={toggleHabit.isPending}
                        >
                          <Ionicons name="add" size={22} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => onToggle(h.id)}
                      disabled={toggleHabit.isPending}
                      style={styles.habitRow}
                    >
                      <View style={styles.icon}>
                        <Ionicons
                          name={h.icon as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.title2}>{h.name}</Text>
                        {h.subtitle ? (
                          <Text style={[typography.caption, { marginTop: 4 }]}>
                            {h.subtitle}
                          </Text>
                        ) : null}
                        <Text style={[typography.caption, { marginTop: 4 }]}>
                          streak {h.streak} дней
                        </Text>
                      </View>
                      <View style={[styles.check, h.todayDone && styles.checkOn]}>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={
                            h.todayDone ? (isLight ? '#FFFFFF' : '#0A0B0F') : colors.textMuted
                          }
                        />
                      </View>
                    </Pressable>
                  )}
                </GlassCard>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader title="Дневник · честность" />
        <GlassCard>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            {data?.dailyReflection?.prompt ??
              'Я оправдывался? Объяснял себя? Подстраивался под ожидания другого?'}
          </Text>
          <TextInput
            value={reflectionDraft}
            onChangeText={setReflectionDraft}
            onBlur={() => {
              const server = data?.dailyReflection?.note ?? '';
              if (reflectionDraft.trim() !== (server ?? '').trim()) {
                saveReflection.mutate(reflectionDraft);
              }
            }}
            placeholder="Коротко запиши, как прошёл день в отношениях с собой и другими…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              ...typography.body,
              minHeight: 96,
              color: colors.text,
              textAlignVertical: 'top',
            }}
          />
          {saveReflection.isPending ? (
            <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textMuted }]}>
              Сохраняю…
            </Text>
          ) : null}
        </GlassCard>
      </View>
    </ScrollView>
  );
}
