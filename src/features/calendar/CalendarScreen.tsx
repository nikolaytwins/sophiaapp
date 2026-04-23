import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import type { PlannerCalendarEventRow, PlannerWeekNoteItemRow } from '@/features/calendar/calendar.types';
import {
  createPlannerCalendarEvent,
  createPlannerWeekNoteItem,
  deletePlannerCalendarEvent,
  deletePlannerWeekNoteItem,
  listPlannerCalendarEventsForGrid,
  listPlannerCalendarEventsForWeek,
  listPlannerWeekNoteItems,
  updatePlannerCalendarEvent,
  updatePlannerWeekNoteItem,
} from '@/features/calendar/calendarApi';
import { CalendarAtmosphere } from '@/features/calendar/CalendarAtmosphere';
import { CalendarLeftNavRail } from '@/features/calendar/CalendarLeftNavRail';
import { monthTitleRu, shortWeekdayRu, weekRangeLabelRu } from '@/features/calendar/calendarFormat';
import { calendarChipColorForId } from '@/features/calendar/calendarEventChips';
import {
  CAL_PRIMARY_GRADIENT,
  calendarSynaptixCardStyle,
  calendarSynaptixGlowWeb,
  calendarSynaptixGlowWebHover,
} from '@/features/calendar/calendarPremiumShell';
import { localDateAndHmToIso, isoToHm } from '@/features/calendar/calendarLocalTime';
import { monthCalendarRows, monthGridRange, shiftCalendarMonth } from '@/features/calendar/calendarMonthLogic';
import { MiniMonthDateField } from '@/features/calendar/MiniMonthDatePicker';
import { webEventTitleProps } from '@/features/calendar/calendarWebTooltip';
import { CalendarWeekHourlyBoard } from '@/features/calendar/CalendarWeekHourlyBoard';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';
import { addDays, localDateKey, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import {
  adjustPlannerCompletedCount,
  createPlannerWeekFocus,
  listMergedWeekFocus,
  listPlannerTasks,
  sortMergedWeekFocusItems,
  updatePlannerTask,
  updatePlannerWeekFocus,
} from '@/features/tasks/plannerApi';
import type { PlannerTaskRow, PlannerWeekFocusListItem } from '@/features/tasks/planner.types';
import {
  PLANNER_CALENDAR_EVENTS_QUERY_KEY,
  PLANNER_STATS_QUERY_KEY,
  PLANNER_TASKS_QUERY_KEY,
  PLANNER_WEEK_FOCUS_QUERY_KEY,
  PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY,
} from '@/features/tasks/queryKeys';
import { invalidatePlannerCalendarQueries, invalidatePlannerWeekQueries } from '@/features/tasks/plannerWeekInvalidation';
import { getSupabase } from '@/lib/supabase';
import { useSupabaseAuthSession } from '@/hooks/useSupabaseAuthSession';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const LG_MIN = 1100;
const CONTENT_MAX = 1760;
const SIDEBAR_W = 328;
const DESKTOP_PAD = 24;
const DOT_EVENT = '#38BDF8';

export type CalendarMainView = 'month' | 'week' | 'day';
export type CalendarVisualVariant = 'default' | 'v2';

function minimalField(colors: { text: string }, isLight: boolean) {
  const base = {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
  };
  if (isLight) {
    return {
      ...base,
      borderColor: 'rgba(15,17,24,0.12)',
      backgroundColor: 'rgba(255,255,255,0.85)',
    };
  }
  if (Platform.OS === 'web') {
    return {
      ...base,
      borderColor: 'rgba(157, 107, 255, 0.38)',
      backgroundColor: 'rgba(12, 4, 32, 0.55)',
      backdropFilter: 'blur(16px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 28px rgba(0,0,0,0.45)',
    } as const;
  }
  return {
    ...base,
    borderColor: 'rgba(157, 107, 255, 0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  };
}

function GradientPrimaryButton({
  label,
  onPress,
  disabled,
  isLight,
  gradientColors,
  accentRgb,
  enableGlow,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLight: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  accentRgb?: string;
  enableGlow?: boolean;
  /** Без верхнего отступа (кнопка в ряду модалки). */
  compact?: boolean;
}) {
  const { brand } = useAppTheme();
  const [webHover, setWebHover] = useState(false);
  const webFuturist = Platform.OS === 'web' && !isLight && Boolean(enableGlow);
  const gradColors = (gradientColors ?? (isLight ? [brand.primary, '#4F46E5'] : [...CAL_PRIMARY_GRADIENT])) as readonly [string, string, ...string[]];
  const glowAccent = accentRgb ?? '157, 107, 255';
  const glow =
    isLight || !webFuturist
      ? {}
      : webHover
        ? calendarSynaptixGlowWebHover(glowAccent)
        : calendarSynaptixGlowWeb(glowAccent);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => webFuturist && setWebHover(true)}
      onHoverOut={() => webFuturist && setWebHover(false)}
      style={{
        marginTop: compact ? 0 : 12,
        opacity: disabled ? 0.55 : 1,
        borderRadius: 16,
        overflow: 'hidden',
        ...(glow as object),
        ...(!isLight && Platform.OS !== 'web'
          ? { shadowColor: '#9D6BFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 12 }
          : {}),
      }}
    >
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, alignItems: 'center', width: '100%' }}>
        <Text style={{ color: '#FAFAFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.35 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function eventsOnDay(events: PlannerCalendarEventRow[], dateKey: string): PlannerCalendarEventRow[] {
  return events.filter((e) => e.event_date === dateKey);
}

export function CalendarScreen({ variant = 'default' }: { variant?: CalendarVisualVariant } = {}) {
  const { colors, spacing, typography, brand, isLight } = useAppTheme();
  const { isAuthed, displayName } = useSupabaseAuthSession();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= LG_MIN;
  const profileTitle = isAuthed ? displayName || 'Профиль' : 'Гость';
  const [navRailCollapsed, setNavRailCollapsed] = useState(() => !isDesktop);
  useEffect(() => {
    setNavRailCollapsed(!isDesktop);
  }, [isDesktop]);

  const isV2 = variant === 'v2' && !isLight;
  const fillAccent = isV2 ? '#8040E8' : brand.primary;
  const labelAccent = isV2 ? '#C49BFF' : '#C4B5FD';
  const ctaGradient = isV2 ? (['#A06AF0', '#5A27B0'] as const) : CAL_PRIMARY_GRADIENT;
  const onAccent = '#FAFAFC';
  const sidebarBg = isLight ? colors.surface2 : isV2 ? '#1A1535' : 'rgba(4,4,10,0.98)';
  const mainShellBg = isLight ? '#FFFFFF' : isV2 ? '#1A1535' : '#0C0A12';
  const mainShellBorder = isLight ? colors.border : isV2 ? 'transparent' : brand.surfaceBorderStrong;

  const todayKey = useMemo(() => localDateKey(), []);
  const [viewYm, setViewYm] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number);
    return { y, m };
  });
  const [weekAnchorKey, setWeekAnchorKey] = useState(todayKey);
  const [mainView, setMainView] = useState<CalendarMainView>('week');
  const [dayViewDateKey, setDayViewDateKey] = useState(todayKey);
  const [dayModalKey, setDayModalKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newWeekEventTitle, setNewWeekEventTitle] = useState('');
  const [newWeekEventDate, setNewWeekEventDate] = useState('');
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const [newWeekEventStart, setNewWeekEventStart] = useState('');
  const [newWeekEventEnd, setNewWeekEventEnd] = useState('');
  const [modalNewTitle, setModalNewTitle] = useState('');
  const [modalDayStart, setModalDayStart] = useState('');
  const [modalDayEnd, setModalDayEnd] = useState('');
  const [editingNote, setEditingNote] = useState<PlannerWeekNoteItemRow | null>(null);
  const [noteEditBody, setNoteEditBody] = useState('');
  const [editingEvent, setEditingEvent] = useState<PlannerCalendarEventRow | null>(null);
  const [evEditTitle, setEvEditTitle] = useState('');
  const [evEditDate, setEvEditDate] = useState('');
  const [evEditStart, setEvEditStart] = useState('09:00');
  const [evEditEnd, setEvEditEnd] = useState('10:00');
  const [evEditNote, setEvEditNote] = useState('');
  const [evAllDay, setEvAllDay] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addFocusOpen, setAddFocusOpen] = useState(false);
  const [focusDraftTitle, setFocusDraftTitle] = useState('');
  const supabaseOn = useSupabaseConfigured;

  const weekMonday = startOfWeekMondayKey(weekAnchorKey);
  const weekSun = addDays(weekMonday, 6);
  const dayKeysWeek = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i)), [weekMonday]);

  const { gridStart, gridEnd } = useMemo(() => monthGridRange(viewYm.y, viewYm.m), [viewYm]);
  const rows = useMemo(() => monthCalendarRows(viewYm.y, viewYm.m), [viewYm]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUserId(null);
      return;
    }
    void sb.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!addEventOpen) return;
    setNewWeekEventTitle('');
    setNewWeekEventDate('');
    setNewWeekEventStart('');
    setNewWeekEventEnd('');
  }, [addEventOpen]);

  useEffect(() => {
    if (!dayModalKey) return;
    setModalNewTitle('');
    setModalDayStart('');
    setModalDayEnd('');
  }, [dayModalKey]);

  useEffect(() => {
    if (!addNoteOpen) return;
    setNewNoteDraft('');
  }, [addNoteOpen]);

  const enabled = Boolean(supabaseOn && userId);

  const eventsGridQ = useQuery({
    queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd],
    queryFn: () => listPlannerCalendarEventsForGrid(gridStart, gridEnd),
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

  const weekNoteItemsQ = useQuery({
    queryKey: [...PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY, weekMonday],
    queryFn: () => listPlannerWeekNoteItems(weekAnchorKey),
    enabled,
  });

  const todayTasksQ = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, todayKey],
    queryFn: () => listPlannerTasks(todayKey),
    enabled,
  });

  const datedEventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of eventsGridQ.data ?? []) {
      if (e.event_date) map.set(e.event_date, (map.get(e.event_date) ?? 0) + 1);
    }
    return map;
  }, [eventsGridQ.data]);

  const createEventMut = useMutation({
    mutationFn: createPlannerCalendarEvent,
    onSuccess: () => {
      invalidatePlannerCalendarQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd] });
    },
  });

  const deleteEventMut = useMutation({
    mutationFn: deletePlannerCalendarEvent,
    onSuccess: () => {
      invalidatePlannerCalendarQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd] });
    },
  });

  const createNoteMut = useMutation({
    mutationFn: (body: string) => createPlannerWeekNoteItem(weekAnchorKey, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY, weekMonday] });
    },
  });

  const createFocusMut = useMutation({
    mutationFn: (input: { title: string }) =>
      createPlannerWeekFocus({
        week_monday: weekMonday,
        title: input.title.trim(),
      }),
    onSuccess: (row) => {
      const focusKey = [...PLANNER_WEEK_FOCUS_QUERY_KEY, weekMonday] as const;
      qc.setQueryData<PlannerWeekFocusListItem[]>(focusKey, (old) => {
        const base = old ?? [];
        if (base.some((it) => it.kind === 'standalone' && it.row.id === row.id)) return base;
        return sortMergedWeekFocusItems([...base, { kind: 'standalone' as const, row }]);
      });
      setAddFocusOpen(false);
      setFocusDraftTitle('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_FOCUS_QUERY_KEY, weekMonday] });
    },
  });

  const toggleWeekFocusItemMut = useMutation({
    mutationFn: async (item: PlannerWeekFocusListItem) => {
      if (item.kind === 'standalone') {
        const next = !item.row.is_done;
        await updatePlannerWeekFocus(item.row.id, { is_done: next });
        if (!item.row.is_done && next) await adjustPlannerCompletedCount(1);
        if (item.row.is_done && !next) await adjustPlannerCompletedCount(-1);
      } else {
        const next = !item.task.is_done;
        await updatePlannerTask(item.task.id, { is_done: next });
        if (!item.task.is_done && next) await adjustPlannerCompletedCount(1);
        if (item.task.is_done && !next) await adjustPlannerCompletedCount(-1);
      }
    },
    onSuccess: () => {
      invalidatePlannerWeekQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, todayKey] });
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
    },
    onError: (e) => Alert.alert('Ошибка', (e as Error).message ?? 'Не удалось обновить'),
  });

  const toggleTodayTaskMut = useMutation({
    mutationFn: async (task: PlannerTaskRow) => {
      const next = !task.is_done;
      await updatePlannerTask(task.id, { is_done: next });
      if (!task.is_done && next) await adjustPlannerCompletedCount(1);
      if (task.is_done && !next) await adjustPlannerCompletedCount(-1);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, todayKey] });
      invalidatePlannerWeekQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_STATS_QUERY_KEY] });
    },
    onError: (e) => Alert.alert('Ошибка', (e as Error).message ?? 'Не удалось обновить'),
  });

  const deleteNoteMut = useMutation({
    mutationFn: deletePlannerWeekNoteItem,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY, weekMonday] });
    },
  });

  const updateNoteMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updatePlannerWeekNoteItem(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY, weekMonday] });
      setEditingNote(null);
    },
  });

  const updateEventMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updatePlannerCalendarEvent>[1] }) =>
      updatePlannerCalendarEvent(id, patch),
    onSuccess: () => {
      invalidatePlannerCalendarQueries(qc, weekAnchorKey);
      void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY, gridStart, gridEnd] });
      setEditingEvent(null);
    },
  });

  const openEventEditor = useCallback((ev: PlannerCalendarEventRow) => {
    setEditingEvent(ev);
    setEvEditTitle(ev.title);
    setEvEditNote(ev.note ?? '');
    setEvEditDate(ev.event_date ?? '');
    const timed = Boolean(ev.starts_at && ev.ends_at);
    setEvAllDay(!timed);
    setEvEditStart(ev.starts_at ? isoToHm(ev.starts_at) : '');
    setEvEditEnd(ev.ends_at ? isoToHm(ev.ends_at) : '');
  }, []);

  const shiftWeek = useCallback((delta: number) => {
    const mon = startOfWeekMondayKey(weekAnchorKey);
    const nextMon = addDays(mon, 7 * delta);
    setWeekAnchorKey(nextMon);
    setDayViewDateKey(nextMon);
    setViewYm({ y: Number(nextMon.slice(0, 4)), m: Number(nextMon.slice(5, 7)) });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekAnchorKey]);

  const onMiniDayPress = (dateKey: string) => {
    setWeekAnchorKey(dateKey);
    setDayViewDateKey(dateKey);
    const [y, m] = dateKey.split('-').map(Number);
    setViewYm({ y, m });
  };

  const addWeekEvent = () => {
    const title = newWeekEventTitle.trim();
    if (!title) return;
    const raw = newWeekEventDate.trim();
    const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    let starts_at: string | null = null;
    let ends_at: string | null = null;
    const ts = newWeekEventStart.trim();
    const te = newWeekEventEnd.trim();
    if ((ts && !te) || (!ts && te)) {
      Alert.alert('Время', 'Укажи оба поля времени или оставь оба пустыми');
      return;
    }
    if (eventDate && ts && te) {
      starts_at = localDateAndHmToIso(eventDate, ts);
      ends_at = localDateAndHmToIso(eventDate, te);
      if (new Date(ends_at) <= new Date(starts_at)) {
        Alert.alert('Ошибка', 'Время окончания должно быть позже начала');
        return;
      }
    }
    createEventMut.mutate(
      { week_monday: weekMonday, event_date: eventDate, title, starts_at, ends_at },
      {
        onSuccess: () => {
          setNewWeekEventTitle('');
          setNewWeekEventDate('');
          setNewWeekEventStart('');
          setNewWeekEventEnd('');
          setAddEventOpen(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  const addNotePlate = () => {
    const t = newNoteDraft.trim();
    if (!t) return;
    createNoteMut.mutate(t, {
      onSuccess: () => {
        setNewNoteDraft('');
        setAddNoteOpen(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const dayModalEvents = useMemo(() => {
    if (!dayModalKey) return [];
    const inWeek = dayModalKey >= weekMonday && dayModalKey <= weekSun;
    const pool = inWeek ? (weekEventsQ.data ?? []) : (eventsGridQ.data ?? []);
    return pool.filter((e) => e.event_date === dayModalKey);
  }, [dayModalKey, weekMonday, weekSun, weekEventsQ.data, eventsGridQ.data]);

  const addDayEvent = () => {
    if (!dayModalKey) return;
    const title = modalNewTitle.trim();
    if (!title) return;
    const ts = modalDayStart.trim();
    const te = modalDayEnd.trim();
    if ((ts && !te) || (!ts && te)) {
      Alert.alert('Время', 'Укажи оба поля времени или оставь оба пустыми');
      return;
    }
    let starts_at: string | null = null;
    let ends_at: string | null = null;
    if (ts && te) {
      starts_at = localDateAndHmToIso(dayModalKey, ts);
      ends_at = localDateAndHmToIso(dayModalKey, te);
      if (new Date(ends_at) <= new Date(starts_at)) {
        Alert.alert('Ошибка', 'Время окончания должно быть позже начала');
        return;
      }
    }
    createEventMut.mutate(
      { week_monday: weekMonday, event_date: dayModalKey, title, starts_at, ends_at },
      {
        onSuccess: () => {
          setModalNewTitle('');
          setModalDayStart('');
          setModalDayEnd('');
          setDayModalKey(null);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  const saveEditedEvent = () => {
    if (!editingEvent) return;
    const title = evEditTitle.trim();
    if (!title) {
      Alert.alert('Введи название');
      return;
    }
    const d = evEditDate.trim();
    const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (editingEvent.event_date == null && !hasDate) {
      updateEventMut.mutate({
        id: editingEvent.id,
        patch: { title, note: evEditNote.trim() || null },
      });
      return;
    }
    const patch: Parameters<typeof updatePlannerCalendarEvent>[1] = {
      title,
      note: evEditNote.trim() || null,
      event_date: hasDate ? d : editingEvent.event_date,
    };
    const ts = evEditStart.trim();
    const te = evEditEnd.trim();
    if (!evAllDay && ((ts && !te) || (!ts && te))) {
      Alert.alert('Время', 'Укажи оба поля времени или оставь оба пустыми');
      return;
    }
    if (hasDate && !evAllDay && ts && te) {
      const s = localDateAndHmToIso(d, ts);
      const e = localDateAndHmToIso(d, te);
      if (new Date(e) <= new Date(s)) {
        Alert.alert('Ошибка', 'Время окончания должно быть позже начала');
        return;
      }
      patch.starts_at = s;
      patch.ends_at = e;
    } else {
      patch.starts_at = null;
      patch.ends_at = null;
    }
    updateEventMut.mutate({ id: editingEvent.id, patch });
  };

  const viewToggle = (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: isLight ? colors.surface2 : isV2 ? '#1A1535' : '#14111F',
        borderRadius: 16,
        padding: 4,
        borderWidth: 0,
        borderColor: 'transparent',
        ...(Platform.OS === 'web' && !isLight && !isV2
          ? ({
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            } as object)
          : {}),
      }}
    >
      {(
        [
          { id: 'month' as const, label: 'Месяц' },
          { id: 'week' as const, label: 'Неделя' },
          { id: 'day' as const, label: 'День' },
        ] as const
      ).map((opt) => {
        const on = mainView === opt.id;
        if (on && !isLight) {
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                setMainView(opt.id);
                if (opt.id === 'day') setDayViewDateKey(weekAnchorKey);
              }}
              style={{ borderRadius: 12, overflow: 'hidden', ...(Platform.OS === 'web' && !isV2 ? calendarSynaptixGlowWeb('157, 107, 255') : {}) }}
            >
              <LinearGradient colors={[...ctaGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 9 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: onAccent, letterSpacing: 0.4 }}>{opt.label}</Text>
              </LinearGradient>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              setMainView(opt.id);
              if (opt.id === 'day') setDayViewDateKey(weekAnchorKey);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: on ? fillAccent : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: on ? onAccent : colors.textMuted }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const weekNavBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: spacing.sm }}>
      <Pressable onPress={() => shiftWeek(-1)} style={ghostBtnCalendar(isLight, sidebarBg, colors, brand, isV2)}>
        <Ionicons name="chevron-back" size={20} color={isLight ? colors.text : labelAccent} />
      </Pressable>
      <Text
        style={{
          color: isLight ? colors.text : '#F5F3FF',
          flex: 1,
          textAlign: 'center',
          fontWeight: '800',
          fontSize: isDesktop ? 17 : 15,
          letterSpacing: isDesktop ? -0.35 : -0.1,
          ...(Platform.OS === 'web' && !isLight
            ? (isV2 ? ({} as object) : ({ textShadow: '0 0 28px rgba(157,107,255,0.45), 0 0 2px rgba(0,0,0,0.8)' } as object))
            : {}),
        }}
        numberOfLines={1}
      >
        {weekRangeLabelRu(weekAnchorKey)}
      </Text>
      <Pressable onPress={() => shiftWeek(1)} style={ghostBtnCalendar(isLight, sidebarBg, colors, brand, isV2)}>
        <Ionicons name="chevron-forward" size={20} color={isLight ? colors.text : labelAccent} />
      </Pressable>
    </View>
  );

  const miniMonth = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={[typography.title2, { color: colors.text, fontWeight: '900', fontSize: 15 }]}>{monthTitleRu(viewYm.y, viewYm.m)}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Pressable onPress={() => setViewYm((p) => shiftCalendarMonth(p.y, p.m, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={isLight ? fillAccent : labelAccent} />
          </Pressable>
          <Pressable onPress={() => setViewYm((p) => shiftCalendarMonth(p.y, p.m, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={isLight ? fillAccent : labelAccent} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAY_SHORT_RU.map((label) => (
          <View key={`h-${label}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted }}>{label}</Text>
          </View>
        ))}
      </View>
      {rows.map((weekRow, wi) => (
        <View key={`mw-${wi}`} style={{ flexDirection: 'row', marginBottom: 6 }}>
          {weekRow.map((dateKey) => {
            const inMonth = Number(dateKey.slice(5, 7)) === viewYm.m;
            const isToday = dateKey === todayKey;
            const selWeek = dateKey >= weekMonday && dateKey <= weekSun;
            return (
              <Pressable
                key={dateKey}
                onPress={() => onMiniDayPress(dateKey)}
                style={{
                  flex: 1,
                  marginHorizontal: 2,
                  minHeight: 36,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isToday ? (isV2 ? '#2A2150' : brand.primaryMuted) : selWeek ? (isV2 ? '#241C4A' : 'rgba(168,85,247,0.12)') : 'transparent',
                  borderWidth: isToday && !isV2 ? 1 : 0,
                  borderColor: isV2 ? 'transparent' : fillAccent,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: inMonth ? colors.text : colors.textMuted,
                    opacity: inMonth ? 1 : 0.4,
                  }}
                >
                  {Number(dateKey.slice(8, 10))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  const sidebarEventsBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={sectionLabel(colors, isLight, isV2)}>События недели</Text>
      <View style={[cardShell(mainShellBorder, isLight, isV2)]}>
        {weekEventsQ.isLoading ? <ActivityIndicator color={fillAccent} /> : null}
        {(weekEventsQ.data ?? []).length === 0 && !weekEventsQ.isLoading ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Нет событий</Text>
        ) : null}
        {(weekEventsQ.data ?? []).map((ev) => (
          <SidebarEventRow key={ev.id} ev={ev} isLight={isLight} isV2={isV2} onEdit={() => openEventEditor(ev)} onDelete={() => confirmDeleteEvent(ev, deleteEventMut.mutate)} />
        ))}
        <GradientPrimaryButton
          label="Добавить событие"
          isLight={isLight}
          gradientColors={ctaGradient}
          accentRgb={isV2 ? '160, 106, 240' : '157, 107, 255'}
          enableGlow={!isV2}
          onPress={() => setAddEventOpen(true)}
          disabled={createEventMut.isPending}
        />
      </View>
    </View>
  );

  const sidebarFocusBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={sectionLabel(colors, isLight, isV2)}>Фокусы недели</Text>
      <View style={[cardShell(mainShellBorder, isLight, isV2)]}>
        {weekFocusQ.isLoading ? (
          <ActivityIndicator color={fillAccent} />
        ) : (weekFocusQ.data ?? []).length === 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Пока нет фокусов на эту неделю</Text>
        ) : (
          (weekFocusQ.data ?? []).map((item, i) => (
            <FocusLine
              key={item.kind === 'task' ? `t-${item.task.id}` : `s-${item.row.id}`}
              item={item}
              isLast={i === (weekFocusQ.data ?? []).length - 1}
              colors={colors}
              isLight={isLight}
              isV2={isV2}
              fillAccent={fillAccent}
              toggleBusy={toggleWeekFocusItemMut.isPending}
              onToggleDone={() => toggleWeekFocusItemMut.mutate(item)}
            />
          ))
        )}
        <Pressable
          onPress={() => {
            setFocusDraftTitle('');
            setAddFocusOpen(true);
          }}
          style={[outlineCta(isLight, colors, isV2), { marginTop: 12 }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: fillAccent, textAlign: 'center' }}>Добавить фокус</Text>
        </Pressable>
        <Link href={'/tasks' as Href} asChild>
          <Pressable style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted }}>Все в «Задачах» →</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  const sidebarNotesBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={sectionLabel(colors, isLight, isV2)}>Заметки</Text>
      {(weekNoteItemsQ.data ?? []).map((n) => (
        <View key={n.id} style={[notePlate(mainShellBorder, isLight, isV2), { marginBottom: 10 }]}>
          <Pressable
            onPress={() => {
              setEditingNote(n);
              setNoteEditBody(n.body);
            }}
            style={{ flex: 1, minWidth: 0 }}
          >
            <Text style={[typography.body, { color: colors.text }]}>{n.body}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Удалить заметку?', undefined, [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => deleteNoteMut.mutate(n.id) },
              ])
            }
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <View style={[cardShell(mainShellBorder, isLight, isV2)]}>
        <Pressable onPress={() => setAddNoteOpen(true)} style={[outlineCta(isLight, colors, isV2), { marginTop: 0 }]}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: fillAccent, textAlign: 'center' }}>Добавить заметку</Text>
        </Pressable>
      </View>
    </View>
  );

  const sidebarTodayTasksBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={sectionLabel(colors, isLight, isV2)}>Задачи на сегодня</Text>
      <View style={[cardShell(mainShellBorder, isLight, isV2)]}>
        {todayTasksQ.isLoading ? <ActivityIndicator color={fillAccent} /> : null}
        {!todayTasksQ.isLoading && (todayTasksQ.data ?? []).length === 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Нет задач на сегодня</Text>
        ) : null}
        {(todayTasksQ.data ?? []).map((task, i) => (
          <TodayTaskRow
            key={task.id}
            task={task}
            isLast={i === (todayTasksQ.data ?? []).length - 1}
            colors={colors}
            isLight={isLight}
            fillAccent={fillAccent}
            toggleBusy={toggleTodayTaskMut.isPending}
            onToggle={() => toggleTodayTaskMut.mutate(task)}
          />
        ))}
        <Link href={'/tasks' as Href} asChild>
          <Pressable style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted }}>Все задачи →</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  const mainHeader = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: spacing.md }}>
      <Text
        style={[
          typography.sectionTitle,
          {
            color: isLight ? colors.text : '#FAF8FF',
            fontSize: isDesktop ? 28 : 22,
            fontWeight: '900',
            letterSpacing: -0.55,
            ...(Platform.OS === 'web' && !isLight
              ? (isV2 ? ({} as object) : ({ textShadow: '0 0 40px rgba(123,92,255,0.5), 0 2px 12px rgba(0,0,0,0.85)' } as object))
              : {}),
          },
        ]}
      >
        Расписание
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{viewToggle}</View>
    </View>
  );

  const monthMainBoard = (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {WEEKDAY_SHORT_RU.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: isLight ? colors.textMuted : 'rgba(196,181,253,0.72)',
                ...(Platform.OS === 'web' && !isLight && !isV2 ? ({ textShadow: '0 0 14px rgba(157,107,255,0.35)' } as object) : {}),
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      {eventsGridQ.isLoading ? (
        <ActivityIndicator color={fillAccent} style={{ marginVertical: 40 }} />
      ) : (
        rows.map((weekRow, wi) => (
          <View key={`mw2-${wi}`} style={{ flexDirection: 'row', marginBottom: 6 }}>
            {weekRow.map((dateKey) => {
              const inMonth = Number(dateKey.slice(5, 7)) === viewYm.m;
              const isToday = dateKey === todayKey;
              const evs = eventsOnDay(eventsGridQ.data ?? [], dateKey).slice(0, 2);
              const nEv = datedEventsByDay.get(dateKey) ?? 0;
              return (
                <Pressable
                  key={dateKey}
                  onPress={() => {
                    setWeekAnchorKey(dateKey);
                    setDayViewDateKey(dateKey);
                    setDayModalKey(dateKey);
                  }}
                  style={{
                    flex: 1,
                    marginHorizontal: 3,
                    minHeight: isDesktop ? 104 : 76,
                    borderRadius: 16,
                    padding: 8,
                    backgroundColor: isLight
                      ? isToday
                        ? brand.primaryMuted
                        : '#F3F4F8'
                      : isToday
                        ? isV2
                          ? '#2A2150'
                          : 'rgba(123, 92, 255, 0.12)'
                        : isV2
                          ? '#1A1535'
                          : 'rgba(12, 6, 32, 0.42)',
                    borderWidth: isV2 ? 0 : 1,
                    borderColor: isToday ? (isLight ? fillAccent : 'rgba(157, 107, 255, 0.65)') : isLight ? mainShellBorder : isV2 ? 'transparent' : 'rgba(157, 107, 255, 0.18)',
                    ...(Platform.OS === 'web' && !isLight && !isV2
                      ? ({
                          backdropFilter: 'blur(12px) saturate(1.2)',
                          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
                          boxShadow: isToday
                            ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(157,107,255,0.35), 0 12px 40px rgba(0,0,0,0.55), 0 0 48px rgba(123,92,255,0.35)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 28px rgba(0,0,0,0.45)',
                        } as object)
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: inMonth ? (isLight ? colors.text : '#F5F3FF') : colors.textMuted,
                      opacity: inMonth ? 1 : 0.45,
                      ...(Platform.OS === 'web' && !isLight && !isV2 && inMonth && isToday
                        ? ({ textShadow: '0 0 24px rgba(157,107,255,0.55)' } as object)
                        : {}),
                    }}
                  >
                    {Number(dateKey.slice(8, 10))}
                  </Text>
                  {evs.map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => openEventEditor(ev)}
                      {...(webEventTitleProps(ev.title) as object)}
                      style={{
                        marginTop: 4,
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        backgroundColor: `${calendarChipColorForId(ev.id)}22`,
                        borderLeftWidth: 3,
                        borderLeftColor: calendarChipColorForId(ev.id),
                      }}
                    >
                      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: isLight ? colors.text : '#EDE9FE' }}>
                        {ev.title}
                      </Text>
                    </Pressable>
                  ))}
                  {nEv > 0 ? (
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
                      <View style={[styles.dot, { backgroundColor: DOT_EVENT }]} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </View>
  );

  const weekMainBoard = (
    <CalendarWeekHourlyBoard
      dayKeys={dayKeysWeek}
      weekEvents={weekEventsQ.data ?? []}
      todayKey={todayKey}
      fullWidthGrid={isDesktop}
      onOpenDay={(dk) => {
        setDayViewDateKey(dk);
        setDayModalKey(dk);
      }}
      onOpenEvent={openEventEditor}
    />
  );

  const dayMainBoard = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable
          onPress={() => {
            const k = addDays(dayViewDateKey, -1);
            setDayViewDateKey(k);
            setWeekAnchorKey(k);
            setViewYm({ y: Number(k.slice(0, 4)), m: Number(k.slice(5, 7)) });
          }}
          style={ghostBtn('transparent', colors, brand)}
        >
          <Ionicons name="chevron-back" size={22} color={fillAccent} />
        </Pressable>
        <Text style={[typography.title2, { color: colors.text, fontWeight: '900', flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {shortWeekdayRu(dayViewDateKey)} · {dayViewDateKey}
        </Text>
        <Pressable
          onPress={() => {
            const k = addDays(dayViewDateKey, 1);
            setDayViewDateKey(k);
            setWeekAnchorKey(k);
            setViewYm({ y: Number(k.slice(0, 4)), m: Number(k.slice(5, 7)) });
          }}
          style={ghostBtn('transparent', colors, brand)}
        >
          <Ionicons name="chevron-forward" size={22} color={fillAccent} />
        </Pressable>
      </View>
      <Text style={[typography.caption, { marginTop: spacing.md, fontWeight: '800' }]}>СОБЫТИЯ</Text>
      {eventsOnDay(weekEventsQ.data ?? [], dayViewDateKey).length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 6 }]}>Нет событий</Text>
      ) : (
        eventsOnDay(weekEventsQ.data ?? [], dayViewDateKey).map((ev) => (
          <Pressable
            key={ev.id}
            onPress={() => openEventEditor(ev)}
            {...(webEventTitleProps(ev.title) as object)}
            style={{
              marginTop: 10,
              borderRadius: 16,
              padding: 14,
              backgroundColor: `${calendarChipColorForId(ev.id)}20`,
              borderLeftWidth: 5,
              borderLeftColor: calendarChipColorForId(ev.id),
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{ev.title}</Text>
            {ev.note ? <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>{ev.note}</Text> : null}
          </Pressable>
        ))
      )}
    </ScrollView>
  );

  const leftColumn = (
    <View
      style={{
        width: isDesktop ? SIDEBAR_W : undefined,
        padding: isDesktop ? spacing.lg : 0,
        paddingRight: isDesktop ? spacing.xl : 0,
        borderRightWidth: 0,
        borderRightColor: mainShellBorder,
        backgroundColor: isDesktop ? sidebarBg : 'transparent',
        borderRadius: isDesktop ? 20 : 0,
        ...(isV2 ? (leftInfoPanelShell(true) as object) : {}),
      }}
    >
      {miniMonth}
      {isDesktop ? weekNavBar : null}
      {sidebarEventsBlock}
      {sidebarFocusBlock}
      {sidebarNotesBlock}
      {sidebarTodayTasksBlock}
    </View>
  );

  const rightColumn = (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: mainShellBg,
        borderRadius: isDesktop ? 22 : 0,
        borderWidth: isDesktop && isLight ? 1 : 0,
        borderColor: mainShellBorder,
        padding: isDesktop ? spacing.xl : spacing.lg,
        ...(Platform.OS === 'web'
          ? ({
              boxShadow: isLight ? '0 12px 40px rgba(15,17,24,0.08)' : '0 16px 48px rgba(0,0,0,0.45)',
            } as object)
          : {}),
      }}
    >
      {mainHeader}
      {!isDesktop ? <View style={{ marginBottom: spacing.md }}>{weekNavBar}</View> : null}
      {mainView === 'month' ? monthMainBoard : null}
      {mainView === 'week' ? weekMainBoard : null}
      {mainView === 'day' ? dayMainBoard : null}
    </View>
  );

  const mainScroll = (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: isDesktop ? DESKTOP_PAD : spacing.lg,
        paddingBottom: insets.bottom + 28,
        maxWidth: CONTENT_MAX,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('../../../assets/images/sophia-icon-1024.png')} style={{ width: 28, height: 28, borderRadius: 7 }} contentFit="cover" />
            <Text style={[typography.screenTitle, { color: '#FFFFFF', fontSize: isDesktop ? 26 : 22, fontWeight: '900', letterSpacing: -0.3 }]}>
              Sophia
            </Text>
          </View>
        ) : (
          <Text style={[typography.screenTitle, { color: colors.text, fontSize: isDesktop ? 32 : 28 }]}>Календарь</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {Platform.OS === 'web' ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.88)' }} numberOfLines={1}>
              {profileTitle}
            </Text>
          ) : null}
          <HeaderProfileAvatar />
        </View>
      </View>

      {isDesktop ? (
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing.lg }}>
          {leftColumn}
          {rightColumn}
        </View>
      ) : (
        <View>
          {rightColumn}
          <View style={{ marginTop: spacing.xl }}>{leftColumn}</View>
        </View>
      )}
    </ScrollView>
  );

  if (!supabaseOn) {
    return (
      <ScreenCanvas>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <CalendarLeftNavRail collapsed={navRailCollapsed} onToggleCollapsed={() => setNavRailCollapsed((c) => !c)} isLight={isLight} variant={variant} />
          <View style={{ flex: 1, minWidth: 0, padding: spacing.xl, justifyContent: 'center' }}>
            <Text style={[typography.title2, { color: colors.text }]}>Календарь</Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
              Подключи Supabase, чтобы хранить события и заметки в облаке.
            </Text>
          </View>
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <CalendarLeftNavRail collapsed={navRailCollapsed} onToggleCollapsed={() => setNavRailCollapsed((c) => !c)} isLight={isLight} variant={variant} />
        <View style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {!isLight ? (
            isV2 ? (
              <LinearGradient
                colors={['#1A1535', '#0B0918']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
            ) : (
              <CalendarAtmosphere />
            )
          ) : null}
          {mainScroll}
        </View>
      </View>

      <Modal visible={addEventOpen} animationType="fade" transparent onRequestClose={() => setAddEventOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddEventOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              modalCardShell(isLight, isV2),
              isLight ? { backgroundColor: brand.canvasBase, borderColor: colors.border } : null,
              { overflow: 'visible' },
            ]}
            onPress={() => {}}
          >
            <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Новое событие</Text>
            <TextInput
              value={newWeekEventTitle}
              onChangeText={setNewWeekEventTitle}
              placeholder="Название"
              placeholderTextColor={colors.textMuted}
              style={[typography.body, minimalField(colors, isLight), { marginTop: 14 }]}
            />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>Дата</Text>
            <View style={{ marginTop: 6 }}>
              <MiniMonthDateField
                value={newWeekEventDate}
                onChange={setNewWeekEventDate}
                onClear={() => setNewWeekEventDate('')}
                allowClear
                fallbackMonthFromKey={weekAnchorKey}
                todayKey={todayKey}
                isLight={isLight}
                colors={colors}
                fieldStyle={minimalField(colors, isLight)}
                typographyBody={typography.body}
              />
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 10 }]}>Время (необязательно), HH:mm</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TextInput
                value={newWeekEventStart}
                onChangeText={setNewWeekEventStart}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                style={[typography.body, minimalField(colors, isLight), { flex: 1 }]}
              />
              <TextInput
                value={newWeekEventEnd}
                onChangeText={setNewWeekEventEnd}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                style={[typography.body, minimalField(colors, isLight), { flex: 1 }]}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Pressable onPress={() => setAddEventOpen(false)} style={[ghostBtn('transparent', colors, brand), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontWeight: '800', color: colors.text }}>Отмена</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <GradientPrimaryButton
                  label="Сохранить"
                  isLight={isLight}
                  gradientColors={ctaGradient}
                  accentRgb={isV2 ? '160, 106, 240' : '157, 107, 255'}
                  enableGlow={!isV2}
                  compact
                  onPress={addWeekEvent}
                  disabled={createEventMut.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addNoteOpen} animationType="fade" transparent onRequestClose={() => setAddNoteOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddNoteOpen(false)}>
          <Pressable
            style={[styles.modalCard, modalCardShell(isLight, isV2), isLight ? { backgroundColor: brand.canvasBase, borderColor: colors.border } : null]}
            onPress={() => {}}
          >
            <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Новая заметка</Text>
            <TextInput
              value={newNoteDraft}
              onChangeText={setNewNoteDraft}
              placeholder="Текст плашки…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[typography.body, minimalField(colors, isLight), { marginTop: 14, minHeight: 120, textAlignVertical: 'top' }]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Pressable onPress={() => setAddNoteOpen(false)} style={[ghostBtn('transparent', colors, brand), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontWeight: '800', color: colors.text }}>Отмена</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <GradientPrimaryButton
                  label="Сохранить"
                  isLight={isLight}
                  gradientColors={ctaGradient}
                  accentRgb={isV2 ? '160, 106, 240' : '157, 107, 255'}
                  enableGlow={!isV2}
                  compact
                  onPress={addNotePlate}
                  disabled={createNoteMut.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addFocusOpen} animationType="fade" transparent onRequestClose={() => setAddFocusOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddFocusOpen(false)}>
          <Pressable
            style={[styles.modalCard, modalCardShell(isLight, isV2), isLight ? { backgroundColor: brand.canvasBase, borderColor: colors.border } : null]}
            onPress={() => {}}
          >
            <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Фокус недели</Text>
            <TextInput
              value={focusDraftTitle}
              onChangeText={setFocusDraftTitle}
              placeholder="Что важно на этой неделе?"
              placeholderTextColor={colors.textMuted}
              style={[typography.body, minimalField(colors, isLight), { marginTop: 14 }]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Pressable onPress={() => setAddFocusOpen(false)} style={[ghostBtn('transparent', colors, brand), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontWeight: '800', color: colors.text }}>Отмена</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <GradientPrimaryButton
                  label="Добавить"
                  isLight={isLight}
                  gradientColors={ctaGradient}
                  accentRgb={isV2 ? '160, 106, 240' : '157, 107, 255'}
                  enableGlow={!isV2}
                  compact
                  onPress={() => {
                    if (!focusDraftTitle.trim()) {
                      Alert.alert('Введи текст фокуса');
                      return;
                    }
                    createFocusMut.mutate(
                      { title: focusDraftTitle },
                      {
                        onError: (e) => Alert.alert('Ошибка', (e as Error).message ?? 'Не удалось сохранить'),
                      }
                    );
                  }}
                  disabled={createFocusMut.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={dayModalKey != null} animationType="slide" transparent onRequestClose={() => setDayModalKey(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDayModalKey(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: brand.canvasBase, borderColor: colors.border, overflow: 'visible' }]}
            onPress={() => {}}
          >
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
                <Text style={[typography.caption, { marginTop: spacing.lg, fontWeight: '800' }]}>СОБЫТИЯ</Text>
                {dayModalEvents.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textMuted, marginTop: 6 }]}>Нет событий</Text>
                ) : (
                  dayModalEvents.map((ev) => (
                    <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <Pressable onPress={() => openEventEditor(ev)} {...(webEventTitleProps(ev.title) as object)} style={{ flex: 1 }}>
                        <Text style={[typography.body, { color: colors.text }]}>• {ev.title}</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteEventMut.mutate(ev.id)}>
                        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))
                )}
                <Text style={[typography.caption, { marginTop: spacing.lg, fontWeight: '800' }]}>НОВОЕ СОБЫТИЕ</Text>
                <TextInput
                  value={modalNewTitle}
                  onChangeText={setModalNewTitle}
                  placeholder="Название"
                  placeholderTextColor={colors.textMuted}
                  style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 8 }]}
                />
                <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textMuted }]}>Время (необязательно), HH:mm</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <TextInput
                    value={modalDayStart}
                    onChangeText={setModalDayStart}
                    placeholder="09:00"
                    placeholderTextColor={colors.textMuted}
                    style={[typography.body, { color: colors.text, flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }]}
                  />
                  <TextInput
                    value={modalDayEnd}
                    onChangeText={setModalDayEnd}
                    placeholder="10:00"
                    placeholderTextColor={colors.textMuted}
                    style={[typography.body, { color: colors.text, flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }]}
                  />
                </View>
                <Pressable onPress={addDayEvent} disabled={createEventMut.isPending} style={[primaryBtn(fillAccent), { marginTop: spacing.md }]}>
                  <Text style={primaryBtnText(onAccent)}>Добавить</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editingNote != null} animationType="fade" transparent onRequestClose={() => setEditingNote(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingNote(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: brand.canvasBase, borderColor: colors.border, maxHeight: '70%' }]} onPress={() => {}}>
            <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Заметка</Text>
            <TextInput
              value={noteEditBody}
              onChangeText={setNoteEditBody}
              multiline
              style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 12, minHeight: 120, textAlignVertical: 'top' }]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <Pressable onPress={() => setEditingNote(null)} style={[ghostBtn('transparent', colors, brand), { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontWeight: '800', color: colors.text }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!editingNote) return;
                  updateNoteMut.mutate({ id: editingNote.id, body: noteEditBody });
                }}
                disabled={updateNoteMut.isPending}
                style={[primaryBtn(fillAccent), { flex: 1 }]}
              >
                <Text style={primaryBtnText(onAccent)}>Сохранить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editingEvent != null} animationType="slide" transparent onRequestClose={() => setEditingEvent(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingEvent(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: brand.canvasBase, borderColor: colors.border, maxHeight: '90%' }]} onPress={() => {}}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ overflow: 'visible' }}
              contentContainerStyle={{ overflow: 'visible', paddingBottom: 24 }}
            >
              <Text style={[typography.title2, { color: colors.text, fontWeight: '900' }]}>Событие</Text>
              <Text style={[typography.caption, { marginTop: spacing.md }]}>Название</Text>
              <TextInput
                value={evEditTitle}
                onChangeText={setEvEditTitle}
                style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 6 }]}
              />
              <Text style={[typography.caption, { marginTop: spacing.md }]}>Дата</Text>
              <View style={{ marginTop: 6, zIndex: 20 }}>
                <MiniMonthDateField
                  value={evEditDate}
                  onChange={setEvEditDate}
                  onClear={() => setEvEditDate('')}
                  allowClear
                  fallbackMonthFromKey={editingEvent?.event_date ?? weekAnchorKey}
                  todayKey={todayKey}
                  isLight={isLight}
                  colors={colors}
                  fieldStyle={minimalField(colors, isLight)}
                  typographyBody={typography.body}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>Целый день</Text>
                <Switch value={evAllDay} onValueChange={setEvAllDay} trackColor={{ false: colors.border, true: fillAccent }} />
              </View>
              {!evAllDay ? (
                <>
                  <Text style={[typography.caption, { marginTop: spacing.sm }]}>Начало / конец (HH:mm)</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TextInput
                      value={evEditStart}
                      onChangeText={setEvEditStart}
                      style={[typography.body, { color: colors.text, flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }]}
                    />
                    <TextInput
                      value={evEditEnd}
                      onChangeText={setEvEditEnd}
                      style={[typography.body, { color: colors.text, flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 }]}
                    />
                  </View>
                </>
              ) : null}
              <Text style={[typography.caption, { marginTop: spacing.md }]}>Заметка</Text>
              <TextInput
                value={evEditNote}
                onChangeText={setEvEditNote}
                multiline
                style={[typography.body, { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 6, minHeight: 72, textAlignVertical: 'top' }]}
              />
              <Pressable onPress={saveEditedEvent} disabled={updateEventMut.isPending} style={[primaryBtn(fillAccent), { marginTop: spacing.lg }]}>
                <Text style={primaryBtnText(onAccent)}>Сохранить</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!editingEvent) return;
                  Alert.alert('Удалить событие?', editingEvent.title, [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Удалить',
                      style: 'destructive',
                      onPress: () => {
                        deleteEventMut.mutate(editingEvent.id);
                        setEditingEvent(null);
                      },
                    },
                  ]);
                }}
                style={{ marginTop: spacing.md, alignItems: 'center', paddingVertical: 12 }}
              >
                <Text style={{ color: colors.danger, fontWeight: '800' }}>Удалить событие</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenCanvas>
  );
}

function confirmDeleteEvent(ev: PlannerCalendarEventRow, del: (id: string) => void) {
  Alert.alert('Удалить событие?', ev.title, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: () => del(ev.id) },
  ]);
}

function sectionLabel(colors: { textMuted: string }, isLight: boolean, isV2: boolean) {
  return {
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 1.55,
    color: isLight ? colors.textMuted : isV2 ? '#C49BFF' : 'rgba(210, 200, 255, 0.78)',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    ...(Platform.OS === 'web' && !isLight && !isV2 ? ({ textShadow: '0 0 22px rgba(157,107,255,0.45)' } as object) : {}),
  };
}

/** Контейнер левой инфо-панели. Для v2 — только заливка без обводки/blur. */
function leftInfoPanelShell(isV2: boolean) {
  if (isV2) {
    return {
      borderRadius: 20,
      borderWidth: 0,
      backgroundColor: '#1A1535',
    };
  }
  return {
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'rgba(20, 14, 38, 0.74)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 8,
        }),
  };
}

function cardShell(border: string, isLight: boolean, isV2: boolean) {
  if (!isLight) {
    if (isV2) {
      return {
        borderRadius: 16,
        borderWidth: 0,
        padding: 16,
        backgroundColor: '#1A1535',
      } as const;
    }
    return {
      borderRadius: 16,
      borderWidth: 0,
      padding: 16,
      backgroundColor: 'rgba(18, 10, 36, 0.74)',
    } as const;
  }
  return {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
  };
}

function notePlate(border: string, isLight: boolean, isV2: boolean) {
  if (!isLight) {
    if (isV2) {
      return {
        borderRadius: 14,
        borderWidth: 0,
        backgroundColor: '#1A1535',
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        gap: 10,
        padding: 14,
      } as const;
    }
    return {
      borderRadius: 14,
      borderWidth: 0,
      backgroundColor: 'rgba(18, 10, 36, 0.74)',
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 10,
      padding: 14,
    } as const;
  }
  return {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#F8FAFC',
  };
}

function modalCardShell(isLight: boolean, isV2: boolean) {
  if (!isLight) {
    if (isV2) {
      return {
        maxWidth: 420,
        width: '100%' as const,
        borderRadius: 20,
        borderWidth: 0,
        backgroundColor: '#1A1535',
      } as const;
    }
    return { ...calendarSynaptixCardStyle(), maxWidth: 420, width: '100%' as const } as const;
  }
  return { maxWidth: 420, width: '100%' as const };
}

function outlineCta(isLight: boolean, colors: { border: string }, isV2: boolean) {
  return {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isLight ? colors.border : isV2 ? '#A06AF0' : 'rgba(255,255,255,0.1)',
    backgroundColor: isLight ? 'transparent' : isV2 ? '#241C4A' : 'rgba(255,255,255,0.03)',
  };
}

function ghostBtn(bg: string, colors: { border: string; text: string }, brand: { surfaceBorderStrong: string }) {
  return {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.surfaceBorderStrong,
    backgroundColor: bg,
  };
}

/** Ghost-кнопки календаря в тёмном режиме: стекло + неоновая кромка (без смены hit-area). */
function ghostBtnCalendar(
  isLight: boolean,
  bg: string,
  colors: { border: string; text: string },
  brand: { surfaceBorderStrong: string },
  isV2: boolean,
) {
  if (isLight) return ghostBtn(bg, colors, brand);
  if (isV2) {
    return {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 0,
      backgroundColor: '#241C4A',
    };
  }
  return {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(157, 107, 255, 0.42)',
    backgroundColor: 'rgba(6, 4, 22, 0.52)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.35)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 44px rgba(0,0,0,0.62), 0 0 40px rgba(123,92,255,0.28), 0 0 80px rgba(244,114,182,0.08)',
        } as object)
      : {
          shadowColor: '#7B5CFF',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.32,
          shadowRadius: 16,
          elevation: 10,
        }),
  };
}

function primaryBtn(fill: string) {
  return {
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: fill,
  };
}

function primaryBtnText(on: string) {
  return { color: on, fontWeight: '800' as const, fontSize: 14 };
}

function SidebarEventRow({
  ev,
  isLight,
  isV2,
  onEdit,
  onDelete,
}: {
  ev: PlannerCalendarEventRow;
  isLight: boolean;
  isV2: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors, typography } = useAppTheme();
  const chip = ev.event_date ? (ev.starts_at && ev.ends_at ? `${ev.event_date} · ${isoToHm(ev.starts_at)}` : ev.event_date) : 'Без даты';
  const c = calendarChipColorForId(ev.id);
  if (!isLight) {
    if (isV2) {
      return (
        <View
          style={{
            marginBottom: 10,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 0,
            backgroundColor: '#1A1535',
          }}
        >
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Pressable onPress={onEdit} {...(webEventTitleProps(ev.title) as object)} style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.caption, { color: '#C49BFF', fontWeight: '800' }]}>{chip}</Text>
                <Text style={{ color: '#F3EEFF', fontWeight: '700', marginTop: 4, fontSize: 14 }} numberOfLines={4}>
                  {ev.title}
                </Text>
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={'#C49BFF'} />
              </Pressable>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View
        style={{
          marginBottom: 10,
          borderRadius: 14,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          ...(Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
              } as object)
            : {}),
        }}
      >
        <LinearGradient colors={['rgba(18,10,36,0.5)', 'rgba(22,14,44,0.28)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Pressable onPress={onEdit} {...(webEventTitleProps(ev.title) as object)} style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.caption, { color: 'rgba(196,181,253,0.82)', fontWeight: '800' }]}>{chip}</Text>
              <Text style={{ color: '#F3EEFF', fontWeight: '700', marginTop: 4, fontSize: 14 }} numberOfLines={4}>
                {ev.title}
              </Text>
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={'rgba(196,181,253,0.82)'} />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.12)' }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c, marginTop: 2 }} />
      <Pressable onPress={onEdit} {...(webEventTitleProps(ev.title) as object)} style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800' }]}>{chip}</Text>
        <Text style={[typography.body, { color: colors.text, fontWeight: '700', marginTop: 2, fontSize: 14 }]} numberOfLines={3}>
          {ev.title}
        </Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function focusCheckboxBox(done: boolean, isLight: boolean, fillAccent: string) {
  return {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: done ? fillAccent : isLight ? 'rgba(15,17,24,0.35)' : 'rgba(157,107,255,0.5)',
    backgroundColor: done ? fillAccent : 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}

function TodayTaskRow({
  task,
  isLast,
  colors,
  isLight,
  fillAccent,
  toggleBusy,
  onToggle,
}: {
  task: PlannerTaskRow;
  isLast: boolean;
  colors: { text: string; textMuted: string };
  isLight: boolean;
  fillAccent: string;
  toggleBusy: boolean;
  onToggle: () => void;
}) {
  const done = task.is_done;
  const rule = isLight ? 'rgba(128,128,128,0.12)' : 'rgba(157,107,255,0.14)';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: rule,
        opacity: toggleBusy ? 0.55 : 1,
      }}
    >
      <Pressable onPress={onToggle} hitSlop={8} disabled={toggleBusy} style={{ paddingTop: 2 }}>
        <View style={focusCheckboxBox(done, isLight, fillAccent)}>{done ? <Ionicons name="checkmark" size={14} color="#FAFAFC" /> : null}</View>
      </Pressable>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '700',
          color: isLight ? colors.text : '#F4F2FF',
          textDecorationLine: done ? 'line-through' : 'none',
          opacity: done ? 0.5 : 1,
        }}
        numberOfLines={4}
      >
        {task.title}
      </Text>
    </View>
  );
}

function FocusLine({
  item,
  isLast,
  colors,
  isLight,
  isV2,
  fillAccent,
  toggleBusy,
  onToggleDone,
}: {
  item: PlannerWeekFocusListItem;
  isLast: boolean;
  colors: { text: string; textMuted: string };
  isLight: boolean;
  isV2: boolean;
  fillAccent: string;
  toggleBusy: boolean;
  onToggleDone: () => void;
}) {
  const done = item.kind === 'task' ? item.task.is_done : item.row.is_done;
  const title = item.kind === 'task' ? item.task.title : item.row.title;
  const isTask = item.kind === 'task';
  const chip = isTask ? `${shortWeekdayRu(item.task.day_date)} ${item.task.day_date.slice(5)}` : 'Неделя';
  const rule = isLight ? 'rgba(128,128,128,0.12)' : 'rgba(157,107,255,0.14)';
  const chipColor = isLight ? colors.textMuted : 'rgba(196,181,253,0.72)';
  const titleColor = isLight ? colors.text : '#F4F2FF';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: rule,
        opacity: toggleBusy ? 0.55 : 1,
      }}
    >
      <Pressable onPress={onToggleDone} hitSlop={8} disabled={toggleBusy} style={{ paddingTop: 2 }}>
        <View style={focusCheckboxBox(done, isLight, fillAccent)}>{done ? <Ionicons name="checkmark" size={14} color="#FAFAFC" /> : null}</View>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: chipColor }}>{chip}</Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: titleColor,
            marginTop: 2,
            textDecorationLine: done ? 'line-through' : 'none',
            opacity: done ? 0.5 : 1,
            ...(Platform.OS === 'web' && !isLight && !isV2 && !done ? ({ textShadow: '0 0 16px rgba(157,107,255,0.22)' } as object) : {}),
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 16 },
  modalCard: { borderRadius: 20, padding: 20, borderWidth: 1, maxHeight: '88%' },
});
