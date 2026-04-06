import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  accountBucketFromType,
  createFinanceTransaction,
} from '@/features/finance/financeApi';
import type { FinanceOverview } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

type TxKind = 'expense' | 'income';

function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToNoonIso(ymd: string): string {
  const parts = ymd.trim().split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('Дата: используй формат ГГГГ-ММ-ДД');
  }
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    throw new Error('Некорректная дата');
  }
  return dt.toISOString();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  overview: FinanceOverview;
  /** Имя категории из бюджета — как в Twinworks, расход сразу в категории. */
  prefillCategoryName?: string | null;
};

export function FinanceAddTransactionModal({
  visible,
  onClose,
  userId,
  overview,
  prefillCategoryName,
}: Props) {
  const { colors, radius, typography, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [kind, setKind] = useState<TxKind>('expense');
  const [categoryName, setCategoryName] = useState('');
  const [amountDraft, setAmountDraft] = useState('');
  const [description, setDescription] = useState('');
  const [dateYmd, setDateYmd] = useState(localYmd);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spendAccounts = useMemo(() => {
    const list = overview.accounts.filter((a) => accountBucketFromType(a.type) === 'available');
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
    return sorted.length > 0 ? sorted : [...overview.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [overview.accounts]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setKind(prefillCategoryName ? 'expense' : 'expense');
    setCategoryName(prefillCategoryName?.trim() ?? '');
    setAmountDraft('');
    setDescription('');
    setDateYmd(localYmd());
    const first = spendAccounts[0]?.id ?? null;
    setAccountId(first);
  }, [visible, prefillCategoryName, spendAccounts]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Войди в аккаунт');
      const amt = Number(amountDraft.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Введи сумму больше нуля');
      const dateISO = ymdToNoonIso(dateYmd);

      if (kind === 'expense') {
        const cat = categoryName.trim();
        if (!cat && overview.budgetLines.length > 0) {
          throw new Error('Выбери категорию расхода');
        }
        if (!accountId) throw new Error('Нет счёта для списания — добавь счёт в структуре');
        await createFinanceTransaction(userId, {
          type: 'expense',
          amount: amt,
          dateISO,
          category: cat || null,
          description: description.trim() || null,
          fromAccountId: accountId,
        });
      } else {
        if (!accountId) throw new Error('Нет счёта для зачисления');
        await createFinanceTransaction(userId, {
          type: 'income',
          amount: amt,
          dateISO,
          category: categoryName.trim() || null,
          description: description.trim() || null,
          toAccountId: accountId,
        });
      }
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} />
        <View
          style={{
            maxHeight: '92%',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[typography.title2, { color: colors.text, marginBottom: 6 }]}>Новая операция</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 16, lineHeight: 20 }]}>
              Расход привязывается к категории бюджета (как в Twinworks) и списывается с выбранного счёта. Доход
              зачисляется на счёт.
            </Text>

            <View style={{ marginBottom: 16 }}>
              <SegmentedControl<TxKind>
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'expense', label: 'Расход' },
                  { value: 'income', label: 'Доход' },
                ]}
              />
            </View>

            {kind === 'expense' && overview.budgetLines.length > 0 ? (
              <>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Категория</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {overview.budgetLines.map((line) => {
                    const on = categoryName === line.title;
                    return (
                      <Pressable
                        key={line.id}
                        onPress={() => setCategoryName(line.title)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: radius.lg,
                          borderWidth: 1,
                          borderColor: on ? brand.primary : colors.border,
                          backgroundColor: on ? 'rgba(168,85,247,0.12)' : colors.surface,
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: on ? brand.primary : colors.text, fontSize: 13 }}>
                          {line.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : kind === 'expense' ? (
              <>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Категория</Text>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Название категории"
                  placeholderTextColor={colors.textMuted}
                  style={[inputStyle, { marginBottom: 16 }]}
                />
              </>
            ) : (
              <>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>
                  Категория (необязательно)
                </Text>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Опционально"
                  placeholderTextColor={colors.textMuted}
                  style={[inputStyle, { marginBottom: 16 }]}
                />
              </>
            )}

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Сумма, ₽</Text>
            <TextInput
              value={amountDraft}
              onChangeText={setAmountDraft}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[inputStyle, { marginBottom: 16 }]}
            />

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Комментарий</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Например, магазин у дома"
              placeholderTextColor={colors.textMuted}
              style={[inputStyle, { marginBottom: 16 }]}
            />

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Дата (ГГГГ-ММ-ДД)</Text>
            <TextInput
              value={dateYmd}
              onChangeText={setDateYmd}
              placeholder={localYmd()}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[inputStyle, { marginBottom: 16 }]}
            />

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>
              {kind === 'expense' ? 'Счёт списания' : 'Счёт зачисления'}
            </Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {spendAccounts.map((a) => {
                const on = accountId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setAccountId(a.id)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: on ? brand.primary : colors.border,
                      backgroundColor: on ? 'rgba(168,85,247,0.1)' : colors.surface,
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: colors.text }}>{a.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                      {a.type} · {Math.round(a.balance).toLocaleString('ru-RU')} ₽
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Text style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '800', color: colors.textMuted }}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  backgroundColor: brand.primary,
                  alignItems: 'center',
                  opacity: saveMut.isPending ? 0.7 : 1,
                }}
              >
                {saveMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
