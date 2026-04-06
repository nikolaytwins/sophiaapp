import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useAppTheme } from '@/theme';

const CELL_GAP = 6;
const CELL_RADIUS = 14;
const WEB_SHEET_MAX_W = 520;

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  todayKey: string;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
};

export function DayDateCalendarModal({
  visible,
  onClose,
  todayKey,
  selectedDateKey,
  onSelectDate,
}: Props) {
  const { colors, isLight, radius, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [ty, tm] = todayKey.split('-').map(Number);
  const todayIdx = ymToIndex(ty, tm);

  const [y, setY] = useState(ty);
  const [m, setM] = useState(tm);

  useEffect(() => {
    if (!visible) return;
    const [sy, sm] = selectedDateKey.split('-').map(Number);
    setY(sy);
    setM(sm);
  }, [visible, selectedDateKey]);

  const anchorKey = monthAnchorKey(y, m);
  const monthTitle = monthGridTitleRu(anchorKey);
  const cells = useMemo(() => monthGridCells(anchorKey), [anchorKey]);
  const rows = useMemo(() => chunkMonthIntoWeekRows(cells), [cells]);
  const isViewingCurrentMonth = y === ty && m === tm;
  const todayWeekdayIdx = weekdayIndexMondayFirst(todayKey);

  const canGoPrev = ymToIndex(y, m) > ymToIndex(2020, 1);
  const canGoNext = ymToIndex(y, m) < todayIdx;

  const bump = (delta: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const n = shiftMonth(y, m, delta);
    setY(n.y);
    setM(n.m);
  };

  const pickDay = (cell: MonthGridCell) => {
    const dk = cell.dateKey;
    if (!dk || dk > todayKey) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelectDate(dk);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Закрыть" />
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
            paddingHorizontal: spacing.md,
            paddingTop: Platform.OS === 'web' ? spacing.lg : 0,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          }}
        >
          <View
            style={[
              styles.sheet,
              Platform.OS === 'web' && styles.sheetWeb,
              {
                padding: spacing.lg + (Platform.OS === 'web' ? 4 : 0),
                borderRadius: radius.xl,
                backgroundColor: isLight ? '#F7F4FA' : '#12121a',
                borderWidth: 1,
                borderColor: isLight ? colors.border : 'rgba(255,255,255,0.12)',
              },
            ]}
          >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={[typography.title2, { fontSize: 18, fontWeight: '900', color: colors.text, flex: 1 }]}>
              Выбор даты
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть">
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Pressable
              onPress={() => bump(-1)}
              disabled={!canGoPrev}
              hitSlop={10}
              style={{ width: 40, alignItems: 'center', opacity: canGoPrev ? 1 : 0.25 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
            </Pressable>
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '800',
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {monthTitle}
            </Text>
            <Pressable
              onPress={() => bump(1)}
              disabled={!canGoNext}
              hitSlop={10}
              style={{ width: 40, alignItems: 'center', opacity: canGoNext ? 1 : 0.25 }}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: CELL_GAP, marginBottom: CELL_GAP }}>
            {WEEKDAY_LABELS_SHORT.map((label, i) => {
              const isTodayCol = isViewingCurrentMonth && i === todayWeekdayIdx;
              return (
                <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: Platform.OS === 'web' ? 11 : 10,
                      fontWeight: isTodayCol ? '800' : '600',
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

          {rows.map((row, ri) => (
            <View key={`row-${ri}`} style={{ flexDirection: 'row', gap: CELL_GAP }}>
              {row.map((cell, ci) => {
                if (!cell.dateKey) {
                  return <View key={`e-${ri}-${ci}`} style={{ flex: 1, aspectRatio: 1, minWidth: 0 }} />;
                }
                const dk = cell.dateKey;
                const future = dk > todayKey;
                const selected = dk === selectedDateKey;
                const isToday = dk === todayKey;
                const [, , dd] = dk.split('-');
                return (
                  <Pressable
                    key={dk}
                    disabled={future}
                    onPress={() => pickDay(cell)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      minWidth: 0,
                      minHeight: Platform.OS === 'web' ? 44 : undefined,
                      padding: (Platform.OS === 'web' ? 4 : CELL_GAP) / 2,
                    }}
                    accessibilityLabel={`${dd}${future ? ', недоступно' : ''}`}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: CELL_RADIUS,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected
                          ? isLight
                            ? colors.text
                            : '#A855F7'
                          : 'rgba(255,255,255,0.06)',
                        borderWidth: !selected && isToday ? 2 : 0,
                        borderColor: 'rgba(168,85,247,0.55)',
                        opacity: future ? 0.28 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Platform.OS === 'web' ? 17 : 15,
                          fontWeight: selected ? '900' : isToday ? '800' : '600',
                          fontVariant: ['tabular-nums'],
                          color: selected
                            ? isLight
                              ? '#F7F4FA'
                              : '#FAFAFC'
                            : future
                              ? colors.textMuted
                              : colors.text,
                        }}
                      >
                        {dd}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Text style={{ marginTop: spacing.md, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' }}>
            Будущие дни недоступны. Стрелки — другой месяц.
          </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  sheetWeb: {
    maxWidth: WEB_SHEET_MAX_W,
    maxHeight: '85%' as const,
  },
});
