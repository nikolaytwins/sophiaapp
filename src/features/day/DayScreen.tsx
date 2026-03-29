import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  DAY_TYPE_OPTIONS,
  EVENING_ENERGY_OPTIONS,
  MORNING_STATE_OPTIONS,
  RECOVERY_OPTIONS,
  type DayTypeId,
  type EveningEnergyId,
  type MorningStateId,
  type RecoveryId,
} from '@/features/day/dayJournal.types';
import { localDateKey } from '@/features/habits/habitLogic';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { HabitHero } from '@/features/habits/HabitHero';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { repos } from '@/services/repositories';
import { buildDayJournalExportDoc, useDayJournalStore } from '@/stores/dayJournal.store';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';
const CANVAS_GRAD = ['#020203', '#0A0A10', '#050506'] as const;
/** Кольцо прогресса: нейтральный трек + фиолетовая дуга (без золотистого accent темы). */
const RING_TRACK = 'rgba(255,255,255,0.09)';
const RING_SUB = 'rgba(196,181,253,0.78)';

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

function headlineDate(): string {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

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
  const dateKey = useMemo(() => localDateKey(), []);
  const [dayPhase, setDayPhase] = useState<'morning' | 'evening'>('morning');

  const updateEntry = useDayJournalStore((s) => s.updateEntry);
  const toggleRecovery = useDayJournalStore((s) => s.toggleRecovery);
  const entry = useDayJournalStore((s) => s.entries[dateKey]);

  const journal = useMemo(() => {
    if (!entry) {
      return {
        dateKey,
        recoveryIds: [] as RecoveryId[],
        note: '',
        updatedAt: '',
      };
    }
    return entry;
  }, [entry, dateKey]);

  const data = habits.data ?? [];
  /** Как на «Привычки»: только отмеченные звёздочкой «в ритме». */
  const ritualHabits = useMemo(() => data.filter((h) => h.required !== false), [data]);
  const doneCount = useMemo(() => ritualHabits.filter((h) => h.todayDone).length, [ritualHabits]);
  const totalHabits = ritualHabits.length;
  const score01 = totalHabits === 0 ? 0 : doneCount / totalHabits;
  const score100 = Math.round(score01 * 100);

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
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (h.cadence === 'daily') {
        checkIn.mutate({ id: h.id, dateKey });
        return;
      }
      if (h.todayDone) {
        undoWeekly.mutate({ id: h.id, dateKey });
      } else {
        checkIn.mutate({ id: h.id, dateKey });
      }
    },
    [checkIn, dateKey, undoWeekly]
  );

  const exportJournal = useCallback(async () => {
    const doc = buildDayJournalExportDoc();
    const text = JSON.stringify(doc, null, 2);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        Alert.alert('Готово', 'JSON дневника скопирован в буфер обмена.');
        return;
      }
      await Share.share({ message: text, title: 'Дневник Sophia' });
    } catch {
      Alert.alert('Экспорт', text.slice(0, 2000));
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
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 120,
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
              {headlineDate()}
            </Text>
          </View>
        </View>

        <HabitHero totalHabits={totalHabits} doneToday={doneCount} />

        <SurfaceCard glow style={{ marginTop: spacing.lg, overflow: 'hidden' }}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(168,85,247,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ ...StyleSheet.absoluteFillObject, borderRadius: radius.xl }}
          />
          <View style={{ position: 'relative', zIndex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.38)', letterSpacing: 1.4, marginBottom: spacing.sm }}>
              ОБЗОР ДНЯ
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing
                value01={score01}
                size={118}
                stroke={9}
                label={`${score100}`}
                sublabel="%"
                trackColor={RING_TRACK}
                progressColor={ACCENT}
                sublabelColor={RING_SUB}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text }}>
                  {totalHabits === 0
                    ? 'На «Привычки» отметь звёздочкой, что входит в ритм дня — тогда появится счёт X/Y.'
                    : `${doneCount} из ${totalHabits} · ${score100}% дня`}
                </Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        {/* Один блок: настроение + переключатель утро/вечер */}
        <SurfaceCard style={{ marginTop: spacing.md, paddingVertical: spacing.xl }}>
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
                      updateEntry(dateKey, {
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
                          updateEntry(dateKey, {
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
                          updateEntry(dateKey, {
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
                          toggleRecovery(dateKey, o.id as RecoveryId);
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

        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.35, color: colors.text, marginBottom: spacing.sm }}>Заметка</Text>
          <TextInput
            value={journal.note ?? ''}
            onChangeText={(t) => updateEntry(dateKey, { note: t })}
            placeholder="Одна мысль на вечер…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              minHeight: 96,
              padding: 16,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: colors.text,
              fontSize: 16,
              lineHeight: 24,
            }}
          />
        </View>

        <SurfaceCard glow style={{ marginTop: spacing.lg }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.38)', letterSpacing: 1.4, marginBottom: 4 }}>
            БЫСТРЫЙ ЧЕКИН
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: spacing.md, lineHeight: 22 }}>
            Касание — та же отметка, что на «Привычки».
          </Text>
          {habits.isLoading ? (
            <Text style={{ color: colors.textMuted }}>Загрузка…</Text>
          ) : totalHabits === 0 ? (
            <Text style={{ color: colors.textMuted }}>Пока нет привычек.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {data.map((h) => {
                const on = h.todayDone;
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => onHabitIcon(h)}
                    style={({ pressed }) => ({
                      width: '30%',
                      minWidth: 96,
                      flexGrow: 1,
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 8,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: on ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.07)',
                      backgroundColor: on ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: radius.lg,
                        backgroundColor: on ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: on ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={h.icon as keyof typeof Ionicons.glyphMap}
                        size={26}
                        color={on ? ACCENT : 'rgba(255,255,255,0.5)'}
                      />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop: 8,
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: '600',
                        color: on ? colors.text : 'rgba(255,255,255,0.68)',
                        lineHeight: 17,
                      }}
                    >
                      {h.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </SurfaceCard>

        <Pressable
          onPress={exportJournal}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            alignSelf: 'flex-start',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
          })}
        >
          <Text style={{ color: 'rgba(196,181,253,0.95)', fontWeight: '600', fontSize: 14 }}>Экспорт дневника (JSON)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
