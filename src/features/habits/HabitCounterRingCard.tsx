import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import { counterCountOnDate } from '@/features/habits/habitLogic';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { useAppTheme } from '@/theme';

const COUNTER_DAY_MAX = 99;

type Props = {
  habit: Habit;
  viewDateKey: string;
  todayKey: string;
  onDelta: (delta: 1 | -1) => void;
  /** Узкая карточка в горизонтальном скролле «Дня». */
  compact?: boolean;
  ringSize?: number;
  progressColor: string;
  trackColor?: string;
};

export function HabitCounterRingCard({
  habit,
  viewDateKey,
  todayKey,
  onDelta,
  compact = false,
  ringSize = 112,
  progressColor,
  trackColor = 'rgba(255,255,255,0.1)',
}: Props) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const target = habit.dailyTarget ?? 1;
  const cur = counterCountOnDate(habit.countsByDate, viewDateKey);
  const future = viewDateKey > todayKey;
  const value01 = target > 0 ? Math.min(1, cur / target) : 0;
  const atMin = cur <= 0;
  const atCeiling = cur >= COUNTER_DAY_MAX;

  const fire = (delta: 1 | -1) => {
    if (future) return;
    if (delta === -1 && atMin) return;
    if (delta === 1 && atCeiling) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDelta(delta);
  };

  const pad = compact ? spacing.md : spacing.lg;
  const compactWidth = compact ? (Platform.OS === 'web' ? 248 : 168) : undefined;

  return (
    <View
      style={{
        width: compactWidth,
        minWidth: compactWidth,
        flex: compact ? undefined : 1,
        borderRadius: radius.xl,
        padding: pad,
        backgroundColor: 'rgba(255,255,255,0.045)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        opacity: future ? 0.42 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={habit.icon as keyof typeof Ionicons.glyphMap} size={22} color={progressColor} />
        </View>
        <Text style={[typography.title2, { flex: 1, color: colors.text, fontSize: 16 }]} numberOfLines={2}>
          {habit.name}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginVertical: compact ? spacing.xs : spacing.sm }}>
        <ProgressRing
          value01={value01}
          size={ringSize}
          stroke={9}
          label={`${cur}/${target}`}
          labelFontSize={22}
          sublabel={habit.counterUnit ?? 'раз'}
          trackColor={trackColor}
          progressColor={progressColor}
          sublabelColor="rgba(255,255,255,0.42)"
        />
      </View>

      <View
        style={{
          marginTop: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radius.full,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => fire(-1)}
          disabled={future || atMin}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            opacity: future || atMin ? 0.25 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && !future && !atMin ? { cursor: 'pointer' as const } : {}),
          })}
          accessibilityRole="button"
          accessibilityLabel="Минус один"
        >
          <Text style={{ fontSize: 22, fontWeight: '500', color: colors.textMuted }}>−</Text>
        </Pressable>
        <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <Pressable
          onPress={() => fire(1)}
          disabled={future || atCeiling}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            opacity: future || atCeiling ? 0.25 : pressed ? 0.75 : 1,
            ...(Platform.OS === 'web' && !future && !atCeiling ? { cursor: 'pointer' as const } : {}),
          })}
          accessibilityRole="button"
          accessibilityLabel="Плюс один"
        >
          <Text style={{ fontSize: 22, fontWeight: '600', color: progressColor }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
