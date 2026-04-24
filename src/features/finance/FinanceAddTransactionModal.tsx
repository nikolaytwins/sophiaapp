import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { createElement, useCallback, useEffect, useState } from 'react';
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

import { createFinanceTransaction, expenseCategorySelectOptions } from '@/features/finance/financeApi';
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
  /** Имя категории из бюджета — расход сразу в категории. */
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setKind('expense');
    setCategoryName(prefillCategoryName?.trim() ?? '');
    setAmountDraft('');
    setDescription('');
    setDateYmd(localYmd());
  }, [visible, prefillCategoryName]);

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
        if (!cat && overview.expenseCategories.length > 0) {
          throw new Error('Выбери категорию расхода');
        }
        await createFinanceTransaction(userId, {
          type: 'expense',
          amount: amt,
          dateISO,
          category: cat || null,
          description: description.trim() || null,
        });
      } else {
        await createFinanceTransaction(userId, {
          type: 'income',
          amount: amt,
          dateISO,
          category: categoryName.trim() || null,
          description: description.trim() || null,
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

  const webSelectStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
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
              Запись в журнале расходов и доходов. На баланс счетов в разделе «Счета» это не влияет.
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

            {kind === 'expense' && overview.expenseCategories.length > 0 ? (
              <>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Категория</Text>
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    {createElement(
                      'select',
                      {
                        value: categoryName,
                        onChange: (e: { target: { value: string } }) => setCategoryName(e.target.value),
                        style: webSelectStyle,
                      },
                      createElement('option', { value: '' }, '—'),
                      ...expenseCategorySelectOptions(overview.expenseCategories).map((o) =>
                        createElement('option', { key: o.value, value: o.value }, o.label)
                      )
                    )}
                  </View>
                ) : (
                  <TextInput
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholder="Категория"
                    placeholderTextColor={colors.textMuted}
                    style={[inputStyle, { marginBottom: 16 }]}
                  />
                )}
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
            {Platform.OS === 'web' ? (
              <View style={{ marginBottom: 20 }}>
                {createElement('input', {
                  type: 'date',
                  value: dateYmd,
                  onChange: (e: { target: { value: string } }) => setDateYmd(e.target.value),
                  style: webSelectStyle,
                })}
              </View>
            ) : (
              <TextInput
                value={dateYmd}
                onChangeText={setDateYmd}
                placeholder={localYmd()}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={[inputStyle, { marginBottom: 20 }]}
              />
            )}

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
