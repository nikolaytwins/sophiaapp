import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayOverview } from '@/hooks/useDayOverview';
import { useDayFilterStore } from '@/stores/dayFilter.store';
import { GlassCard } from '@/shared/ui/GlassCard';
import { MetricTile } from '@/shared/ui/MetricTile';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

import { TaskRow } from './TaskRow';

const BG_GRADIENT = ['#1A0F28', '#0D0814', '#07060B'] as const;
const BG_GRADIENT_LIGHT = ['#EDE8FF', '#E8EAFF', '#F5F6FA'] as const;
const HERO_INNER_GRAD = ['rgba(212,184,122,0.14)', 'rgba(74,45,92,0.2)', 'rgba(7,6,11,0.92)'] as const;
const HERO_INNER_LIGHT = ['rgba(91,75,255,0.1)', 'rgba(255,255,255,0.88)', 'rgba(255,255,255,0.98)'] as const;

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

export function DayScreen() {
  const { colors, typography, spacing, radius, isLight, toggle } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const filter = useDayFilterStore((s) => s.filter);
  const setFilter = useDayFilterStore((s) => s.setFilter);

  const dateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { tasks, dailyScore, health, todayEvents, isLoading, toggleTask } = useDayOverview(dateKey);
  const { weekday, date } = useMemo(() => todayRu(), []);

  const filteredTasks = useMemo(() => {
    const list = tasks ?? [];
    if (filter === 'all') return list;
    return list.filter((t) => (filter === 'work' ? t.domain === 'work' : t.domain === 'personal'));
  }, [tasks, filter]);

  const sortedTasks = useMemo(() => {
    const withTime = filteredTasks.filter((t) => t.dueTime);
    const without = filteredTasks.filter((t) => !t.dueTime);
    withTime.sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''));
    return [...withTime, ...without];
  }, [filteredTasks]);

  const onToggle = (id: string, done: boolean) => {
    toggleTask.mutate({ id, done });
  };

  const bgGradient = useMemo(() => (isLight ? BG_GRADIENT_LIGHT : BG_GRADIENT), [isLight]);
  const heroInnerGrad = useMemo(() => (isLight ? HERO_INNER_LIGHT : HERO_INNER_GRAD), [isLight]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex1: { flex: 1 },
        gradientBg: { ...StyleSheet.absoluteFillObject },
        screen: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          backgroundColor: 'transparent',
        },
        kicker: {
          ...typography.caption,
          color: colors.accent,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: spacing.xs,
        },
        heroTitle: {
          ...typography.hero,
          fontSize: 36,
          letterSpacing: -1,
        },
        heroSub: {
          ...typography.body,
          color: colors.textMuted,
          marginTop: spacing.sm,
        },
        topRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        },
        topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        themeBtn: {
          width: 44,
          height: 44,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.accentSoft,
        },
        planBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.accentSoft,
        },
        planBtnTxt: {
          ...typography.caption,
          color: colors.accent,
          fontWeight: '700',
        },
        heroCardOuter: {
          borderRadius: radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.borderStrong,
        },
        heroInner: {
          padding: spacing.lg,
          overflow: 'hidden',
        },
        scoreRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
        },
        scoreCopy: { flex: 1 },
        factorsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginTop: spacing.md,
        },
        factorChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.full,
          backgroundColor: isLight ? 'rgba(91,75,255,0.08)' : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: colors.border,
        },
        factorTxt: {
          ...typography.caption,
          color: colors.textMuted,
        },
        metricsRow: {
          flexDirection: 'row',
          gap: spacing.md,
          marginTop: spacing.lg,
        },
        metricFlex: { flex: 1 },
        tasksShell: {
          marginTop: spacing.xl,
          borderRadius: radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(7,6,11,0.35)',
        },
        tasksInner: {
          padding: spacing.lg,
          paddingBottom: spacing.md,
        },
        eventRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        eventTime: {
          ...typography.caption,
          color: colors.accent,
          width: 52,
          fontWeight: '600',
        },
        eventTitle: {
          ...typography.title2,
          flex: 1,
          marginLeft: spacing.sm,
        },
        eventAccent: {
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 2,
          backgroundColor: colors.accent2,
          marginRight: spacing.sm,
        },
      }),
    [colors, isLight, radius, spacing, typography]
  );

  return (
    <View style={styles.flex1}>
      <LinearGradient colors={bgGradient} style={styles.gradientBg} />
      <ScrollView
        style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.kicker}>София · день</Text>
            <Text style={styles.heroTitle}>{weekday}</Text>
            <Text style={styles.heroSub}>{date}</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={toggle}
              style={styles.themeBtn}
              accessibilityLabel={isLight ? 'Тёмная тема' : 'Светлая тема'}
            >
              <Ionicons
                name={isLight ? 'moon-outline' : 'sunny-outline'}
                size={22}
                color={colors.accent}
              />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/plan')} style={styles.planBtn}>
              <Text style={styles.planBtnTxt}>План</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <Text style={[typography.body, { marginTop: spacing.lg, color: colors.textMuted }]}>Загрузка…</Text>
        ) : (
          <>
            {dailyScore ? (
              <View style={styles.heroCardOuter}>
                <LinearGradient colors={heroInnerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.heroInner}>
                    <Text style={[typography.caption, { color: colors.accent, letterSpacing: 1.2 }]}>
                      ОБЗОР ДНЯ
                    </Text>
                    <View style={styles.scoreRow}>
                      <ProgressRing
                        value01={dailyScore.progress01}
                        label={`${dailyScore.score100}`}
                        sublabel="score"
                      />
                      <View style={styles.scoreCopy}>
                        <Text style={[typography.body, { color: colors.text }]}>{dailyScore.summary}</Text>
                        <View style={styles.factorsRow}>
                          {dailyScore.factors.map((f) => (
                            <View key={f.label} style={styles.factorChip}>
                              <Text style={styles.factorTxt}>
                                {f.label} · +{f.impact}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ) : null}

            {health ? (
              <View style={styles.metricsRow}>
                <View style={styles.metricFlex}>
                  <MetricTile
                    icon="footsteps-outline"
                    title="Шаги"
                    value={`${health.steps}`}
                    hint={`цель ${health.stepsGoal}`}
                    progress01={health.steps / health.stepsGoal}
                  />
                </View>
                <View style={styles.metricFlex}>
                  <MetricTile
                    icon="nutrition-outline"
                    title="Белок"
                    value={`${health.proteinG} г`}
                    hint={`цель ${health.proteinGoal} г`}
                    progress01={health.proteinG / health.proteinGoal}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.tasksShell}>
              <View style={styles.tasksInner}>
                <SectionHeader title="Задачи" />
                <SegmentedControl
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'Все' },
                    { value: 'work', label: 'Работа' },
                    { value: 'personal', label: 'Личное' },
                  ]}
                />
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  {sortedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => onToggle(task.id, task.status !== 'done')}
                    />
                  ))}
                  {sortedTasks.length === 0 ? (
                    <Text style={[typography.caption, { textAlign: 'center', paddingVertical: spacing.lg }]}>
                      Нет задач в этом фильтре.
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {todayEvents.length > 0 ? (
              <View style={{ marginTop: spacing.xl }}>
                <SectionHeader title="События сегодня" />
                <GlassCard glow padding={spacing.md}>
                  {todayEvents.map((ev) => (
                    <View key={ev.id} style={styles.eventRow}>
                      <View style={styles.eventAccent} />
                      <Text style={styles.eventTime}>{formatTime(ev.start)}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {ev.title}
                      </Text>
                    </View>
                  ))}
                </GlassCard>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
