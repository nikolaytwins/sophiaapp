import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import {
  createPlannerCalendarEvent,
  deletePlannerCalendarEvent,
  getPlannerWeekNotes,
  listPlannerCalendarEventsForGrid,
  listPlannerCalendarEventsForWeek,
  upsertPlannerWeekNotes,
} from '@/features/calendar/calendarApi';
import { monthCalendarRows, monthGridRange, shiftCalendarMonth } from '@/features/calendar/calendarMonthLogic';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';
import { addDays, localDateKey, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { listMergedWeekFocus, listPlannerTasksInDateRange } from '@/features/tasks/plannerApi';
import type { PlannerWeekFocusListItem } from '@/features/tasks/planner.types';
import {
  PLANNER_CALENDAR_EVENTS_QUERY_KEY,
  PLANNER_TASKS_RANGE_QUERY_KEY,
  PLANNER_WEEK_FOCUS_QUERY_KEY,
  PLANNER_WEEK_NOTES_QUERY_KEY,
} from '@/features/tasks/queryKeys';
import { invalidatePlannerCalendarQueries } from '@/features/tasks/plannerWeekInvalidation';
import { getSupabase } from '@/lib/supabase';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { GlassCard } from '@/shared/ui/GlassCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const LG_MIN = 1024;
const CONTENT_MAX = 1280;
const DESKTOP_PAD_X = 28;
const DOT_TASK = '#A855F7';
const DOT_EVENT = '#38BDF8';

function monthTitleRu(year: number, month1: number): string {
  const d = new Date(year, month1 - 1, 1);
  const s = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function weekRangeLabelRu(anchorDateKey: string): string {
  const mon = startOfWeekMondayKey(anchorDateKey);
  const sun = addDays(mon, 6);
  const [y1, m1, d1] = mon.split('-').map(Number);
  const [y2, m2, d2] = sun.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const b = new Date(y2, m2 - 1, d2).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${a} — ${b}`;
}

function shortWeekdayRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const idx = day === 0 ? 6 : day - 1;
  return WEEKDAY_SHORT_RU[idx] ?? '';
}

export function CalendarScreen() {
  const { colors, spacing, typography, brand, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= LG_MIN;

  const todayKey = useMemo(() => localDateKey(), []);
  const [viewYm, setViewYm] = useState(() => {
    const [y, m, da] = todayKey.split('-').map(Number);
    return { y, m };
  });
  const [weekAnchorKey, setWeekAnchorKey] = useState(todayKey);
  const [dayModalKey, setDayModalKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newWeekEventTitle, setNewWeekEventTitle] = useState('');
  const [newWeekEventDate, setNewWeekEventDate] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseOn = useSupabaseConfigured;

  const { gridStart, gridEnd } = useMemo(() => monthGridRange(viewYm.y, viewYm.m), [viewYm]);
  const rows = useMemo(() => monthCalendarRows(viewYm.y, viewYm.m), [viewYm]);
  const weekMonday = startOfWeekMondayKey(weekAnchorKey);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUserId(null);
      return;
    }
    void sb.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(
    () => () => {
      if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    },
    []
  );

  const enabled = Boolean(supabaseOn && userId);

  const eventsGridQ = useQuery({
    queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd],
    queryFn: () => listPlannerCalendarEventsForGrid(gridStart, gridEnd),
    enabled,
  });

  const tasksRangeQ = useQuery({
    queryKey: [...PLANNER_TASKS_RANGE_QUERY_KEY, gridStart, gridEnd],
    queryFn: () => listPlannerTasksInDateRange(gridStart, gridEnd),
    enabled,
  });

  const weekEventsQ = useQuery({
    queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, 'week', weekMonday],
    queryFn: () => listPlannerCalendarEventsForWeek(weekAnchorKey),
    enabled,
  });

  const weekFocusQ = useQuery({
    queryKey: [...PLANNER_WEEK_FOCUS_QUERY_KEY, weekMonday],
    queryFn: () => listMergedWeekFocus(weekAnchorKey),
    enabled,
  });

  const weekNotesQ = useQuery({
    queryKey: [...PLANNER_WEEK_NOTES_QUERY_KEY, weekMonday],
    queryFn: () => getPlannerWeekNotes(weekAnchorKey),
    enabled,
  });

  useEffect(() => {
    if (!weekNotesQ.isLoading) setNotesDraft(weekNotesQ.data?.body ?? '');
  }, [weekMonday, weekNotesQ.isLoading, weekNotesQ.data?.body]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasksRangeQ.data ?? []) {
      map.set(t.day_date, (map.get(t.day_date) ?? 0) + 1);
    }
    return map;
  }, [tasksRangeQ.data]);

  const datedEventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of eventsGridQ.data ?? []) {
      if (e.event_date) {
        map.set(e.event_date, (map.get(e.event_date) ?? 0) + 1);
      }
    }
    return map;
  }, [eventsGridQ.data]);

  const createEventMut = useMutation({
    mutationFn: createPlannerCalendarEvent,
    onSuccess: () => {
      invalidatePlannerCalendarQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd] });
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_RANGE_QUERY_KEY, gridStart, gridEnd] });
    },
  });

  const deleteEventMut = useMutation({
    mutationFn: deletePlannerCalendarEvent,
    onSuccess: () => {
      invalidatePlannerCalendarQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd] });
    },
  });

  const saveNotesMut = useMutation({
    mutationFn: ({ body }: { body: string }) => upsertPlannerWeekNotes(weekAnchorKey, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTES_QUERY_KEY, weekMonday] });
    },
  });

  const scheduleNotesSave = useCallback(
    (body: string) => {
      if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
      notesSaveTimer.current = setTimeout(() => {
        saveNotesMut.mutate({ body });
      }, 650);
    },
    [saveNotesMut]
  );

  const onNotesChange = (text: string) => {
    setNotesDraft(text);
    if (!enabled) return;
    scheduleNotesSave(text);
  };

  const addWeekEvent = () => {
    const title = newWeekEventTitle.trim();
    if (!title) return;
    const raw = newWeekEventDate.trim();
    const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    createEventMut.mutate(
      { week_monday: weekMonday, event_date: eventDate, title },
      {
        onSuccess: () => {
          setNewWeekEventTitle('');
          setNewWeekEventDate('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  const dayModalTasks = useMemo(() => {
    if (!dayModalKey) return [];
    return (tasksRangeQ.data ?? []).filter((t) => t.day_date === dayModalKey);
  }, [dayModalKey, tasksRangeQ.data]);

  const dayModalEvents = useMemo(() => {
    if (!dayModalKey) return [];
    return (eventsGridQ.data ?? []).filter((e) => e.event_date === dayModalKey);
  }, [dayModalKey, eventsGridQ.data]);

  const [modalNewTitle, setModalNewTitle] = useState('');
  const addDayEvent = () => {
    if (!dayModalKey) return;
    const title = modalNewTitle.trim();
    if (!title) return;
    createEventMut.mutate(
      { week_monday: weekMonday, event_date: dayModalKey, title },
      {
        onSuccess: () => {
          setModalNewTitle('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  const headerRight = useMemo(
    () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <HeaderProfileAvatar />
      </View>
    ),
    []
  );

  const calendarBlock = (
    <View style={{ flex: isDesktop ? 1.15 : 1, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewYm((p) => shiftCalendarMonth(p.y, p.m, -1));
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={26} color={colors.accent} />
        </Pressable>
        <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>{monthTitleRu(viewYm.y, viewYm.m)}</Text>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewYm((p) => shiftCalendarMonth(p.y, p.m, 1));
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-forward" size={26} color={colors.accent} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAY_SHORT_RU.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{label}</Text>
          </View>
        ))}
      </View>

      {eventsGridQ.isLoading || tasksRangeQ.isLoading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        rows.map((weekRow, wi) => (
          <View key={`w-${wi}`} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {weekRow.map((dateKey) => {
              const inMonth = Number(dateKey.slice(5, 7)) === viewYm.m;
              const isToday = dateKey === todayKey;
              const nTask = tasksByDay.get(dateKey) ?? 0;
              const nEv = datedEventsByDay.get(dateKey) ?? 0;
              return (
                <Pressable
                  key={dateKey}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setWeekAnchorKey(dateKey);
                    setDayModalKey(dateKey);
                  }}
                  style={{
                    flex: 1,
                    marginHorizontal: 2,
                    minHeight: isDesktop ? 72 : 56,
                    borderRadius: 12,
                    paddingVertical: 6,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    backgroundColor: isToday ? 'rgba(168,85,247,0.18)' : isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                    borderWidth: isToday ? 1 : 0,
                    borderColor: 'rgba(168,85,247,0.55)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: inMonth ? colors.text : colors.textMuted,
                      opacity: inMonth ? 1 : 0.45,
                    }}
                  >
                    {Number(dateKey.slice(8, 10))}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {nTask > 0 ? <View style={[styles.dot, { backgroundColor: DOT_TASK }]} /> : null}
                    {nEv > 0 ? <View style={[styles.dot, { backgroundColor: DOT_EVENT }]} /> : null}
                    {nTask > 1 ? <View style={[styles.dot, { backgroundColor: DOT_TASK, opacity: 0.65 }]} /> : null}
                    {nEv > 1 ? <View style={[styles.dot, { backgroundColor: DOT_EVENT, opacity: 0.65 }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <View style={[styles.dot, { backgroundColor: DOT_TASK }]} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>задачи</Text>
        <View style={[styles.dot, { backgroundColor: DOT_EVENT, marginLeft: 8 }]} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>события</Text>
      </View>
    </View>
  );

  const weekPanel = (
    <View style={{ flex: isDesktop ? 1 : undefined, minWidth: 0, marginTop: isDesktop ? 0 : spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Эта неделя</Text>
        <Pressable
          onPress={() => {
            setWeekAnchorKey(todayKey);
            const [y, m] = todayKey.split('-').map(Number);
            setViewYm({ y, m });
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(168,85,247,0.2)' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accent }}>Сегодня</Text>
        </Pressable>
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>{weekRangeLabelRu(weekAnchorKey)}</Text>

      <Text style={[typography.caption, { marginTop: spacing.lg, marginBottom: spacing.xs, fontWeight: '900', letterSpacing: 1.2 }]}>
        ФОКУСЫ НЕДЕЛИ
      </Text>
      <AppSurfaceCard style={{ padding: spacing.md }}>
        {weekFocusQ.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (weekFocusQ.data ?? []).length === 0 ? (
          <Text style={[typography.body, { color: colors.textMuted }]}>Нет фокусов — отметь в задачах «фокус недели» или добавь в «Задачи».</Text>
        ) : (
          (weekFocusQ.data ?? []).map((item, i) => (
            <WeekFocusLine key={item.kind === 'task' ? `t-${item.task.id}` : `s-${item.row.id}`} item={item} isLast={i === (weekFocusQ.data ?? []).length - 1} />
          ))
        )}
        <Link href={'/tasks' as Href} asChild>
          <Pressable style={{ marginTop: spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>Открыть задачи →</Text>
          </Pressable>
        </Link>
      </AppSurfaceCard>

      <Text style={[typography.caption, { marginTop: spacing.lg, marginBottom: spacing.xs, fontWeight: '900', letterSpacing: 1.2 }]}>
        СОБЫТИЯ НЕДЕЛИ
      </Text>
      <GlassCard>
        {(weekEventsQ.data ?? []).map((ev) => (
          <WeekEventRow
            key={ev.id}
            ev={ev}
            onDelete={() => {
              Alert.alert('Удалить событие?', ev.title, [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => deleteEventMut.mutate(ev.id) },
              ]);
            }}
          />
        ))}
        {(weekEventsQ.data ?? []).length === 0 && !weekEventsQ.isLoading ? (
          <Text style={[typography.body, { color: colors.textMuted, paddingVertical: 4 }]}>Пока пусто</Text>
        ) : null}
        <Text style={[typography.caption, { marginTop: spacing.md, color: colors.textMuted }]}>Новое</Text>
        <TextInput
          value={newWeekEventTitle}
          onChangeText={setNewWeekEventTitle}
          placeholder="Название"
          placeholderTextColor={colors.textMuted}
          style={[typography.body, { color: colors.text, marginTop: 6, paddingVertical: 8 }]}
        />
        <TextInput
          value={newWeekEventDate}
          onChangeText={setNewWeekEventDate}
          placeholder="Дата YYYY-MM-DD (пусто = только неделя)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={[typography.body, { color: colors.text, paddingVertical: 8 }]}
        />
        <Pressable
          onPress={addWeekEvent}
          disabled={createEventMut.isPending}
          style={{ marginTop: spacing.sm, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Добавить событие</Text>
        </Pressable>
      </GlassCard>

      <Text style={[typography.caption, { marginTop: spacing.lg, marginBottom: spacing.xs, fontWeight: '900', letterSpacing: 1.2 }]}>
        ЗАМЕТКИ НЕДЕЛИ
      </Text>
      <GlassCard>
        <TextInput
          value={notesDraft}
          onChangeText={onNotesChange}
          placeholder="Мысли на неделю…"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[typography.body, { color: colors.text, minHeight: 100, textAlignVertical: 'top' }]}
        />
        {saveNotesMut.isPending ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>Сохранение…</Text>
        ) : null}
      </GlassCard>
    </View>
  );

  if (!supabaseOn) {
    return (
      <ScreenCanvas>
        <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }}>
          <Text style={[typography.title2, { color: colors.text }]}>Календарь</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
            Подключи Supabase в настройках, чтобы хранить события и заметки недели в облаке.
          </Text>
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: isDesktop ? DESKTOP_PAD_X : spacing.lg,
          paddingBottom: insets.bottom + 100,
          maxWidth: CONTENT_MAX,
          width: '100%',
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Text style={[typography.title1, { color: colors.text, fontWeight: '900' }]}>Календарь</Text>
          {headerRight}
        </View>

        {isDesktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl }}>
            {calendarBlock}
            {weekPanel}
          </View>
        ) : (
          <View>
            {calendarBlock}
            {weekPanel}
          </View>
        )}
      </ScrollView>

      <Modal visible={dayModalKey != null} animationType="slide" transparent onRequestClose={() => setDayModalKey(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDayModalKey(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: brand.canvasBase, borderColor: colors.border }]} onPress={() => {}}>
            {dayModalKey ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.title2, { color: colors.text, fontWeight: '900', flex: 1 }]}>
                    {shortWeekdayRu(dayModalKey)} · {dayModalKey}
                  </Text>
                  <Pressable onPress={() => setDayModalKey(null)} hitSlop={12}>
                    <Ionicons name="close" size={28} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Text style={[typography.caption, { marginTop: spacing.lg, fontWeight: '800' }]}>ЗАДАЧИ</Text>
                {dayModalTasks.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textMuted, marginTop: 6 }]}>Нет задач на этот день</Text>
                ) : (
                  dayModalTasks.map((t) => (
                    <Text key={t.id} style={[typography.body, { color: colors.text, marginTop: 8, textDecorationLine: t.is_done ? 'line-through' : 'none' }]}>
                      • {t.title}
                    </Text>
                  ))
                )}

                <Text style={[typography.caption, { marginTop: spacing.lg, fontWeight: '800' }]}>СОБЫТИЯ</Text>
                {dayModalEvents.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textMuted, marginTop: 6 }]}>Нет событий</Text>
                ) : (
                  dayModalEvents.map((ev) => (
                    <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <Text style={[typography.body, { color: colors.text, flex: 1 }]}>• {ev.title}</Text>
                      <Pressable onPress={() => deleteEventMut.mutate(ev.id)}>
                        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))
                )}

                <Text style={[typography.caption, { marginTop: spacing.lg, fontWeight: '800' }]}>НОВОЕ СОБЫТИЕ НА ДЕНЬ</Text>
                <TextInput
                  value={modalNewTitle}
                  onChangeText={setModalNewTitle}
                  placeholder="Название"
                  placeholderTextColor={colors.textMuted}
                  style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 8 }]}
                />
                <Pressable
                  onPress={addDayEvent}
                  disabled={createEventMut.isPending}
                  style={{ marginTop: spacing.md, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Добавить</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenCanvas>
  );
}

function WeekFocusLine({ item, isLast }: { item: PlannerWeekFocusListItem; isLast: boolean }) {
  const { colors, spacing } = useAppTheme();
  const done = item.kind === 'task' ? item.task.is_done : item.row.is_done;
  const title = item.kind === 'task' ? item.task.title : item.row.title;
  const isTask = item.kind === 'task';
  const chip = isTask ? `${shortWeekdayRu(item.task.day_date)} ${item.task.day_date.slice(5)}` : 'Неделя';
  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{chip}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 4, textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>
        {title}
      </Text>
    </View>
  );
}

function WeekEventRow({ ev, onDelete }: { ev: PlannerCalendarEventRow; onDelete: () => void }) {
  const { colors, typography } = useAppTheme();
  const chip = ev.event_date ? ev.event_date : 'Без даты · неделя';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800' }]}>{chip}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '700', marginTop: 4 }]}>{ev.title}</Text>
        {ev.note ? <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>{ev.note}</Text> : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    maxHeight: '88%',
  },
});
