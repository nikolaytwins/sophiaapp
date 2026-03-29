import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, type ReactNode } from 'react';
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
    borderColor: glow ? 'rgba(168,85,247,0.22)' : 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(18,18,22,0.92)',
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? {}
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: glow ? 0.5 : 0.38,
          shadowRadius: glow ? 28 : 22,
          elevation: glow ? 10 : 7,
        }),
  };
  return <View style={[base, style]}>{children}</View>;
}

function SelectChip({
  label,
  selected,
  onPress,
  compact,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: compact ? 8 : 10,
        paddingHorizontal: compact ? 10 : 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? 'rgba(168,85,247,0.55)' : 'rgba(255,255,255,0.1)',
        backgroundColor: selected ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.04)',
        opacity: pressed ? 0.88 : 1,
        flexGrow: compact ? 1 : undefined,
        flexBasis: compact ? '48%' : undefined,
        minWidth: compact ? '47%' : undefined,
      })}
    >
      <Text style={{ fontSize: compact ? 12 : 13, lineHeight: 18, color: 'rgba(250,250,252,0.92)' }}>{label}</Text>
    </Pressable>
  );
}

export function DayScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const habits = useHabitsQuery();
  const dateKey = useMemo(() => localDateKey(), []);

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
  const doneCount = useMemo(() => data.filter((h) => h.todayDone).length, [data]);
  const totalHabits = data.length;
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
            colors={['rgba(168,85,247,0.07)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ ...StyleSheet.absoluteFillObject, borderRadius: radius.xl }}
          />
          <View style={{ position: 'relative', zIndex: 1 }}>
            <Text
              style={[
                typography.caption,
                {
                  color: 'rgba(255,255,255,0.32)',
                  letterSpacing: 1.3,
                  textTransform: 'uppercase',
                  marginBottom: spacing.sm,
                },
              ]}
            >
              Обзор дня
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing value01={score01} size={120} stroke={10} label={`${score100}`} sublabel="%" />
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                  {totalHabits === 0
                    ? 'Добавь привычки на экране «Привычки» — здесь появится общий счёт за сегодня.'
                    : `Выполнено ${doneCount} из ${totalHabits} привычек. 100% — все отмечены сегодня.`}
                </Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: spacing.sm },
            ]}
          >
            Утро · состояние
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MORNING_STATE_OPTIONS.map((o) => (
              <SelectChip
                key={o.id}
                label={o.label}
                compact
                selected={journal.morningState === o.id}
                onPress={() =>
                  updateEntry(dateKey, {
                    morningState: journal.morningState === o.id ? undefined : (o.id as MorningStateId),
                  })
                }
              />
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: spacing.sm },
            ]}
          >
            Вечер · состояние
          </Text>
          <View style={{ gap: 8 }}>
            {EVENING_ENERGY_OPTIONS.map((o) => (
              <SelectChip
                key={o.id}
                label={o.label}
                selected={journal.eveningEnergy === o.id}
                onPress={() =>
                  updateEntry(dateKey, {
                    eveningEnergy: journal.eveningEnergy === o.id ? undefined : (o.id as EveningEnergyId),
                  })
                }
              />
            ))}
          </View>

          <Text
            style={[
              typography.caption,
              {
                color: 'rgba(255,255,255,0.32)',
                letterSpacing: 1.3,
                textTransform: 'uppercase',
                marginTop: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            Тип дня
          </Text>
          <View style={{ gap: 8 }}>
            {DAY_TYPE_OPTIONS.map((o) => (
              <SelectChip
                key={o.id}
                label={o.label}
                selected={journal.dayType === o.id}
                onPress={() =>
                  updateEntry(dateKey, {
                    dayType: journal.dayType === o.id ? undefined : (o.id as DayTypeId),
                  })
                }
              />
            ))}
          </View>

          <Text
            style={[
              typography.caption,
              {
                color: 'rgba(255,255,255,0.32)',
                letterSpacing: 1.3,
                textTransform: 'uppercase',
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              },
            ]}
          >
            Восстановление (1–2)
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            Выбери не больше двух пунктов.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RECOVERY_OPTIONS.map((o) => (
              <SelectChip
                key={o.id}
                label={o.label}
                compact
                selected={journal.recoveryIds.includes(o.id)}
                onPress={() => toggleRecovery(dateKey, o.id as RecoveryId)}
              />
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={{ marginTop: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: spacing.sm },
            ]}
          >
            Заметка
          </Text>
          <TextInput
            value={journal.note ?? ''}
            onChangeText={(t) => updateEntry(dateKey, { note: t })}
            placeholder="Короткая запись…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              minHeight: 72,
              padding: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(0,0,0,0.35)',
              color: colors.text,
              fontSize: 15,
              lineHeight: 22,
            }}
          />
        </SurfaceCard>

        <SurfaceCard glow style={{ marginTop: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: 'rgba(255,255,255,0.32)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: spacing.sm },
            ]}
          >
            Быстрый чекин
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
            Нажми на привычку — отметка синхронизируется с экраном «Привычки».
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
                      borderColor: on ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)',
                      backgroundColor: on ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: radius.lg,
                        backgroundColor: on ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: on ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.07)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={h.icon as keyof typeof Ionicons.glyphMap}
                        size={28}
                        color={on ? ACCENT : 'rgba(255,255,255,0.55)'}
                      />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop: 8,
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: '600',
                        color: on ? colors.text : 'rgba(255,255,255,0.72)',
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
            borderColor: 'rgba(255,255,255,0.12)',
            backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
          })}
        >
          <Text style={{ color: ACCENT, fontWeight: '600', fontSize: 14 }}>Экспорт дневника (JSON)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
