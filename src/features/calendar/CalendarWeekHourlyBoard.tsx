import { Pressable, ScrollView, Text, View } from 'react-native';

const COL_HEADER_H = 52;
const ALLDAY_MIN_H = 44;
const TIME_RAIL_TOP = COL_HEADER_H + ALLDAY_MIN_H;

import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import { calendarChipColorForId } from '@/features/calendar/calendarEventChips';
import {
  WEEK_GRID_HOUR_END,
  WEEK_GRID_HOUR_START,
  WEEK_GRID_SLOT_PX,
  allDayEventsOnDay,
  layoutTimedEventOnDay,
  timedEventsStartingOnDay,
  weekGridTotalHeightPx,
} from '@/features/calendar/calendarWeekHourLayout';
import { shortWeekdayRu } from '@/features/calendar/calendarFormat';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { useAppTheme } from '@/theme';

function tasksOnDay(tasks: PlannerTaskRow[], dateKey: string): PlannerTaskRow[] {
  return tasks.filter((t) => t.day_date === dateKey);
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
  const mainShellBorder = isLight ? colors.border : brand.surfaceBorderStrong;
  const gridH = weekGridTotalHeightPx();
  const hours = Array.from({ length: WEEK_GRID_HOUR_END - WEEK_GRID_HOUR_START + 1 }, (_, i) => WEEK_GRID_HOUR_START + i);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, width: '100%' }}>
      <View style={{ flexDirection: 'row', minWidth: 720 }}>
        <View style={{ width: 44, paddingTop: TIME_RAIL_TOP }}>
          {hours.map((h) => (
            <View key={h} style={{ height: WEEK_GRID_SLOT_PX, justifyContent: 'flex-start', paddingTop: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textAlign: 'right', paddingRight: 6 }}>
                {h}:00
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
          {dayKeys.map((dk) => {
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
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isToday ? fillAccent : mainShellBorder,
                  backgroundColor: isToday ? brand.primaryMuted : isLight ? '#F3F4F8' : 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                }}
              >
                <Pressable onPress={() => onOpenDay(dk)} style={{ minHeight: COL_HEADER_H, paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted }}>{shortWeekdayRu(dk)}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 2 }}>{Number(dk.slice(8, 10))}</Text>
                </Pressable>

                <View style={{ paddingHorizontal: 6, paddingBottom: 6, minHeight: ALLDAY_MIN_H, maxHeight: 88 }}>
                  {allDay.map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => onOpenEvent(ev)}
                      style={{
                        marginBottom: 4,
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: `${calendarChipColorForId(ev.id)}22`,
                        borderLeftWidth: 3,
                        borderLeftColor: calendarChipColorForId(ev.id),
                      }}
                    >
                      <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>
                        {ev.title}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginTop: 2 }}>Весь день</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={{ height: gridH, position: 'relative', marginHorizontal: 4, marginBottom: 8 }}>
                  {hours.map((h) => (
                    <View
                      key={`${dk}-h-${h}`}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: (h - WEEK_GRID_HOUR_START) * WEEK_GRID_SLOT_PX,
                        height: WEEK_GRID_SLOT_PX,
                        borderTopWidth: 1,
                        borderTopColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  ))}
                  {timed.map((ev) => {
                    const lay = layoutTimedEventOnDay(ev, dk);
                    if (!lay) return null;
                    const c = calendarChipColorForId(ev.id);
                    return (
                      <Pressable
                        key={ev.id}
                        onPress={() => onOpenEvent(ev)}
                        style={{
                          position: 'absolute',
                          left: 2,
                          right: 2,
                          top: lay.top,
                          height: lay.height,
                          borderRadius: 12,
                          padding: 6,
                          backgroundColor: `${c}28`,
                          borderLeftWidth: 4,
                          borderLeftColor: c,
                          zIndex: 2,
                        }}
                      >
                        <Text numberOfLines={3} style={{ fontSize: 11, fontWeight: '900', color: colors.text }}>
                          {ev.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {tks.length > 0 ? (
                  <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                    <Text style={[typography.caption, { fontWeight: '800', marginBottom: 4 }]}>Задачи</Text>
                    {tks.map((t) => (
                      <View
                        key={t.id}
                        style={{
                          marginBottom: 4,
                          borderRadius: 10,
                          padding: 6,
                          borderWidth: 1,
                          borderColor: 'rgba(168,85,247,0.35)',
                          backgroundColor: 'rgba(168,85,247,0.08)',
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 10, fontWeight: '800', color: colors.text, textDecorationLine: t.is_done ? 'line-through' : 'none', opacity: t.is_done ? 0.55 : 1 }}
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
