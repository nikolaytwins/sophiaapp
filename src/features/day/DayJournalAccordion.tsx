import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { mergeNikolayJournalFields } from '@/features/accounts/nikolayJournalFields';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';
import { JournalFieldCard } from '@/features/day/DayJournalFieldCards';
import {
  buildJournalDayPlainText,
  getFieldsBySection,
  journalEntryHasContent,
  journalEntryHasFieldContent,
} from '@/features/day/dayJournal.logic';
import type { JournalExportPeriod, JournalFieldDefinition, JournalMoodId } from '@/features/day/dayJournal.types';
import { findJournalHabit } from '@/features/journal/journalHabit';
import { JournalMoodStrip } from '@/features/journal/JournalMoodStrip';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { exportDayJournalPdf } from '@/services/dayJournalPdfExport';
import { pushDayJournalToCloud } from '@/services/dayJournalSupabaseSync';
import { repos } from '@/services/repositories';
import {
  buildDayJournalHealthExportDoc,
  buildDayJournalNarrativeExportDoc,
  useDayJournalStore,
} from '@/stores/dayJournal.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

type Props = {
  viewDateKey: string;
  todayKey: string;
  sessionEmail: string | null;
  /** На экране «День»: смена дня в полоске настроения переключает весь экран. */
  linkMoodToScreenDay?: boolean;
  onMoodStripChangeDay?: (dk: string) => void;
  onPickMood?: (dk: string, mood: JournalMoodId | null) => void;
};

export function DayJournalAccordion({
  viewDateKey,
  todayKey,
  sessionEmail,
  linkMoodToScreenDay = false,
  onMoodStripChangeDay,
  onPickMood,
}: Props) {
  const { colors, spacing, brand, radius } = useAppTheme();
  const qc = useQueryClient();
  const habitsQ = useHabitsQuery();

  const doc = useDayJournalStore((s) => s.doc);
  const setFieldValue = useDayJournalStore((s) => s.setFieldValue);
  const getEntry = useDayJournalStore((s) => s.getEntry);

  const [innerDay, setInnerDay] = useState(viewDateKey);
  useEffect(() => {
    setInnerDay(viewDateKey);
  }, [viewDateKey]);

  const editingDay = linkMoodToScreenDay ? viewDateKey : innerDay;
  const navigateMoodDay = linkMoodToScreenDay ? onMoodStripChangeDay ?? (() => {}) : setInnerDay;

  const journalFields = useMemo(() => getFieldsBySection(doc.fields, 'journal'), [doc.fields]);
  const healthFields = useMemo(() => getFieldsBySection(doc.fields, 'health'), [doc.fields]);
  const journalHabit = useMemo(() => findJournalHabit(habitsQ.data ?? []), [habitsQ.data]);

  const dayKeyRef = useRef(editingDay);
  const [expanded, setExpanded] = useState(() => {
    const st = useDayJournalStore.getState();
    return !journalEntryHasContent(st.getEntry(viewDateKey), st.doc.fields);
  });
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [exportHint, setExportHint] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (dayKeyRef.current !== editingDay) {
      dayKeyRef.current = editingDay;
      const st = useDayJournalStore.getState();
      setExpanded(!journalEntryHasContent(st.getEntry(editingDay), st.doc.fields));
    }
  }, [editingDay]);

  useEffect(() => {
    if (!isNikolayPrimaryAccount(sessionEmail)) return;
    const prev = useDayJournalStore.getState().doc;
    const merged = mergeNikolayJournalFields(prev);
    if (merged !== prev) {
      useDayJournalStore.getState().replaceDocument(merged);
    }
  }, [sessionEmail]);

  const entry = getEntry(editingDay);
  const entryHasContent = journalEntryHasContent(entry, doc.fields);
  const entryHasFieldContent = journalEntryHasFieldContent(entry, doc.fields);
  const habitDone =
    journalHabit && editingDay <= todayKey ? habitDoneOnDate(journalHabit, editingDay) : false;
  const showDoneBadge = entryHasFieldContent && habitDone;

  const commitFieldValue = useCallback(
    (field: JournalFieldDefinition, value: string | number | boolean | null) => {
      setFieldValue(editingDay, field.id, value);
    },
    [setFieldValue, editingDay]
  );

  const exportDoc = async (kind: 'journal' | 'health') => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const payload = kind === 'journal' ? buildDayJournalNarrativeExportDoc() : buildDayJournalHealthExportDoc();
    await Clipboard.setStringAsync(JSON.stringify(payload, null, 2));
    setExportHint(kind === 'journal' ? 'Весь дневник (JSON) в буфере' : 'Здоровье (JSON) в буфере');
    setTimeout(() => setExportHint(null), 2800);
  };

  const copyThisDayPlainText = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = buildJournalDayPlainText(doc, editingDay);
    await Clipboard.setStringAsync(text);
    setExportHint('Текст этого дня скопирован в буфер — вставь в заметки или почту.');
    setTimeout(() => setExportHint(null), 3200);
  };

  const exportPdf = async (period: JournalExportPeriod) => {
    if (pdfBusy) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPdfBusy(true);
    try {
      const pdfResult = await exportDayJournalPdf(period, period === 'today' ? { anchorDayKey: editingDay } : undefined);
      if (pdfResult === 'web-popup-blocked-copied-day') {
        setExportHint('Окно печати заблокировано — текст этого дня скопирован в буфер. Вставь в документ и при необходимости сохрани как PDF.');
      } else {
        setExportHint(
          Platform.OS === 'web'
            ? 'Откроется окно печати — выбери «Сохранить как PDF», если нужен файл.'
            : 'PDF сформирован — сохрани или отправь из системного окна.'
        );
      }
      setTimeout(() => setExportHint(null), 4200);
    } catch (error) {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Ошибка';
      setExportHint(`PDF: ${message}`);
      setTimeout(() => setExportHint(null), 5200);
    } finally {
      setPdfBusy(false);
    }
  };

  const saveJournal = async () => {
    try {
      await pushDayJournalToCloud();
      const entryAfter = useDayJournalStore.getState().getEntry(editingDay);
      const filledForHabit = journalEntryHasFieldContent(entryAfter, doc.fields);
      if (
        journalHabit &&
        filledForHabit &&
        editingDay <= todayKey &&
        !habitDoneOnDate(journalHabit, editingDay)
      ) {
        const nextHabits = await repos.habits.checkIn(journalHabit.id, editingDay);
        qc.setQueryData([...HABITS_QUERY_KEY], nextHabits);
      }
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveHint('Сохранено');
    } catch (error) {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Ошибка';
      setSaveHint(`Не вышло: ${message}`);
    } finally {
      setTimeout(() => setSaveHint(null), 2800);
    }
  };

  const toggleHeader = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setExpanded((e) => !e);
  };

  return (
    <AppSurfaceCard
      style={{
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: showDoneBadge ? 'rgba(167,139,250,0.45)' : 'rgba(168,85,247,0.35)',
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={toggleHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.md,
          backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showDoneBadge ? 'rgba(167,139,250,0.2)' : 'rgba(168,85,247,0.14)',
            borderWidth: 1,
            borderColor: showDoneBadge ? 'rgba(196,181,253,0.45)' : 'rgba(168,85,247,0.3)',
          }}
        >
          <Ionicons
            name={showDoneBadge ? 'checkmark-circle' : 'book-outline'}
            size={26}
            color={showDoneBadge ? 'rgba(196,181,253,0.98)' : brand.primary}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.4,
              color: 'rgba(196,181,253,0.9)',
              textTransform: 'uppercase',
            }}
          >
            Привычка дня
          </Text>
          <Text style={{ marginTop: 4, fontSize: 19, fontWeight: '900', color: colors.text, letterSpacing: -0.4 }}>
            Дневник
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: colors.textMuted }} numberOfLines={2}>
            {showDoneBadge
              ? 'Сохранено — привычка отмечена.'
              : entryHasFieldContent
                ? 'Нажми «Сохранить», чтобы отметить привычку за этот день.'
                : 'Раскрой блок: настроение, записи и здоровье. После заполнения нажми «Сохранить».'}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {onPickMood ? (
            <>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  color: 'rgba(249,115,22,0.95)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  marginTop: 8,
                }}
              >
                Настроение
              </Text>
              <JournalMoodStrip
                viewDateKey={editingDay}
                todayKey={todayKey}
                onViewDateChange={navigateMoodDay}
                entries={doc.entries}
                onPickMood={onPickMood}
              />
            </>
          ) : null}

          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.4,
              color: 'rgba(196,181,253,0.9)',
              textTransform: 'uppercase',
              marginBottom: 8,
              marginTop: onPickMood ? 16 : 8,
            }}
          >
            Записи
          </Text>
          {journalFields.map((field) => (
            <JournalFieldCard key={field.id} field={field} dateKey={editingDay} onValueCommit={commitFieldValue} />
          ))}

          <Text
            style={{
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.4,
              color: 'rgba(147,197,253,0.95)',
              textTransform: 'uppercase',
              marginBottom: 8,
              marginTop: 8,
            }}
          >
            Здоровье
          </Text>
          {healthFields.map((field) => (
            <JournalFieldCard key={field.id} field={field} dateKey={editingDay} onValueCommit={commitFieldValue} />
          ))}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => void saveJournal()}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: radius.lg,
                backgroundColor: brand.primaryMuted,
                borderWidth: 1,
                borderColor: brand.surfaceBorderStrong,
              }}
            >
              <Text style={{ fontWeight: '800', color: colors.text }}>Сохранить</Text>
            </Pressable>
            <Pressable
              onPress={() => void copyThisDayPlainText()}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorderStrong,
                backgroundColor: 'rgba(168,85,247,0.06)',
              }}
            >
              <Text style={{ fontWeight: '800', color: colors.text }}>Скопировать день (текст)</Text>
            </Pressable>
            <Pressable
              onPress={() => void exportDoc('journal')}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.textMuted }}>Все дни (JSON)</Text>
            </Pressable>
            <Pressable
              onPress={() => void exportDoc('health')}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.textMuted }}>Здоровье (JSON)</Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.2,
              color: 'rgba(196,181,253,0.85)',
              textTransform: 'uppercase',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            PDF за период
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 17 }}>
            «Этот день» — выбранная в дневнике дата. Если PDF не открывается, используй «Скопировать день (текст)».
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              disabled={pdfBusy}
              onPress={() => void exportPdf('today')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorderStrong,
                backgroundColor: pdfBusy ? 'rgba(255,255,255,0.02)' : 'rgba(168,85,247,0.08)',
                opacity: pdfBusy ? 0.55 : 1,
              }}
            >
              <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13 }}>Этот день</Text>
            </Pressable>
            <Pressable
              disabled={pdfBusy}
              onPress={() => void exportPdf('month')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
                opacity: pdfBusy ? 0.55 : 1,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.textMuted, fontSize: 13 }}>Месяц</Text>
            </Pressable>
            <Pressable
              disabled={pdfBusy}
              onPress={() => void exportPdf('last90')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
                opacity: pdfBusy ? 0.55 : 1,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.textMuted, fontSize: 13 }}>90 дней</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <Link href={'/habits?focus=mood' as Href} asChild>
              <Pressable>
                <Text style={{ fontSize: 14, fontWeight: '700', color: brand.primarySoft }}>Календарь настроений</Text>
              </Pressable>
            </Link>
            <Link href={'/journal-settings' as Href} asChild>
              <Pressable>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Настройки полей</Text>
              </Pressable>
            </Link>
          </View>

          {saveHint ? (
            <Text style={{ marginTop: 10, fontSize: 13, color: brand.primarySoft }}>{saveHint}</Text>
          ) : null}
          {exportHint ? (
            <Text style={{ marginTop: 6, fontSize: 13, color: brand.primarySoft }}>{exportHint}</Text>
          ) : null}
        </View>
      ) : null}
    </AppSurfaceCard>
  );
}
