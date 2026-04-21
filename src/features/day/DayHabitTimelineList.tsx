import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import {
  getWeekDayKeys,
  habitCadenceLabel,
  habitDoneOnDate,
  harmfulIntakeDayState,
} from '@/features/day/dayHabitUi';
import { journalEntryHasFieldContent } from '@/features/day/dayJournal.logic';
import type { JournalEntry, JournalFieldDefinition } from '@/features/day/dayJournal.types';
import { promptDeleteHabit } from '@/features/day/promptDeleteHabit';
import { JOURNAL_HABIT_NAME } from '@/features/journal/journalHabit';
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

/** Строка «Ведение дневника»: только отображение, отметка при сохранении дневника (или по факту записи, если привычки в списке нет). */
export type DayJournalHabitRowConfig = {
  viewDateKey: string;
  todayKey: string;
  entry: JournalEntry | undefined;
  fields: JournalFieldDefinition[];
  /** Если есть — «выполнено» совпадает с отметкой привычки после «Сохранить». */
  journalHabit?: Habit;
};

type Props = {
  habits: Habit[];
  loading: boolean;
  /** На широком веб-экране — две колонки карточек привычек. */
  desktopTwoColumn?: boolean;
  emptyHint: ReactNode;
  viewDateKey: string;
  todayKey: string;
  onToggle: (habit: Habit) => void;
  /** Для привычки «вредное» (да / нет / сброс). */
  onHarmfulChoice?: (habit: Habit, dateKey: string, choice: 'harmful' | 'clean' | 'clear') => void;
  onRequestDelete?: (habit: Habit) => void;
  journalRow?: DayJournalHabitRowConfig;
};

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    out.push(arr.slice(i, i + 2));
  }
  return out;
}

function streakSubtitle(h: Habit, viewDateKey: string, todayKey: string): string {
  if (h.cadence === 'daily') {
    if (h.analyticsHeatMode === 'negative') {
      const st = harmfulIntakeDayState(h, viewDateKey);
      if (st === 'harmful') return 'Отмечено: был срыв';
      if (st === 'clean') return 'Чистый день';
      return 'Мучное, фастфуд или алкоголь — отметь ниже';
    }
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

function journalRowDone(cfg: DayJournalHabitRowConfig): boolean {
  const { viewDateKey, todayKey, entry, fields, journalHabit } = cfg;
  if (viewDateKey > todayKey) return false;
  if (journalHabit) return habitDoneOnDate(journalHabit, viewDateKey);
  return journalEntryHasFieldContent(entry, fields);
}

function JournalHabitDayRow({
  cfg,
  iconBg,
  afterHabits,
}: {
  cfg: DayJournalHabitRowConfig;
  iconBg: string;
  afterHabits: boolean;
}) {
  const { spacing, colors, radius, isLight } = useAppTheme();
  const future = cfg.viewDateKey > cfg.todayKey;
  const done = journalRowDone(cfg);
  const filled = journalEntryHasFieldContent(cfg.entry, cfg.fields);
  const subtitle = future
    ? 'Будущий день'
    : done
      ? cfg.journalHabit
        ? 'Отмечено при сохранении дневника'
        : 'Поля дневника заполнены'
      : filled && cfg.journalHabit
        ? 'Нажми «Сохранить» в блоке дневника ниже'
        : 'Заполни дневник ниже — отметка поставится сама';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        marginTop: afterHabits ? spacing.sm + 2 : 0,
      }}
    >
      <View style={{ width: 36, alignItems: 'center' }}>
        <View
          accessibilityRole="text"
          accessibilityLabel={`${JOURNAL_HABIT_NAME}. ${done ? 'Выполнено' : 'Не выполнено'}. Автоматически при заполнении дневника.`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: done ? 0 : 2,
            borderColor: 'rgba(255,255,255,0.22)',
            backgroundColor: done ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: future ? 0.4 : 1,
          }}
        >
          {done ? (
            <Ionicons name="checkmark" size={18} color={isLight ? '#FFFFFF' : 'rgba(22,22,28,0.94)'} />
          ) : null}
        </View>
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
            <Ionicons name="book-outline" size={22} color={done ? colors.text : 'rgba(255,255,255,0.78)'} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
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
              {JOURNAL_HABIT_NAME}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 13,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.42)',
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>

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
            <Ionicons name="sparkles-outline" size={16} color="rgba(255,255,255,0.38)" />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: 'rgba(255,255,255,0.45)',
                width: 44,
              }}
              numberOfLines={2}
            >
              Авто
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

type HabitTimelineRowProps = {
  h: Habit;
  colorIndex: number;
  showLineBelow: boolean;
  viewDateKey: string;
  todayKey: string;
  onToggle: (habit: Habit) => void;
  onHarmfulChoice?: (habit: Habit, dateKey: string, choice: 'harmful' | 'clean' | 'clear') => void;
  onRequestDelete?: (habit: Habit) => void;
};

function HabitTimelineRow({
  h,
  colorIndex,
  showLineBelow,
  viewDateKey,
  todayKey,
  onToggle,
  onHarmfulChoice,
  onRequestDelete,
}: HabitTimelineRowProps) {
  const { spacing, colors, radius, isLight } = useAppTheme();
  const future = viewDateKey > todayKey;
  const done = habitDoneOnDate(h, viewDateKey);
  const intake = h.analyticsHeatMode === 'negative' ? harmfulIntakeDayState(h, viewDateKey) : 'none';
  const weekKeys = getWeekDayKeys(viewDateKey);
  const iconBg = ICON_BG[colorIndex % ICON_BG.length]!;
  const canDelete = onRequestDelete && !future;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        marginBottom: showLineBelow ? spacing.sm + 2 : 0,
      }}
    >
      <View style={{ width: 36, alignItems: 'center' }}>
        {h.analyticsHeatMode === 'negative' ? (
          <View
            accessibilityRole="text"
            accessibilityLabel={
              intake === 'harmful' ? 'День со срывом' : intake === 'clean' ? 'Чистый день' : 'Нет отметки'
            }
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: intake === 'none' ? 2 : 0,
              borderColor: 'rgba(255,255,255,0.22)',
              backgroundColor:
                intake === 'harmful'
                  ? 'rgba(220,38,38,0.85)'
                  : intake === 'clean'
                    ? colors.accent
                    : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: future ? 0.4 : 1,
            }}
          >
            {intake === 'harmful' ? (
              <Ionicons name="alert" size={16} color="#FEF2F2" />
            ) : intake === 'clean' ? (
              <Ionicons name="checkmark" size={18} color={isLight ? '#FFFFFF' : 'rgba(22,22,28,0.94)'} />
            ) : null}
          </View>
        ) : (
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
        )}
        {showLineBelow ? (
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
            borderColor: done
              ? 'rgba(255,255,255,0.14)'
              : intake === 'harmful'
                ? 'rgba(248,113,113,0.42)'
                : 'rgba(255,255,255,0.08)',
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
            disabled={future || h.analyticsHeatMode === 'negative'}
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
              {h.cadence === 'daily' && h.analyticsHeatMode === 'negative' && !future && onHarmfulChoice ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable
                    onPress={() => onHarmfulChoice(h, viewDateKey, 'harmful')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor:
                        intake === 'harmful' ? 'rgba(220,38,38,0.35)' : 'rgba(220,38,38,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(248,113,113,0.5)',
                    }}
                  >
                    <Text style={{ fontWeight: '900', color: '#FECACA', fontSize: 14 }}>Да</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onHarmfulChoice(h, viewDateKey, 'clean')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor:
                        intake === 'clean' ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(74,222,128,0.45)',
                    }}
                  >
                    <Text style={{ fontWeight: '900', color: '#BBF7D0', fontSize: 14 }}>Нет</Text>
                  </Pressable>
                </View>
              ) : null}
              {intake !== 'none' && h.analyticsHeatMode === 'negative' && !future && onHarmfulChoice ? (
                <Pressable onPress={() => onHarmfulChoice(h, viewDateKey, 'clear')} style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.38)',
                      textDecorationLine: 'underline',
                    }}
                  >
                    Сбросить
                  </Text>
                </Pressable>
              ) : null}
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
        </View>
      </View>
    </View>
  );
}

export function DayHabitTimelineList({
  habits,
  loading,
  desktopTwoColumn = false,
  emptyHint,
  viewDateKey,
  todayKey,
  onToggle,
  onHarmfulChoice,
  onRequestDelete,
  journalRow,
}: Props) {
  const { spacing, colors, brand } = useAppTheme();

  if (loading) {
    return (
      <View style={{ paddingVertical: 28, alignItems: 'center' }}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  const hasJournalAfter = Boolean(journalRow);
  const journalIconBg = ICON_BG[habits.length % ICON_BG.length]!;
  const habitPairRows = desktopTwoColumn ? chunkPairs(habits) : null;

  if (habits.length === 0 && !journalRow) {
    return <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{emptyHint}</Text>;
  }

  return (
    <View style={{ gap: 0 }}>
      {habits.length === 0 ? (
        <Text style={{ color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm }}>{emptyHint}</Text>
      ) : null}
      {habitPairRows
        ? habitPairRows.map((pair, rowIndex) => {
            const isLastPair = rowIndex === habitPairRows.length - 1;
            return (
              <View
                key={pair.map((x) => x.id).join('|')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: spacing.md,
                  marginBottom: isLastPair && !hasJournalAfter ? 0 : spacing.sm + 2,
                }}
              >
                {pair.map((h, colIndex) => (
                  <View key={h.id} style={{ flex: 1, minWidth: 0 }}>
                    <HabitTimelineRow
                      h={h}
                      colorIndex={rowIndex * 2 + colIndex}
                      showLineBelow={false}
                      viewDateKey={viewDateKey}
                      todayKey={todayKey}
                      onToggle={onToggle}
                      onHarmfulChoice={onHarmfulChoice}
                      onRequestDelete={onRequestDelete}
                    />
                  </View>
                ))}
              </View>
            );
          })
        : habits.map((h, index) => {
            const isLastRow = index === habits.length - 1 && !hasJournalAfter;
            return (
              <HabitTimelineRow
                key={h.id}
                h={h}
                colorIndex={index}
                showLineBelow={!isLastRow}
                viewDateKey={viewDateKey}
                todayKey={todayKey}
                onToggle={onToggle}
                onHarmfulChoice={onHarmfulChoice}
                onRequestDelete={onRequestDelete}
              />
            );
          })}
      {journalRow ? (
        <JournalHabitDayRow cfg={journalRow} iconBg={journalIconBg} afterHabits={habits.length > 0} />
      ) : null}
    </View>
  );
}
