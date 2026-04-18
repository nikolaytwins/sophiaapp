import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import type { HabitCadence } from '@/entities/models';
import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

const ICON_OPTIONS = [
  'sparkles-outline',
  'flame-outline',
  'walk-outline',
  'water-outline',
  'barbell-outline',
  'moon-outline',
  'book-outline',
  'heart-outline',
] as const;

const VIOLET = '#A855F7';
const HABITS_TAB = '/habits' as Href;

export default function HabitNewScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);
  /** Только для ежедневных: одна галочка или счётчик за день. */
  const [dailyCheckMode, setDailyCheckMode] = useState<'once' | 'counter'>('once');
  const [counterTarget, setCounterTarget] = useState(8);
  const [counterUnit, setCounterUnit] = useState('');
  /** Вкл — входит в X/Y на экране «День» (вместе с задачами). */
  const [countInDayProgress, setCountInDayProgress] = useState(true);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () =>
      repos.habits.create({
        name: name.trim() || 'Привычка',
        icon,
        cadence,
        required: countInDayProgress,
        weeklyTarget: cadence === 'weekly' ? weeklyTarget : undefined,
        ...(cadence === 'daily' && dailyCheckMode === 'counter'
          ? {
              checkInKind: 'counter' as const,
              dailyTarget: counterTarget,
              ...(counterUnit.trim() ? { counterUnit: counterUnit.trim() } : {}),
            }
          : {}),
      }),
    onSuccess: (list) => {
      qc.setQueryData([...HABITS_QUERY_KEY], list);
      Keyboard.dismiss();
      /** Web: replace надёжнее, чем back(). Native: dismiss для modal stack. */
      if (Platform.OS === 'web') {
        router.replace(HABITS_TAB);
        return;
      }
      if (router.canDismiss()) {
        router.dismiss();
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(HABITS_TAB);
      }
    },
  });

  /** Пустое имя → «Привычка» в mutation; визуальная подсказка в шапке. */
  const canSave = name.trim().length > 0;

  const submit = useCallback(() => {
    if (isPending) return;
    mutate();
  }, [isPending, mutate]);

  const screenOptions = useMemo(
    () => ({
      headerShown: true as const,
      headerTitle: 'Новая привычка',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable
          onPress={submit}
          disabled={isPending}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Создать привычку"
        >
          {isPending ? (
            <ActivityIndicator color={VIOLET} />
          ) : (
            <Text
              style={{
                color: canSave ? VIOLET : colors.textMuted,
                fontWeight: '700',
                fontSize: 16,
              }}
            >
              Создать
            </Text>
          )}
        </Pressable>
      ),
    }),
    [canSave, colors.bg, colors.text, colors.textMuted, isPending, submit]
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
          Фокус на ритме
        </Text>

        <GlassCard glow>
          <Text style={typography.caption}>НАЗВАНИЕ</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Например: утренний протокол"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
        </GlassCard>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { marginBottom: spacing.sm }]}>ТИП</Text>
          <SegmentedControl
            value={cadence}
            onChange={setCadence}
            options={[
              { value: 'daily', label: 'Каждый день' },
              { value: 'weekly', label: 'Недельный ритм' },
            ]}
          />
          <Text style={[typography.caption, { marginTop: spacing.sm, opacity: 0.85 }]}>
            {cadence === 'daily'
              ? 'Стрик — подряд идущие дни с отметкой.'
              : 'Цель на неделю (пн–вс): N выполнений. Стрик — недели подряд, где цель достигнута.'}
          </Text>
        </View>

        {cadence === 'daily' ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.caption, { marginBottom: spacing.sm }]}>ОТМЕТКА ЗА ДЕНЬ</Text>
            <SegmentedControl
              value={dailyCheckMode}
              onChange={setDailyCheckMode}
              options={[
                { value: 'once', label: 'Раз в день' },
                { value: 'counter', label: 'Несколько раз' },
              ]}
            />
            <Text style={[typography.caption, { marginTop: spacing.sm, opacity: 0.85 }]}>
              {dailyCheckMode === 'once'
                ? 'Одна галочка закрывает день (как раньше).'
                : 'В течение дня набираешь нужное число чек-инов (например стаканы воды).'}
            </Text>
            {dailyCheckMode === 'counter' ? (
              <GlassCard style={{ marginTop: spacing.lg }} glow>
                <Text style={typography.caption}>ЦЕЛЬ НА ДЕНЬ (ЧИСЛО ЧЕК-ИНОВ)</Text>
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
                      <Pressable
                        key={n}
                        onPress={() => setCounterTarget(n)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[typography.title2, { color: on ? VIOLET : colors.text }]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[typography.caption, { marginTop: spacing.md }]}>ПОДПИСЬ (НЕОБЯЗАТЕЛЬНО)</Text>
                <TextInput
                  value={counterUnit}
                  onChangeText={setCounterUnit}
                  placeholder="стаканов, раз, минут…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </GlassCard>
            ) : null}
          </View>
        ) : null}

        {cadence === 'weekly' ? (
          <GlassCard style={{ marginTop: spacing.lg }} glow>
            <Text style={typography.caption}>СКОЛЬКО РАЗ ЗА НЕДЕЛЮ</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const on = n === weeklyTarget;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setWeeklyTarget(n)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[typography.title2, { color: on ? VIOLET : colors.text }]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        ) : null}

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

        <GlassCard style={{ marginTop: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={typography.caption}>ПРОГРЕСС НА ЭКРАНЕ «ДЕНЬ»</Text>
              <Text
                style={[typography.body, { color: colors.textMuted, marginTop: 6, lineHeight: 20 }]}
              >
                Учитывать в прогрессе на экране «День» (вместе с задачами)
              </Text>
            </View>
            <Switch
              value={countInDayProgress}
              onValueChange={(v) => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setCountInDayProgress(v);
              }}
              trackColor={{ false: colors.border, true: `${VIOLET}88` }}
              thumbColor={countInDayProgress ? VIOLET : colors.textMuted}
            />
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
          accessibilityLabel="Создать привычку"
        >
          {isPending ? (
            <ActivityIndicator color={VIOLET} />
          ) : (
            <Text style={{ color: VIOLET, fontWeight: '800', fontSize: 16 }}>
              Создать привычку
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
