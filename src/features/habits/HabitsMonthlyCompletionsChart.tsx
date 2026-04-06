import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import { localDateKey } from '@/features/habits/habitLogic';
import {
  lastNCalendarMonths,
  totalHabitCompletionsInMonth,
  yAxisMaxForCounts,
} from '@/features/habits/habitMonthlyCompletions';
import { useAppTheme } from '@/theme';

const CHART_HEIGHT = 200;
const MONTHS = 13;

const BAR_PURPLE: [string, string] = ['#C084FC', '#7C3AED'];

type Props = {
  habits: Habit[];
};

export function HabitsMonthlyCompletionsChart({ habits }: Props) {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const todayKey = localDateKey();

  const buckets = useMemo(() => lastNCalendarMonths(MONTHS, todayKey), [todayKey]);
  const counts = useMemo(
    () => buckets.map((b) => totalHabitCompletionsInMonth(habits, b.y, b.m, todayKey)),
    [buckets, habits, todayKey]
  );
  const yMax = useMemo(() => yAxisMaxForCounts(counts), [counts]);
  const ticks = useMemo(() => {
    const n = 5;
    return Array.from({ length: n }, (_, i) => Math.round((yMax * (n - 1 - i)) / (n - 1)));
  }, [yMax]);

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';
  const trackBg = 'rgba(255,255,255,0.08)';

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
      <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 }]}>
        Сумма отметок: каждый день × каждая привычка, если в этот день она выполнена.
      </Text>

      <View style={{ flexDirection: 'row', minHeight: CHART_HEIGHT + 28 }}>
        <View
          style={{
            width: 30,
            height: CHART_HEIGHT,
            justifyContent: 'space-between',
            paddingRight: 6,
            paddingTop: 2,
          }}
        >
          {ticks.map((t) => (
            <Text
              key={t}
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

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 4 }}>
          {buckets.map((b, i) => {
            const v = counts[i] ?? 0;
            const hRatio = yMax > 0 ? v / yMax : 0;
            const fillH = Math.max(hRatio * 100, v > 0 ? 8 : 0);
            return (
              <View key={`${b.y}-${b.m}`} style={{ flex: 1, height: CHART_HEIGHT, alignItems: 'center' }}>
                <View
                  style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: 28,
                    justifyContent: 'flex-end',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
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
                        height: `${fillH}%`,
                        minHeight: v > 0 ? 6 : 0,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 6,
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
  );
}
