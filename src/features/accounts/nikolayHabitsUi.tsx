import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Habit } from '@/entities/models';
import { GenZFinanceReservePlaque } from '@/features/accounts/nikolayFinanceReservePlaque';
import { pickNikolayMoneyReserveAccounts } from '@/features/accounts/nikolayFinanceReserveAccounts';
import { fmtFinanceAccountMoney } from '@/features/finance/FinanceAccountPlaqueTile';
import type { FinanceAccount } from '@/features/finance/finance.types';
import type { SprintGoal } from '@/features/sprint/sprint.types';
import { useSprintStore } from '@/stores/sprint.store';
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

function parseRub(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const GENZ_PURPLE = '#E879F9';
const GENZ_PURPLE_SOFT = 'rgba(232,121,249,0.2)';
const CARD_RADIUS = 26;
const CANVAS_INNER = '#0E0E12';

type MoneyPlaqueVariant = 'china' | 'cushion';

const PLAQUE_THEME: Record<
  MoneyPlaqueVariant,
  { border: string; glow: readonly [string, string]; bar: readonly [string, string]; chipBg: string }
> = {
  china: {
    border: 'rgba(232,121,249,0.65)',
    glow: ['rgba(168,85,247,0.45)', 'rgba(232,121,249,0.08)'] as const,
    bar: ['#E879F9', '#A855F7'] as const,
    chipBg: 'rgba(232,121,249,0.18)',
  },
  cushion: {
    border: 'rgba(167,139,250,0.55)',
    glow: ['rgba(139,92,246,0.35)', 'rgba(232,121,249,0.08)'] as const,
    bar: ['#C084FC', '#A855F7'] as const,
    chipBg: 'rgba(167,139,250,0.2)',
  },
};

function GenZMoneyGoalPlaque({
  variant,
  overline,
  defaultTitle,
  goal,
  sprintId,
  fallbackHint,
  presentation = 'genz',
}: {
  variant: MoneyPlaqueVariant;
  overline: string;
  defaultTitle: string;
  goal: SprintGoal | null;
  sprintId: string | null;
  fallbackHint: string;
  presentation?: 'genz' | 'accountTile';
}) {
  const { colors, spacing, radius } = useAppTheme();
  const { width: windowW } = useWindowDimensions();
  const narrowTitle = windowW < 440;
  const theme = PLAQUE_THEME[variant];
  const setProgressGoalNumbers = useSprintStore((s) => s.setProgressGoalNumbers);
  const updateGoalTitle = useSprintStore((s) => s.updateGoalTitle);

  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');

  useEffect(() => {
    if (!editOpen || !goal) return;
    setDraftTitle(goal.title);
    setDraftTarget(String(goal.target ?? 0));
    setDraftCurrent(String(goal.current ?? 0));
  }, [editOpen, goal]);

  const target = goal?.target ?? 0;
  const current = goal?.current ?? 0;
  const hasNumbers = goal != null && sprintId != null && target > 0;
  const pct = hasNumbers ? Math.min(1, Math.max(0, current / target)) : 0;

  const saveEdit = useCallback(() => {
    if (!sprintId || !goal || goal.kind !== 'progress') return;
    const t = Math.max(1, parseRub(draftTarget));
    const c = Math.max(0, parseRub(draftCurrent));
    const numOk = setProgressGoalNumbers(sprintId, goal.id, { target: t, current: Math.min(c, t) });
    if (!numOk.ok) {
      Alert.alert('Суммы', numOk.error);
      return;
    }
    const titleOk = updateGoalTitle(sprintId, goal.id, draftTitle);
    if (!titleOk.ok) {
      Alert.alert('Цель', titleOk.error);
      return;
    }
    setEditOpen(false);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftCurrent, draftTarget, draftTitle, goal, setProgressGoalNumbers, sprintId, updateGoalTitle]);

  const inner = (
    <View
      style={{
        borderRadius: CARD_RADIUS,
        backgroundColor: CANVAS_INNER,
        paddingVertical: spacing.lg + 4,
        paddingHorizontal: spacing.lg + 6,
        overflow: 'hidden',
      }}
    >
      <View style={[StyleSheet.absoluteFillObject, { opacity: 0.35 }]} pointerEvents="none">
        <LinearGradient
          colors={[...theme.glow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={{ position: 'relative' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {overline.trim() ? (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 2.2,
                  color: 'rgba(250,232,255,0.75)',
                  textTransform: 'uppercase',
                }}
              >
                {overline}
              </Text>
            ) : null}
            <Text
              style={{
                marginTop: overline.trim() ? 8 : 0,
                fontSize: narrowTitle ? 19 : 21,
                fontWeight: '900',
                color: '#FAFAFC',
                letterSpacing: -0.8,
                lineHeight: narrowTitle ? 24 : 26,
              }}
              numberOfLines={narrowTitle ? 4 : 2}
            >
              {goal?.title ?? defaultTitle}
            </Text>
          </View>
          {hasNumbers ? (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setEditOpen(true);
              }}
              accessibilityLabel="Точные суммы и название"
              hitSlop={10}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? theme.chipBg : 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              })}
            >
              <Ionicons name="create-outline" size={22} color={GENZ_PURPLE} />
            </Pressable>
          ) : null}
        </View>

        {hasNumbers ? (
          <>
            <Text
              style={{
                marginTop: 14,
                fontSize: 26,
                fontWeight: '900',
                color: '#FAFAFC',
                fontVariant: ['tabular-nums'],
                letterSpacing: -0.5,
              }}
            >
              {fmtRub(current)}
              <Text style={{ fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.45)' }}> ₽</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.35)' }}> · </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.5)' }}>{fmtRub(target)} ₽</Text>
            </Text>

            <View
              style={{
                marginTop: 14,
                height: 14,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[...theme.bar]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: `${Math.round(pct * 1000) / 10}%`, height: '100%', borderRadius: 999 }}
              />
            </View>

          </>
        ) : (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.5)' }}>{fallbackHint}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const accountTileGoal =
    presentation === 'accountTile' ? (
      <View
        style={{
          width: '100%',
          minWidth: 160,
          minHeight: 118,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: 'rgba(167,139,250,0.45)',
          backgroundColor: 'rgba(18,18,22,0.95)',
          paddingVertical: 16,
          paddingHorizontal: 14,
        }}
      >
        {overline.trim() ? (
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 2,
              color: 'rgba(196,181,253,0.65)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {overline}
          </Text>
        ) : null}
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.2 }} numberOfLines={2}>
          {goal?.title ?? defaultTitle}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }} numberOfLines={1}>
          Цель спринта
        </Text>
        {hasNumbers ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setEditOpen(true);
            }}
            style={{ marginTop: 10 }}
          >
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FAFAFC', fontVariant: ['tabular-nums'] }} numberOfLines={1}>
              {fmtFinanceAccountMoney(Math.round(current))}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(248,250,252,0.42)', marginTop: 6, fontWeight: '600' }}>
              Цель {fmtFinanceAccountMoney(Math.round(target))}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(196,181,253,0.65)', marginTop: 6 }}>тап — править цель</Text>
          </Pressable>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(248,250,252,0.45)' }} numberOfLines={5}>
              {fallbackHint}
            </Text>
          </View>
        )}
      </View>
    ) : null;

  return (
    <>
      {presentation === 'accountTile' ? (
        accountTileGoal
      ) : (
        <LinearGradient
          colors={[theme.border, 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: CARD_RADIUS + 2,
            padding: 2,
            ...(Platform.OS === 'web'
              ? {}
              : {
                  shadowColor: '#A855F7',
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: 8,
                }),
          }}
        >
          {inner}
        </LinearGradient>
      )}

      <Modal visible={editOpen} animationType="fade" transparent onRequestClose={() => setEditOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }}
          onPress={() => setEditOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              backgroundColor: '#14141c',
              padding: spacing.lg + 4,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 4 }}>
              {goal?.title ?? defaultTitle}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>Изменения сразу попадают в активный спринт.</Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Название</Text>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Название цели"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Цель, ₽</Text>
            <TextInput
              value={draftTarget}
              onChangeText={setDraftTarget}
              keyboardType="numeric"
              placeholder="500000"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
                fontVariant: ['tabular-nums'],
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Сейчас накоплено, ₽</Text>
            <TextInput
              value={draftCurrent}
              onChangeText={setDraftCurrent}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 20,
                fontVariant: ['tabular-nums'],
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                }}
              >
                <Text style={{ fontWeight: '800', color: colors.textMuted }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#9333EA',
                }}
              >
                <Text style={{ fontWeight: '900', color: '#FAFAFC' }}>Сохранить</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const HINT_CHINA_FINANCE =
  'В «Финансах» добавь счёт в блоке «Резервы и накопления» (тип накопления / цель / резерв), в названии — «Китай». Баланс суммируется с другими резервами. Либо настрой цель в спринте.';
const HINT_CUSHION_FINANCE =
  'В «Финансах» добавь счёт в резервах с «подуш» в названии — баланс пойдёт в накопления. Либо цель в спринте.';

function NikolayMoneyHeroSlot({
  variant,
  overline,
  defaultTitle,
  financeAccount,
  financeUserId,
  onFinanceUpdated,
  sprintGoal,
  sprintId,
  fallbackHint,
  presentation = 'genz',
}: {
  variant: MoneyPlaqueVariant;
  overline: string;
  defaultTitle: string;
  financeAccount: FinanceAccount | null;
  financeUserId: string | null;
  onFinanceUpdated?: () => void;
  sprintGoal: SprintGoal | null;
  sprintId: string | null;
  fallbackHint: string;
  presentation?: 'genz' | 'accountTile';
}) {
  if (financeAccount && financeUserId) {
    return (
      <GenZFinanceReservePlaque
        variant={variant}
        overline={overline}
        defaultTitle={defaultTitle}
        account={financeAccount}
        userId={financeUserId}
        onSaved={() => onFinanceUpdated?.()}
        presentation={presentation}
      />
    );
  }
  return (
    <GenZMoneyGoalPlaque
      variant={variant}
      overline={overline}
      defaultTitle={defaultTitle}
      goal={sprintGoal}
      sprintId={sprintId}
      fallbackHint={fallbackHint}
      presentation={presentation}
    />
  );
}

/**
 * Китай и подушка: приоритет — счета «резервы» из Финансов (имя содержит китай / подуш).
 * Иначе — прогресс-цели активного спринта (как раньше).
 */
export function NikolayDayMoneyHeroCards({
  sprintId,
  chinaGoal,
  cushionGoal,
  overline = '',
  desktopTwoColumn = false,
  financeAccounts,
  financeUserId,
  onFinanceAccountsUpdated,
  presentation = 'genz',
}: {
  sprintId: string | null;
  chinaGoal: SprintGoal | null;
  cushionGoal: SprintGoal | null;
  overline?: string;
  desktopTwoColumn?: boolean;
  financeAccounts?: FinanceAccount[] | null;
  financeUserId?: string | null;
  onFinanceAccountsUpdated?: () => void;
  /** Как плитки «Счета» на дашборде финансов — только для экрана «Финансы». */
  presentation?: 'genz' | 'accountTile';
}) {
  const { spacing } = useAppTheme();
  const desktopGap = 24;
  const { china: chinaAccount, cushion: cushionAccount } = useMemo(
    () => pickNikolayMoneyReserveAccounts(financeAccounts ?? []),
    [financeAccounts]
  );
  const finUid = financeUserId ?? null;
  const onFin = onFinanceAccountsUpdated;

  const row = desktopTwoColumn ? (
    <View
      style={{
        marginBottom: spacing.md,
        flexDirection: 'row',
        gap: desktopGap,
        alignItems: 'stretch',
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <NikolayMoneyHeroSlot
          variant="china"
          overline={overline}
          defaultTitle="Поездка в Китай"
          financeAccount={chinaAccount}
          financeUserId={finUid}
          onFinanceUpdated={onFin}
          sprintGoal={chinaGoal}
          sprintId={sprintId}
          fallbackHint={HINT_CHINA_FINANCE}
          presentation={presentation}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <NikolayMoneyHeroSlot
          variant="cushion"
          overline={overline}
          defaultTitle="Финансовая подушка"
          financeAccount={cushionAccount}
          financeUserId={finUid}
          onFinanceUpdated={onFin}
          sprintGoal={cushionGoal}
          sprintId={sprintId}
          fallbackHint={HINT_CUSHION_FINANCE}
          presentation={presentation}
        />
      </View>
    </View>
  ) : (
    <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
      <NikolayMoneyHeroSlot
        variant="china"
        overline={overline}
        defaultTitle="Поездка в Китай"
        financeAccount={chinaAccount}
        financeUserId={finUid}
        onFinanceUpdated={onFin}
        sprintGoal={chinaGoal}
        sprintId={sprintId}
        fallbackHint={HINT_CHINA_FINANCE}
        presentation={presentation}
      />
      <NikolayMoneyHeroSlot
        variant="cushion"
        overline={overline}
        defaultTitle="Финансовая подушка"
        financeAccount={cushionAccount}
        financeUserId={finUid}
        onFinanceUpdated={onFin}
        sprintGoal={cushionGoal}
        sprintId={sprintId}
        fallbackHint={HINT_CUSHION_FINANCE}
        presentation={presentation}
      />
    </View>
  );

  return row;
}

/** Приглушённые напоминания под деньгами. */
export function NikolayDayMutedReminders() {
  const { spacing, radius } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
      <View
        style={[
          styles.reminderMuted,
          {
            borderRadius: radius.xl,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderLeftWidth: 4,
            borderLeftColor: 'rgba(167,139,250,0.55)',
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
            borderRadius: radius.xl,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderLeftWidth: 4,
            borderLeftColor: 'rgba(232,121,249,0.55)',
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
  );
}

/**
 * Экран «День»: две денежные цели из спринта + спокойные напоминания (композиция для обратной совместимости).
 */
export function NikolayDayFocusPanel({
  sprintId,
  chinaGoal,
  cushionGoal,
}: {
  sprintId: string | null;
  chinaGoal: SprintGoal | null;
  cushionGoal: SprintGoal | null;
}) {
  return (
    <>
      <NikolayDayMoneyHeroCards sprintId={sprintId} chinaGoal={chinaGoal} cushionGoal={cushionGoal} />
      <NikolayDayMutedReminders />
    </>
  );
}

const styles = StyleSheet.create({
  reminderMuted: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
});
