import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { CAL_PRIMARY_GRADIENT } from '@/features/calendar/calendarPremiumShell';
import { createFinanceTransaction } from '@/features/finance/financeApi';
import type { FinanceOverview, FinanceTransaction } from '@/features/finance/finance.types';
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

function fmtMoney(n: number, fractionDigits = 0) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: fractionDigits }).replace(/\u00A0/g, ' ') + ' ₽';
}

/** Одинаковые ширины колонок для строки ввода и строк данных. */
const COL = {
  date: 104,
  amount: 92,
  category: 132,
  type: 100,
  /** Ширина колонки с кнопкой сохранения + подпись «Действия». */
  actions: 68,
} as const;

const sans =
  Platform.OS === 'web'
    ? ({
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Inter", "Segoe UI", sans-serif',
      } as const)
    : ({} as const);

function tableShellOuter(isLight: boolean): object {
  if (Platform.OS === 'web' && !isLight) {
    return {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: 'rgba(157, 107, 255, 0.22)',
      backgroundColor: 'rgba(18, 8, 42, 0.42)',
      backdropFilter: 'blur(14px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
    };
  }
  if (Platform.OS === 'web' && isLight) {
    return {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: 'rgba(15,17,24,0.08)',
      backgroundColor: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    };
  }
  return {
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: isLight ? 'rgba(15,17,24,0.1)' : 'rgba(157, 107, 255, 0.28)',
    backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(22, 12, 48, 0.88)',
  };
}

function TransactionDataRow({ t }: { t: FinanceTransaction }) {
  const { colors, isLight } = useAppTheme();
  const d = new Date(t.date);
  const dateLabel = Number.isFinite(d.getTime())
    ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : t.date.slice(0, 10);
  const isIncome = t.type === 'income';
  const isExpense = t.type === 'expense';
  const sign = isIncome ? '+' : isExpense ? '−' : '';
  const amountColor = isIncome ? '#4ADE80' : isExpense ? '#FB7185' : colors.text;
  const typeLabel = isIncome ? 'Доход' : isExpense ? 'Расход' : t.type;
  const border = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: border,
      }}
    >
      <View style={{ width: COL.date, paddingRight: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, ...sans }} numberOfLines={1}>
          {dateLabel}
        </Text>
      </View>
      <View style={{ width: COL.amount, paddingRight: 6 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: amountColor,
            fontVariant: ['tabular-nums'],
            ...sans,
          }}
          numberOfLines={1}
        >
          {sign}
          {fmtMoney(t.amount, 0)}
        </Text>
      </View>
      <View style={{ width: COL.category, paddingRight: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, ...sans }} numberOfLines={1}>
          {t.category?.trim() ? t.category : '—'}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 120, paddingRight: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textMuted, ...sans }} numberOfLines={2}>
          {t.description?.trim() ? t.description : '—'}
        </Text>
      </View>
      <View style={{ width: COL.type, paddingRight: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, ...sans }} numberOfLines={1}>
          {typeLabel}
        </Text>
      </View>
      <View style={{ width: COL.actions }} />
    </View>
  );
}

function AddTransactionRow({
  userId,
  overview,
  onSaved,
  prefillCategoryName,
}: {
  userId: string;
  overview: FinanceOverview;
  onSaved: () => void;
  prefillCategoryName?: string | null;
}) {
  const { colors, isLight, brand } = useAppTheme();
  const [kind, setKind] = useState<TxKind>('expense');
  const [dateYmd, setDateYmd] = useState(localYmd);
  const [amountDraft, setAmountDraft] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillCategoryName != null && prefillCategoryName.trim()) {
      setCategoryName(prefillCategoryName.trim());
      setKind('expense');
    }
  }, [prefillCategoryName]);

  const underline = (key: string) => ({
    borderBottomWidth: focusKey === key ? 1 : StyleSheet.hairlineWidth,
    borderBottomColor:
      focusKey === key
        ? isLight
          ? brand.primary
          : 'rgba(157, 107, 255, 0.85)'
        : isLight
          ? 'rgba(15,17,24,0.12)'
          : 'rgba(255,255,255,0.08)',
    backgroundColor: focusKey === key ? (isLight ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.05)') : 'transparent',
  });

  const inputTextColor = colors.text;
  const placeholderColor = colors.textMuted;

  const webUnderline = (key: string): React.CSSProperties => {
    const on = focusKey === key;
    return {
      borderBottom: on
        ? `1px solid ${isLight ? brand.primary : 'rgba(157, 107, 255, 0.85)'}`
        : `1px solid ${isLight ? 'rgba(15,17,24,0.12)' : 'rgba(255,255,255,0.08)'}`,
      backgroundColor: on ? (isLight ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.05)') : 'transparent',
    };
  };

  const webSelectStyle = (key: string): React.CSSProperties => ({
    width: '100%',
    minHeight: 36,
    padding: '6px 2px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: inputTextColor,
    fontSize: 13,
    fontWeight: 600,
    boxSizing: 'border-box',
    cursor: 'pointer',
    ...webUnderline(key),
    ...sans,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Войди в аккаунт');
      const amt = Number(amountDraft.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Введи сумму');
      const dateISO = ymdToNoonIso(dateYmd);
      const cat = categoryName.trim();
      if (kind === 'expense' && overview.budgetLines.length > 0 && !cat) {
        throw new Error('Выбери категорию');
      }
      await createFinanceTransaction(userId, {
        type: kind,
        amount: amt,
        dateISO,
        category: cat || null,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      setError(null);
      setAmountDraft('');
      setDescription('');
      onSaved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const rowTint = isLight ? 'rgba(124,58,237,0.06)' : 'rgba(255, 255, 255, 0.03)';

  return (
    <View
      style={{
        backgroundColor: rowTint,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
        <View style={{ width: COL.date, paddingRight: 6 }}>
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'date',
              value: dateYmd,
              onFocus: () => setFocusKey('date'),
              onBlur: () => setFocusKey((k) => (k === 'date' ? null : k)),
              onChange: (e: { target: { value: string } }) => setDateYmd(e.target.value),
              style: {
                ...webSelectStyle('date'),
                fontVariantNumeric: 'tabular-nums',
                cursor: 'text',
              } as React.CSSProperties,
            })
          ) : (
            <TextInput
              value={dateYmd}
              onChangeText={setDateYmd}
              placeholder={localYmd()}
              placeholderTextColor={placeholderColor}
              onFocus={() => setFocusKey('date')}
              onBlur={() => setFocusKey((k) => (k === 'date' ? null : k))}
              autoCapitalize="none"
              style={[
                { color: inputTextColor, fontSize: 13, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 2, ...sans },
                underline('date'),
              ]}
            />
          )}
        </View>

        <View style={{ width: COL.amount, paddingRight: 6 }}>
          <TextInput
            value={amountDraft}
            onChangeText={setAmountDraft}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={placeholderColor}
            onFocus={() => setFocusKey('amount')}
            onBlur={() => setFocusKey((k) => (k === 'amount' ? null : k))}
            style={[
              {
                color: inputTextColor,
                fontSize: 14,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                paddingVertical: 8,
                paddingHorizontal: 2,
                ...sans,
              },
              underline('amount'),
            ]}
          />
        </View>

        <View style={{ width: COL.category, paddingRight: 6 }}>
          {Platform.OS === 'web' && kind === 'expense' && overview.budgetLines.length > 0 ? (
            createElement(
              'select',
              {
                value: categoryName,
                onFocus: () => setFocusKey('cat'),
                onBlur: () => setFocusKey((k) => (k === 'cat' ? null : k)),
                onChange: (e: { target: { value: string } }) => setCategoryName(e.target.value),
                style: webSelectStyle('cat'),
              },
              createElement('option', { value: '' }, '—'),
              ...overview.budgetLines.map((line) =>
                createElement('option', { key: line.id, value: line.title }, line.title)
              )
            )
          ) : (
            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="—"
              placeholderTextColor={placeholderColor}
              onFocus={() => setFocusKey('cat')}
              onBlur={() => setFocusKey((k) => (k === 'cat' ? null : k))}
              style={[
                { color: inputTextColor, fontSize: 13, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 2, ...sans },
                underline('cat'),
              ]}
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 120, paddingRight: 8 }}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Описание (необязательно)"
            placeholderTextColor={placeholderColor}
            onFocus={() => setFocusKey('desc')}
            onBlur={() => setFocusKey((k) => (k === 'desc' ? null : k))}
            style={[
              { color: inputTextColor, fontSize: 13, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 2, ...sans },
              underline('desc'),
            ]}
          />
        </View>

        <View style={{ width: COL.type, paddingRight: 6 }}>
          {Platform.OS === 'web' ? (
            createElement(
              'select',
              {
                value: kind,
                onFocus: () => setFocusKey('kind'),
                onBlur: () => setFocusKey((k) => (k === 'kind' ? null : k)),
                onChange: (e: { target: { value: string } }) => setKind(e.target.value as TxKind),
                style: webSelectStyle('kind'),
              },
              createElement('option', { value: 'expense' }, 'Расход'),
              createElement('option', { value: 'income' }, 'Доход')
            )
          ) : (
            <View style={[{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden' }, underline('kind')]}>
              {(['expense', 'income'] as const).map((k) => {
                const on = kind === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setKind(k)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      alignItems: 'center',
                      backgroundColor: on ? 'rgba(168,85,247,0.22)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: on ? '#EDE9FE' : colors.textMuted }}>
                      {k === 'expense' ? 'Расх.' : 'Дох.'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ width: COL.actions, alignItems: 'flex-end' }}>
          <Pressable
            onPress={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              overflow: 'hidden',
              opacity: saveMut.isPending ? 0.65 : 1,
              ...(Platform.OS === 'web' && !isLight
                ? ({
                    boxShadow: '0 0 24px rgba(123, 92, 255, 0.45), 0 8px 20px rgba(0,0,0,0.4)',
                  } as object)
                : {}),
            }}
          >
            <LinearGradient
              colors={[...CAL_PRIMARY_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              {saveMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark" size={22} color="#fff" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12, paddingHorizontal: 12, paddingBottom: 8 }}>{error}</Text>
      ) : null}
    </View>
  );
}

type Props = {
  userId: string;
  overview: FinanceOverview;
  transactions: FinanceTransaction[];
  onSaved: () => void;
  /** Синхронизация с модалкой «быстрый расход из категории». */
  prefillCategoryName?: string | null;
  onOpenFullForm?: () => void;
};

export function FinanceTransactionTable({
  userId,
  overview,
  transactions,
  onSaved,
  prefillCategoryName,
  onOpenFullForm,
}: Props) {
  const { colors, typography, isLight } = useAppTheme();
  const { width: winW } = useWindowDimensions();
  const tableMinW = Math.max(560, Math.min(920, winW - 40));

  const headerBorder = isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.1)';

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: headerBorder,
      }}
    >
      {(
        [
          ['ДАТА', COL.date],
          ['СУММА', COL.amount],
          ['КАТЕГОРИЯ', COL.category],
          ['ОПИСАНИЕ', undefined],
          ['ТИП', COL.type],
          ['ДЕЙСТВИЯ', COL.actions],
        ] as const
      ).map(([label, w], i) => (
        <View
          key={`h-${i}`}
          style={
            w != null
              ? { width: w, paddingRight: 6 }
              : { flex: 1, minWidth: 120, paddingRight: 8 }
          }
        >
          {label ? (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.1,
                color: colors.textMuted,
                ...sans,
              }}
            >
              {label}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );

  const body = (
    <>
      {header}
      <AddTransactionRow
        userId={userId}
        overview={overview}
        onSaved={onSaved}
        prefillCategoryName={prefillCategoryName}
      />
      {transactions.map((t) => (
        <TransactionDataRow key={t.id} t={t} />
      ))}
      {transactions.length === 0 ? (
        <Text
          style={[
            typography.body,
            {
              color: colors.textMuted,
              paddingVertical: 28,
              paddingHorizontal: 16,
              textAlign: 'center',
              lineHeight: 22,
              ...sans,
            },
          ]}
        >
          Нет транзакций. Добавь первую строкой выше.
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
        <Text style={[typography.caption, { color: colors.textMuted, flex: 1, letterSpacing: 0.4 }]}>Операции</Text>
        {onOpenFullForm ? (
          <Pressable onPress={onOpenFullForm} hitSlop={8}>
            <Text style={{ fontWeight: '800', color: colors.textMuted, fontSize: 13 }}>Расширенная форма</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Platform.OS === 'web' ? (
          <View style={[{ minWidth: tableMinW, alignSelf: 'flex-start', paddingBottom: 4 }, tableShellOuter(isLight)]}>
            {body}
          </View>
        ) : (
          <BlurView
            intensity={isLight ? 52 : 40}
            tint={isLight ? 'light' : 'dark'}
            style={[{ minWidth: tableMinW, alignSelf: 'flex-start', paddingBottom: 4 }, tableShellOuter(isLight)]}
          >
            {body}
          </BlurView>
        )}
      </ScrollView>
    </View>
  );
}
