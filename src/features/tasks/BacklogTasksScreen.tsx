import { Ionicons } from '@expo/vector-icons';
import type { PostgrestError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, Link, Stack } from 'expo-router';
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
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import type { BacklogPriority, BacklogTaskView } from '@/features/tasks/backlog.types';
import {
  createBacklogTask,
  createBacklogType,
  deleteBacklogTask,
  listBacklogTasks,
  listBacklogTypes,
  mergeTasksWithTypes,
  scheduleBacklogTasksToDay,
  sortBacklogTasksForDisplay,
  updateBacklogTask,
} from '@/features/tasks/backlogApi';
import { BacklogHero } from '@/features/tasks/BacklogHero';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { BACKLOG_TASKS_QUERY_KEY, BACKLOG_TYPES_QUERY_KEY, PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { PLANNER_PRIORITY_OPTIONS, priorityBadgeStyle } from '@/features/tasks/taskPriorityUi';
import { getSupabase } from '@/lib/supabase';
import { alertInfo, confirmDestructive } from '@/shared/lib/confirmAction';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';

type PriorityFilter = 'all' | BacklogPriority;
/** `none` — только задачи без типа; иначе id типа */
type TypeFilter = 'all' | 'none' | string;

const PRIORITY_OPTIONS = PLANNER_PRIORITY_OPTIONS;

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

function shortTaskId(id: string): string {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function relativeBacklogAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'сейчас';
  if (m < 60) return `${m} мин`;
  if (h < 24) return `${h} ч`;
  if (d === 1) return 'вчера';
  if (d < 7) return `${d} дн.`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} нед.`;
  return new Date(createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const TYPE_PILL_BACKGROUNDS = [
  'rgba(168,85,247,0.38)',
  'rgba(59,130,246,0.38)',
  'rgba(16,185,129,0.34)',
  'rgba(236,72,153,0.32)',
  'rgba(245,158,11,0.34)',
];

function typePillBackground(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TYPE_PILL_BACKGROUNDS[h % TYPE_PILL_BACKGROUNDS.length] ?? TYPE_PILL_BACKGROUNDS[0];
}

export type BacklogTasksScreenProps = {
  /** `tab` — отдельная вкладка; `stack` — экран из стека (с шапкой «Назад»). */
  variant?: 'stack' | 'tab';
};

export function BacklogTasksScreen({ variant = 'stack' }: BacklogTasksScreenProps) {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;

  const [userId, setUserId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPriority, setDraftPriority] = useState<BacklogPriority>('medium');
  const [draftTypeId, setDraftTypeId] = useState<string | null>(null);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const todayKey = localDateKey();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleBatch, setScheduleBatch] = useState<BacklogTaskView[]>([]);
  const [scheduleDayKey, setScheduleDayKey] = useState(todayKey);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [backlogView, setBacklogView] = useState<'table' | 'kanban'>('table');

  const scheduleStripKeys = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(scheduleDayKey, i - 5)),
    [scheduleDayKey]
  );

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

  const typesQ = useQuery({
    queryKey: [...BACKLOG_TYPES_QUERY_KEY],
    queryFn: listBacklogTypes,
    enabled,
  });

  const tasksQ = useQuery({
    queryKey: [...BACKLOG_TASKS_QUERY_KEY],
    queryFn: listBacklogTasks,
    enabled,
  });

  const views = useMemo(() => {
    const types = typesQ.data ?? [];
    const raw = tasksQ.data ?? [];
    return sortBacklogTasksForDisplay(mergeTasksWithTypes(raw, types));
  }, [tasksQ.data, typesQ.data]);

  const filteredViews = useMemo(() => {
    let list = views;
    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (typeFilter === 'none') {
      list = list.filter((t) => !t.type_id);
    } else if (typeFilter !== 'all') {
      list = list.filter((t) => t.type_id === typeFilter);
    }
    return list;
  }, [views, priorityFilter, typeFilter]);

  const { width: windowWidth } = useWindowDimensions();

  const kanbanColumns = useMemo(() => {
    const types = typesQ.data ?? [];
    const cols: { key: string; title: string; tasks: BacklogTaskView[] }[] = [
      { key: 'none', title: 'Без типа', tasks: filteredViews.filter((t) => !t.type_id) },
    ];
    for (const ty of types) {
      cols.push({ key: ty.id, title: ty.name, tasks: filteredViews.filter((t) => t.type_id === ty.id) });
    }
    return cols;
  }, [filteredViews, typesQ.data]);

  const invalidateAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...BACKLOG_TYPES_QUERY_KEY] });
    void qc.invalidateQueries({ queryKey: [...BACKLOG_TASKS_QUERY_KEY] });
  }, [qc]);

  const createTypeMut = useMutation({
    mutationFn: (name: string) => createBacklogType(name),
    onSuccess: (created) => {
      invalidateAll();
      setNewTypeOpen(false);
      setNewTypeName('');
      setDraftTypeId(created.id);
      setTypePickerOpen(false);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => {
      const code = typeof e === 'object' && e && 'code' in e ? (e as PostgrestError).code : undefined;
      const msg =
        code === '23505' || e.message.includes('duplicate') || e.message.includes('unique')
          ? 'Тип с таким именем уже есть'
          : e.message;
      alertInfo('Тип задачи', msg);
    },
  });

  const saveTaskMut = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updateBacklogTask(editingId, {
          title: draftTitle,
          description: draftDescription,
          type_id: draftTypeId,
          priority: draftPriority,
        });
      }
      return createBacklogTask({
        title: draftTitle,
        description: draftDescription || null,
        type_id: draftTypeId,
        priority: draftPriority,
      });
    },
    onSuccess: () => {
      invalidateAll();
      closeEditor();
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (e: Error) => alertInfo('Задача', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBacklogTask(id),
    onSuccess: () => {
      invalidateAll();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => alertInfo('Удаление', e.message),
  });

  const scheduleMut = useMutation({
    mutationFn: async ({ tasks, day }: { tasks: BacklogTaskView[]; day: string }) => {
      await scheduleBacklogTasksToDay(
        tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
        day
      );
    },
    onSuccess: () => {
      invalidateAll();
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY] });
      setScheduleOpen(false);
      setScheduleBatch([]);
      setSelectMode(false);
      setSelectedIds(new Set());
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => alertInfo('Перенос в план', e.message),
  });

  const openScheduleForTasks = useCallback(
    (tasks: BacklogTaskView[]) => {
      if (tasks.length === 0) return;
      setScheduleBatch(tasks);
      setScheduleDayKey(todayKey);
      setScheduleOpen(true);
    },
    [todayKey]
  );

  const toggleTaskSelected = useCallback((id: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setDraftTitle('');
    setDraftDescription('');
    setDraftPriority('medium');
    setDraftTypeId(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((t: BacklogTaskView) => {
    setEditingId(t.id);
    setDraftTitle(t.title);
    setDraftDescription(t.description ?? '');
    setDraftPriority(t.priority);
    setDraftTypeId(t.type_id);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingId(null);
  }, []);

  const typeLabel = useMemo(() => {
    if (!draftTypeId) return 'Без типа';
    const t = (typesQ.data ?? []).find((x) => x.id === draftTypeId);
    return t?.name ?? 'Тип';
  }, [draftTypeId, typesQ.data]);

  const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const headerOpts = useMemo(
    () => ({
      headerShown: true as const,
      title: 'Бэклог',
      headerBackTitle: 'План',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
    }),
    [colors.bg, colors.text]
  );

  return (
    <ScreenCanvas>
      {variant === 'stack' ? <Stack.Screen options={headerOpts} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: variant === 'tab' ? insets.top + spacing.lg : insets.top + spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + (selectMode && selectedIds.size > 0 ? 160 : 120),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: spacing.md }}>
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
          <Text style={[typography.hero, { fontSize: 26, letterSpacing: -0.65, color: colors.text }]}>
            {variant === 'tab' ? 'Входящие' : 'Идеи без даты'}
          </Text>
        </View>

        {!supabaseOn ? (
          <Text style={[typography.body, { marginTop: spacing.lg, color: colors.textMuted, lineHeight: 22 }]}>
            Добавь EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY — тогда задачи сохранятся в облаке.
          </Text>
        ) : !userId ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md }]}>
              Войди в облако — бэклог привязан к аккаунту и хранится в Supabase.
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
            <BacklogHero backlogCount={views.length} />

            <View
              style={{
                marginTop: spacing.md,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Pressable
                onPress={openCreate}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: radius.xl,
                  backgroundColor: pressed ? 'rgba(168,85,247,0.22)' : 'rgba(168,85,247,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.4)',
                  ...webCursor,
                })}
              >
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
                <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 15 }}>Добавить</Text>
              </Pressable>

              <View
                style={{
                  flexDirection: 'row',
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setBacklogView('table');
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: backlogView === 'table' ? 'rgba(168,85,247,0.2)' : 'transparent',
                    ...webCursor,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: backlogView === 'table' ? '800' : '600',
                      color: backlogView === 'table' ? ACCENT : colors.textMuted,
                    }}
                  >
                    Таблица
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setBacklogView('kanban');
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: backlogView === 'kanban' ? 'rgba(168,85,247,0.2)' : 'transparent',
                    ...webCursor,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: backlogView === 'kanban' ? '800' : '600',
                      color: backlogView === 'kanban' ? ACCENT : colors.textMuted,
                    }}
                  >
                    Канбан
                  </Text>
                </Pressable>
              </View>

              <View style={{ flex: 1, minWidth: 4 }} />

              {!tasksQ.isLoading && !typesQ.isLoading && views.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setSelectMode((m) => {
                        if (m) setSelectedIds(new Set());
                        return !m;
                      });
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: selectMode ? 'rgba(168,85,247,0.55)' : colors.border,
                      backgroundColor: selectMode ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.04)',
                      opacity: pressed ? 0.88 : 1,
                      ...webCursor,
                    })}
                  >
                    <Text style={{ fontWeight: '800', color: selectMode ? ACCENT : colors.textMuted, fontSize: 13 }}>
                      {selectMode ? 'Готово' : 'Выбрать'}
                    </Text>
                  </Pressable>
                  {selectMode ? (
                    <Pressable
                      onPress={() => {
                        const ids = filteredViews.map((t) => t.id);
                        setSelectedIds((prev) => {
                          const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
                          return allOn ? new Set() : new Set(ids);
                        });
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        opacity: pressed ? 0.88 : 1,
                        ...webCursor,
                      })}
                    >
                      <Text style={{ fontWeight: '700', color: colors.textMuted, fontSize: 13 }}>Все в фильтре</Text>
                    </Pressable>
                  ) : null}
                  {selectMode && selectedIds.size > 0 ? (
                    <Pressable
                      onPress={() => {
                        const list = filteredViews.filter((t) => selectedIds.has(t.id));
                        openScheduleForTasks(list);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: 'rgba(52,211,153,0.45)',
                        backgroundColor: 'rgba(52,211,153,0.12)',
                        opacity: pressed ? 0.88 : 1,
                        ...webCursor,
                      })}
                    >
                      <Text style={{ fontWeight: '800', color: 'rgba(52,211,153,0.98)', fontSize: 13 }}>
                        На день ({selectedIds.size})
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

                {!tasksQ.isLoading && !typesQ.isLoading && views.length > 0 ? (
                  <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          letterSpacing: 1.2,
                          textTransform: 'uppercase',
                          fontWeight: '800',
                          fontSize: 10,
                        },
                      ]}
                    >
                      Фильтр по приоритету
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}
                    >
                      {[
                        { id: 'all' as const, label: 'Все' },
                        ...PRIORITY_OPTIONS.map((p) => ({ id: p.id, label: p.label })),
                      ].map((chip) => {
                        const active =
                          chip.id === 'all' ? priorityFilter === 'all' : priorityFilter === chip.id;
                        return (
                          <Pressable
                            key={chip.id}
                            onPress={() => {
                              if (Platform.OS !== 'web') void Haptics.selectionAsync();
                              setPriorityFilter(chip.id === 'all' ? 'all' : chip.id);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: radius.full,
                              borderWidth: 1,
                              backgroundColor: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                              borderColor: active ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
                              ...webCursor,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: active ? '800' : '600',
                                color: active ? colors.text : colors.textMuted,
                              }}
                            >
                              {chip.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          letterSpacing: 1.2,
                          textTransform: 'uppercase',
                          fontWeight: '800',
                          fontSize: 10,
                          marginTop: 4,
                        },
                      ]}
                    >
                      Фильтр по типу
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}
                    >
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          setTypeFilter('all');
                        }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.full,
                          borderWidth: 1,
                          backgroundColor: typeFilter === 'all' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                          borderColor: typeFilter === 'all' ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
                          ...webCursor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: typeFilter === 'all' ? '800' : '600',
                            color: typeFilter === 'all' ? colors.text : colors.textMuted,
                          }}
                        >
                          Все типы
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          setTypeFilter('none');
                        }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.full,
                          borderWidth: 1,
                          backgroundColor: typeFilter === 'none' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                          borderColor: typeFilter === 'none' ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
                          ...webCursor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: typeFilter === 'none' ? '800' : '600',
                            color: typeFilter === 'none' ? colors.text : colors.textMuted,
                          }}
                        >
                          Без типа
                        </Text>
                      </Pressable>
                      {(typesQ.data ?? []).map((ty) => {
                        const active = typeFilter === ty.id;
                        return (
                          <Pressable
                            key={ty.id}
                            onPress={() => {
                              if (Platform.OS !== 'web') void Haptics.selectionAsync();
                              setTypeFilter(ty.id);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: radius.full,
                              borderWidth: 1,
                              backgroundColor: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                              borderColor: active ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
                              maxWidth: 220,
                              ...webCursor,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: active ? '800' : '600',
                                color: active ? colors.text : colors.textMuted,
                              }}
                              numberOfLines={1}
                            >
                              {ty.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {tasksQ.isLoading || typesQ.isLoading ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator color={ACCENT} />
                  </View>
                ) : views.length === 0 ? (
                  <Text
                    style={[
                      typography.body,
                      { marginTop: spacing.xl, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
                    ]}
                  >
                    В бэклоге пока пусто. Задачи с типом и приоритетом сохраняются в Supabase.
                  </Text>
                ) : filteredViews.length === 0 ? (
                  <Text
                    style={[
                      typography.body,
                      { marginTop: spacing.lg, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
                    ]}
                  >
                    Нет задач по выбранным фильтрам. Сбрось фильтр «Все» / «Все типы».
                  </Text>
                ) : backlogView === 'table' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: spacing.lg }}
                    contentContainerStyle={{ paddingBottom: spacing.md }}
                  >
                    <View style={{ minWidth: Math.max(580, windowWidth - spacing.xl * 2) }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 6,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        }}
                      >
                        {selectMode ? <View style={{ width: 36 }} /> : null}
                        <Text
                          style={{
                            flex: 1,
                            minWidth: 200,
                            fontSize: 11,
                            fontWeight: '800',
                            color: colors.textMuted,
                            letterSpacing: 0.4,
                          }}
                        >
                          Задача
                        </Text>
                        <Text
                          style={{
                            width: 112,
                            fontSize: 11,
                            fontWeight: '800',
                            color: colors.textMuted,
                            letterSpacing: 0.4,
                          }}
                        >
                          Тип
                        </Text>
                        <Text
                          style={{
                            width: 80,
                            fontSize: 11,
                            fontWeight: '800',
                            color: colors.textMuted,
                            letterSpacing: 0.4,
                          }}
                        >
                          Приоритет
                        </Text>
                        <Text
                          style={{
                            width: 72,
                            fontSize: 11,
                            fontWeight: '800',
                            color: colors.textMuted,
                            letterSpacing: 0.4,
                          }}
                        >
                          Когда
                        </Text>
                        {!selectMode ? (
                          <View style={{ width: 100, flexDirection: 'row', justifyContent: 'flex-end' }} />
                        ) : (
                          <View style={{ width: 4 }} />
                        )}
                      </View>
                      {filteredViews.map((t) => {
                        const prOpt = PRIORITY_OPTIONS.find((p) => p.id === t.priority);
                        const pBadge = priorityBadgeStyle(t.priority, isLight);
                        const typeSeed = t.type_id ?? t.typeName ?? 'none';
                        return (
                          <View
                            key={t.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 12,
                              paddingHorizontal: 6,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: colors.border,
                            }}
                          >
                            {selectMode ? (
                              <Pressable
                                onPress={() => toggleTaskSelected(t.id)}
                                style={{ width: 36, justifyContent: 'center' }}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: selectedIds.has(t.id) }}
                              >
                                <Ionicons
                                  name={selectedIds.has(t.id) ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={24}
                                  color={selectedIds.has(t.id) ? ACCENT : colors.textMuted}
                                />
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={() => (selectMode ? toggleTaskSelected(t.id) : openEdit(t))}
                              style={({ pressed }) => [
                                {
                                  flex: 1,
                                  minWidth: 200,
                                  opacity: pressed ? 0.88 : 1,
                                  paddingRight: spacing.xs,
                                },
                                webCursor,
                              ]}
                            >
                              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, fontWeight: '700' }]}>
                                {shortTaskId(t.id)}
                              </Text>
                              <Text
                                style={[
                                  typography.body,
                                  {
                                    color: colors.text,
                                    fontWeight: t.priority === 'high' ? '800' : '700',
                                    marginTop: 2,
                                    fontSize: 15,
                                  },
                                ]}
                                numberOfLines={2}
                              >
                                {t.title}
                              </Text>
                            </Pressable>
                            <View style={{ width: 112, justifyContent: 'center' }}>
                              {t.typeName ? (
                                <View
                                  style={{
                                    alignSelf: 'flex-start',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: radius.full,
                                    backgroundColor: typePillBackground(typeSeed),
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FAFAFC' }} numberOfLines={1}>
                                    {t.typeName}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>—</Text>
                              )}
                            </View>
                            <View style={{ width: 80, justifyContent: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: pBadge.color }} numberOfLines={1}>
                                {prOpt?.label ?? t.priority}
                              </Text>
                            </View>
                            <Text
                              style={{
                                width: 72,
                                fontSize: 11,
                                color: colors.textMuted,
                                fontWeight: '600',
                              }}
                              numberOfLines={1}
                            >
                              {relativeBacklogAge(t.created_at)}
                            </Text>
                            {!selectMode ? (
                              <View style={{ width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                <Pressable
                                  onPress={() => openScheduleForTasks([t])}
                                  hitSlop={8}
                                  accessibilityRole="button"
                                  accessibilityLabel="Перенести в план на день"
                                  style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.65 : 1, ...webCursor })}
                                >
                                  <Ionicons name="calendar-outline" size={20} color="rgba(52,211,153,0.95)" />
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    if (Platform.OS !== 'web') {
                                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    }
                                    deleteMut.mutate(t.id);
                                  }}
                                  disabled={deleteMut.isPending}
                                  hitSlop={8}
                                  accessibilityRole="button"
                                  accessibilityLabel="Выполнено, убрать из входящих"
                                  style={({ pressed }) => ({
                                    padding: 6,
                                    opacity: deleteMut.isPending ? 0.35 : pressed ? 0.65 : 1,
                                    ...webCursor,
                                  })}
                                >
                                  <Ionicons name="checkmark-circle-outline" size={22} color="rgba(129,140,248,0.98)" />
                                </Pressable>
                                <Pressable
                                  onPress={() =>
                                    confirmDestructive({
                                      title: 'Удалить задачу?',
                                      message: `«${t.title}»`,
                                      onConfirm: () => deleteMut.mutate(t.id),
                                    })
                                  }
                                  hitSlop={8}
                                  style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1, ...webCursor })}
                                >
                                  <Ionicons name="trash-outline" size={18} color="rgba(248,113,113,0.88)" />
                                </Pressable>
                              </View>
                            ) : (
                              <View style={{ width: 4 }} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: spacing.lg }}
                    contentContainerStyle={{ flexDirection: 'row', gap: 12, paddingBottom: spacing.md }}
                  >
                    {kanbanColumns.map((col) => (
                      <View
                        key={col.key}
                        style={{
                          width: 276,
                          borderRadius: radius.xl,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: spacing.sm,
                          backgroundColor: isLight ? colors.bg : 'rgba(20,20,26,0.96)',
                        }}
                      >
                        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', fontSize: 10, letterSpacing: 1 }]}>
                          {col.title.toUpperCase()}
                        </Text>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '900', marginTop: 4, marginBottom: spacing.sm }]}>
                          {col.tasks.length} шт.
                        </Text>
                        {col.tasks.map((t) => {
                          const prOpt = PRIORITY_OPTIONS.find((p) => p.id === t.priority);
                          const pBadge = priorityBadgeStyle(t.priority, isLight);
                          const typeSeed = t.type_id ?? t.typeName ?? 'none';
                          return (
                            <View
                              key={t.id}
                              style={{
                                marginBottom: spacing.sm,
                                borderRadius: radius.lg,
                                borderWidth: 1,
                                borderColor: colors.border,
                                padding: spacing.sm,
                                backgroundColor: isLight ? 'rgba(15,17,24,0.02)' : 'rgba(255,255,255,0.03)',
                              }}
                            >
                              <Pressable
                                onPress={() => (selectMode ? toggleTaskSelected(t.id) : openEdit(t))}
                                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, webCursor]}
                              >
                                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>{shortTaskId(t.id)}</Text>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '700', marginTop: 4 }]} numberOfLines={3}>
                                  {t.title}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                                  {t.typeName ? (
                                    <View
                                      style={{
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: radius.full,
                                        backgroundColor: typePillBackground(typeSeed),
                                      }}
                                    >
                                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#FAFAFC' }} numberOfLines={1}>
                                        {t.typeName}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: pBadge.color }}>{prOpt?.label ?? t.priority}</Text>
                                  <View style={{ flex: 1, minWidth: 4 }} />
                                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{relativeBacklogAge(t.created_at)}</Text>
                                </View>
                              </Pressable>
                              {selectMode ? (
                                <Pressable
                                  onPress={() => toggleTaskSelected(t.id)}
                                  style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                >
                                  <Ionicons
                                    name={selectedIds.has(t.id) ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={22}
                                    color={selectedIds.has(t.id) ? ACCENT : colors.textMuted}
                                  />
                                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Выбрать для переноса</Text>
                                </Pressable>
                              ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 10 }}>
                                  <Pressable onPress={() => openScheduleForTasks([t])} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.65 : 1, ...webCursor })}>
                                    <Ionicons name="calendar-outline" size={20} color="rgba(52,211,153,0.95)" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      if (Platform.OS !== 'web') {
                                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                      }
                                      deleteMut.mutate(t.id);
                                    }}
                                    disabled={deleteMut.isPending}
                                    style={({ pressed }) => ({
                                      padding: 6,
                                      opacity: deleteMut.isPending ? 0.35 : pressed ? 0.65 : 1,
                                      ...webCursor,
                                    })}
                                  >
                                    <Ionicons name="checkmark-circle-outline" size={20} color="rgba(129,140,248,0.98)" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() =>
                                      confirmDestructive({
                                        title: 'Удалить задачу?',
                                        message: `«${t.title}»`,
                                        onConfirm: () => deleteMut.mutate(t.id),
                                      })
                                    }
                                    style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1, ...webCursor })}
                                  >
                                    <Ionicons name="trash-outline" size={18} color="rgba(248,113,113,0.88)" />
                                  </Pressable>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                )}
          </>
        )}
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={closeEditor}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} />
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
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md }} />
            <Text style={[typography.title1, { color: colors.text }]}>
              {editingId ? 'Редактировать' : 'Новая задача'}
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Заголовок</Text>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Что сделать"
              placeholderTextColor={colors.textMuted}
              style={[
                typography.body,
                {
                  marginTop: 6,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Описание</Text>
            <TextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Детали (необязательно)"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                typography.body,
                {
                  marginTop: 6,
                  minHeight: 80,
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
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {PRIORITY_OPTIONS.map((p) => {
                const on = draftPriority === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setDraftPriority(p.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      alignItems: 'center',
                      backgroundColor: on ? 'rgba(168,85,247,0.2)' : 'transparent',
                      borderColor: on ? 'rgba(168,85,247,0.5)' : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: on ? ACCENT : colors.textMuted }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Тип</Text>
            <Pressable
              onPress={() => setTypePickerOpen(true)}
              style={{
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={[typography.body, { color: colors.text }]}>{typeLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.lg }}>
              <Pressable
                onPress={closeEditor}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.textMuted }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!draftTitle.trim()) {
                    alertInfo('Задача', 'Введи заголовок');
                    return;
                  }
                  saveTaskMut.mutate();
                }}
                disabled={saveTaskMut.isPending}
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
                {saveTaskMut.isPending ? (
                  <ActivityIndicator color="#FAFAFC" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#FAFAFC' }}>{editingId ? 'Сохранить' : 'Создать'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={typePickerOpen} animationType="fade" transparent onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }} onPress={() => setTypePickerOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.lg, maxHeight: '70%', borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.md }]}>Тип задачи</Text>
            <Pressable
              onPress={() => {
                setDraftTypeId(null);
                setTypePickerOpen(false);
              }}
              style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Без типа</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 280 }}>
              {(typesQ.data ?? []).map((ty) => (
                <Pressable
                  key={ty.id}
                  onPress={() => {
                    setDraftTypeId(ty.id);
                    setTypePickerOpen(false);
                  }}
                  style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{ty.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => {
                setNewTypeOpen(true);
              }}
              style={{
                marginTop: spacing.md,
                paddingVertical: 14,
                borderRadius: radius.md,
                backgroundColor: 'rgba(168,85,247,0.15)',
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.4)',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: ACCENT, fontWeight: '800' }}>+ Создать тип</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={newTypeOpen} animationType="fade" transparent onRequestClose={() => setNewTypeOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }} onPress={() => setNewTypeOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.title2, { color: colors.text }]}>Новый тип</Text>
            <TextInput
              value={newTypeName}
              onChangeText={setNewTypeName}
              placeholder="Например: Разработка"
              placeholderTextColor={colors.textMuted}
              style={[
                typography.body,
                {
                  marginTop: spacing.md,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Pressable
                onPress={() => setNewTypeOpen(false)}
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const n = newTypeName.trim();
                  if (!n) {
                    alertInfo('Тип', 'Введи название');
                    return;
                  }
                  createTypeMut.mutate(n);
                }}
                disabled={createTypeMut.isPending}
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, backgroundColor: 'rgba(168,85,247,0.3)' }}
              >
                {createTypeMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#FAFAFC', fontWeight: '800' }}>Создать</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={scheduleOpen} animationType="slide" transparent onRequestClose={() => setScheduleOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScheduleOpen(false)} />
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
            <Text style={[typography.title1, { color: colors.text }]}>День в плане</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
              {scheduleBatch.length === 1
                ? `Одна задача: «${scheduleBatch[0]?.title ?? ''}»`
                : `${scheduleBatch.length} задач — появятся на выбранной дате во вкладке «Задачи».`}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setScheduleDayKey((k) => addDays(k, -1));
                }}
                hitSlop={12}
                style={webCursor}
              >
                <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                  {formatLongDateLabel(scheduleDayKey, todayKey)}
                </Text>
                {scheduleDayKey === todayKey ? (
                  <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '700', color: ACCENT }}>Сегодня</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setScheduleDayKey((k) => addDays(k, 1));
                }}
                hitSlop={12}
                style={webCursor}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.sm, maxHeight: 56 }}
              contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
            >
              {scheduleStripKeys.map((dk) => {
                const sel = dk === scheduleDayKey;
                const isToday = dk === todayKey;
                return (
                  <Pressable
                    key={dk}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setScheduleDayKey(dk);
                    }}
                    style={{
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
                      ...webCursor,
                    }}
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

            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.lg }}>
              <Pressable
                onPress={() => setScheduleOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.textMuted }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (scheduleBatch.length === 0) return;
                  scheduleMut.mutate({ tasks: scheduleBatch, day: scheduleDayKey });
                }}
                disabled={scheduleMut.isPending || scheduleBatch.length === 0}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(52,211,153,0.28)',
                  borderWidth: 1,
                  borderColor: 'rgba(52,211,153,0.5)',
                  alignItems: 'center',
                }}
              >
                {scheduleMut.isPending ? (
                  <ActivityIndicator color="#FAFAFC" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#FAFAFC' }}>
                    {scheduleBatch.length === 1 ? 'В план' : `В план (${scheduleBatch.length})`}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenCanvas>
  );
}
