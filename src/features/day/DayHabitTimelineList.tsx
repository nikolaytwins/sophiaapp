import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import {
  getWeekDayKeys,
  habitCadenceLabel,
  habitDoneOnDate,
} from '@/features/day/dayHabitUi';
import { promptDeleteHabit } from '@/features/day/promptDeleteHabit';
import { countCompletionsInWeekRange, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { useAppTheme } from '@/theme';

const ICON_BG: string[] = [
  'rgba(168,85,247,0.22)',
  'rgba(59,130,246,0.2)',
  'rgba(236,72,153,0.2)',
  'rgba(139,92,246,0.22)',
  'rgba(249,115,22,0.2)',
  'rgba(139,92,246,0.2)',
];

type Props = {
  habits: Habit[];
  loading: boolean;
  emptyHint: ReactNode;
  viewDateKey: string;
  todayKey: string;
  onToggle: (habit: Habit) => void;
  onRequestDelete?: (habit: Habit) => void;
};

function streakSubtitle(h: Habit, viewDateKey: string, todayKey: string): string {
  if (h.cadence === 'daily') {
    if (h.streak > 0) return `Стрик · ${h.streak} дн.`;
    return habitCadenceLabel(h);
  }
  const weekStart = startOfWeekMondayKey(viewDateKey);
  const weekCount =
    h.completionDates != null
      ? countCompletionsInWeekRange(h.completionDates, weekStart)
      : (h.weeklyCompleted ?? 0);
  const target = h.weeklyTarget ?? 1;
  const doneThisDay = habitDoneOnDate(h, viewDateKey);
  const dayLabel = viewDateKey === todayKey ? 'Сегодня' : 'В выбранный день';
  return `${dayLabel}: ${doneThisDay ? 'отмечено' : 'нет отметки'} · ${weekCount}/${target} за неделю`;
}

function rightMeta(h: Habit): string {
  if (h.cadence === 'daily') return 'Ежедн.';
  const t = h.weeklyTarget ?? 1;
  return `${t}×/нед`;
}

export function DayHabitTimelineList({
  habits,
  loading,
  emptyHint,
  viewDateKey,
  todayKey,
  onToggle,
  onRequestDelete,
}: Props) {
  const { spacing, colors, radius, brand, isLight } = useAppTheme();

  if (loading) {
    return (
      <View style={{ paddingVertical: 28, alignItems: 'center' }}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  if (habits.length === 0) {
    return <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{emptyHint}</Text>;
  }

  return (
    <View style={{ gap: 0 }}>
      {habits.map((h, index) => {
        const isLast = index === habits.length - 1;
        const future = viewDateKey > todayKey;
        const done = habitDoneOnDate(h, viewDateKey);
        const weekKeys = getWeekDayKeys(viewDateKey);
        const iconBg = ICON_BG[index % ICON_BG.length]!;
        const canDelete = onRequestDelete && !future;

        return (
          <View
            key={h.id}
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              marginBottom: isLast ? 0 : spacing.sm + 2,
            }}
          >
            <View style={{ width: 36, alignItems: 'center' }}>
              <Pressable
                disabled={future}
                onPress={() => onToggle(h)}
                accessibilityRole="button"
                accessibilityLabel={done ? 'Снять отметку' : 'Отметить привычку'}
                style={({ pressed }) => ({
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: done ? 0 : 2,
                  borderColor: 'rgba(255,255,255,0.22)',
                  backgroundColor: done ? colors.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: future ? 0.4 : pressed ? 0.88 : 1,
                })}
              >
                {done ? (
                  <Ionicons name="checkmark" size={18} color={isLight ? '#FFFFFF' : 'rgba(22,22,28,0.94)'} />
                ) : null}
              </Pressable>
              {!isLast ? (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    alignItems: 'center',
                    minHeight: spacing.md + 4,
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      width: 0,
                      borderLeftWidth: 2,
                      borderLeftColor: 'rgba(255,255,255,0.12)',
                      borderStyle: 'dashed',
                    }}
                  />
                </View>
              ) : null}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.045)',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={h.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={done ? colors.text : 'rgba(255,255,255,0.78)'}
                  />
                </View>

                <Pressable
                  disabled={future}
                  onPress={() => onToggle(h)}
                  onLongPress={canDelete ? () => promptDeleteHabit(h, () => onRequestDelete!(h)) : undefined}
                  delayLongPress={480}
                  style={({ pressed }) => ({
                    flex: 1,
                    minWidth: 0,
                    opacity: future ? 0.45 : pressed ? 0.94 : 1,
                  })}
                >
                  <View>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        letterSpacing: -0.3,
                        color: colors.text,
                        lineHeight: 21,
                      }}
                    >
                      {h.name}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.42)',
                      }}
                      numberOfLines={1}
                    >
                      {streakSubtitle(h, viewDateKey, todayKey)}
                    </Text>
                    {h.cadence === 'weekly' ? (
                      <View style={{ flexDirection: 'row', marginTop: 8, gap: 4 }}>
                        {weekKeys.map((dk) => {
                          const hit = habitDoneOnDate(h, dk);
                          const isView = dk === viewDateKey;
                          return (
                            <View
                              key={dk}
                              style={{
                                flex: 1,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: hit ? 'rgba(168,85,247,0.75)' : 'rgba(255,255,255,0.08)',
                                borderWidth: isView ? 1 : 0,
                                borderColor: 'rgba(196,181,253,0.7)',
                              }}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                {canDelete ? (
                  <Pressable
                    onPress={() => promptDeleteHabit(h, () => onRequestDelete(h))}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Удалить привычку"
                    style={({ pressed }) => ({
                      padding: 6,
                      alignSelf: 'flex-start',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Ionicons name="trash-outline" size={18} color="rgba(248,113,113,0.85)" />
                  </Pressable>
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingLeft: spacing.sm,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderLeftColor: 'rgba(255,255,255,0.12)',
                    alignSelf: 'stretch',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.38)" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.45)',
                      width: 44,
                    }}
                    numberOfLines={2}
                  >
                    {rightMeta(h)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
