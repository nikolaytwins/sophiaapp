import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import { calendarChipColorForId, eventPastelForId } from '@/features/calendar/calendarEventChips';
import { shortWeekdayRu } from '@/features/calendar/calendarFormat';
import { isoToHm } from '@/features/calendar/calendarLocalTime';
import {
  WEEK_GRID_HOUR_END,
  WEEK_GRID_HOUR_START,
  WEEK_GRID_SLOT_PX,
  allDayEventsOnDay,
  layoutTimedEventOnDay,
  timedEventsStartingOnDay,
  weekGridTotalHeightPx,
} from '@/features/calendar/calendarWeekHourLayout';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { useAppTheme } from '@/theme';

const COL_HEADER_H = 56;
const ALLDAY_MIN_H = 48;
const TIME_RAIL_TOP = COL_HEADER_H + ALLDAY_MIN_H;
const TIME_RAIL_W = 40;

function tasksOnDay(tasks: PlannerTaskRow[], dateKey: string): PlannerTaskRow[] {
  return tasks.filter((t) => t.day_date === dateKey);
}

function floatingCardShadow(isLight: boolean): object {
  if (Platform.OS === 'web') {
    return {
      boxShadow: isLight ? '0 4px 18px rgba(15,17,24,0.08)' : '0 8px 28px rgba(0,0,0,0.45)',
    };
  }
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isLight ? 0.12 : 0.35,
      shadowRadius: 10,
    };
  }
  return { elevation: 5 };
}

type Props = {
  dayKeys: string[];
  weekEvents: PlannerCalendarEventRow[];
  weekTasks: PlannerTaskRow[];
  todayKey: string;
  onOpenDay: (dateKey: string) => void;
  onOpenEvent: (ev: PlannerCalendarEventRow) => void;
};

/** Неделя: общая шкала часов слева + колонки по дням с «весь день» и почасовой сеткой. */
export function CalendarWeekHourlyBoard({ dayKeys, weekEvents, weekTasks, todayKey, onOpenDay, onOpenEvent }: Props) {
  const { colors, brand, typography, isLight } = useAppTheme();
  const fillAccent = brand.primary;
  const gridH = weekGridTotalHeightPx();
  const hours = Array.from({ length: WEEK_GRID_HOUR_END - WEEK_GRID_HOUR_START + 1 }, (_, i) => WEEK_GRID_HOUR_START + i);
  const hourLineColor = isLight ? 'rgba(15,17,24,0.07)' : 'rgba(255,255,255,0.08)';
  const colDivider = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.07)';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, width: '100%' }}>
      <View style={{ flexDirection: 'row', minWidth: 720 }}>
        <View style={{ width: TIME_RAIL_W, paddingTop: TIME_RAIL_TOP }}>
          {hours.map((h) => (
            <View key={h} style={{ height: WEEK_GRID_SLOT_PX, justifyContent: 'flex-end', paddingBottom: 2 }}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '600',
                  color: colors.textMuted,
                  opacity: 0.75,
                  textAlign: 'right',
                  paddingRight: 8,
                }}
              >
                {h}:00
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 0 }}>
          {dayKeys.map((dk, colIdx) => {
            const isToday = dk === todayKey;
            const allDay = allDayEventsOnDay(weekEvents, dk);
            const timed = timedEventsStartingOnDay(weekEvents, dk);
            const tks = tasksOnDay(weekTasks, dk);
            return (
              <View
                key={dk}
                style={{
                  flex: 1,
                  minWidth: 96,
                  marginLeft: colIdx > 0 ? 10 : 0,
                  paddingLeft: colIdx > 0 ? 10 : 0,
                  borderLeftWidth: colIdx > 0 ? 1 : 0,
                  borderLeftColor: colDivider,
                  borderRadius: 14,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: isToday ? fillAccent : 'transparent',
                  backgroundColor: 'transparent',
                  overflow: 'visible',
                }}
              >
                <Pressable
                  onPress={() => onOpenDay(dk)}
                  style={{ minHeight: COL_HEADER_H, paddingHorizontal: 8, paddingVertical: 12, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, opacity: 0.85 }}>{shortWeekdayRu(dk)}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4, letterSpacing: -0.3 }}>
                    {Number(dk.slice(8, 10))}
                  </Text>
                </Pressable>

                <View style={{ paddingHorizontal: 4, paddingBottom: 8, minHeight: ALLDAY_MIN_H, maxHeight: 92 }}>
                  {allDay.map((ev) => {
                    const p = eventPastelForId(ev.id);
                    return (
                      <Pressable
                        key={ev.id}
                        onPress={() => onOpenEvent(ev)}
                        style={{
                          marginBottom: 6,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          backgroundColor: p.fill,
                          borderWidth: 1,
                          borderColor: p.border,
                          ...(floatingCardShadow(isLight) as object),
                        }}
                      >
                        <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '800', color: p.text }}>
                          {ev.title}
                        </Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: p.sub, marginTop: 3, opacity: 0.9 }}>Весь день</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ height: gridH, position: 'relative', marginBottom: 10 }}>
                  {hours.map((h) => (
                    <View
                      key={`${dk}-h-${h}`}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: (h - WEEK_GRID_HOUR_START) * WEEK_GRID_SLOT_PX,
                        height: WEEK_GRID_SLOT_PX,
                        borderBottomWidth: 1,
                        borderBottomColor: hourLineColor,
                      }}
                    />
                  ))}
                  {timed.map((ev) => {
                    const lay = layoutTimedEventOnDay(ev, dk);
                    if (!lay) return null;
                    const p = eventPastelForId(ev.id);
                    const showMeta = lay.height >= 40;
                    const showFaces = lay.height >= 56;
                    return (
                      <Pressable
                        key={ev.id}
                        onPress={() => onOpenEvent(ev)}
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top: lay.top,
                          height: lay.height,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          backgroundColor: p.fill,
                          borderWidth: 1,
                          borderColor: p.border,
                          zIndex: 2,
                          ...(floatingCardShadow(isLight) as object),
                        }}
                      >
                        {showMeta ? (
                          <Text style={{ fontSize: 9, fontWeight: '700', color: p.sub, marginBottom: 4 }} numberOfLines={1}>
                            {isoToHm(ev.starts_at!)} – {isoToHm(ev.ends_at!)}
                          </Text>
                        ) : null}
                        <Text numberOfLines={lay.height < 52 ? 2 : 4} style={{ fontSize: 12, fontWeight: '800', color: p.text, lineHeight: 15 }}>
                          {ev.title}
                        </Text>
                        {showFaces ? (
                          <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                            {[0, 1].map((i) => (
                              <View
                                key={i}
                                style={{
                                  marginLeft: i > 0 ? -6 : 0,
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: 'rgba(255,255,255,0.55)',
                                  borderWidth: 1,
                                  borderColor: p.border,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Ionicons name="person" size={12} color={p.sub} />
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {tks.length > 0 ? (
                  <View style={{ paddingHorizontal: 6, paddingBottom: 10 }}>
                    <Text style={[typography.caption, { fontWeight: '800', marginBottom: 6, color: colors.textMuted, fontSize: 10 }]}>Задачи</Text>
                    {tks.map((t) => (
                      <View
                        key={t.id}
                        style={{
                          marginBottom: 6,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: isLight ? 'rgba(99,102,241,0.25)' : 'rgba(167,139,250,0.35)',
                          backgroundColor: isLight ? 'rgba(99,102,241,0.06)' : 'rgba(167,139,250,0.08)',
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 11, fontWeight: '700', color: colors.text, textDecorationLine: t.is_done ? 'line-through' : 'none', opacity: t.is_done ? 0.5 : 1 }}
                        >
                          {t.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
