import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  defaultNikolayReserveTargetRub,
  mergeNotesWithGoalTarget,
  parseFinanceAccountGoalTarget,
} from '@/features/accounts/nikolayFinanceReserveAccounts';
import { updateFinanceAccount } from '@/features/finance/financeApi';
import type { FinanceAccount } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

const GENZ_PURPLE = '#E879F9';
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

function fmtRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function parseRub(raw: string): number {
  const x = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(x) ? Math.round(x) : 0;
}

type Props = {
  variant: MoneyPlaqueVariant;
  overline?: string;
  defaultTitle: string;
  account: FinanceAccount;
  userId: string;
  /** Дополнительно к инвалидации кэша финансов внутри компонента. */
  onSaved?: () => void;
};

/** Плашка накопления из счёта «резервы» (баланс + цель в notes `target:…`). Редактирование пишет в те же счета, что и раздел Финансы. */
export function GenZFinanceReservePlaque({ variant, overline = '', defaultTitle, account, userId, onSaved }: Props) {
  const { colors, spacing } = useAppTheme();
  const theme = PLAQUE_THEME[variant];
  const qc = useQueryClient();

  const defaultTarget = defaultNikolayReserveTargetRub(variant);
  const targetFromNotes = parseFinanceAccountGoalTarget(account.notes);
  const target = targetFromNotes ?? defaultTarget;
  const current = account.balance;
  const hasNumbers = target > 0;
  const pct = hasNumbers ? Math.min(1, Math.max(0, current / target)) : 0;

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(account.name);
  const [draftTarget, setDraftTarget] = useState(String(target));
  const [draftBalance, setDraftBalance] = useState(String(Math.round(current)));

  useEffect(() => {
    if (!editOpen) return;
    setDraftName(account.name);
    const t = parseFinanceAccountGoalTarget(account.notes) ?? defaultNikolayReserveTargetRub(variant);
    setDraftTarget(String(t));
    setDraftBalance(String(Math.round(account.balance)));
  }, [account.balance, account.id, account.name, account.notes, editOpen, variant]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const t = Math.max(1, parseRub(draftTarget));
      const b = Math.max(0, parseRub(draftBalance));
      const name = draftName.trim() || account.name;
      const notes = mergeNotesWithGoalTarget(account.notes, t);
      await updateFinanceAccount(userId, account.id, {
        name,
        balance: Math.min(b, t),
        notes,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
      onSaved?.();
      setEditOpen(false);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert('Счёт', e.message ?? 'Не удалось сохранить'),
  });

  const saveEdit = useCallback(() => {
    saveMut.mutate();
  }, [saveMut]);

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
                fontSize: 12,
                fontWeight: '800',
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: 0.4,
                marginBottom: 6,
              }}
            >
              Счёт в финансах · резервы
            </Text>
            <Text
              style={{
                fontSize: 21,
                fontWeight: '900',
                color: '#FAFAFC',
                letterSpacing: -0.8,
                lineHeight: 26,
              }}
              numberOfLines={2}
            >
              {account.name || defaultTitle}
            </Text>
          </View>
          {hasNumbers ? (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setEditOpen(true);
              }}
              accessibilityLabel="Править счёт и цель"
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
            {!targetFromNotes ? (
              <Text style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 17 }}>
                Цель по умолчанию для шкалы. Задай свою в правке — сохранится в заметках счёта как target:…
              </Text>
            ) : null}
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
        ) : null}
      </View>
    </View>
  );

  return (
    <>
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
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 4 }}>Счёт резерва</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
              То же, что в разделе «Финансы». Баланс входит в сумму «Резервы и накопления». Цель хранится в заметках
              счёта строкой target:300000.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Название</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Название счёта"
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
              placeholder="300000"
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

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Баланс, ₽</Text>
            <TextInput
              value={draftBalance}
              onChangeText={setDraftBalance}
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
                disabled={saveMut.isPending}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#9333EA',
                  opacity: saveMut.isPending ? 0.7 : 1,
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
