import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { habitCadenceLabel } from '@/features/day/dayHabitUi';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { useHabitsQuery } from '@/features/habits/useHabitsQuery';
import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

const VIOLET = '#A855F7';
const SETTINGS_HABITS = '/settings?tab=habits' as Href;

const ICON_OPTIONS = [
  'sparkles-outline',
  'flame-outline',
  'walk-outline',
  'water-outline',
  'barbell-outline',
  'moon-outline',
  'book-outline',
  'heart-outline',
  'megaphone-outline',
  'document-text-outline',
  'heart-circle-outline',
] as const;

export default function HabitEditScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const habitId = Array.isArray(rawId) ? rawId[0] : rawId;

  const habits = useHabitsQuery();
  const habit = useMemo(
    () => (habitId ? (habits.data ?? []).find((h) => h.id === habitId) : undefined),
    [habits.data, habitId]
  );

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);
  const [requiredForProgress, setRequiredForProgress] = useState(true);
  const [dailyCheckMode, setDailyCheckMode] = useState<'once' | 'counter'>('once');
  const [counterTarget, setCounterTarget] = useState(3);
  const [counterUnit, setCounterUnit] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!habit) return;
    setName(habit.name);
    setIcon(
      ICON_OPTIONS.includes(habit.icon as (typeof ICON_OPTIONS)[number])
        ? habit.icon
        : ICON_OPTIONS[0]
    );
    setRequiredForProgress(habit.required);
    if (habit.cadence === 'weekly') {
      setWeeklyTarget(habit.weeklyTarget ?? 3);
    } else if (habit.checkInKind === 'counter' && habit.dailyTarget != null) {
      setDailyCheckMode('counter');
      setCounterTarget(habit.dailyTarget);
      setCounterUnit(habit.counterUnit ?? '');
    } else {
      setDailyCheckMode('once');
      setCounterTarget(3);
      setCounterUnit('');
    }
    setHydrated(true);
  }, [habit]);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => {
      if (!habitId || !habit) throw new Error('Нет привычки');
      const base = {
        name: name.trim() || habit.name,
        icon,
        required: requiredForProgress,
      };
      if (habit.cadence === 'weekly') {
        return repos.habits.update(habitId, base);
      }
      if (dailyCheckMode === 'counter') {
        return repos.habits.update(habitId, {
          ...base,
          dailyTrackMode: 'counter',
          dailyTarget: counterTarget,
          counterUnit: counterUnit.trim() || undefined,
        });
      }
      return repos.habits.update(habitId, {
        ...base,
        dailyTrackMode: 'once',
      });
    },
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
      Keyboard.dismiss();
      if (Platform.OS === 'web') {
        router.replace(SETTINGS_HABITS);
        return;
      }
      if (router.canDismiss()) router.dismiss();
      else if (router.canGoBack()) router.back();
      else router.replace(SETTINGS_HABITS);
    },
  });

  const submit = useCallback(() => {
    if (isPending || !habitId || !habit) return;
    mutate();
  }, [habit, habitId, isPending, mutate]);

  const canSave = name.trim().length > 0;

  const screenOptions = useMemo(
    () => ({
      headerShown: true as const,
      headerTitle: 'Привычка',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable
          onPress={submit}
          disabled={isPending || !habit || !hydrated}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Сохранить"
        >
          {isPending ? (
            <ActivityIndicator color={VIOLET} />
          ) : (
            <Text
              style={{
                color: canSave && habit && hydrated ? VIOLET : colors.textMuted,
                fontWeight: '700',
                fontSize: 16,
              }}
            >
              Сохранить
            </Text>
          )}
        </Pressable>
      ),
    }),
    [canSave, colors.bg, colors.text, colors.textMuted, habit, hydrated, isPending, submit]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          ...typography.body,
          color: colors.text,
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
        },
        chip: {
          minWidth: 44,
          height: 44,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(168,85,247,0.06)',
        },
        chipOn: {
          borderColor: `${VIOLET}88`,
          backgroundColor: 'rgba(168,85,247,0.18)',
        },
        primaryBtn: {
          marginTop: spacing.lg,
          paddingVertical: 16,
          borderRadius: 20,
          backgroundColor: isPending ? 'rgba(255,255,255,0.08)' : 'rgba(168,85,247,0.35)',
          borderWidth: 1,
          borderColor: `${VIOLET}66`,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        },
      }),
    [colors.border, colors.text, isPending, radius.md, spacing.lg, spacing.sm, typography.body]
  );

  const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  if (!habitId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Ошибка' }} />
        <View style={{ flex: 1, padding: spacing.xl, backgroundColor: colors.bg }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>Не передан id привычки.</Text>
        </View>
      </>
    );
  }

  if (habits.isLoading || !hydrated) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Загрузка…' }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={VIOLET} />
        </View>
      </>
    );
  }

  if (!habit) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Нет данных' }} />
        <View style={{ flex: 1, padding: spacing.xl, backgroundColor: colors.bg }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Привычка не найдена. Вернись в настройки.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <Text
          style={[
            typography.caption,
            { color: VIOLET, letterSpacing: 1.2, marginBottom: spacing.md, textTransform: 'uppercase' },
          ]}
        >
          Редактирование
        </Text>

        <GlassCard glow>
          <Text style={typography.caption}>НАЗВАНИЕ</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Название привычки"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.title2, { color: colors.text, fontSize: 16 }]}>В прогрессе дня</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, lineHeight: 18 }]}>
                Входит в счётчик на экране «День» вместе с задачами. Недельные можно не включать, если не хочешь
                видеть их в числе каждый день.
              </Text>
            </View>
            <Switch
              value={requiredForProgress}
              onValueChange={setRequiredForProgress}
              trackColor={{ false: colors.border, true: 'rgba(168,85,247,0.45)' }}
              thumbColor={requiredForProgress ? VIOLET : colors.textMuted}
            />
          </View>
        </GlassCard>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { marginBottom: spacing.sm }]}>ТИП</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
            {habitCadenceLabel(habit)}
          </Text>
          <Text style={[typography.caption, { marginTop: spacing.sm, opacity: 0.85 }]}>
            Ритм (каждый день / неделя) при создании не меняется. Ниже — только способ отметки для ежедневных.
          </Text>
        </View>

        {habit.cadence === 'daily' ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.caption, { marginBottom: spacing.sm }]}>ОТМЕТКА ЗА ДЕНЬ</Text>
            <SegmentedControl
              value={dailyCheckMode}
              onChange={setDailyCheckMode}
              options={[
                { value: 'once', label: 'Раз в день' },
                { value: 'counter', label: 'Количество (+)' },
              ]}
            />
            <Text style={[typography.caption, { marginTop: spacing.sm, opacity: 0.85 }]}>
              Количественная: на экране «День» кольцо и кнопки +/−. Цель — когда «выполнено»; можно набрать больше
              (например 5/3).
            </Text>
            {dailyCheckMode === 'counter' ? (
              <GlassCard style={{ marginTop: spacing.lg }} glow>
                <Text style={typography.caption}>ЦЕЛЬ НА ДЕНЬ (ДЛЯ «СДЕЛАНО»)</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                    marginTop: spacing.md,
                  }}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 50, 100, 140].map((n) => {
                    const on = n === counterTarget;
                    return (
                      <Pressable key={n} onPress={() => setCounterTarget(n)} style={[styles.chip, on && styles.chipOn]}>
                        <Text style={[typography.title2, { color: on ? VIOLET : colors.text }]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[typography.caption, { marginTop: spacing.md }]}>ПОДПИСЬ (НЕОБЯЗАТЕЛЬНО)</Text>
                <TextInput
                  value={counterUnit}
                  onChangeText={setCounterUnit}
                  placeholder="действий, раз, стаканов…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </GlassCard>
            ) : null}
          </View>
        ) : (
          <GlassCard style={{ marginTop: spacing.lg }} glow>
            <Text style={typography.caption}>СКОЛЬКО РАЗ ЗА НЕДЕЛЮ (СПРАВОЧНО)</Text>
            <Text style={[typography.caption, { marginTop: spacing.sm, opacity: 0.85 }]}>
              Число недели задаётся при создании. Чтобы изменить цель недели, удали привычку и создай заново.
            </Text>
            <Text style={[typography.title2, { marginTop: spacing.md, color: colors.text }]}>
              {weeklyTarget}× / нед.
            </Text>
          </GlassCard>
        )}

        <GlassCard style={{ marginTop: spacing.lg }}>
          <Text style={typography.caption}>ИКОНКА</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginTop: spacing.md,
            }}
          >
            {ICON_OPTIONS.map((ico) => {
              const on = icon === ico;
              return (
                <Pressable
                  key={ico}
                  onPress={() => setIcon(ico)}
                  style={[
                    {
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: on ? `${VIOLET}99` : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Ionicons name={ico} size={24} color={on ? VIOLET : colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {isError ? (
          <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.md }]}>
            Не удалось сохранить. Попробуй ещё раз.
          </Text>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={submit}
          disabled={isPending}
          style={[styles.primaryBtn, webCursor]}
          accessibilityRole="button"
          accessibilityLabel="Сохранить привычку"
        >
          {isPending ? (
            <ActivityIndicator color={VIOLET} />
          ) : (
            <Text style={{ color: VIOLET, fontWeight: '800', fontSize: 16 }}>
              Сохранить изменения
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
