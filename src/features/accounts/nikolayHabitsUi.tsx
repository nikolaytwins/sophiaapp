import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import { useAppTheme } from '@/theme';

export const NIKOLAY_DAILY_GROUPS: Array<{ key: 'money' | 'body' | 'life' | 'default'; label: string }> = [
  { key: 'money', label: '💰 Деньги' },
  { key: 'body', label: '⚡ Тело и энергия' },
  { key: 'life', label: '🧠 Жизнь' },
  { key: 'default', label: '' },
];

export const NIKOLAY_WEEKLY_GROUPS: Array<{ key: 'body' | 'life' | 'default'; label: string }> = [
  { key: 'body', label: '⚡ Тело и энергия' },
  { key: 'life', label: '🧠 Жизнь' },
  { key: 'default', label: '' },
];

export function groupNikolayDailyHabits(
  habits: Habit[]
): Record<'money' | 'body' | 'life' | 'default', Habit[]> {
  const m: Record<'money' | 'body' | 'life' | 'default', Habit[]> = {
    money: [],
    body: [],
    life: [],
    default: [],
  };
  for (const h of habits) {
    const k =
      h.section === 'money' || h.section === 'body' || h.section === 'life' ? h.section : 'default';
    m[k].push(h);
  }
  return m;
}

export function groupNikolayWeeklyHabits(habits: Habit[]): Record<'body' | 'life' | 'default', Habit[]> {
  const m: Record<'body' | 'life' | 'default', Habit[]> = {
    body: [],
    life: [],
    default: [],
  };
  for (const h of habits) {
    const k = h.section === 'body' || h.section === 'life' ? h.section : 'default';
    m[k].push(h);
  }
  return m;
}

const REMINDER_BORDER = 'rgba(251,191,36,0.45)';
const REMINDER_BG = 'rgba(251,191,36,0.08)';

/**
 * Супер-цель и жёсткие напоминания — только для профиля nikolaytwins / nikollaytwins.
 */
export function NikolayHabitsHeadlines() {
  const { radius, typography, spacing } = useAppTheme();

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
      <LinearGradient
        colors={['rgba(220,38,38,0.35)', 'rgba(234,179,8,0.28)', 'rgba(168,85,247,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.xl,
          borderWidth: 2,
          borderColor: 'rgba(250,204,21,0.55)',
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? {
                boxShadow:
                  '0 0 48px rgba(234,179,8,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
              }
            : {
                shadowColor: '#EAB308',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 24,
                elevation: 10,
              }),
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 2.4,
            color: 'rgba(254,243,199,0.85)',
          }}
        >
          РАДИ ЧЕГО Я РАБОТАЮ
        </Text>
        <Text
          style={[
            typography.hero,
            {
              marginTop: 10,
              fontSize: 28,
              letterSpacing: -0.8,
              lineHeight: 34,
              color: '#FFFBEB',
              fontWeight: '800',
            },
          ]}
        >
          Поездка в Китай
        </Text>
        <Text
          style={{
            marginTop: 10,
            fontSize: 14,
            lineHeight: 21,
            color: 'rgba(255,251,235,0.72)',
            fontWeight: '600',
          }}
        >
          Главная награда за дисциплину и деньги — держи это в голове каждый день.
        </Text>
      </LinearGradient>

      <View
        style={[
          styles.reminder,
          {
            borderRadius: radius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <Text style={[typography.title2, { fontSize: 15, color: '#FEF3C7', fontWeight: '800' }]}>
          Компьютерные игры — только после сделанного рабочего действия
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: 'rgba(254,243,199,0.78)' }}>
          Сначала шаг по работе, потом награда. Так цепляется честная дофаминовая петля.
        </Text>
      </View>

      <View
        style={[
          styles.reminder,
          {
            borderRadius: radius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderColor: 'rgba(239,68,68,0.5)',
            backgroundColor: 'rgba(239,68,68,0.1)',
          },
        ]}
      >
        <Text style={[typography.title2, { fontSize: 15, color: '#FECACA', fontWeight: '800' }]}>
          Убрать жизнь в фантазиях
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: 'rgba(254,202,202,0.88)' }}>
          Временно не крутить в голове девушек и тройнички, «гигантские проекты» и сценарии. Фокус —
          реальные шаги здесь и сейчас.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reminder: {
    borderWidth: 1,
    borderColor: REMINDER_BORDER,
    backgroundColor: REMINDER_BG,
  },
});
