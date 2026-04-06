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
  sortBacklogTasksForDisplay,
  updateBacklogTask,
} from '@/features/tasks/backlogApi';
import { BACKLOG_TASKS_QUERY_KEY, BACKLOG_TYPES_QUERY_KEY } from '@/features/tasks/queryKeys';
import {
  PLANNER_PRIORITY_OPTIONS,
  cardSurfaceForPriority,
  priorityBadgeStyle,
  priorityStripStyle,
} from '@/features/tasks/taskPriorityUi';
import { getSupabase } from '@/lib/supabase';
import { alertInfo, confirmDestructive } from '@/shared/lib/confirmAction';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';

type PriorityFilter = 'all' | BacklogPriority;
/** `none` — только задачи без типа; иначе id типа */
type TypeFilter = 'all' | 'none' | string;

const PRIORITY_OPTIONS = PLANNER_PRIORITY_OPTIONS;

export function BacklogTasksScreen() {
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
      <Stack.Screen options={headerOpts} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: spacing.sm }}>
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
          <Text style={[typography.hero, { fontSize: 28, letterSpacing: -0.8, color: colors.text }]}>
            Идеи без даты
          </Text>
          <Text style={[typography.body, { marginTop: spacing.sm, color: colors.textMuted, lineHeight: 22 }]}>
            Задачи без привязки к дню. Дневной план — на вкладке «Задачи».
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
                <Pressable
                  onPress={openCreate}
                  style={({ pressed }) => ({
                    marginTop: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: radius.xl,
                    backgroundColor: pressed ? 'rgba(168,85,247,0.22)' : 'rgba(168,85,247,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.4)',
                    ...webCursor,
                  })}
                >
                  <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
                  <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 16 }}>Добавить в бэклог</Text>
                </Pressable>

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
                ) : (
                  <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                    {filteredViews.map((t) => {
                      const prOpt = PRIORITY_OPTIONS.find((p) => p.id === t.priority);
                      const pBadge = priorityBadgeStyle(t.priority, isLight);
                      const strip = priorityStripStyle(t.priority, isLight);
                      const titleWeight = t.priority === 'high' ? ('900' as const) : ('800' as const);
                      return (
                        <View
                          key={t.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'stretch',
                            borderRadius: radius.xl,
                            overflow: 'hidden',
                            ...cardSurfaceForPriority(t.priority, isLight),
                          }}
                        >
                          <View style={{ width: strip.width, backgroundColor: strip.backgroundColor }} />
                          <Pressable
                            onPress={() => openEdit(t)}
                            style={({ pressed }) => [
                              {
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: spacing.sm,
                                paddingVertical: spacing.md,
                                paddingLeft: spacing.md,
                                paddingRight: spacing.xs,
                                opacity: pressed ? 0.92 : 1,
                              },
                              webCursor,
                            ]}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[
                                  typography.title2,
                                  {
                                    color: colors.text,
                                    fontWeight: titleWeight,
                                    fontSize: t.priority === 'high' ? 18 : 17,
                                  },
                                ]}
                                numberOfLines={3}
                              >
                                {t.title}
                              </Text>
                              {t.description ? (
                                <Text
                                  style={[
                                    typography.caption,
                                    { color: colors.textMuted, marginTop: 6, lineHeight: 18 },
                                  ]}
                                  numberOfLines={4}
                                >
                                  {t.description}
                                </Text>
                              ) : null}
                            </View>
                            <View
                              style={{
                                alignItems: 'flex-end',
                                justifyContent: 'flex-start',
                                gap: 8,
                                maxWidth: 118,
                                paddingTop: 2,
                              }}
                            >
                              <View
                                style={{
                                  paddingHorizontal: t.priority === 'high' ? 11 : 9,
                                  paddingVertical: t.priority === 'high' ? 6 : 5,
                                  borderRadius: radius.md,
                                  borderWidth: 1,
                                  backgroundColor: pBadge.backgroundColor,
                                  borderColor: pBadge.borderColor,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: t.priority === 'high' ? 12 : 11,
                                    fontWeight: '900',
                                    color: pBadge.color,
                                    textAlign: 'right',
                                  }}
                                  numberOfLines={1}
                                >
                                  {t.priority === 'high' ? 'ВАЖНО' : prOpt?.short ?? prOpt?.label ?? t.priority}
                                </Text>
                              </View>
                              {t.typeName ? (
                                <View
                                  style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: radius.full,
                                    backgroundColor: isLight ? 'rgba(15,17,24,0.04)' : 'rgba(255,255,255,0.05)',
                                    borderWidth: 1,
                                    borderColor: isLight ? 'rgba(15,17,24,0.1)' : 'rgba(255,255,255,0.1)',
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '600',
                                      color: colors.textMuted,
                                      textAlign: 'right',
                                    }}
                                    numberOfLines={2}
                                  >
                                    {t.typeName}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              confirmDestructive({
                                title: 'Удалить задачу?',
                                message: `«${t.title}»`,
                                onConfirm: () => deleteMut.mutate(t.id),
                              })
                            }
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
                    })}
                  </View>
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
    </ScreenCanvas>
  );
}
