import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ProgressRing } from '@/shared/ui/ProgressRing';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  goalDone,
  sprintAggregateStats,
  sprintElapsedDayIndex,
  sprintEndDateKey,
} from '@/features/sprint/sprint.logic';
import {
  SPRINT_SPHERE_LABEL,
  type SprintGoal,
  type SprintGoalKind,
  type SprintSphere,
} from '@/features/sprint/sprint.types';
import { localDateKey } from '@/features/habits/habitLogic';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { repos } from '@/services/repositories';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { alertInfo, confirmDestructive } from '@/shared/lib/confirmAction';

const ACCENT = '#A855F7';
const CANVAS_GRAD = ['#020203', '#0A0A10', '#050506'] as const;
const SPHERE_ORDER: SprintSphere[] = ['relationships', 'energy', 'work'];

/** Единые карточки как на «Привычки». */
const CARD_R = 18;
const CARD_PAD = 18;
const SECTION = 28;

function parseGoalNumber(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

function confirmRemoveHabit(h: { id: string; name: string }, onRemove: (id: string) => void) {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
  confirmDestructive({
    title: 'Удалить привычку?',
    message: `«${h.name}» исчезнет везде (День, аналитика). Связи целей этого спринта сбросятся.`,
    onConfirm: () => onRemove(h.id),
  });
}

function SurfaceCard({ children, style, glow }: { children: ReactNode; style?: object; glow?: boolean }) {
  return (
    <View
      style={[
        {
          borderRadius: CARD_R,
          borderWidth: 1,
          borderColor: glow ? 'rgba(168,85,247,0.22)' : 'rgba(255,255,255,0.07)',
          backgroundColor: 'rgba(18,18,22,0.92)',
          padding: CARD_PAD,
          ...(Platform.OS === 'web'
            ? {}
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: glow ? 0.42 : 0.35,
                shadowRadius: glow ? 24 : 20,
                elevation: glow ? 8 : 6,
              }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SprintScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const todayKey = localDateKey();

  const sprints = useSprintStore((s) => s.sprints);
  const createSprint = useSprintStore((s) => s.createSprint);
  const completeSprint = useSprintStore((s) => s.completeSprint);
  const addGoal = useSprintStore((s) => s.addGoal);
  const removeGoal = useSprintStore((s) => s.removeGoal);
  const adjustGoalCurrent = useSprintStore((s) => s.adjustGoalCurrent);
  const toggleCheckpoint = useSprintStore((s) => s.toggleCheckpoint);
  const setGoalHabitLinks = useSprintStore((s) => s.setGoalHabitLinks);
  const setProgressGoalNumbers = useSprintStore((s) => s.setProgressGoalNumbers);
  const active = useMemo(() => sprints.find((x) => x.status === 'active') ?? null, [sprints]);

  const [durationPick, setDurationPick] = useState<30 | 60 | 90>(30);
  const [newTitle, setNewTitle] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [sphere, setSphere] = useState<SprintSphere>('relationships');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalKind, setGoalKind] = useState<SprintGoalKind>('checkpoint');
  const [targetStr, setTargetStr] = useState('10');
  const [currentStr, setCurrentStr] = useState('0');
  const [linkHabitId, setLinkHabitId] = useState<string | null>(null);

  const [habitPickGoalId, setHabitPickGoalId] = useState<string | null>(null);
  const [goalProgressEdit, setGoalProgressEdit] = useState<SprintGoal | null>(null);
  const [progressDraftCurrent, setProgressDraftCurrent] = useState('');
  const [progressDraftTarget, setProgressDraftTarget] = useState('');

  const habitsQ = useHabitsQuery();

  const removeHabitMutation = useMutation({
    mutationFn: (id: string) => repos.habits.remove(id),
    onSuccess: (list, id) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
      useSprintStore.getState().removeHabitFromAllGoalLinks(id);
      setLinkHabitId((prev) => (prev === id ? null : prev));
    },
  });

  /** Автозавершение спринта после последнего дня периода. */
  useEffect(() => {
    if (!active || active.status !== 'active') return;
    const end = sprintEndDateKey(active);
    if (todayKey > end) {
      completeSprint(active.id);
    }
  }, [active, completeSprint, todayKey]);

  useEffect(() => {
    if (!goalProgressEdit || goalProgressEdit.kind !== 'progress') return;
    setProgressDraftCurrent(String(goalProgressEdit.current ?? 0));
    setProgressDraftTarget(String(goalProgressEdit.target ?? 1));
  }, [goalProgressEdit]);

  const resetAddForm = useCallback(() => {
    setSphere('relationships');
    setGoalTitle('');
    setGoalKind('checkpoint');
    setTargetStr('10');
    setCurrentStr('0');
    setLinkHabitId(null);
  }, []);

  const onCreateSprint = useCallback(() => {
    const r = createSprint({ title: newTitle.trim() || undefined, durationDays: durationPick });
    if (!r.ok) {
      alertInfo('Спринт', r.error);
      return;
    }
    setNewTitle('');
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [createSprint, durationPick, newTitle]);

  const onAddGoal = useCallback(() => {
    if (!active) return;
    const target = Math.max(1, parseGoalNumber(targetStr) || 1);
    const current = Math.max(0, parseGoalNumber(currentStr));
    const r = addGoal(active.id, {
      sphere,
      title: goalTitle,
      kind: goalKind,
      target: goalKind === 'progress' ? target : undefined,
      current: goalKind === 'progress' ? current : undefined,
      habitLinks: linkHabitId ? [{ habitId: linkHabitId, deltaPerCompletion: 1 }] : [],
    });
    if (!r.ok) {
      alertInfo('Цель', r.error);
      return;
    }
    resetAddForm();
    setAddOpen(false);
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [active, addGoal, currentStr, goalKind, goalTitle, linkHabitId, resetAddForm, sphere, targetStr]);

  const dayIdx = active ? sprintElapsedDayIndex(active.startDate, todayKey, active.durationDays) : 0;
  const timeProgress = active && active.durationDays > 0 ? Math.min(1, dayIdx / active.durationDays) : 0;

  const sprintStats = useMemo(
    () => (active ? sprintAggregateStats(active.goals) : null),
    [active]
  );

  const sortedGoals = useMemo(() => {
    if (!active) return [];
    return [...active.goals].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [active]);

  const habitName = useCallback(
    (id: string) => habitsQ.data?.find((h) => h.id === id)?.name ?? id,
    [habitsQ.data]
  );

  const confirmRemoveGoal = (g: SprintGoal) => {
    confirmDestructive({
      title: 'Удалить цель?',
      message: g.title,
      onConfirm: () => {
        if (active) removeGoal(active.id, g.id);
      },
    });
  };

  const openHabitPickerForGoal = (goalId: string) => {
    setHabitPickGoalId(goalId);
  };

  const applyHabitToGoal = (habitId: string | null) => {
    if (!active || !habitPickGoalId) return;
    setGoalHabitLinks(
      active.id,
      habitPickGoalId,
      habitId ? [{ habitId, deltaPerCompletion: 1 }] : []
    );
    setHabitPickGoalId(null);
  };

  const saveProgressEdit = useCallback(() => {
    if (!active || !goalProgressEdit || goalProgressEdit.kind !== 'progress') return;
    const t = Math.max(1, parseGoalNumber(progressDraftTarget) || 1);
    const c = Math.max(0, parseGoalNumber(progressDraftCurrent));
    const r = setProgressGoalNumbers(active.id, goalProgressEdit.id, {
      target: t,
      current: Math.min(c, t),
    });
    if (!r.ok) {
      alertInfo('Значения', r.error);
      return;
    }
    setGoalProgressEdit(null);
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [active, goalProgressEdit, progressDraftCurrent, progressDraftTarget, setProgressGoalNumbers]);

  const agg01 = sprintStats ? Math.min(1, sprintStats.aggregatePercent / 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#030304' }}>
      <LinearGradient colors={[...CANVAS_GRAD]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(255,255,255,0.38)' }}>
              СПРИНТ
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 6, letterSpacing: -0.6 }}>
              Цели
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Pressable
              onPress={() => router.push('/sprint-settings' as Href)}
              hitSlop={12}
              style={({ pressed }) => ({ padding: 10, opacity: pressed ? 0.75 : 1, marginRight: 2 })}
            >
              <Ionicons name="settings-outline" size={24} color="rgba(255,255,255,0.55)" />
            </Pressable>
            <HeaderProfileAvatar marginTop={0} />
          </View>
        </View>

        <LinearGradient
          colors={['rgba(168,85,247,0.55)', 'rgba(168,85,247,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            height: 5,
            borderRadius: 3,
            marginTop: 16,
            marginBottom: 4,
          }}
        />

        <Pressable
          onPress={() => router.push('/sprint-archive' as Href)}
          style={({ pressed }) => ({
            marginTop: SECTION - 8,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(196,181,253,0.88)' }}>Прошлые спринты</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(196,181,253,0.88)" />
        </Pressable>

        {!active ? (
          <SurfaceCard style={{ marginTop: spacing.lg }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Новый спринт</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Одновременно может быть только один активный спринт.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {([30, 60, 90] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDurationPick(d)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: durationPick === d ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: durationPick === d ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: durationPick === d ? '#FAFAFC' : colors.textMuted }}>{d} дн.</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Название (необязательно)</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Например: Весна"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: radius.md,
                padding: 12,
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <Pressable
              onPress={onCreateSprint}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(168,85,247,0.85)' : ACCENT,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Начать спринт</Text>
            </Pressable>
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard glow style={{ marginTop: SECTION }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>{active.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 18 }}>
                    {active.startDate} → {sprintEndDateKey(active)}
                  </Text>
                </View>
                <Pressable onPress={() => router.push(`/sprint-detail/${active.id}` as Href)} hitSlop={10} style={{ padding: 8 }}>
                  <Ionicons name="information-circle-outline" size={22} color="rgba(255,255,255,0.45)" />
                </Pressable>
              </View>

              {sprintStats ? (
                <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                  <ProgressRing
                    value01={agg01}
                    size={132}
                    stroke={11}
                    label={sprintStats.totalCount > 0 ? `${Math.round(sprintStats.aggregatePercent)}%` : '—'}
                    sublabel={sprintStats.totalCount > 0 ? 'сводно' : 'добавьте цели'}
                    trackColor="rgba(255,255,255,0.08)"
                    progressColor={ACCENT}
                    sublabelColor="rgba(255,255,255,0.42)"
                  />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.42)', letterSpacing: 0.4 }}>
                      Выполнено целей
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 8 }}>
                      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                        {sprintStats.doneCount}
                      </Text>
                      <Text style={{ fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.28)' }}>/</Text>
                      <Text style={{ fontSize: 30, fontWeight: '800', color: 'rgba(255,255,255,0.45)' }}>
                        {sprintStats.totalCount}
                      </Text>
                    </View>
                    {sprintStats.totalCount > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                        {Array.from({ length: sprintStats.totalCount }).map((_, i) => (
                          <View
                            key={i}
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor:
                                i < sprintStats.doneCount ? 'rgba(134,239,172,0.95)' : 'rgba(255,255,255,0.12)',
                              borderWidth: i < sprintStats.doneCount ? 0 : 1,
                              borderColor: 'rgba(255,255,255,0.14)',
                            }}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={{ marginTop: 22 }}>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
                  <LinearGradient
                    colors={[ACCENT, 'rgba(168,85,247,0.35)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ height: '100%', width: `${Math.max(0, timeProgress) * 100}%` }}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    День {Math.max(1, dayIdx)} из {active.durationDays}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>ход времени {Math.round(timeProgress * 100)}%</Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setAddOpen(true);
                }}
                style={({ pressed }) => ({
                  marginTop: 22,
                  paddingVertical: 14,
                  borderRadius: CARD_R - 2,
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.4)',
                  backgroundColor: pressed ? 'rgba(168,85,247,0.14)' : 'rgba(168,85,247,0.08)',
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontWeight: '800', color: ACCENT, fontSize: 16 }}>+ Цель</Text>
              </Pressable>
            </SurfaceCard>

            <View style={{ marginTop: SECTION + 4 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.3,
                  color: 'rgba(255,255,255,0.35)',
                  marginBottom: 12,
                }}
              >
                ЦЕЛИ СПРИНТА
              </Text>

              {sortedGoals.length === 0 ? (
                <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 6, lineHeight: 22 }}>
                  Пока нет целей. Нажми «+ Цель» и добавь первую — сферу можно выбрать в форме.
                </Text>
              ) : (
                sortedGoals.map((g) => (
                  <SurfaceCard key={g.id} style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 23 }}>{g.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{SPRINT_SPHERE_LABEL[g.sphere]}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        {g.kind === 'progress' ? (
                          <Pressable onPress={() => setGoalProgressEdit(g)} hitSlop={10} style={{ padding: 8 }}>
                            <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.38)" />
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => confirmRemoveGoal(g)} hitSlop={10} style={{ padding: 8 }}>
                          <Ionicons name="trash-outline" size={20} color="rgba(255,100,100,0.65)" />
                        </Pressable>
                      </View>
                    </View>

                    {g.kind === 'checkpoint' ? (
                      <Pressable
                        onPress={() => toggleCheckpoint(active.id, g.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}
                      >
                        <Ionicons
                          name={goalDone(g) ? 'checkbox' : 'square-outline'}
                          size={26}
                          color={goalDone(g) ? 'rgba(134,239,172,0.95)' : 'rgba(255,255,255,0.35)'}
                        />
                        <Text style={{ fontSize: 15, color: goalDone(g) ? 'rgba(134,239,172,0.95)' : colors.textMuted }}>
                          {goalDone(g) ? 'Сделано' : 'Отметить выполненным'}
                        </Text>
                      </Pressable>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View
                              style={{
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                              }}
                            >
                              <View
                                style={{
                                  height: '100%',
                                  width: `${g.target ? Math.min(100, ((g.current ?? 0) / g.target) * 100) : 0}%`,
                                  overflow: 'hidden',
                                  borderRadius: 5,
                                }}
                              >
                                <LinearGradient
                                  colors={
                                    goalDone(g)
                                      ? ['rgba(134,239,172,0.95)', 'rgba(74,222,128,0.55)']
                                      : [ACCENT, 'rgba(168,85,247,0.35)']
                                  }
                                  start={{ x: 0, y: 0.5 }}
                                  end={{ x: 1, y: 0.5 }}
                                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                                />
                              </View>
                            </View>
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: colors.text,
                              letterSpacing: -0.2,
                            }}
                          >
                            {g.current ?? 0} / {g.target ?? 0}
                          </Text>
                          <Pressable
                            onPress={() => {
                              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              adjustGoalCurrent(active.id, g.id, -1);
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.12)',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="remove" size={20} color="rgba(255,255,255,0.85)" />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              adjustGoalCurrent(active.id, g.id, 1);
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.12)',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="add" size={22} color="rgba(255,255,255,0.85)" />
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => openHabitPickerForGoal(g.id)}
                          style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <Ionicons name="link-outline" size={18} color="rgba(255,255,255,0.4)" />
                          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', fontWeight: '500' }}>
                            {g.habitLinks.length ? `Привычка: ${habitName(g.habitLinks[0]!.habitId)}` : 'Связать с привычкой'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </SurfaceCard>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setAddOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#12121a',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Новая цель</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Сфера</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {SPHERE_ORDER.map((sp) => (
                <Pressable
                  key={sp}
                  onPress={() => setSphere(sp)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: sphere === sp ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: sphere === sp ? 'rgba(168,85,247,0.12)' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, color: sphere === sp ? '#fff' : colors.textMuted }} numberOfLines={1}>
                    {SPRINT_SPHERE_LABEL[sp]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Название</Text>
            <TextInput
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder="Что сделать"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                marginBottom: 12,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Тип</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Pressable
                onPress={() => setGoalKind('checkpoint')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: goalKind === 'checkpoint' ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: goalKind === 'checkpoint' ? '#fff' : colors.textMuted }}>Галочка</Text>
              </Pressable>
              <Pressable
                onPress={() => setGoalKind('progress')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: goalKind === 'progress' ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: goalKind === 'progress' ? '#fff' : colors.textMuted }}>X из Y</Text>
              </Pressable>
            </View>
            {goalKind === 'progress' ? (
              <>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Цель (Y)</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={targetStr}
                      onChangeText={setTargetStr}
                      style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 12,
                        color: colors.text,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Сейчас (X)</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={currentStr}
                      onChangeText={setCurrentStr}
                      style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 12,
                        color: colors.text,
                      }}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Опционально: привычка</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setLinkHabitId(null)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginRight: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: linkHabitId === null ? ACCENT : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ color: linkHabitId === null ? '#fff' : colors.textMuted }}>Без связи</Text>
                  </Pressable>
                  {(habitsQ.data ?? []).map((h) => (
                    <View
                      key={h.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginRight: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: linkHabitId === h.id ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                        maxWidth: 240,
                        overflow: 'hidden',
                      }}
                    >
                      <Pressable
                        onPress={() => setLinkHabitId(h.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          minWidth: 0,
                        }}
                      >
                        <Text numberOfLines={1} style={{ color: linkHabitId === h.id ? '#fff' : colors.textMuted }}>
                          {h.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmRemoveHabit(h, (id) => removeHabitMutation.mutate(id))}
                        style={{ paddingHorizontal: 8, paddingVertical: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Удалить привычку ${h.name}`}
                      >
                        <Ionicons name="trash-outline" size={17} color="rgba(248,113,113,0.9)" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <Pressable
              onPress={onAddGoal}
              style={{
                backgroundColor: ACCENT,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Сохранить цель</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={habitPickGoalId != null} animationType="fade" transparent onRequestClose={() => setHabitPickGoalId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }} onPress={() => setHabitPickGoalId(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#12121a',
              borderRadius: 16,
              padding: 16,
              maxHeight: '70%',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Привычка для цели</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              +1 к прогрессу за каждое засчитанное выполнение привычки. Можно убрать связь.
            </Text>
            <ScrollView>
              <Pressable
                onPress={() => applyHabitToGoal(null)}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}
              >
                <Text style={{ color: 'rgba(255,120,120,0.95)' }}>Убрать связь</Text>
              </Pressable>
              {(habitsQ.data ?? []).map((h) => (
                <View
                  key={h.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Pressable
                    onPress={() => applyHabitToGoal(h.id)}
                    style={{ flex: 1, paddingVertical: 12, paddingRight: 8 }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{h.name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmRemoveHabit(h, (id) => removeHabitMutation.mutate(id))}
                    style={{ paddingVertical: 12, paddingHorizontal: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Удалить привычку ${h.name}`}
                  >
                    <Ionicons name="trash-outline" size={20} color="rgba(248,113,113,0.9)" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={goalProgressEdit != null} animationType="fade" transparent onRequestClose={() => setGoalProgressEdit(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }} onPress={() => setGoalProgressEdit(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#12121a',
              borderRadius: CARD_R,
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Настройки прогресса</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 8 }} numberOfLines={2}>
              {goalProgressEdit?.title}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 14, lineHeight: 18 }}>
              На карточке — только + и −. Здесь можно ввести точные числа вручную.
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Сейчас (X)</Text>
            <TextInput
              value={progressDraftCurrent}
              onChangeText={setProgressDraftCurrent}
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: radius.md,
                padding: 12,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
              }}
            />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Цель (Y)</Text>
            <TextInput
              value={progressDraftTarget}
              onChangeText={setProgressDraftTarget}
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: radius.md,
                padding: 12,
                color: colors.text,
                fontSize: 16,
                marginBottom: 18,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setGoalProgressEdit(null)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={saveProgressEdit}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Сохранить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
