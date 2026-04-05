import { Ionicons } from '@expo/vector-icons';
import { type Href, Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/entities/models';
import type { SprintGoal } from '@/features/sprint/sprint.types';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
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

/** Прогресс-цели спринта: Китай и подушка (по названию). */
export function pickNikolayMoneyProgressGoals(
  goals: SprintGoal[]
): { china: SprintGoal | null; cushion: SprintGoal | null } {
  const progress = goals.filter((g) => g.kind === 'progress' && g.target != null && g.current != null);
  let china: SprintGoal | null = null;
  let cushion: SprintGoal | null = null;
  for (const g of progress) {
    const t = g.title.toLowerCase();
    if (!china && t.includes('китай')) china = g;
    else if (!cushion && t.includes('подуш')) cushion = g;
  }
  return { china, cushion };
}

function fmtRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function ProgressGoalCard({
  overline,
  title,
  goal,
  fallbackHint,
}: {
  overline: string;
  title: string;
  goal: SprintGoal | null;
  fallbackHint: string;
}) {
  const { colors, typography, spacing, radius, brand } = useAppTheme();
  const target = goal?.target ?? 0;
  const current = goal?.current ?? 0;
  const hasNumbers = goal != null && target > 0;
  const pct = hasNumbers ? Math.min(1, Math.max(0, current / target)) : 0;

  return (
    <AppSurfaceCard
      style={{
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: brand.surfaceBorder,
        backgroundColor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.6,
          color: 'rgba(255,255,255,0.38)',
          textTransform: 'uppercase',
        }}
      >
        {overline}
      </Text>
      <Text
        style={[
          typography.title2,
          {
            marginTop: 6,
            fontSize: 17,
            fontWeight: '800',
            color: colors.text,
            letterSpacing: -0.3,
          },
        ]}
        numberOfLines={2}
      >
        {goal?.title ?? title}
      </Text>
      {hasNumbers ? (
        <>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
            {fmtRub(current)} / {fmtRub(target)} ₽
          </Text>
          <View
            style={{
              marginTop: 10,
              height: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.round(pct * 1000) / 10}%`,
                height: '100%',
                borderRadius: 999,
                backgroundColor: 'rgba(167,139,250,0.55)',
              }}
            />
          </View>
          <Text style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {Math.round(pct * 100)}% · из активного спринта
          </Text>
        </>
      ) : (
        <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>{fallbackHint}</Text>
      )}
    </AppSurfaceCard>
  );
}

const SPRINT_HREF = '/sprint' as Href;

/**
 * Экран «День»: две денежные цели из спринта + спокойные напоминания.
 */
export function NikolayDayFocusPanel({
  chinaGoal,
  cushionGoal,
}: {
  chinaGoal: SprintGoal | null;
  cushionGoal: SprintGoal | null;
}) {
  const { spacing, brand, radius } = useAppTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
        }}
      >
        Фокус · деньги
      </Text>

      <ProgressGoalCard
        overline="Ради чего копим"
        title="Поездка в Китай"
        goal={chinaGoal}
        fallbackHint="Добавь прогресс-цель про Китай во вкладке «Спринт» — здесь появится шкала."
      />
      <ProgressGoalCard
        overline="Стабильность"
        title="Финансовая подушка"
        goal={cushionGoal}
        fallbackHint="Добавь цель «подушка» в спринте — отобразим накопление здесь."
      />

      <Link href={SPRINT_HREF} asChild>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            marginBottom: spacing.md,
            paddingVertical: 6,
            opacity: pressed ? 0.85 : 1,
            ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
          })}
        >
          <Ionicons name="rocket-outline" size={16} color={brand.primarySoft} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: brand.primarySoft }}>Открыть спринт</Text>
        </Pressable>
      </Link>

      <View style={{ gap: spacing.sm }}>
        <View
          style={[
            styles.reminderMuted,
            {
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="game-controller-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>
              Компы и игры
            </Text>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.52)' }}>
            Только после сделанного рабочего действия — сначала шаг, потом награда.
          </Text>
        </View>

        <View
          style={[
            styles.reminderMuted,
            {
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="eye-off-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>
              Меньше фантазий
            </Text>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.52)' }}>
            Временно не уводить голову в сценарии, «гигантские проекты» и лишние образы — фокус на реальных шагах
            сегодня.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reminderMuted: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
});
