import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  chunkMonthIntoWeekRows,
  monthAnchorKey,
  monthGridCells,
  monthGridTitleRu,
  weekdayIndexMondayFirst,
  WEEKDAY_LABELS_SHORT,
  ymToIndex,
  type MonthGridCell,
} from '@/features/habits/habitCardVisual';
import { localDateKey } from '@/features/habits/habitLogic';
import type { JournalDocument, JournalMoodId } from '@/features/day/dayJournal.types';
import {
  JOURNAL_MOODS,
  aggregateEnergyInMonth,
  aggregateMoodsInMonth,
  getMoodMeta,
  journalEnergyForDateKey,
  journalMoodForDateKey,
  totalMoodDaysInMonth,
} from '@/features/journal/journalMood';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { useAppTheme } from '@/theme';

/** Как в `HabitMonthCalendar` — одинаковая сетка с календарём привычек. */
const CELL_GAP = 8;
const CELL_RADIUS = 10;
const TWO_COL_MIN_WIDTH = 880;

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function JournalFaceCalendarCell({
  cell,
  todayKey,
  doc,
  colors,
  isLight,
  pickId,
  uncapturedPhrase,
}: {
  cell: MonthGridCell;
  todayKey: string;
  doc: JournalDocument;
  colors: { text: string; textMuted: string; borderStrong: string };
  isLight: boolean;
  pickId: (doc: JournalDocument, dateKey: string) => JournalMoodId | null;
  uncapturedPhrase: string;
}) {
  if (!cell.dateKey) {
    return <View style={{ flex: 1, aspectRatio: 1, minWidth: 0 }} />;
  }

  const isFuture = cell.dateKey > todayKey;
  const isToday = cell.dateKey === todayKey;
  const faceId = pickId(doc, cell.dateKey);
  const meta = getMoodMeta(faceId);
  const [, , dd] = cell.dateKey.split('-');
  const dayNum = dd ?? '';

  const futureText = isLight ? 'rgba(15,17,24,0.28)' : 'rgba(255,255,255,0.28)';

  return (
    <View
      style={{ flex: 1, aspectRatio: 1, minWidth: 0, padding: CELL_GAP / 2 }}
      accessibilityLabel={
        meta
          ? `${dayNum}, ${meta.label}`
          : isFuture
            ? `${dayNum}, будущий день`
            : `${dayNum}, ${uncapturedPhrase}`
      }
    >
      <View
        style={{
          flex: 1,
          borderRadius: CELL_RADIUS,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: meta && !isFuture ? meta.circleBg : isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.07)',
          borderWidth: meta && !isFuture ? 1 : StyleSheet.hairlineWidth,
          borderColor:
            meta && !isFuture
              ? meta.circleBorder
              : isToday && !isFuture
                ? isLight
                  ? colors.borderStrong
                  : 'rgba(255,255,255,0.3)'
                : isLight
                  ? 'rgba(15,17,24,0.1)'
                  : 'rgba(255,255,255,0.12)',
          opacity: isFuture ? 0.4 : 1,
        }}
      >
        {meta && !isFuture ? (
          <Text style={{ fontSize: 20, lineHeight: 24 }}>{meta.emoji}</Text>
        ) : (
          <Text
            style={{
              fontSize: 13,
              fontWeight: isToday ? '800' : '600',
              fontVariant: ['tabular-nums'],
              color: isFuture ? futureText : colors.textMuted,
            }}
          >
            {dayNum}
          </Text>
        )}
      </View>
    </View>
  );
}

type Props = {
  /** Для прокрутки экрана-приёмника при `?focus=mood`. */
  onLayoutRoot?: (y: number) => void;
};

/**
 * Календари месяца: настроение и энергия (одни и те же шкалы). На широком вебе — в один ряд.
 */
export function JournalMoodCalendarPanel({ onLayoutRoot }: Props) {
  const { colors, isLight, radius, spacing, typography } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const doc = useDayJournalStore((s) => s.doc);
  const todayKey = localDateKey();
  const [ty, tm] = todayKey.split('-').map(Number);
  const todayIdx = ymToIndex(ty, tm);

  const [y, setY] = useState(ty);
  const [m, setM] = useState(tm);

  const anchorKey = monthAnchorKey(y, m);
  const monthTitle = monthGridTitleRu(anchorKey);
  const cells = useMemo(() => monthGridCells(anchorKey), [anchorKey]);
  const monthWeekRows = useMemo(() => chunkMonthIntoWeekRows(cells), [cells]);
  const isViewingCurrentMonth = y === ty && m === tm;
  const todayWeekdayIdx = weekdayIndexMondayFirst(todayKey);

  const canGoPrev = ymToIndex(y, m) > ymToIndex(2020, 1);
  const canGoNext = ymToIndex(y, m) < todayIdx;

  const moodCounts = useMemo(() => aggregateMoodsInMonth(doc, y, m, todayKey), [doc, y, m, todayKey]);
  const energyCounts = useMemo(() => aggregateEnergyInMonth(doc, y, m, todayKey), [doc, y, m, todayKey]);
  const totalMood = totalMoodDaysInMonth(moodCounts);
  const totalEnergy = totalMoodDaysInMonth(energyCounts);
  const twoCol = Platform.OS === 'web' && windowWidth >= TWO_COL_MIN_WIDTH;

  const bump = (delta: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const n = shiftMonth(y, m, delta);
    setY(n.y);
    setM(n.m);
  };

  return (
    <View
      onLayout={(e) => onLayoutRoot?.(e.nativeEvent.layout.y)}
      style={{
        width: '100%',
        ...(Platform.OS === 'web' && !twoCol ? { maxWidth: 400, alignSelf: 'flex-start' as const } : {}),
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)',
        borderWidth: 1,
        borderColor: isLight ? colors.border : 'rgba(255,255,255,0.07)',
        marginTop: spacing.lg,
        overflow: 'hidden',
      }}
    >
      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            fontWeight: '800',
            marginBottom: spacing.sm,
          },
        ]}
      >
        Настроение и энергия · календарь
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable
          onPress={() => bump(-1)}
          disabled={!canGoPrev}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          style={({ pressed }) => ({
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            opacity: !canGoPrev ? 0.22 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && canGoPrev ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.title2, { fontSize: 17, fontWeight: '800', color: colors.text }]} numberOfLines={1}>
            {monthTitle}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
            Настроение: {totalMood} дн. · Энергия: {totalEnergy} дн.
          </Text>
        </View>
        <Pressable
          onPress={() => bump(1)}
          disabled={!canGoNext}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          style={({ pressed }) => ({
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            opacity: !canGoNext ? 0.22 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && canGoNext ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {twoCol ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                typography.caption,
                {
                  color: colors.textMuted,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  marginBottom: spacing.sm,
                },
              ]}
            >
              Настроение
            </Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP, marginBottom: CELL_GAP }}>
              {WEEKDAY_LABELS_SHORT.map((label, i) => {
                const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
                return (
                  <View key={`m-${label}`} style={{ flex: 1, alignItems: 'center' }}>
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
              <View key={`mood-cal-${ri}`} style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP }}>
                {row.map((cell, ci) => (
                  <JournalFaceCalendarCell
                    key={cell.dateKey ?? `e-${ri}-${ci}`}
                    cell={cell}
                    todayKey={todayKey}
                    doc={doc}
                    colors={colors}
                    isLight={isLight}
                    pickId={journalMoodForDateKey}
                    uncapturedPhrase="настроение не отмечено"
                  />
                ))}
              </View>
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
              {JOURNAL_MOODS.map((row) => (
                <View
                  key={row.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: radius.md,
                    backgroundColor: row.circleBg,
                    borderWidth: 1,
                    borderColor: row.circleBorder,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{moodCounts[row.id]}</Text>
                </View>
              ))}
            </View>
          </View>
          <View
            style={{
              width: StyleSheet.hairlineWidth,
              alignSelf: 'stretch',
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginVertical: 4,
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                typography.caption,
                {
                  color: colors.textMuted,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  marginBottom: spacing.sm,
                },
              ]}
            >
              Энергия / продуктивность
            </Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP, marginBottom: CELL_GAP }}>
              {WEEKDAY_LABELS_SHORT.map((label, i) => {
                const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
                return (
                  <View key={`e-${label}`} style={{ flex: 1, alignItems: 'center' }}>
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
              <View key={`energy-cal-${ri}`} style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP }}>
                {row.map((cell, ci) => (
                  <JournalFaceCalendarCell
                    key={`en-${cell.dateKey ?? `${ri}-${ci}`}`}
                    cell={cell}
                    todayKey={todayKey}
                    doc={doc}
                    colors={colors}
                    isLight={isLight}
                    pickId={journalEnergyForDateKey}
                    uncapturedPhrase="энергия не отмечена"
                  />
                ))}
              </View>
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
              {JOURNAL_MOODS.map((row) => (
                <View
                  key={`ec-${row.id}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: radius.md,
                    backgroundColor: row.circleBg,
                    borderWidth: 1,
                    borderColor: row.circleBorder,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{energyCounts[row.id]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <>
          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                fontWeight: '800',
                marginBottom: spacing.sm,
              },
            ]}
          >
            Настроение
          </Text>
          <View style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP, marginBottom: CELL_GAP }}>
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
            <View key={`mood-cal-${ri}`} style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP }}>
              {row.map((cell, ci) => (
                <JournalFaceCalendarCell
                  key={cell.dateKey ?? `e-${ri}-${ci}`}
                  cell={cell}
                  todayKey={todayKey}
                  doc={doc}
                  colors={colors}
                  isLight={isLight}
                  pickId={journalMoodForDateKey}
                  uncapturedPhrase="настроение не отмечено"
                />
              ))}
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
            {JOURNAL_MOODS.map((row) => (
              <View
                key={row.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: radius.md,
                  backgroundColor: row.circleBg,
                  borderWidth: 1,
                  borderColor: row.circleBorder,
                }}
              >
                <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{moodCounts[row.id]}</Text>
              </View>
            ))}
          </View>

          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                fontWeight: '800',
                marginTop: spacing.lg,
                marginBottom: spacing.sm,
              },
            ]}
          >
            Энергия / продуктивность
          </Text>
          <View style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP, marginBottom: CELL_GAP }}>
            {WEEKDAY_LABELS_SHORT.map((label, i) => {
              const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
              return (
                <View key={`e-h-${label}`} style={{ flex: 1, alignItems: 'center' }}>
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
            <View key={`energy-cal-${ri}`} style={{ flexDirection: 'row', width: '100%', gap: CELL_GAP }}>
              {row.map((cell, ci) => (
                <JournalFaceCalendarCell
                  key={`en-${cell.dateKey ?? `${ri}-${ci}`}`}
                  cell={cell}
                  todayKey={todayKey}
                  doc={doc}
                  colors={colors}
                  isLight={isLight}
                  pickId={journalEnergyForDateKey}
                  uncapturedPhrase="энергия не отмечена"
                />
              ))}
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
            {JOURNAL_MOODS.map((row) => (
              <View
                key={`e-${row.id}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: radius.md,
                  backgroundColor: row.circleBg,
                  borderWidth: 1,
                  borderColor: row.circleBorder,
                }}
              >
                <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{energyCounts[row.id]}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={{ marginTop: spacing.sm, fontSize: 12, lineHeight: 17, color: colors.textMuted }}>
        Отмечай настроение и энергию на экране «День». Здесь — обзор месяца.
      </Text>
    </View>
  );
}
