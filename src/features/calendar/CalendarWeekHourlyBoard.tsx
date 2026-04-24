import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import { eventGemForEvent, eventGemWebShadow, eventPastelForEvent } from '@/features/calendar/calendarEventChips';
import { shortWeekdayRu } from '@/features/calendar/calendarFormat';
import { webEventTitleProps } from '@/features/calendar/calendarWebTooltip';
import { isoToHm } from '@/features/calendar/calendarLocalTime';
import {
  WEEK_COL_HEADER_H,
  WEEK_GRID_HOUR_END,
  WEEK_GRID_HOUR_START,
  WEEK_GRID_SLOT_PX,
  allDayEventsOnDay,
  layoutTimedEventOnDay,
  timedEventsStartingOnDay,
  weekAllDayRowHeightPx,
  weekGridTotalHeightPx,
} from '@/features/calendar/calendarWeekHourLayout';
import { useAppTheme } from '@/theme';

const TIME_RAIL_W = 40;

function floatingCardShadowLight(): object {
  if (Platform.OS === 'web') {
    return { boxShadow: '0 4px 18px rgba(15,17,24,0.08)' };
  }
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    };
  }
  return { elevation: 5 };
}

function gemNativeShadow(gem: ReturnType<typeof eventGemForEvent>): object {
  const accent = Boolean(gem.isAccent);
  if (Platform.OS === 'ios') {
    return {
      shadowColor: `rgba(${gem.glowRgb},${accent ? 0.78 : 0.55})`,
      shadowOffset: { width: 0, height: accent ? 8 : 6 },
      shadowOpacity: accent ? 0.52 : 0.35,
      shadowRadius: accent ? 22 : 14,
    };
  }
  return { elevation: accent ? 12 : 8 };
}

type Props = {
  dayKeys: string[];
  weekEvents: PlannerCalendarEventRow[];
  todayKey: string;
  /** На широком экране колонки тянутся на всю ширину панели. */
  fullWidthGrid?: boolean;
  onOpenDay: (dateKey: string) => void;
  onOpenEvent: (ev: PlannerCalendarEventRow) => void;
};

/** Неделя: общая шкала часов слева + колонки по дням с «весь день» и почасовой сеткой. */
export function CalendarWeekHourlyBoard({ dayKeys, weekEvents, todayKey, fullWidthGrid, onOpenDay, onOpenEvent }: Props) {
  const { colors, brand, isLight } = useAppTheme();
  const fillAccent = brand.primary;
  const gridH = weekGridTotalHeightPx();
  const hours = Array.from({ length: WEEK_GRID_HOUR_END - WEEK_GRID_HOUR_START + 1 }, (_, i) => WEEK_GRID_HOUR_START + i);
  const hourLineColor = isLight ? 'rgba(15,17,24,0.07)' : 'rgba(255,255,255,0.055)';
  const colDivider = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(123, 92, 255, 0.16)';
  const allDayRowH = weekAllDayRowHeightPx(dayKeys, weekEvents);

  const dayColumnChrome = (dk: string, colIdx: number) => {
    const isToday = dk === todayKey;
    return {
      flex: 1,
      minWidth: fullWidthGrid ? 0 : 88,
      marginLeft: colIdx > 0 ? 8 : 0,
      paddingLeft: colIdx > 0 ? 8 : 0,
      borderLeftWidth: colIdx > 0 ? 1 : 0,
      borderLeftColor: colDivider,
      borderRadius: 14,
      borderWidth: isToday ? 1 : 0,
      borderColor: isToday ? (isLight ? fillAccent : 'rgba(157, 107, 255, 0.55)') : 'transparent',
      backgroundColor: isToday && !isLight ? 'rgba(123, 92, 255, 0.06)' : 'transparent',
      overflow: 'visible' as const,
      ...(Platform.OS === 'web' && isToday && !isLight
        ? ({
            boxShadow:
              '0 0 0 1px rgba(157, 107, 255, 0.55), 0 0 40px rgba(123, 92, 255, 0.42), 0 24px 56px rgba(0,0,0,0.58), inset 0 0 56px rgba(123,92,255,0.09)',
          } as object)
        : {}),
    };
  };

  const renderAllDayChips = (dk: string) => {
    const allDay = allDayEventsOnDay(weekEvents, dk);
    return allDay.map((ev) => {
      if (isLight) {
        const p = eventPastelForEvent(ev);
        return (
          <Pressable
            key={ev.id}
            onPress={() => onOpenEvent(ev)}
            {...(webEventTitleProps(ev.title) as object)}
            style={{
              marginBottom: 6,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: p.fill,
              borderWidth: 1,
              borderColor: p.border,
              ...(floatingCardShadowLight() as object),
            }}
          >
            <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '800', color: p.text }}>
              {ev.title}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: p.sub, marginTop: 3, opacity: 0.9 }}>Весь день</Text>
          </Pressable>
        );
      }
      const g = eventGemForEvent(ev);
      return (
        <Pressable
          key={ev.id}
          onPress={() => onOpenEvent(ev)}
          {...(webEventTitleProps(ev.title) as object)}
          style={{
            marginBottom: 6,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: g.border,
            ...(Platform.OS === 'web' ? ({ boxShadow: eventGemWebShadow(g) } as object) : (gemNativeShadow(g) as object)),
          }}
        >
          <LinearGradient colors={[...g.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '800', color: g.text }}>
              {ev.title}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: g.sub, marginTop: 3 }}>Весь день</Text>
          </LinearGradient>
        </Pressable>
      );
    });
  };

  const renderTimedLayer = (dk: string) => {
    const timed = timedEventsStartingOnDay(weekEvents, dk);
    return (
      <View style={{ height: gridH, position: 'relative', marginBottom: 10, width: '100%' }}>
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
          const showMeta = lay.height >= 40;
          const showFaces = lay.height >= 56;

          if (isLight) {
            const p = eventPastelForEvent(ev);
            return (
              <Pressable
                key={ev.id}
                onPress={() => onOpenEvent(ev)}
                {...(webEventTitleProps(ev.title) as object)}
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
                  ...(floatingCardShadowLight() as object),
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
          }

          const g = eventGemForEvent(ev);
          return (
            <Pressable
              key={ev.id}
              onPress={() => onOpenEvent(ev)}
              {...(webEventTitleProps(ev.title) as object)}
              style={{
                position: 'absolute',
                left: 4,
                right: 4,
                top: lay.top,
                height: lay.height,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: g.border,
                zIndex: 2,
                ...(Platform.OS === 'web' ? ({ boxShadow: eventGemWebShadow(g) } as object) : (gemNativeShadow(g) as object)),
              }}
            >
              <LinearGradient colors={[...g.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 8 }}>
                {showMeta ? (
                  <Text style={{ fontSize: 9, fontWeight: '700', color: g.sub, marginBottom: 4 }} numberOfLines={1}>
                    {isoToHm(ev.starts_at!)} – {isoToHm(ev.ends_at!)}
                  </Text>
                ) : null}
                <Text numberOfLines={lay.height < 52 ? 2 : 4} style={{ fontSize: 12, fontWeight: '800', color: g.text, lineHeight: 15 }}>
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
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderWidth: 1,
                          borderColor: g.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="person" size={12} color={g.sub} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const gridRow = (
    <View style={{ flexDirection: 'row', width: fullWidthGrid ? ('100%' as const) : undefined, minWidth: fullWidthGrid ? undefined : 780, alignSelf: 'stretch' }}>
      <View style={{ width: TIME_RAIL_W, flexShrink: 0 }}>
        <View style={{ height: WEEK_COL_HEADER_H }} />
        <View style={{ height: allDayRowH }} />
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

      <View style={{ flex: 1, flexDirection: 'row', minWidth: 0 }}>
        {dayKeys.map((dk, colIdx) => (
          <View key={dk} style={dayColumnChrome(dk, colIdx)}>
            <Pressable
              onPress={() => onOpenDay(dk)}
              style={{ height: WEEK_COL_HEADER_H, paddingHorizontal: 6, justifyContent: 'center' }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: isLight ? colors.textMuted : 'rgba(196,181,253,0.72)',
                  opacity: isLight ? 0.85 : 1,
                }}
              >
                {shortWeekdayRu(dk)}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: isLight ? colors.text : '#F5F3FF',
                  marginTop: 4,
                  letterSpacing: -0.35,
                  ...(Platform.OS === 'web' && !isLight && dk === todayKey
                    ? ({ textShadow: '0 0 28px rgba(157,107,255,0.45)' } as object)
                    : {}),
                }}
              >
                {Number(dk.slice(8, 10))}
              </Text>
            </Pressable>

            <View style={{ height: allDayRowH, overflow: 'hidden' }}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 2, paddingBottom: 8 }}
              >
                {renderAllDayChips(dk)}
              </ScrollView>
            </View>

            {renderTimedLayer(dk)}
          </View>
        ))}
      </View>
    </View>
  );

  if (fullWidthGrid) {
    return <View style={{ width: '100%', alignSelf: 'stretch' }}>{gridRow}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {gridRow}
    </ScrollView>
  );
}
