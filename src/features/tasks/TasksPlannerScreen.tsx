import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, Link, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import type { BacklogPriority } from '@/features/tasks/backlog.types';
import {
  adjustPlannerCompletedCount,
  createPlannerTask,
  deletePlannerTask,
  getPlannerUserStats,
  listPlannerTasks,
  purgeOldPlannerTasks,
  updatePlannerTask,
} from '@/features/tasks/plannerApi';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { PLANNER_STATS_QUERY_KEY, PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { applyPlannerTitleDateHints } from '@/features/tasks/plannerTitleDateParse';
import { sortPlannerTasksForDisplay } from '@/features/tasks/plannerSort';
import {
  PLANNER_PRIORITY_OPTIONS,
  cardSurfaceForPriority,
  priorityBadgeStyle,
  priorityStripStyle,
} from '@/features/tasks/taskPriorityUi';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { getSupabase } from '@/lib/supabase';
import { alertInfo, confirmDestructive } from '@/shared/lib/confirmAction';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';

function formatLongDateLabel(dateKey: string, todayKey: string): string {
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

function weekdayShortRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const idx = day === 0 ? 6 : day - 1;
  return WEEKDAY_SHORT_RU[idx] ?? '';
}

export function TasksPlannerScreen() {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;

  const todayKey = localDateKey();
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [userId, setUserId] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftPriority, setDraftPriority] = useState<BacklogPriority>('medium');
  const [draftAsFocus, setDraftAsFocus] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTaskRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<BacklogPriority>('medium');
  const [editIsFocus, setEditIsFocus] = useState(false);
  const [editDayKey, setEditDayKey] = useState(todayKey);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUserId(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const enabled = Boolean(supabaseOn && userId);

  useEffect(() => {
    if (!enabled) return;
    void purgeOldPlannerTasks().catch(() => {});
  }, [enabled]);

  const tasksQ = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, selectedDay],
    queryFn: () => listPlannerTasks(selectedDay),
    enabled,
  });

  const statsQ = useQuery({
    queryKey: [...PLANNER_STATS_QUERY_KEY],
    queryFn: getPlannerUserStats,
    enabled,
  });

  useEffect(() => {
    setDraftAsFocus(false);
  }, [selectedDay]);

  const stripKeys = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(selectedDay, i - 5));
  }, [selectedDay]);

  const sortedTasks = useMemo(() => sortPlannerTasksForDisplay(tasksQ.data ?? []), [tasksQ.data]);

  const invalidateDay = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, selectedDay] });
  }, [qc, selectedDay]);

  const addMut = useMutation({
    mutationFn: async () => {
      const parsed = applyPlannerTitleDateHints(draftTitle, selectedDay);
      const title = parsed.title.trim();
      if (!title) throw new Error('Введи текст');
      return createPlannerTask({
        day_date: parsed.dayDate,
        title,
        priority: draftPriority,
        is_focus: draftAsFocus || undefined,
      });
    },
    onSuccess: (row) => {
      setDraftTitle('');
      setDraftPriority('medium');
      setDraftAsFocus(false);
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, selectedDay] });
      if (row.day_date !== selectedDay) {
        void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, row.day_date] });
      }
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (e: Error) => alertInfo('Задача', e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({
      id,
      next,
      wasDone,
      dayKey,
    }: {
      id: string;
      next: boolean;
      wasDone: boolean;
      dayKey: string;
    }) => {
      const row = await updatePlannerTask(id, { is_done: next });
      if (!wasDone && next) await adjustPlannerCompletedCount(1);
      if (wasDone && !next) await adjustPlannerCompletedCount(-1);
      return { row, dayKey };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, vars.dayKey] });
      const previous = qc.getQueryData<PlannerTaskRow[]>([...PLANNER_TASKS_QUERY_KEY, vars.dayKey]);
      if (previous) {
        qc.setQueryData(
          [...PLANNER_TASKS_QUERY_KEY, vars.dayKey],
          sortPlannerTasksForDisplay(
            previous.map((t) => (t.id === vars.id ? { ...t, is_done: vars.next } : t))
          )
        );
      }
      return { previous } as { previous: PlannerTaskRow[] | undefined };
    },
    onError: (e, vars, ctx) => {
      const p = ctx as { previous: PlannerTaskRow[] | undefined } | undefined;
      if (p?.previous) qc.setQueryData([...PLANNER_TASKS_QUERY_KEY, vars.dayKey], p.previous);
      alertInfo('Задача', e.message);
    },
    onSuccess: ({ row, dayKey }) => {
      qc.setQueryData<PlannerTaskRow[]>([...PLANNER_TASKS_QUERY_KEY, dayKey], (old) => {
        if (!old) return [row];
        return sortPlannerTasksForDisplay(old.map((t) => (t.id === row.id ? row : t)));
      });
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async ({ id, wasDone }: { id: string; wasDone: boolean }) => {
      await deletePlannerTask(id);
      if (wasDone) await adjustPlannerCompletedCount(-1);
    },
    onSuccess: () => {
      invalidateDay();
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => alertInfo('Удаление', e.message),
  });

  const deferToNextDayMut = useMutation({
    mutationFn: async ({ id, fromDay }: { id: string; fromDay: string }) => {
      const next = addDays(fromDay, 1);
      await updatePlannerTask(id, { day_date: next });
      return { fromDay, toDay: next };
    },
    onSuccess: ({ fromDay, toDay }) => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, fromDay] });
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, toDay] });
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (e: Error) => alertInfo('Перенос', e.message),
  });

  const openTaskEditor = useCallback((t: PlannerTaskRow) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditPriority(t.priority as BacklogPriority);
    setEditIsFocus(Boolean(t.is_focus));
    setEditDayKey(t.day_date);
    setEditorOpen(true);
  }, []);

  const closeTaskEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingTask(null);
  }, []);

  const editStripKeys = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(editDayKey, i - 5));
  }, [editDayKey]);

  const saveTaskEditMut = useMutation({
    mutationFn: async (p: {
      id: string;
      fromDay: string;
      toDay: string;
      title: string;
      priority: BacklogPriority;
      isFocus: boolean;
      wasFocus: boolean;
    }) => {
      const patch: {
        title: string;
        priority: BacklogPriority;
        day_date?: string;
        is_focus?: boolean;
      } = { title: p.title, priority: p.priority };
      if (p.toDay !== p.fromDay) patch.day_date = p.toDay;
      if (p.isFocus !== p.wasFocus) patch.is_focus = p.isFocus;
      return updatePlannerTask(p.id, patch);
    },
    onSuccess: (_d, p) => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, p.fromDay] });
      if (p.toDay !== p.fromDay) {
        void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, p.toDay] });
      }
      closeTaskEditor();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => alertInfo('Задача', e.message),
  });

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const completedTotal = statsQ.data?.completed_count ?? 0;

  return (
    <ScreenCanvas>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                Рабочий стол
              </Text>
              <Text style={[typography.hero, { fontSize: 32, letterSpacing: -0.8, color: colors.text }]}>
                Задачи
              </Text>
            </View>
            <HeaderProfileAvatar marginTop={4} />
          </View>

          {!supabaseOn ? (
            <Text style={[typography.body, { marginTop: spacing.lg, color: colors.textMuted, lineHeight: 22 }]}>
              Добавь EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY — план дня сохранится в Supabase.
            </Text>
          ) : !userId ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md }]}>
                Войди в облако — дневной план и статистика закрытых задач привязаны к аккаунту.
              </Text>
              <Link href={'/cloud' as Href} asChild>
                <Pressable
                  style={{
                    alignSelf: 'flex-start',
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(168,85,247,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.45)',
                  }}
                >
                  <Text style={{ color: ACCENT, fontWeight: '800' }}>Войти в облако</Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <>
              <View
                style={{
                  marginTop: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Pressable
                  onPress={() => router.push('/inbox' as Href)}
                  style={StyleSheet.flatten([
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: 'rgba(168,85,247,0.35)',
                      backgroundColor: 'rgba(168,85,247,0.1)',
                    },
                    webPtr,
                  ])}
                >
                  <Ionicons name="layers-outline" size={18} color={ACCENT} />
                  <Text style={{ marginLeft: 8, fontWeight: '800', color: ACCENT, fontSize: 14 }}>Входящие</Text>
                  <Ionicons name="chevron-forward" size={16} color={ACCENT} style={{ marginLeft: 4 }} />
                </Pressable>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.full,
                    backgroundColor: isLight ? 'rgba(124,58,237,0.08)' : 'rgba(168,85,247,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.28)',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: ACCENT }}>
                    Закрыто всего · {completedTotal}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setSelectedDay((k) => addDays(k, -1));
                    }}
                    hitSlop={12}
                    style={webPtr}
                  >
                    <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '900',
                        color: colors.text,
                        textAlign: 'center',
                      }}
                      numberOfLines={2}
                    >
                      {formatLongDateLabel(selectedDay, todayKey)}
                    </Text>
                    {selectedDay === todayKey ? (
                      <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '700', color: ACCENT }}>Сегодня</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setSelectedDay((k) => addDays(k, 1));
                    }}
                    hitSlop={12}
                    style={webPtr}
                  >
                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                >
                  {stripKeys.map((dk) => {
                    const sel = dk === selectedDay;
                    const isToday = dk === todayKey;
                    return (
                      <Pressable
                        key={dk}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          setSelectedDay(dk);
                        }}
                        style={StyleSheet.flatten([
                          {
                            marginRight: 8,
                            minWidth: 48,
                            paddingVertical: 10,
                            paddingHorizontal: 10,
                            borderRadius: radius.lg,
                            borderWidth: 1,
                            alignItems: 'center',
                            backgroundColor: sel
                              ? 'rgba(168,85,247,0.22)'
                              : isToday
                                ? 'rgba(168,85,247,0.08)'
                                : 'rgba(255,255,255,0.04)',
                            borderColor: sel
                              ? 'rgba(168,85,247,0.55)'
                              : isToday
                                ? 'rgba(168,85,247,0.3)'
                                : 'rgba(255,255,255,0.1)',
                          },
                          webPtr,
                        ])}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '900',
                            color: sel ? colors.text : colors.textMuted,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {Number(dk.split('-')[2])}
                        </Text>
                        <Text
                          style={{
                            marginTop: 2,
                            fontSize: 9,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            color: sel ? ACCENT : colors.textMuted,
                          }}
                        >
                          {weekdayShortRu(dk)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ marginTop: spacing.xl }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '900',
                    letterSpacing: 1.6,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    marginBottom: spacing.sm,
                  }}
                >
                  Быстро добавить
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                    paddingLeft: spacing.md,
                    paddingVertical: 6,
                  }}
                >
                  <TextInput
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                    placeholder="Что сделать в этот день?"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      typography.body,
                      { flex: 1, color: colors.text, paddingVertical: 10, minHeight: 44 },
                    ]}
                    onSubmitEditing={() => {
                      if (draftTitle.trim()) addMut.mutate();
                    }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 6 }}>
                    {PLANNER_PRIORITY_OPTIONS.map((p) => {
                      const on = draftPriority === p.id;
                      const strip = priorityStripStyle(p.id, isLight);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            if (Platform.OS !== 'web') void Haptics.selectionAsync();
                            setDraftPriority(p.id);
                          }}
                          style={StyleSheet.flatten([
                            {
                              marginHorizontal: 3,
                              width: 10,
                              height: 28,
                              borderRadius: 5,
                              backgroundColor: strip.backgroundColor,
                              opacity: on ? 1 : 0.35,
                              borderWidth: on ? 2 : 0,
                              borderColor: '#FAFAFC',
                            },
                            webPtr,
                          ])}
                          accessibilityLabel={p.label}
                        />
                      );
                    })}
                    <Pressable
                      onPress={() => {
                        if (!draftTitle.trim()) {
                          alertInfo('Задача', 'Введи текст');
                          return;
                        }
                        addMut.mutate();
                      }}
                      disabled={addMut.isPending}
                      style={StyleSheet.flatten([
                        {
                          marginLeft: 8,
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: 'rgba(168,85,247,0.35)',
                          borderWidth: 1,
                          borderColor: 'rgba(168,85,247,0.55)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                        webPtr,
                      ])}
                    >
                      {addMut.isPending ? (
                        <ActivityIndicator color="#FAFAFC" size="small" />
                      ) : (
                        <Ionicons name="add" size={28} color="#FAFAFC" />
                      )}
                    </Pressable>
                  </View>
                </View>
                <View
                  style={{
                    marginTop: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Фокус дня</Text>
                    <Text style={{ marginTop: 2, fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                      Одна главная задача — в списке ниже, сверху
                    </Text>
                  </View>
                  <Switch
                    value={draftAsFocus}
                    onValueChange={(v) => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setDraftAsFocus(v);
                    }}
                    trackColor={{ false: colors.border, true: 'rgba(168,85,247,0.45)' }}
                    thumbColor={draftAsFocus ? ACCENT : colors.textMuted}
                  />
                </View>
                <Text style={{ marginTop: 8, fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                  Полоски справа: важный · средний · низкий приоритет
                </Text>
                <Text style={{ marginTop: 6, fontSize: 11, fontWeight: '600', color: colors.textMuted, lineHeight: 16 }}>
                  В названии: завтра, послезавтра, день недели (вторник, пятница) или кратко пн … вс — задача уйдёт на
                  эту дату, слово из заголовка уберется. От выбранного дня на экране считается «завтра» и ближайший
                  будний день.
                </Text>
              </View>

              <Text
                style={{
                  marginTop: spacing.xl,
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.6,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                }}
              >
                На этот день
              </Text>

              {tasksQ.isLoading ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <ActivityIndicator color={ACCENT} />
                </View>
              ) : sortedTasks.length === 0 ? (
                <Text
                  style={[
                    typography.body,
                    { marginTop: spacing.md, color: colors.textMuted, lineHeight: 22 },
                  ]}
                >
                  Пока пусто. Добавь задачу выше — она привязана к выбранной дате. Старые дни очищаются через месяц,
                  счётчик «закрыто» сохраняется.
                </Text>
              ) : (
                <View style={{ marginTop: spacing.md }}>
                  {sortedTasks.map((t) => (
                    <PlannerTaskCard
                      key={t.id}
                      task={t}
                      onToggle={() =>
                        toggleMut.mutate({
                          id: t.id,
                          next: !t.is_done,
                          wasDone: t.is_done,
                          dayKey: selectedDay,
                        })
                      }
                      onEdit={() => openTaskEditor(t)}
                      onDeferNextDay={() => deferToNextDayMut.mutate({ id: t.id, fromDay: t.day_date })}
                      onDelete={() =>
                        confirmDestructive({
                          title: 'Удалить задачу?',
                          message: `«${t.title}»`,
                          onConfirm: () => deleteMut.mutate({ id: t.id, wasDone: t.is_done }),
                        })
                      }
                      busy={
                        toggleMut.isPending ||
                        deleteMut.isPending ||
                        saveTaskEditMut.isPending ||
                        deferToNextDayMut.isPending
                      }
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={closeTaskEditor}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTaskEditor} />
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.lg) + 8,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: '88%',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center',
                marginBottom: spacing.md,
              }}
            />
            <Text style={[typography.title1, { color: colors.text }]}>Редактировать</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
              Текст, приоритет и день. Тап по полоске дней — другая дата. В тексте можно написать завтра, послезавтра
              или день недели — дата подставится автоматически.
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Задача</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Что сделать"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                typography.body,
                {
                  marginTop: 6,
                  minHeight: 72,
                  textAlignVertical: 'top',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Приоритет</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {PLANNER_PRIORITY_OPTIONS.map((p) => {
                const on = editPriority === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setEditPriority(p.id);
                    }}
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      paddingVertical: 12,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      alignItems: 'center',
                      backgroundColor: on ? 'rgba(168,85,247,0.22)' : 'transparent',
                      borderColor: on ? 'rgba(168,85,247,0.55)' : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: on ? ACCENT : colors.textMuted }}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                marginTop: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 4,
              }}
            >
              <Text style={[typography.caption, { color: colors.textMuted }]}>Фокус дня</Text>
              <Switch
                value={editIsFocus}
                onValueChange={(v) => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setEditIsFocus(v);
                }}
                trackColor={{ false: colors.border, true: 'rgba(168,85,247,0.45)' }}
                thumbColor={editIsFocus ? ACCENT : colors.textMuted}
              />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.lg }]}>
              День
            </Text>
            <Text
              style={[typography.body, { marginTop: 4, color: colors.text, fontWeight: '700' }]}
              numberOfLines={2}
            >
              {formatLongDateLabel(editDayKey, todayKey)}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.sm, maxHeight: 56 }}
              contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
            >
              {editStripKeys.map((dk) => {
                const sel = dk === editDayKey;
                const isToday = dk === todayKey;
                return (
                  <Pressable
                    key={dk}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setEditDayKey(dk);
                    }}
                    style={StyleSheet.flatten([
                      {
                        marginRight: 8,
                        minWidth: 48,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: sel
                          ? 'rgba(168,85,247,0.22)'
                          : isToday
                            ? 'rgba(168,85,247,0.08)'
                            : 'rgba(255,255,255,0.04)',
                        borderColor: sel
                          ? 'rgba(168,85,247,0.55)'
                          : isToday
                            ? 'rgba(168,85,247,0.3)'
                            : 'rgba(255,255,255,0.1)',
                      },
                      webPtr,
                    ])}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '900',
                        color: sel ? colors.text : colors.textMuted,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {Number(dk.split('-')[2])}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 9,
                        fontWeight: '800',
                        color: sel ? ACCENT : colors.textMuted,
                      }}
                    >
                      {weekdayShortRu(dk)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
              <Pressable
                onPress={closeTaskEditor}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.textMuted }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!editingTask) return;
                  const t = editTitle.trim();
                  if (!t) {
                    alertInfo('Задача', 'Введи текст');
                    return;
                  }
                  const parsed = applyPlannerTitleDateHints(t, editDayKey);
                  const finalTitle = parsed.title.trim() || 'Задача';
                  saveTaskEditMut.mutate({
                    id: editingTask.id,
                    fromDay: editingTask.day_date,
                    toDay: parsed.dayDate,
                    title: finalTitle,
                    priority: editPriority,
                    isFocus: editIsFocus,
                    wasFocus: Boolean(editingTask.is_focus),
                  });
                }}
                disabled={saveTaskEditMut.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(168,85,247,0.35)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.5)',
                  alignItems: 'center',
                }}
              >
                {saveTaskEditMut.isPending ? (
                  <ActivityIndicator color="#FAFAFC" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#FAFAFC' }}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenCanvas>
  );
}

function PlannerTaskCard({
  task,
  onToggle,
  onEdit,
  onDeferNextDay,
  onDelete,
  busy,
}: {
  task: PlannerTaskRow;
  onToggle: () => void;
  onEdit: () => void;
  onDeferNextDay: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const pr = task.priority as BacklogPriority;
  const strip = priorityStripStyle(pr, isLight);
  const badge = priorityBadgeStyle(pr, isLight);
  const surface = cardSurfaceForPriority(pr, isLight);
  const prOpt = PLANNER_PRIORITY_OPTIONS.find((p) => p.id === pr);
  const titleSize = pr === 'high' ? 18 : 16;
  const titleWeight = pr === 'high' ? ('900' as const) : ('800' as const);
  const isFocus = Boolean(task.is_focus);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: radius.xl,
        overflow: 'hidden',
        marginBottom: spacing.md,
        ...surface,
        ...(isFocus
          ? {
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.5)',
              shadowColor: '#A855F7',
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
            }
          : {}),
      }}
    >
      <View style={{ width: strip.width, backgroundColor: strip.backgroundColor }} />
      <Pressable
        onPress={onToggle}
        disabled={busy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={task.is_done ? 'Снять отметку' : 'Отметить выполненной'}
        style={{
          justifyContent: 'flex-start',
          paddingTop: spacing.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.xs,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: task.is_done ? 0 : 2,
            borderColor: 'rgba(255,255,255,0.25)',
            backgroundColor: task.is_done ? ACCENT : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {task.is_done ? (
            <Ionicons name="checkmark" size={18} color={isLight ? '#FFFFFF' : 'rgba(12,12,16,0.92)'} />
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onEdit}
        disabled={busy}
        style={[
          {
            flex: 1,
            paddingVertical: spacing.md,
            paddingRight: spacing.sm,
            opacity: task.is_done ? 0.72 : 1,
          },
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {},
        ]}
        accessibilityRole="button"
        accessibilityLabel="Редактировать задачу"
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
            {isFocus ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  marginBottom: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.md,
                  backgroundColor: 'rgba(168,85,247,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.4)',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: ACCENT }}>
                  ФОКУС ДНЯ
                </Text>
              </View>
            ) : null}
            <Text
              style={[
                typography.title2,
                {
                  color: colors.text,
                  fontWeight: titleWeight,
                  fontSize: titleSize,
                  textDecorationLine: task.is_done ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={4}
            >
              {task.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <View
                style={{
                  paddingHorizontal: pr === 'high' ? 11 : 9,
                  paddingVertical: pr === 'high' ? 6 : 5,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  backgroundColor: badge.backgroundColor,
                  borderColor: badge.borderColor,
                }}
              >
                <Text
                  style={{
                    fontSize: pr === 'high' ? 12 : 11,
                    fontWeight: '900',
                    color: badge.color,
                  }}
                >
                  {pr === 'high' ? 'ВАЖНО' : prOpt?.short ?? pr}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="create-outline" size={22} color="rgba(196,181,253,0.65)" style={{ marginTop: 2 }} />
        </View>
      </Pressable>
      <Pressable
        onPress={onDeferNextDay}
        disabled={busy}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Перенести на следующий день"
        style={({ pressed }) => ({
          justifyContent: 'flex-start',
          paddingTop: spacing.md,
          paddingRight: 4,
          paddingLeft: 4,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Ionicons name="arrow-forward-circle-outline" size={22} color="rgba(52,211,153,0.95)" />
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={busy}
        hitSlop={12}
        style={({ pressed }) => ({
          justifyContent: 'flex-start',
          paddingTop: spacing.md,
          paddingRight: spacing.md,
          paddingLeft: 4,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="trash-outline" size={20} color="rgba(248,113,113,0.88)" />
      </Pressable>
    </View>
  );
}
