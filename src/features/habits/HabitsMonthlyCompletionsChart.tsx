import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import { localDateKey } from '@/features/habits/habitLogic';
import {
  chartYMaxFromWindowValues,
  lastNCalendarMonths,
  totalHabitCompletionsInMonth,
} from '@/features/habits/habitMonthlyCompletions';
import { useAppTheme } from '@/theme';

const CHART_HEIGHT = 168;
/** Фиксированная высота трека столбца: % высоты внутри flex на web часто даёт 0px. */
const BAR_TRACK_PX = 110;
const TOTAL_MONTHS = 30;
const VISIBLE_MONTHS = 8;
const STEP_MONTHS = 2;

const BAR_PURPLE: [string, string] = ['#C084FC', '#7C3AED'];
const ACCENT = '#A855F7';

type Props = {
  habits: Habit[];
};

export function HabitsMonthlyCompletionsChart({ habits }: Props) {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const todayKey = localDateKey();

  const buckets = useMemo(() => lastNCalendarMonths(TOTAL_MONTHS, todayKey), [todayKey]);
  const counts = useMemo(
    () => buckets.map((b) => totalHabitCompletionsInMonth(habits, b.y, b.m, todayKey)),
    [buckets, habits, todayKey]
  );

  const maxStart = Math.max(0, buckets.length - VISIBLE_MONTHS);
  const [startIndex, setStartIndex] = useState(maxStart);

  useEffect(() => {
    setStartIndex(Math.max(0, buckets.length - VISIBLE_MONTHS));
  }, [buckets.length]);

  const sliceBuckets = useMemo(
    () => buckets.slice(startIndex, startIndex + VISIBLE_MONTHS),
    [buckets, startIndex]
  );
  const sliceCounts = useMemo(
    () => counts.slice(startIndex, startIndex + VISIBLE_MONTHS),
    [counts, startIndex]
  );

  const yMax = useMemo(() => chartYMaxFromWindowValues(sliceCounts), [sliceCounts]);
  const ticks = useMemo(() => {
    if (yMax <= 1) return [0];
    const mid = Math.round(yMax / 2);
    return [yMax, mid, 0];
  }, [yMax]);

  const canGoOlder = startIndex > 0;
  const canGoNewer = startIndex < maxStart;

  const shiftWindow = (delta: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setStartIndex((s) => {
      const next = s + delta;
      return Math.max(0, Math.min(maxStart, next));
    });
  };

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';
  const trackBg = 'rgba(255,255,255,0.08)';
  const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const rangeHint =
    sliceBuckets.length > 0
      ? `${sliceBuckets[0]!.label} ${sliceBuckets[0]!.y} — ${sliceBuckets[sliceBuckets.length - 1]!.label} ${sliceBuckets[sliceBuckets.length - 1]!.y}`
      : '';

  return (
    <View
      style={{
        marginTop: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: shellBg,
        borderWidth: 1,
        borderColor: shellBorder,
      }}
    >
      <Text
        style={[
          typography.caption,
          {
            color: 'rgba(196,181,253,0.85)',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: spacing.sm,
          },
        ]}
      >
        Выполнения по месяцам
      </Text>
      <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 }]}>
        Сумма отметок за день по всем привычкам. Шкала подстраивается под видимые месяцы.
      </Text>
      {rangeHint ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: 'rgba(196,181,253,0.75)',
            marginBottom: spacing.sm,
          }}
          numberOfLines={1}
        >
          {rangeHint}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 4 }}>
        <Pressable
          onPress={() => shiftWindow(-STEP_MONTHS)}
          disabled={!canGoOlder}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Более ранние месяцы"
          style={({ pressed }) => ({
            width: 36,
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.08)',
            backgroundColor: isLight ? 'rgba(15,17,24,0.03)' : 'rgba(255,255,255,0.04)',
            opacity: !canGoOlder ? 0.28 : pressed ? 0.85 : 1,
            ...webPointer,
          })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', minHeight: CHART_HEIGHT + 52 }}>
            <View
              style={{
                width: 28,
                height: CHART_HEIGHT,
                justifyContent: 'space-between',
                paddingRight: 4,
                paddingTop: 22,
              }}
            >
              {ticks.map((t) => (
                <Text
                  key={`tick-${t}`}
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: colors.textMuted,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {t}
                </Text>
              ))}
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'flex-end',
                height: CHART_HEIGHT,
                paddingTop: 20,
                minHeight: 0,
              }}
            >
              {sliceBuckets.map((b, j) => {
                const v = sliceCounts[j] ?? 0;
                const fillPx =
                  yMax > 0 ? Math.max(v > 0 ? 4 : 0, Math.round((v / yMax) * BAR_TRACK_PX)) : 0;
                const showYear = j === 0 || b.y !== sliceBuckets[j - 1]!.y;
                return (
                  <View
                    key={`${b.y}-${b.m}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      marginHorizontal: 1,
                      alignItems: 'center',
                      minHeight: 0,
                    }}
                  >
                    <View
                      style={{
                        height: 22,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      {showYear ? (
                        <View
                          style={{
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: 'rgba(168,85,247,0.16)',
                            borderWidth: 1,
                            borderColor: 'rgba(196,181,253,0.32)',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '900',
                              color: 'rgba(233,213,255,0.92)',
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {b.y}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View
                      style={{
                        height: BAR_TRACK_PX,
                        width: '100%',
                        maxWidth: 26,
                        justifyContent: 'flex-end',
                        marginTop: 2,
                      }}
                    >
                      <View
                        style={{
                          height: BAR_TRACK_PX,
                          width: '100%',
                          borderRadius: 999,
                          backgroundColor: trackBg,
                          overflow: 'hidden',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <LinearGradient
                          colors={BAR_PURPLE}
                          start={{ x: 0.5, y: 1 }}
                          end={{ x: 0.5, y: 0 }}
                          style={{
                            width: '100%',
                            height: fillPx,
                            borderRadius: 999,
                          }}
                        />
                      </View>
                    </View>
                    <Text
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        fontWeight: '900',
                        color: ACCENT,
                        fontVariant: ['tabular-nums'],
                      }}
                      numberOfLines={1}
                    >
                      {v}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 2,
                        fontSize: 9,
                        fontWeight: '700',
                        color: colors.textMuted,
                        textTransform: 'lowercase',
                      }}
                    >
                      {b.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => shiftWindow(STEP_MONTHS)}
          disabled={!canGoNewer}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Более поздние месяцы"
          style={({ pressed }) => ({
            width: 36,
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.08)',
            backgroundColor: isLight ? 'rgba(15,17,24,0.03)' : 'rgba(255,255,255,0.04)',
            opacity: !canGoNewer ? 0.28 : pressed ? 0.85 : 1,
            ...webPointer,
          })}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
