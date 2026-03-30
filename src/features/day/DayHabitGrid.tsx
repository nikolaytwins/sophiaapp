import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import {
  chunkPairs,
  getWeekDayKeys,
  habitCadenceLabel,
  habitDoneOnDate,
  WEEKDAY_SHORT_RU,
} from '@/features/day/dayHabitUi';
import { countCompletionsInWeekRange, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { useAppTheme } from '@/theme';

const ACCENT_PURPLE = '#A855F7';

/** Воздух между колонками / строками и внутри карточки. */
const GAP_COL = 16;
const ROW_MARGIN_BOTTOM = 22;
const CARD_PAD_H = 18;
const CARD_PAD_TOP = 16;
const CARD_PAD_BOTTOM = 16;
/** Две строки заголовка — фиксированная зона, чтобы соседние карточки в ряду совпадали по сетке. */
const TITLE_MIN_HEIGHT = 50;
const SUBTITLE_MIN_HEIGHT = 40;

const CARD_GRADIENTS: [string, string][] = [
  ['rgba(168,85,247,0.14)', 'rgba(127,29,200,0.06)'],
  ['rgba(59,130,246,0.12)', 'rgba(37,99,235,0.05)'],
  ['rgba(236,72,153,0.12)', 'rgba(190,24,93,0.05)'],
  ['rgba(34,197,94,0.1)', 'rgba(22,163,74,0.05)'],
  ['rgba(249,115,22,0.12)', 'rgba(234,88,12,0.05)'],
  ['rgba(139,92,246,0.12)', 'rgba(109,40,217,0.05)'],
];

function HabitCard({
  habit: h,
  viewDateKey,
  todayKey,
  index,
  onToggle,
}: {
  habit: Habit;
  viewDateKey: string;
  todayKey: string;
  index: number;
  onToggle: (habit: Habit) => void;
}) {
  const { radius, colors } = useAppTheme();
  const weekKeys = getWeekDayKeys(viewDateKey);
  const doneToday = habitDoneOnDate(h, viewDateKey);
  const future = viewDateKey > todayKey;
  const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length]!;
  const weekStart = startOfWeekMondayKey(viewDateKey);
  const weekCountForView =
    h.cadence === 'weekly' && h.completionDates
      ? countCompletionsInWeekRange(h.completionDates, weekStart)
      : h.weeklyCompleted;

  return (
    <Pressable
      disabled={future}
      onPress={() => onToggle(h)}
      style={({ pressed }) => ({
        flex: 1,
        alignSelf: 'stretch',
        opacity: future ? 0.45 : pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={[grad[0], grad[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: doneToday ? 'rgba(168,85,247,0.42)' : 'rgba(255,255,255,0.08)',
          paddingHorizontal: CARD_PAD_H,
          paddingTop: CARD_PAD_TOP,
          paddingBottom: CARD_PAD_BOTTOM,
          overflow: 'hidden',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                backgroundColor: 'rgba(0,0,0,0.22)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={h.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={doneToday ? ACCENT_PURPLE : 'rgba(255,255,255,0.72)'}
              />
            </View>
            <View
              pointerEvents="none"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: doneToday ? 'rgba(168,85,247,0.85)' : 'rgba(255,255,255,0.18)',
                backgroundColor: doneToday ? 'rgba(168,85,247,0.28)' : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={doneToday ? 'checkmark' : 'ellipse-outline'}
                size={doneToday ? 22 : 18}
                color={doneToday ? '#FAFAFC' : 'rgba(255,255,255,0.35)'}
              />
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={{
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
              color: colors.text,
              lineHeight: 22,
              marginBottom: 6,
              minHeight: TITLE_MIN_HEIGHT,
            }}
          >
            {h.name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.42)',
              lineHeight: 17,
              marginBottom: 12,
              minHeight: SUBTITLE_MIN_HEIGHT,
            }}
          >
            {habitCadenceLabel(h)}
            {h.cadence === 'daily' && h.streak > 0 ? ` · ${h.streak} дн.` : ''}
            {h.cadence === 'weekly' && h.weeklyTarget != null
              ? ` · ${weekCountForView ?? 0}/${h.weeklyTarget} нед.`
              : ''}
          </Text>

          <View style={{ flex: 1, minHeight: 4 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            {WEEKDAY_SHORT_RU.map((label, i) => (
              <Text
                key={label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: '700',
                  color: weekKeys[i] === viewDateKey ? 'rgba(196,181,253,0.95)' : 'rgba(255,255,255,0.28)',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 5 }}>
            {weekKeys.map((dk) => {
              const hit = habitDoneOnDate(h, dk);
              const isView = dk === viewDateKey;
              return (
                <View
                  key={dk}
                  style={{
                    flex: 1,
                    height: 24,
                    borderRadius: 8,
                    backgroundColor: hit ? 'rgba(168,85,247,0.75)' : 'rgba(255,255,255,0.08)',
                    borderWidth: isView ? 1.5 : 0,
                    borderColor: 'rgba(196,181,253,0.9)',
                  }}
                />
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

type Props = {
  habits: Habit[];
  loading: boolean;
  emptyHint: ReactNode;
  viewDateKey: string;
  todayKey: string;
  onToggle: (habit: Habit) => void;
};

export function DayHabitGrid({ habits, loading, emptyHint, viewDateKey, todayKey, onToggle }: Props) {
  const { spacing, colors } = useAppTheme();
  const rows = chunkPairs(habits);

  return (
    <View style={{ marginTop: spacing.lg + 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.38)',
          marginBottom: 8,
        }}
      >
        ПРИВЫЧКИ
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.48)',
          marginBottom: spacing.lg + 4,
          lineHeight: 22,
        }}
      >
        Тап по карточке или по кругу — отметка за выбранный день (как на «Привычки»).
      </Text>
      {loading ? (
        <View style={{ paddingVertical: 28, alignItems: 'center' }}>
          <ActivityIndicator color={ACCENT_PURPLE} />
        </View>
      ) : habits.length === 0 ? (
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{emptyHint}</Text>
      ) : (
        <View>
          {rows.map((pair, rowIdx) => {
            const single = pair.length === 1;
            return (
              <View
                key={`row-${rowIdx}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  gap: GAP_COL,
                  marginBottom: rowIdx < rows.length - 1 ? ROW_MARGIN_BOTTOM : 0,
                }}
              >
                {pair.map((h, i) => {
                  const globalIndex = rowIdx * 2 + i;
                  return (
                    <View
                      key={h.id}
                      style={
                        single
                          ? { width: '100%' }
                          : { flex: 1, minWidth: 0 }
                      }
                    >
                      <HabitCard
                        habit={h}
                        index={globalIndex}
                        viewDateKey={viewDateKey}
                        todayKey={todayKey}
                        onToggle={onToggle}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
