import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '@/theme/palettes';

import type { MonthGridCell } from '@/features/habits/habitCardVisual';
import { WEEKDAY_LABELS_SHORT } from '@/features/habits/habitCardVisual';
import { useAppTheme } from '@/theme';

/** Как на референсе: сплошной синий + тёмные цифры. */
const HEAT_DONE_BG = '#6495ED';
const HEAT_DONE_TEXT = '#0D1117';

const CELL_GAP = 8;
const CELL_RADIUS = 10;

function CalendarDayCell({
  cell,
  todayKey,
  completedSet,
  colors,
  isLight,
}: {
  cell: MonthGridCell;
  todayKey: string;
  completedSet: Set<string>;
  colors: AppPalette;
  isLight: boolean;
}) {

  if (!cell.dateKey) {
    return <View style={{ flex: 1, aspectRatio: 1, minWidth: 0 }} />;
  }

  const isFuture = cell.dateKey > todayKey;
  const done = !isFuture && completedSet.has(cell.dateKey);
  const isToday = cell.dateKey === todayKey;
  const [, , dd] = cell.dateKey.split('-');
  const label = dd ?? '';

  const idleText = isLight ? colors.text : 'rgba(255,255,255,0.92)';
  const futureText = isLight ? 'rgba(15,17,24,0.28)' : 'rgba(255,255,255,0.28)';

  return (
    <View
      style={{
        flex: 1,
        aspectRatio: 1,
        minWidth: 0,
        padding: CELL_GAP / 2,
      }}
      accessibilityLabel={
        isFuture ? `${label}, будущий день` : done ? `${label}, отмечено` : `${label}, без отметки`
      }
    >
      <View
        style={{
          flex: 1,
          borderRadius: CELL_RADIUS,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? HEAT_DONE_BG : 'transparent',
          borderWidth: !done && isToday && !isFuture ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: !done && isToday ? (isLight ? colors.borderStrong : 'rgba(255,255,255,0.22)') : 'transparent',
          opacity: isFuture ? 0.38 : 1,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: done ? '800' : isToday ? '700' : '600',
            fontVariant: ['tabular-nums'],
            color: done ? HEAT_DONE_TEXT : isFuture ? futureText : idleText,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  monthTitle: string;
  /** Например «72%» или «72% месяца». */
  monthStatLine?: string;
  monthWeekRows: MonthGridCell[][];
  completedSet: Set<string>;
  todayKey: string;
  isViewingCurrentMonth: boolean;
  todayWeekdayIdx: number;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

/**
 * Месячная сетка истории привычки: шапка со стрелками, подписи дней, ячейки с двузначными числами.
 */
export function HabitMonthCalendar({
  monthTitle,
  monthStatLine,
  monthWeekRows,
  completedSet,
  todayKey,
  isViewingCurrentMonth,
  todayWeekdayIdx,
  canGoPrevMonth,
  canGoNextMonth,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const { colors, isLight, radius, spacing, typography } = useAppTheme();

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';

  return (
    <View
      style={{
        width: '100%',
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: shellBg,
        borderWidth: 1,
        borderColor: shellBorder,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={onPrevMonth}
          disabled={!canGoPrevMonth}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          style={({ pressed }) => ({
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            opacity: !canGoPrevMonth ? 0.22 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && canGoPrevMonth ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs }}>
          <Text
            style={[
              typography.title2,
              {
                fontSize: 17,
                fontWeight: '700',
                color: colors.text,
                letterSpacing: -0.3,
                textAlign: 'center',
              },
            ]}
            numberOfLines={1}
          >
            {monthTitle}
          </Text>
          {monthStatLine ? (
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: '600',
                color: colors.textMuted,
                letterSpacing: 0.2,
              }}
            >
              {monthStatLine}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onNextMonth}
          disabled={!canGoNextMonth}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          style={({ pressed }) => ({
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            opacity: !canGoNextMonth ? 0.22 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && canGoNextMonth ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          width: '100%',
          gap: CELL_GAP,
          marginBottom: CELL_GAP,
        }}
      >
        {WEEKDAY_LABELS_SHORT.map((label, i) => {
          const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isTodayCol ? '800' : '600',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: isTodayCol ? colors.text : colors.textMuted,
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {monthWeekRows.map((row, ri) => (
        <View
          key={`cal-row-${ri}`}
          style={{
            flexDirection: 'row',
            width: '100%',
            marginBottom: ri < monthWeekRows.length - 1 ? 0 : 0,
            gap: CELL_GAP,
          }}
        >
          {row.map((cell, ci) => (
            <CalendarDayCell
              key={cell.dateKey ?? `empty-${ri}-${ci}`}
              cell={cell}
              todayKey={todayKey}
              completedSet={completedSet}
              colors={colors}
              isLight={isLight}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
