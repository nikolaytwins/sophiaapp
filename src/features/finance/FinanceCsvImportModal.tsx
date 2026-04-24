import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { createElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bulkInsertFinanceExpenseTransactions, expenseCategorySelectOptions } from '@/features/finance/financeApi';
import { parseTbankOperationsCsv } from '@/features/finance/financeTbankCsv';
import type { FinanceOverview } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

type RowState = {
  key: string;
  dateISO: string;
  amountRub: number;
  description: string;
  include: boolean;
  category: string;
};

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type Props = {
  visible: boolean;
  csvText: string | null;
  userId: string;
  overview: FinanceOverview;
  onClose: () => void;
  onImported: () => void;
};

export function FinanceCsvImportModal({ visible, csvText, userId, overview, onClose, onImported }: Props) {
  const { colors, radius, typography, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<RowState[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');

  const parsed = useMemo(() => (csvText != null && csvText.trim().length > 0 ? parseTbankOperationsCsv(csvText) : null), [csvText]);

  useEffect(() => {
    if (!visible) {
      setRows([]);
      setBulkCategory('');
      return;
    }
    if (!parsed || !parsed.ok || parsed.rows.length === 0) {
      setRows([]);
      return;
    }
    setRows(
      parsed.rows.map((r) => ({
        key: r.key,
        dateISO: r.dateISO,
        amountRub: r.amountRub,
        description: r.description,
        include: true,
        category: '',
      }))
    );
  }, [visible, parsed]);

  const statsLine = useMemo(() => {
    if (!parsed) return null;
    const s = parsed.stats;
    return `Строк в файле: ${s.totalLines} · пропуск: FAILED ${s.skippedFailed}, не OK ${s.skippedNotOk}, поступления/≥0 ${s.skippedNonExpense}, свои счета ${s.skippedInternalTransfer}, разбор ${s.skippedParse}`;
  }, [parsed]);

  const applyBulkCategory = () => {
    const v = bulkCategory.trim();
    if (!v) return;
    setRows((prev) => prev.map((r) => (r.include ? { ...r, category: v } : r)));
  };

  const importMut = useMutation({
    mutationFn: async () => {
      const needCat = overview.expenseCategories.length > 0;
      const payload = rows
        .filter((r) => r.include)
        .map((r) => {
          const cat = r.category.trim();
          if (needCat && !cat) {
            throw new Error('Укажи категорию для всех отмеченных строк (или примени ко всем).');
          }
          return {
            dateISO: r.dateISO,
            amount: r.amountRub,
            description: r.description,
            category: cat || null,
          };
        });
      if (payload.length === 0) throw new Error('Отметь хотя бы одну строку.');
      await bulkInsertFinanceExpenseTransactions(userId, payload);
    },
    onSuccess: () => {
      onImported();
      onClose();
    },
  });

  const webSelectStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 40,
    padding: '8px 10px',
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const headerError =
    visible && parsed && (!parsed.ok || parsed.rows.length === 0) ? (
      <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
        <Text style={{ color: colors.danger, lineHeight: 20 }}>{parsed.errors.join('\n')}</Text>
      </View>
    ) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={{
            maxHeight: '88%',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
            <Text style={[typography.title2, { color: colors.text, flex: 1, fontSize: 18, fontWeight: '900' }]}>
              Импорт из CSV
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть">
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[typography.caption, { color: colors.textMuted, paddingHorizontal: 18, marginTop: 6, lineHeight: 18 }]}>
            Формат Т‑Банка: только статус OK и расходы (отрицательная сумма платежа). Категорию бюджета выбери ниже — из файла не
            подставляем.
          </Text>

          {statsLine && parsed?.ok ? (
            <Text style={[typography.caption, { color: colors.textMuted, paddingHorizontal: 18, marginTop: 8, lineHeight: 18 }]}>
              {statsLine}
            </Text>
          ) : null}

          {headerError}

          {parsed?.ok && rows.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 18,
                  marginTop: 14,
                  flexWrap: 'wrap',
                }}
              >
                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>Ко всем отмеченным:</Text>
                {Platform.OS === 'web' && overview.expenseCategories.length > 0 ? (
                  createElement(
                    'select',
                    {
                      value: bulkCategory,
                      onChange: (e: { target: { value: string } }) => setBulkCategory(e.target.value),
                      style: { ...webSelectStyle, maxWidth: 220 } as React.CSSProperties,
                    },
                    createElement('option', { value: '' }, '—'),
                    ...expenseCategorySelectOptions(overview.expenseCategories).map((o) =>
                      createElement('option', { key: o.value, value: o.value }, o.label)
                    )
                  )
                ) : (
                  <TextInput
                    value={bulkCategory}
                    onChangeText={setBulkCategory}
                    placeholder="Категория"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      maxWidth: 220,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: 10,
                      paddingVertical: 10,
                      color: colors.text,
                      backgroundColor: colors.surface,
                    }}
                  />
                )}
                <Pressable
                  onPress={applyBulkCategory}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    backgroundColor: brand.primaryMuted,
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.35)',
                  }}
                >
                  <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>Применить</Text>
                </Pressable>
              </View>

              <ScrollView
                style={{ marginTop: 12, maxHeight: Platform.OS === 'web' ? 420 : 360 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
              >
                {rows.map((r) => (
                  <View
                    key={r.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                      paddingVertical: 10,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Pressable
                      onPress={() => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, include: !x.include } : x)))}
                      style={{ paddingTop: 4 }}
                    >
                      <Ionicons name={r.include ? 'checkbox' : 'square-outline'} size={22} color={r.include ? brand.primary : colors.textMuted} />
                    </Pressable>
                    <View style={{ width: 118 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Дата</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }} numberOfLines={2}>
                        {fmtShortDate(r.dateISO)}
                      </Text>
                    </View>
                    <View style={{ width: 96 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Сумма</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FB7185', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                        {fmtMoney(r.amountRub)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Описание</Text>
                      <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }} numberOfLines={3}>
                        {r.description}
                      </Text>
                      {Platform.OS === 'web' && overview.expenseCategories.length > 0 ? (
                        <View style={{ marginTop: 8 }}>
                          {createElement(
                            'select',
                            {
                              value: r.category,
                              onChange: (e: { target: { value: string } }) => {
                                const v = e.target.value;
                                setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, category: v } : x)));
                              },
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
                          value={r.category}
                          onChangeText={(t) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, category: t } : x)))}
                          placeholder={overview.expenseCategories.length > 0 ? 'Категория' : 'Необязательно'}
                          placeholderTextColor={colors.textMuted}
                          style={{
                            marginTop: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: radius.md,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            color: colors.text,
                            backgroundColor: colors.surface,
                            fontSize: 14,
                          }}
                        />
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {importMut.isError ? (
                <Text style={{ color: colors.danger, paddingHorizontal: 18, marginTop: 8 }}>
                  {importMut.error instanceof Error ? importMut.error.message : 'Ошибка'}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 18, marginTop: 12 }}>
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
                  onPress={() => importMut.mutate()}
                  disabled={importMut.isPending}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: brand.primary,
                    alignItems: 'center',
                    opacity: importMut.isPending ? 0.75 : 1,
                  }}
                >
                  {importMut.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ fontWeight: '800', color: '#fff' }}>Добавить в журнал</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
