import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Habit } from '@/entities/models';
import { DayHabitGrid } from '@/features/day/DayHabitGrid';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';
import {
  DAY_TYPE_OPTIONS,
  EVENING_ENERGY_OPTIONS,
  MORNING_STATE_OPTIONS,
  RECOVERY_OPTIONS,
  type DayJournalEntry,
  type DayTypeId,
  type EveningEnergyId,
  type MorningStateId,
  type RecoveryId,
} from '@/features/day/dayJournal.types';
import { addDays, localDateKey } from '@/features/habits/habitLogic';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { repos } from '@/services/repositories';
import {
  buildDayJournalExportDoc,
  ensureDayJournalHydrated,
  useDayJournalStore,
} from '@/stores/dayJournal.store';
import { useAppTheme } from '@/theme';

const CANVAS_GRAD = ['#020203', '#0A0A10', '#050506'] as const;

function entryHasContent(e: DayJournalEntry | undefined): boolean {
  if (!e) return false;
  return Boolean(
    e.morningState ||
      e.eveningEnergy ||
      e.dayType ||
      (e.recoveryIds?.length ?? 0) > 0 ||
      (e.note?.trim().length ?? 0) > 0
  );
}

function formatDayHeading(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(dateKey !== todayKey ? { year: 'numeric' as const } : {}),
  });
}

function shortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function splitEmojiTitle(label: string): { emoji: string; title: string } {
  const i = label.indexOf(' ');
  if (i === -1) return { emoji: label.trim(), title: '' };
  return { emoji: label.slice(0, i).trim(), title: label.slice(i + 1).trim() };
}

/** Короткие подписи для сетки «тип дня» — полные строки остаются в данных экспорта. */
const DAY_TYPE_TITLE: Record<DayTypeId, string> = {
  super_productive: 'Суперпродуктив',
  focus: 'Фокус',
  chaos: 'Суета',
  stuck: 'Застрял',
  dropped: 'Выпал',
  rest: 'Отдых',
};

function SurfaceCard({
  children,
  glow,
  style,
}: {
  children: ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { radius, spacing } = useAppTheme();
  const base = {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glow ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(14,14,18,0.88)',
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? {}
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: glow ? 0.42 : 0.32,
          shadowRadius: glow ? 24 : 18,
          elevation: glow ? 8 : 6,
        }),
  };
  return <View style={[base, style]}>{children}</View>;
}

export function DayScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const habits = useHabitsQuery();
  const todayKey = localDateKey();
  const [viewDateKey, setViewDateKey] = useState(todayKey);
  const [dayPhase, setDayPhase] = useState<'morning' | 'evening'>('morning');
  const [exportHint, setExportHint] = useState<string | null>(null);

  const updateEntry = useDayJournalStore((s) => s.updateEntry);
  const toggleRecovery = useDayJournalStore((s) => s.toggleRecovery);
  const allJournalEntries = useDayJournalStore((s) => s.entries);
  const entry = allJournalEntries[viewDateKey];

  const journal = useMemo(() => {
    if (!entry) {
      return {
        dateKey: viewDateKey,
        recoveryIds: [] as RecoveryId[],
        note: '',
        updatedAt: '',
      };
    }
    return entry;
  }, [entry, viewDateKey]);

  const historyDayKeys = useMemo(() => {
    return Object.keys(allJournalEntries)
      .filter((k) => entryHasContent(allJournalEntries[k]))
      .sort()
      .reverse()
      .slice(0, 40);
  }, [allJournalEntries]);

  const data = habits.data ?? [];

  const checkIn = useMutation({
    mutationFn: ({ id, dateKey: dk }: { id: string; dateKey?: string }) => repos.habits.checkIn(id, dk),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const undoWeekly = useMutation({
    mutationFn: ({ id, dateKey: dk }: { id: string; dateKey?: string }) => repos.habits.undoWeekly(id, dk),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
    },
  });

  const onHabitIcon = useCallback(
    (h: Habit) => {
      if (viewDateKey > todayKey) return;
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (h.cadence === 'daily') {
        checkIn.mutate({ id: h.id, dateKey: viewDateKey });
        return;
      }
      if (habitDoneOnDate(h, viewDateKey)) {
        undoWeekly.mutate({ id: h.id, dateKey: viewDateKey });
      } else {
        checkIn.mutate({ id: h.id, dateKey: viewDateKey });
      }
    },
    [checkIn, todayKey, undoWeekly, viewDateKey]
  );

  const goPrevDay = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewDateKey((k) => addDays(k, -1));
  }, []);

  const goNextDay = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setViewDateKey((k) => {
      const n = addDays(k, 1);
      return n > todayKey ? k : n;
    });
  }, [todayKey]);

  const isViewingToday = viewDateKey === todayKey;

  const exportJournal = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await ensureDayJournalHydrated();
      const doc = buildDayJournalExportDoc();
      const text = JSON.stringify(doc, null, 2);
      await Clipboard.setStringAsync(text);
      setExportHint('Скопировано в буфер обмена');
      setTimeout(() => setExportHint(null), 3500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      try {
        await ensureDayJournalHydrated();
        const text = JSON.stringify(buildDayJournalExportDoc(), null, 2);
        if (Platform.OS !== 'web') {
          await Share.share({ message: text, title: 'Дневник Sophia' });
          setExportHint('Открыто меню «Поделиться» — сохрани или отправь JSON');
        } else {
          setExportHint(`Не удалось скопировать: ${msg}`);
        }
      } catch {
        setExportHint(`Ошибка экспорта: ${msg}`);
        Alert.alert('Экспорт дневника', msg);
      }
      setTimeout(() => setExportHint(null), 6000);
    }
  }, []);

  const subsectionStyle = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 10,
    letterSpacing: 0.2,
  };

  const pillHit = (active: boolean) => ({
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: active ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.07)',
    backgroundColor: active ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.03)',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#030304' }}>
      <LinearGradient pointerEvents="none" colors={[...CANVAS_GRAD]} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl + 8,
          paddingBottom: insets.bottom + 148,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                typography.caption,
                {
                  color: 'rgba(255,255,255,0.42)',
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  marginBottom: spacing.xs,
                },
              ]}
            >
              Ритм
            </Text>
            <Text style={[typography.hero, { fontSize: 34, letterSpacing: -1.1, color: colors.text }]}>День</Text>
            <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textMuted, opacity: 0.9 }]}>
              {formatDayHeading(viewDateKey, todayKey)}
              {isViewingToday ? ' · сегодня' : ''}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <Pressable
            onPress={goPrevDay}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Предыдущий день"
            style={{ padding: 6 }}
          >
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.65)" />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
            }}
            numberOfLines={2}
          >
            {viewDateKey}
          </Text>
          <Pressable
            onPress={goNextDay}
            disabled={viewDateKey >= todayKey}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Следующий день"
            style={{ padding: 6, opacity: viewDateKey >= todayKey ? 0.25 : 1 }}
          >
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.65)" />
          </Pressable>
        </View>

        {historyDayKeys.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, marginBottom: spacing.sm }}>
              ДНИ С ЗАПИСЯМИ
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {historyDayKeys.map((k) => {
                const on = k === viewDateKey;
                return (
                  <Pressable
                    key={k}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setViewDateKey(k);
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: on ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.1)',
                      backgroundColor: on ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#FAFAFC' : 'rgba(255,255,255,0.65)' }}>
                      {shortDayLabel(k)}
                      {k === todayKey ? ' · сегодня' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <DayHabitGrid
          habits={data}
          loading={habits.isLoading}
          emptyHint="Пока нет привычек — добавь на вкладке «Привычки»."
          viewDateKey={viewDateKey}
          todayKey={todayKey}
          onToggle={onHabitIcon}
        />

        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.4,
              color: 'rgba(255,255,255,0.38)',
              marginBottom: 6,
            }}
          >
            ДНЕВНИК
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', marginBottom: spacing.md, lineHeight: 22 }}>
            Состояние, тип дня и заметка хранятся локально. Экспорт — внизу экрана.
          </Text>
        </View>

        {/* Один блок: настроение + переключатель утро/вечер */}
        <SurfaceCard style={{ marginTop: spacing.sm, paddingVertical: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: colors.text }}>Состояние</Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: radius.lg,
              padding: 3,
              marginBottom: spacing.lg,
            }}
          >
            {(['morning', 'evening'] as const).map((key) => {
              const on = dayPhase === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setDayPhase(key);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: radius.md,
                    backgroundColor: on ? 'rgba(168,85,247,0.22)' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: '700',
                      color: on ? '#FAFAFC' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {key === 'morning' ? 'Утро' : 'Вечер'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {dayPhase === 'morning' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MORNING_STATE_OPTIONS.map((o) => {
                const { emoji, title } = splitEmojiTitle(o.label);
                const sel = journal.morningState === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      updateEntry(viewDateKey, {
                        morningState: journal.morningState === o.id ? undefined : (o.id as MorningStateId),
                      });
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 4,
                      borderRadius: 16,
                      opacity: pressed ? 0.92 : 1,
                      borderWidth: 1,
                      borderColor: sel ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)',
                      backgroundColor: sel ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                    })}
                  >
                    <Text style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        textAlign: 'center',
                        color: sel ? 'rgba(250,250,252,0.95)' : 'rgba(255,255,255,0.55)',
                        lineHeight: 17,
                      }}
                    >
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: spacing.lg }}>
              <View>
                <Text style={subsectionStyle}>Сейчас</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                  {EVENING_ENERGY_OPTIONS.map((o) => {
                    const { emoji, title } = splitEmojiTitle(o.label);
                    const sel = journal.eveningEnergy === o.id;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          updateEntry(viewDateKey, {
                            eveningEnergy: journal.eveningEnergy === o.id ? undefined : (o.id as EveningEnergyId),
                          });
                        }}
                        style={({ pressed }) => ({
                          width: 112,
                          alignItems: 'center',
                          opacity: pressed ? 0.9 : 1,
                          ...pillHit(sel),
                          paddingVertical: 14,
                          paddingHorizontal: 10,
                          borderRadius: 16,
                        })}
                      >
                        <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</Text>
                        <Text
                          numberOfLines={2}
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            textAlign: 'center',
                            color: sel ? '#FAFAFC' : 'rgba(255,255,255,0.55)',
                            lineHeight: 17,
                          }}
                        >
                          {title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.07)' }} />

              <View>
                <Text style={subsectionStyle}>Тип дня</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {DAY_TYPE_OPTIONS.map((o) => {
                    const sel = journal.dayType === o.id;
                    const short = DAY_TYPE_TITLE[o.id];
                    const { emoji } = splitEmojiTitle(o.label);
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          updateEntry(viewDateKey, {
                            dayType: journal.dayType === o.id ? undefined : (o.id as DayTypeId),
                          });
                        }}
                        style={({ pressed }) => ({
                          width: '47%',
                          flexGrow: 1,
                          minWidth: 140,
                          paddingVertical: 14,
                          paddingHorizontal: 12,
                          borderRadius: 16,
                          opacity: pressed ? 0.92 : 1,
                          borderWidth: 1,
                          borderColor: sel ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)',
                          backgroundColor: sel ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                        })}
                      >
                        <Text style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? colors.text : 'rgba(255,255,255,0.65)', lineHeight: 20 }}>
                          {short}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.07)' }} />

              <View>
                <Text style={subsectionStyle}>Восстановление · до двух</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RECOVERY_OPTIONS.map((o) => {
                    const sel = journal.recoveryIds.includes(o.id);
                    const { emoji, title } = splitEmojiTitle(o.label);
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          toggleRecovery(viewDateKey, o.id as RecoveryId);
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          opacity: pressed ? 0.9 : 1,
                          ...pillHit(sel),
                          paddingVertical: 11,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                        })}
                      >
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? '#FAFAFC' : 'rgba(255,255,255,0.6)' }}>{title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: spacing.md }}>
          <Text style={{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: colors.text, marginBottom: spacing.sm }}>
            Заметка дня
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: spacing.sm, lineHeight: 20 }}>
            Короткая мысль или итог — без обязательной структуры.
          </Text>
          <TextInput
            value={journal.note ?? ''}
            onChangeText={(t) => updateEntry(viewDateKey, { note: t })}
            placeholder="Одна мысль на вечер…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              minHeight: 100,
              padding: 16,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              color: colors.text,
              fontSize: 16,
              lineHeight: 24,
            }}
          />
        </SurfaceCard>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.42)', marginBottom: spacing.sm }}>
            Дневник (утро, вечер, заметки) хранится только на этом устройстве в локальной памяти. В Supabase и
            синхронизацию с облаком он не передаётся — только экспорт JSON.
          </Text>
          <Pressable
            onPress={exportJournal}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
            })}
          >
            <Text style={{ color: 'rgba(196,181,253,0.95)', fontWeight: '600', fontSize: 14 }}>
              Экспорт дневника (JSON)
            </Text>
          </Pressable>
          {exportHint ? (
            <Text style={{ marginTop: spacing.sm, fontSize: 13, color: 'rgba(134,239,172,0.95)' }}>{exportHint}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
