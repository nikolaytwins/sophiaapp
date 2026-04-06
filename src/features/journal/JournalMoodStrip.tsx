import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { JournalEntry, JournalMoodId } from '@/features/day/dayJournal.types';
import { JOURNAL_MOODS, getMoodMeta, journalMoodStripDayKeys } from '@/features/journal/journalMood';
import { useAppTheme } from '@/theme';

/** Акцент выбранного дня — оранжевый, в духе блока «Задачи». */
const STRIP_SELECTED_BG = '#F97316';
const STRIP_SELECTED_TEXT = '#1A0A02';

type Props = {
  viewDateKey: string;
  todayKey: string;
  onViewDateChange: (dateKey: string) => void;
  entries: Record<string, JournalEntry>;
  onPickMood: (dateKey: string, mood: JournalMoodId | null) => void;
};

function weekdayShortUpper(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const s = dt.toLocaleDateString('ru-RU', { weekday: 'short' });
  return s.replace(/\.$/, '').slice(0, 3).toUpperCase();
}

function dayNum(dateKey: string): string {
  return String(Number(dateKey.split('-')[2]));
}

export function JournalMoodStrip({ viewDateKey, todayKey, onViewDateChange, entries, onPickMood }: Props) {
  const { colors, radius, spacing } = useAppTheme();
  const stripKeys = useMemo(() => journalMoodStripDayKeys(viewDateKey, todayKey, 8), [viewDateKey, todayKey]);
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  const closePicker = useCallback(() => setPickerKey(null), []);

  const moodFor = useCallback((dk: string) => entries[dk]?.mood, [entries]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{
          flexDirection: 'row',
          gap: 10,
          paddingVertical: 4,
          paddingRight: spacing.md,
        }}
      >
        {stripKeys.map((dk) => {
          const selected = dk === viewDateKey;
          const mood = moodFor(dk);
          const meta = getMoodMeta(mood);
          const future = dk > todayKey;
          return (
            <View key={dk} style={{ alignItems: 'center', width: 58 }}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  onViewDateChange(dk);
                }}
                disabled={future}
                style={{
                  width: '100%',
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  borderRadius: 14,
                  backgroundColor: selected ? STRIP_SELECTED_BG : 'rgba(255,255,255,0.06)',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: selected ? 'transparent' : 'rgba(255,255,255,0.1)',
                  opacity: future ? 0.35 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                    color: selected ? STRIP_SELECTED_TEXT : 'rgba(255,255,255,0.55)',
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {weekdayShortUpper(dk)}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 17,
                    fontWeight: '800',
                    color: selected ? STRIP_SELECTED_TEXT : colors.text,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {dayNum(dk)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (future) return;
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPickerKey(dk);
                }}
                disabled={future}
                style={{
                  marginTop: 8,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: meta ? meta.circleBg : 'rgba(255,255,255,0.04)',
                  borderWidth: 2,
                  borderColor: meta ? 'transparent' : 'rgba(255,255,255,0.14)',
                  opacity: future ? 0.35 : 1,
                }}
                accessibilityLabel={meta ? `Настроение: ${meta.label}` : 'Выбрать настроение'}
              >
                <Text style={{ fontSize: 22 }}>{meta ? meta.emoji : '🙂'}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={pickerKey != null} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <Pressable style={[styles.modalCard, { borderRadius: radius.xl }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Настроение дня</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              {pickerKey ? dayNum(pickerKey) + ' ' + weekdayShortUpper(pickerKey).toLowerCase() : ''}
            </Text>
            {JOURNAL_MOODS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  if (pickerKey) {
                    const current = moodFor(pickerKey);
                    onPickMood(pickerKey, current === m.id ? null : m.id);
                  }
                  closePicker();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: radius.lg,
                  backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  marginBottom: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(255,255,255,0.08)',
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: m.circleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{m.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={closePicker}
              style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#141418',
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    marginBottom: 16,
  },
});
