import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  accountBucketFromType,
  createFinanceTransaction,
} from '@/features/finance/financeApi';
import type { FinanceOverview } from '@/features/finance/finance.types';
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
    throw new Error('Дата: формат ГГГГ-ММ-ДД');
  }
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    throw new Error('Некорректная дата');
  }
  return dt.toISOString();
}

type Props = {
  userId: string;
  overview: FinanceOverview;
  onSaved: () => void;
};

export function FinanceQuickTransactionBar({ userId, overview, onSaved }: Props) {
  const { colors, typography, radius, brand, isLight, shadows } = useAppTheme();
  const [kind, setKind] = useState<TxKind>('expense');
  const [dateYmd, setDateYmd] = useState(localYmd);
  const [amountDraft, setAmountDraft] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spendAccounts = useMemo(() => {
    const list = overview.accounts.filter((a) => accountBucketFromType(a.type) === 'available');
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
    return sorted.length > 0 ? sorted : [...overview.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [overview.accounts]);

  useEffect(() => {
    setAccountId(spendAccounts[0]?.id ?? null);
  }, [spendAccounts]);

  useEffect(() => {
    setCatOpen(false);
  }, [kind]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Войди в аккаунт');
      const amt = Number(amountDraft.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Введи сумму');
      const dateISO = ymdToNoonIso(dateYmd);
      const cat = categoryName.trim();

      if (kind === 'expense') {
        if (overview.budgetLines.length > 0 && !cat) throw new Error('Выбери категорию');
        if (!accountId) throw new Error('Нет счёта');
        await createFinanceTransaction(userId, {
          type: 'expense',
          amount: amt,
          dateISO,
          category: cat || null,
          description: description.trim() || null,
          fromAccountId: accountId,
        });
      } else {
        if (!accountId) throw new Error('Нет счёта');
        await createFinanceTransaction(userId, {
          type: 'income',
          amount: amt,
          dateISO,
          category: cat || null,
          description: description.trim() || null,
          toAccountId: accountId,
        });
      }
    },
    onSuccess: () => {
      setError(null);
      setAmountDraft('');
      setDescription('');
      setCatOpen(false);
      onSaved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputShell = useCallback(
    () => ({
      minHeight: 42,
      paddingVertical: Platform.OS === 'web' ? 8 : 10,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: brand.surfaceBorderStrong,
      backgroundColor: colors.surface,
      justifyContent: 'center' as const,
    }),
    [brand.surfaceBorderStrong, colors.surface, radius.md]
  );

  const labelStyle = [
    typography.caption,
    {
      color: colors.textMuted,
      fontWeight: '800' as const,
      letterSpacing: 0.8,
      marginBottom: 6,
      textTransform: 'uppercase' as const,
    },
  ];

  const webSelectStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 42,
    padding: '8px 10px',
    borderRadius: radius.md,
    border: `1px solid ${brand.surfaceBorderStrong}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  const barBg = isLight ? 'rgba(124,58,237,0.07)' : 'rgba(168,85,247,0.1)';
  const barBorder = brand.surfaceBorderStrong;

  return (
    <View
      style={[
        {
          marginBottom: 16,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: barBorder,
          backgroundColor: barBg,
          padding: 12,
        },
        isLight ? shadows.card : {},
      ]}
    >
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 10, lineHeight: 18 }]}>
        Быстрое добавление операции — без всплывающего окна
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
          {/* Дата */}
          <View style={{ width: Platform.OS === 'web' ? 148 : 124, minWidth: 118 }}>
            <Text style={labelStyle}>Дата</Text>
            {Platform.OS === 'web' ? (
              createElement('input', {
                type: 'date',
                value: dateYmd,
                onChange: (e: { target: { value: string } }) => setDateYmd(e.target.value),
                style: webSelectStyle,
              })
            ) : (
              <TextInput
                value={dateYmd}
                onChangeText={setDateYmd}
                placeholder={localYmd()}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={[inputShell(), { color: colors.text, fontSize: 14 }]}
              />
            )}
          </View>

          {/* Сумма */}
          <View style={{ width: 108, minWidth: 96 }}>
            <Text style={labelStyle}>Сумма</Text>
            <TextInput
              value={amountDraft}
              onChangeText={setAmountDraft}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[inputShell(), { color: colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }]}
            />
          </View>

          {/* Категория */}
          <View style={{ width: Platform.OS === 'web' ? 200 : 160, minWidth: 140, zIndex: catOpen ? 40 : 1 }}>
            <Text style={labelStyle}>Категория</Text>
            {Platform.OS === 'web' && kind === 'expense' && overview.budgetLines.length > 0 ? (
              createElement(
                'select',
                {
                  value: categoryName,
                  onChange: (e: { target: { value: string } }) => setCategoryName(e.target.value),
                  style: webSelectStyle,
                },
                createElement('option', { value: '' }, '—'),
                ...overview.budgetLines.map((line) =>
                  createElement('option', { key: line.id, value: line.title }, line.title)
                )
              )
            ) : Platform.OS === 'web' && kind === 'income' ? (
              createElement('input', {
                value: categoryName,
                onChange: (e: { target: { value: string } }) => setCategoryName(e.target.value),
                placeholder: 'Необязательно',
                style: webSelectStyle,
              })
            ) : Platform.OS !== 'web' && kind === 'expense' && overview.budgetLines.length > 0 ? (
              <View style={{ position: 'relative' }}>
                <Pressable
                  onPress={() => setCatOpen((o) => !o)}
                  style={[inputShell(), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }]}
                >
                  <Text style={{ color: categoryName ? colors.text : colors.textMuted, flex: 1 }} numberOfLines={1}>
                    {categoryName || '—'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>
                {catOpen ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      maxHeight: 200,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: barBorder,
                      backgroundColor: colors.surface,
                      elevation: 6,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                    }}
                  >
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                      {overview.budgetLines.map((line) => (
                        <Pressable
                          key={line.id}
                          onPress={() => {
                            setCategoryName(line.title);
                            setCatOpen(false);
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Text style={{ color: colors.text, fontWeight: '600' }}>{line.title}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : (
              <TextInput
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder={kind === 'income' ? 'Необязательно' : 'Категория'}
                placeholderTextColor={colors.textMuted}
                style={[inputShell(), { color: colors.text, fontSize: 14 }]}
              />
            )}
          </View>

          {/* Описание */}
          <View style={{ width: Platform.OS === 'web' ? 220 : 180, minWidth: 140, flexGrow: 1 }}>
            <Text style={labelStyle}>Описание</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Необязательно"
              placeholderTextColor={colors.textMuted}
              style={[inputShell(), { color: colors.text, fontSize: 14 }]}
            />
          </View>

          {/* Тип */}
          <View style={{ width: Platform.OS === 'web' ? 120 : 100, minWidth: 88 }}>
            <Text style={labelStyle}>Тип</Text>
            {Platform.OS === 'web' ? (
              createElement(
                'select',
                {
                  value: kind,
                  onChange: (e: { target: { value: string } }) => setKind(e.target.value as TxKind),
                  style: webSelectStyle,
                },
                createElement('option', { value: 'expense' }, 'Расход'),
                createElement('option', { value: 'income' }, 'Доход')
              )
            ) : (
              <View style={{ flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: brand.surfaceBorderStrong }}>
                {(['expense', 'income'] as const).map((k) => {
                  const on = kind === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setKind(k)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        backgroundColor: on ? brand.primaryMuted : colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? brand.primary : colors.textMuted }}>
                        {k === 'expense' ? 'Расход' : 'Доход'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Сохранить */}
          <View style={{ width: 48, minWidth: 48 }}>
            <Text style={[labelStyle, { opacity: 0 }]}>.</Text>
            <Pressable
              onPress={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              style={{
                width: 44,
                height: 42,
                borderRadius: radius.md,
                backgroundColor: brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saveMut.isPending ? 0.65 : 1,
              }}
            >
              {saveMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark" size={26} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {spendAccounts.length > 1 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8, fontWeight: '700' }]}>Счёт</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {spendAccounts.map((a) => {
              const on = accountId === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccountId(a.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: on ? brand.primary : colors.border,
                    backgroundColor: on ? brand.primaryMuted : colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: on ? brand.primary : colors.text }}>{a.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
