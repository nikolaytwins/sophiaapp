import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildDayJournalHealthExportDoc,
  buildDayJournalNarrativeExportDoc,
  useDayJournalStore,
} from '@/stores/dayJournal.store';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { journalEntryHasContent, getFieldsBySection } from '@/features/day/dayJournal.logic';
import type { JournalFieldDefinition, JournalMoodId } from '@/features/day/dayJournal.types';
import { mergeNikolayJournalFields } from '@/features/accounts/nikolayJournalFields';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { findJournalHabit } from '@/features/journal/journalHabit';
import { JournalMoodStrip } from '@/features/journal/JournalMoodStrip';
import { getSupabase } from '@/lib/supabase';
import { pushDayJournalToCloud } from '@/services/dayJournalSupabaseSync';
import { repos } from '@/services/repositories';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { useAppTheme } from '@/theme';

function formatPrimaryDate(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const withYear = dateKey.slice(0, 4) !== todayKey.slice(0, 4);
  return dt.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}

function formatWeekday(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const s = dt.toLocaleDateString('ru-RU', { weekday: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function JournalMultilineInput({
  value,
  placeholder,
  onChangeText,
}: {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}) {
  const onWebChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.currentTarget.value;
    if (next !== value) onChangeText(next);
  };

  if (Platform.OS === 'web') {
    return React.createElement('textarea', {
      value,
      onChange: onWebChange,
      placeholder,
      rows: 4,
      style: {
        width: '100%',
        minHeight: 110,
        color: 'rgba(248,250,252,0.94)',
        fontSize: 15,
        lineHeight: '24px',
        fontWeight: 400,
        padding: 0,
        margin: 0,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      },
    });
  }

  return (
    <TextInput
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      underlineColorAndroid="transparent"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.32)"
      style={{
        width: '100%',
        minHeight: 110,
        color: 'rgba(248,250,252,0.94)',
        fontSize: 15,
        lineHeight: 24,
        padding: 0,
        margin: 0,
      }}
    />
  );
}

function JournalFieldCard({
  field,
  dateKey,
  onValueCommit,
}: {
  field: JournalFieldDefinition;
  dateKey: string;
  onValueCommit: (field: JournalFieldDefinition, value: string | number | boolean | null) => void;
}) {
  const { colors, brand, radius } = useAppTheme();
  const value = useDayJournalStore((s) => s.doc.entries[dateKey]?.values[field.id]);

  return (
    <AppSurfaceCard style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: field.prompt ? 6 : 12 }}>
        {field.label}
      </Text>
      {field.prompt ? (
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textMuted, marginBottom: 12 }}>{field.prompt}</Text>
      ) : null}

      {field.type === 'text' ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: 14,
          }}
        >
          <JournalMultilineInput
            value={typeof value === 'string' ? value : ''}
            placeholder="Напиши сюда"
            onChangeText={(text) => onValueCommit(field, text)}
          />
        </View>
      ) : field.type === 'number' ? (
        <TextInput
          value={typeof value === 'number' ? String(value) : ''}
          onChangeText={(text) => {
            const trimmed = text.trim();
            onValueCommit(field, trimmed ? Number(trimmed.replace(',', '.')) : null);
          }}
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.28)"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: colors.text,
            fontSize: 16,
          }}
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: brand.surfaceBorder,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{value === true ? 'Да' : 'Нет'}</Text>
          <Switch value={value === true} onValueChange={(next) => onValueCommit(field, next)} />
        </View>
      )}
    </AppSurfaceCard>
  );
}

export function JournalScreen() {
  const { colors, spacing, radius, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [viewDateKey, setViewDateKey] = useState(localDateKey());
  const [exportHint, setExportHint] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const doc = useDayJournalStore((s) => s.doc);
  const setFieldValue = useDayJournalStore((s) => s.setFieldValue);
  const setMood = useDayJournalStore((s) => s.setMood);
  const getEntry = useDayJournalStore((s) => s.getEntry);
  const habitsQ = useHabitsQuery();
  const todayKey = localDateKey();

  const journalFields = useMemo(() => getFieldsBySection(doc.fields, 'journal'), [doc.fields]);
  const healthFields = useMemo(() => getFieldsBySection(doc.fields, 'health'), [doc.fields]);
  const journalHabit = useMemo(() => findJournalHabit(habitsQ.data ?? []), [habitsQ.data]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setSessionEmail(null);
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isNikolayPrimaryAccount(sessionEmail)) return;
    const prev = useDayJournalStore.getState().doc;
    const merged = mergeNikolayJournalFields(prev);
    if (merged !== prev) {
      useDayJournalStore.getState().replaceDocument(merged);
    }
  }, [sessionEmail]);

  const commitFieldValue = async (field: JournalFieldDefinition, value: string | number | boolean | null) => {
    const before = getEntry(viewDateKey);
    const nextValues = { ...before.values, [field.id]: value };
    setFieldValue(viewDateKey, field.id, value);

    const nextEntry = {
      ...before,
      values: nextValues,
    };

    if (
      journalHabit &&
      !journalEntryHasContent(before, doc.fields) &&
      journalEntryHasContent(nextEntry, doc.fields) &&
      !habitDoneOnDate(journalHabit, viewDateKey)
    ) {
      const nextHabits = await repos.habits.checkIn(journalHabit.id, viewDateKey);
      qc.setQueryData([...HABITS_QUERY_KEY], nextHabits);
    }
  };

  const pickMood = async (dateKey: string, mood: JournalMoodId | null) => {
    const before = getEntry(dateKey);
    setMood(dateKey, mood);
    const after = useDayJournalStore.getState().getEntry(dateKey);
    if (
      journalHabit &&
      !journalEntryHasContent(before, doc.fields) &&
      journalEntryHasContent(after, doc.fields) &&
      !habitDoneOnDate(journalHabit, dateKey)
    ) {
      const nextHabits = await repos.habits.checkIn(journalHabit.id, dateKey);
      qc.setQueryData([...HABITS_QUERY_KEY], nextHabits);
    }
  };

  const exportDoc = async (kind: 'journal' | 'health') => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const payload = kind === 'journal' ? buildDayJournalNarrativeExportDoc() : buildDayJournalHealthExportDoc();
    const text = JSON.stringify(payload, null, 2);
    await Clipboard.setStringAsync(text);
    setExportHint(kind === 'journal' ? 'Экспорт дневника скопирован' : 'Экспорт здоровья скопирован');
    setTimeout(() => setExportHint(null), 3500);
  };

  const saveJournal = async () => {
    try {
      await pushDayJournalToCloud();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveHint('Сохранено');
    } catch (error) {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Ошибка сохранения';
      setSaveHint(`Не сохранилось: ${message}`);
    } finally {
      setTimeout(() => setSaveHint(null), 3200);
    }
  };

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl + 8,
          paddingBottom: insets.bottom + 148,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle
          eyebrow="Раздел"
          title="Дневник"
          subtitle="Ежедневные записи и здоровье в облаке"
          trailing={
            <Pressable
              onPress={() => router.push('/cloud' as Href)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Ionicons name={sessionEmail ? 'cloud-done-outline' : 'cloud-offline-outline'} size={20} color={sessionEmail ? brand.primarySoft : '#FCA5A5'} />
            </Pressable>
          }
        />

        <AppSurfaceCard glow style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: sessionEmail ? brand.primaryMuted : 'rgba(239,68,68,0.12)',
                borderWidth: 1,
                borderColor: sessionEmail ? brand.surfaceBorderStrong : 'rgba(239,68,68,0.3)',
              }}
            >
              <Ionicons name={sessionEmail ? 'cloud-done-outline' : 'warning-outline'} size={20} color={sessionEmail ? brand.primarySoft : '#FCA5A5'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                {sessionEmail ? 'Облако подключено' : 'Ты не вошёл в облако'}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>
                {sessionEmail
                  ? `Синхронизация идёт через ${sessionEmail}`
                  : 'Чтобы дневник точно сохранялся в Supabase, открой Облако и войди в аккаунт.'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => router.push('/cloud' as Href)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: sessionEmail ? brand.surfaceBorder : brand.surfaceBorderStrong,
                backgroundColor: pressed
                  ? brand.primaryMuted
                  : sessionEmail
                    ? 'rgba(255,255,255,0.03)'
                    : brand.primaryMuted,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Ionicons name={sessionEmail ? 'person-circle-outline' : 'log-in-outline'} size={16} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {sessionEmail ? 'Открыть Облако' : 'Войти в Облако'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/journal-settings' as Href)}
              style={({ pressed }) => ({
                width: 50,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? brand.primaryMuted : 'rgba(255,255,255,0.03)',
              })}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
        </AppSurfaceCard>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Pressable onPress={() => setViewDateKey((k) => addDays(k, -1))} hitSlop={12} style={{ paddingVertical: 4, paddingHorizontal: 2 }}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs }}>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: colors.text }} numberOfLines={1}>
              {formatPrimaryDate(viewDateKey, todayKey)}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }} numberOfLines={1}>
              {formatWeekday(viewDateKey)}
              {viewDateKey === todayKey ? ' · сегодня' : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => setViewDateKey((k) => {
              const n = addDays(k, 1);
              return n > todayKey ? k : n;
            })}
            disabled={viewDateKey >= todayKey}
            hitSlop={12}
            style={{ paddingVertical: 4, paddingHorizontal: 2, opacity: viewDateKey >= todayKey ? 0.28 : 1 }}
          >
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <JournalMoodStrip
          viewDateKey={viewDateKey}
          todayKey={todayKey}
          onViewDateChange={setViewDateKey}
          entries={doc.entries}
          onPickMood={(dk, mood) => void pickMood(dk, mood)}
        />

        <Pressable
          onPress={() => router.push('/journal-mood-stats' as Href)}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginBottom: spacing.lg,
            paddingVertical: 8,
            paddingHorizontal: 2,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: brand.primarySoft }}>Статистика настроений →</Text>
        </Pressable>

        <View
          style={{
            marginBottom: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: brand.primaryMuted,
              borderWidth: 1,
              borderColor: brand.surfaceBorderStrong,
            }}
          >
            <Ionicons name="book-outline" size={18} color={brand.primarySoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: colors.text }}>Дневник</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textMuted }}>Основные мысли, эмоции и события дня</Text>
          </View>
        </View>

        {journalFields.map((field) => (
          <JournalFieldCard key={field.id} field={field} dateKey={viewDateKey} onValueCommit={commitFieldValue} />
        ))}

        <View
          style={{
            marginTop: spacing.lg,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(59,130,246,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,0.22)',
            }}
          >
            <Ionicons name="fitness-outline" size={18} color="#93C5FD" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: colors.text }}>Здоровье</Text>
        </View>

        {healthFields.map((field) => (
          <JournalFieldCard key={field.id} field={field} dateKey={viewDateKey} onValueCommit={commitFieldValue} />
        ))}

        <AppSurfaceCard style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="download-outline" size={18} color={brand.primarySoft} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Экспорт</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Pressable
              onPress={() => void exportDoc('journal')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorderStrong,
                backgroundColor: brand.primaryMuted,
              }}
            >
              <Ionicons name="bookmarks-outline" size={16} color="#FAFAFC" />
              <Text style={{ color: '#FAFAFC', fontWeight: '700' }}>Экспорт дневника</Text>
            </Pressable>
            <Pressable
              onPress={() => void exportDoc('health')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: brand.surfaceBorder,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Ionicons name="pulse-outline" size={16} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>Экспорт здоровья</Text>
            </Pressable>
          </View>
          {exportHint ? <Text style={{ marginTop: 10, color: 'rgba(134,239,172,0.95)', fontSize: 13 }}>{exportHint}</Text> : null}
        </AppSurfaceCard>

        <Pressable
          onPress={() => void saveJournal()}
          style={({ pressed }) => ({
            marginTop: spacing.md,
            marginBottom: spacing.sm,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.5)',
            backgroundColor: pressed ? '#9333EA' : brand.primary,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            shadowColor: '#A855F7',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.28,
            shadowRadius: 24,
            elevation: 10,
          })}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FAFAFC" />
          <Text style={{ color: '#FAFAFC', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>Сохранить</Text>
        </Pressable>
        <Text style={{ textAlign: 'center', fontSize: 13, color: saveHint ? 'rgba(134,239,172,0.95)' : colors.textMuted }}>
          {saveHint ?? 'Все записи и так сохраняются автоматически, кнопка просто даёт явное подтверждение.'}
        </Text>
      </ScrollView>
    </ScreenCanvas>
  );
}
