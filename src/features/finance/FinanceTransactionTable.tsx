import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CAL_PRIMARY_GRADIENT } from '@/features/calendar/calendarPremiumShell';
import { FinanceCsvImportModal } from '@/features/finance/FinanceCsvImportModal';
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  expenseCategorySelectOptions,
  updateFinanceTransaction,
  type UpdateFinanceTransactionPatch,
} from '@/features/finance/financeApi';
import type { FinanceOverview, FinanceTransaction } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToLocalYmd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return localYmd();
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

/** Ширины колонок: дата и сумма шире (сумма — ключевое поле); категория и «хвост» на описание сбалансированы. */
const COL = {
  date: 154,
  amount: 124,
  category: 204,
  actions: 52,
} as const;

/** Чуть больше «воздуха» в строках таблицы. */
const TX_ROW_PAD_V = 14;
const TX_INPUT_PAD_V = 10;

const sans =
  Platform.OS === 'web'
    ? ({
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Inter", "Segoe UI", sans-serif',
      } as const)
    : ({} as const);

const FINANCE_TABLE_BG_DARK = '#05040b';

function tableShellOuter(isLight: boolean): object {
  if (Platform.OS === 'web' && !isLight) {
    return {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 0,
      backgroundColor: FINANCE_TABLE_BG_DARK,
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
    borderWidth: isLight ? 1 : 0,
    borderColor: isLight ? 'rgba(15,17,24,0.1)' : 'transparent',
    backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : FINANCE_TABLE_BG_DARK,
  };
}

function EditableTransactionRow({
  t,
  overview,
  userId,
  onSaved,
}: {
  t: FinanceTransaction;
  overview: FinanceOverview;
  userId: string;
  onSaved: () => void;
}) {
  const { colors, isLight, brand } = useAppTheme();
  const [dateYmd, setDateYmd] = useState(() => isoToLocalYmd(t.date));
  const [amountDraft, setAmountDraft] = useState(() => {
    const a = t.amount;
    return Number.isInteger(a) ? String(a) : String(a).replace('.', ',');
  });
  const [categoryName, setCategoryName] = useState(() => t.category?.trim() ?? '');
  const [description, setDescription] = useState(() => t.description?.trim() ?? '');
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    setDateYmd(isoToLocalYmd(t.date));
    setAmountDraft(
      Number.isInteger(t.amount) ? String(t.amount) : String(t.amount).replace('.', ',')
    );
    setCategoryName(t.category?.trim() ?? '');
    setDescription(t.description?.trim() ?? '');
    setSaveErr(null);
  }, [t.id, t.date, t.amount, t.category, t.description]);

  const isIncome = t.type === 'income';
  const amountColor = isIncome ? '#4ADE80' : '#FB7185';

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
    minHeight: 40,
    padding: '8px 4px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: inputTextColor,
    fontSize: 13,
    fontWeight: 600,
    boxSizing: 'border-box',
    ...webUnderline(key),
    ...sans,
  });

  const saveMut = useMutation({
    mutationFn: async (patch: UpdateFinanceTransactionPatch) => {
      await updateFinanceTransaction(userId, t.id, patch);
    },
    onSuccess: () => {
      setSaveErr(null);
      onSaved();
    },
    onError: (e: Error) => setSaveErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      await deleteFinanceTransaction(userId, t.id);
    },
    onSuccess: () => {
      onSaved();
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const persistPatch = (patch: UpdateFinanceTransactionPatch) => {
    if (Object.keys(patch).length === 0) return;
    saveMut.mutate(patch);
  };

  const onBlurDate = () => {
    setFocusKey((k) => (k === 'date' ? null : k));
    try {
      if (isoToLocalYmd(t.date) === dateYmd.trim()) return;
      persistPatch({ dateISO: ymdToNoonIso(dateYmd) });
    } catch {
      setDateYmd(isoToLocalYmd(t.date));
    }
  };

  const onBlurAmount = () => {
    setFocusKey((k) => (k === 'amount' ? null : k));
    const amt = Number(amountDraft.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      const a = t.amount;
      setAmountDraft(Number.isInteger(a) ? String(a) : String(a).replace('.', ','));
      return;
    }
    if (Math.abs(amt - t.amount) > 0.0001) persistPatch({ amount: amt });
  };

  const onBlurCategory = () => {
    setFocusKey((k) => (k === 'cat' ? null : k));
    const cat = categoryName.trim();
    const prev = (t.category ?? '').trim();
    if (cat !== prev) persistPatch({ category: cat || null });
  };

  const onWebCategoryChange = (value: string) => {
    setCategoryName(value);
    const cat = value.trim();
    const prev = (t.category ?? '').trim();
    if (cat !== prev) persistPatch({ category: cat || null });
  };

  const onBlurDescription = () => {
    setFocusKey((k) => (k === 'desc' ? null : k));
    const desc = description.trim();
    const prev = (t.description ?? '').trim();
    if (desc !== prev) persistPatch({ description: desc || null });
  };

  const confirmDelete = () => {
    Alert.alert('Удалить операцию?', t.description || t.category || fmtMoney(t.amount, 0), [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => delMut.mutate(),
      },
    ]);
  };

  const border = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }}>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: TX_ROW_PAD_V,
        paddingHorizontal: 12,
      }}
    >
      <View style={{ width: COL.date, paddingRight: 6 }}>
        {Platform.OS === 'web' ? (
          createElement('input', {
            type: 'date',
            className: 'finance-web-date',
            value: dateYmd,
            onFocus: () => setFocusKey('date'),
            onBlur: onBlurDate,
            onChange: (e: { target: { value: string } }) => setDateYmd(e.target.value),
            style: {
              ...webSelectStyle('date'),
              minWidth: COL.date,
              fontVariantNumeric: 'tabular-nums',
              cursor: 'text',
              colorScheme: isLight ? undefined : ('dark' as const),
            } as React.CSSProperties,
          })
        ) : (
          <TextInput
            value={dateYmd}
            onChangeText={setDateYmd}
            onFocus={() => setFocusKey('date')}
            onBlur={onBlurDate}
            autoCapitalize="none"
            style={[
              {
                color: inputTextColor,
                fontSize: 13,
                fontWeight: '600',
                paddingVertical: TX_INPUT_PAD_V,
                paddingHorizontal: 2,
                ...sans,
              },
              underline('date'),
            ]}
          />
        )}
      </View>
      <View style={{ width: COL.amount, paddingRight: 6, alignItems: 'flex-end' }}>
        <TextInput
          value={amountDraft}
          onChangeText={setAmountDraft}
          keyboardType="decimal-pad"
          onFocus={() => setFocusKey('amount')}
          onBlur={onBlurAmount}
          style={[
            {
              width: '100%',
              textAlign: 'right',
              color: amountColor,
              fontSize: 14,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              paddingVertical: TX_INPUT_PAD_V,
              paddingHorizontal: 2,
              ...sans,
            },
            underline('amount'),
          ]}
        />
      </View>
      <View style={{ width: COL.category, paddingRight: 6 }}>
        {Platform.OS === 'web' && overview.expenseCategories.length > 0 ? (
          createElement(
            'select',
            {
              value: categoryName,
              onFocus: () => setFocusKey('cat'),
              onBlur: () => setFocusKey((k) => (k === 'cat' ? null : k)),
              onChange: (e: { target: { value: string } }) => onWebCategoryChange(e.target.value),
              style: webSelectStyle('cat'),
            },
            createElement('option', { value: '' }, '—'),
            ...expenseCategorySelectOptions(overview.expenseCategories).map((o) =>
              createElement('option', { key: o.value, value: o.value }, o.label)
            )
          )
        ) : (
          <TextInput
            value={categoryName}
            onChangeText={setCategoryName}
            placeholder="—"
            placeholderTextColor={placeholderColor}
            onFocus={() => setFocusKey('cat')}
            onBlur={onBlurCategory}
            style={[
              {
                color: inputTextColor,
                fontSize: 13,
                fontWeight: '600',
                paddingVertical: TX_INPUT_PAD_V,
                paddingHorizontal: 2,
                ...sans,
              },
              underline('cat'),
            ]}
          />
        )}
      </View>
      <View style={{ flex: 1, flexBasis: 0, minWidth: 72, paddingRight: 8 }}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="—"
          placeholderTextColor={placeholderColor}
          onFocus={() => setFocusKey('desc')}
          onBlur={onBlurDescription}
          style={[
            {
              color: inputTextColor,
              fontSize: 13,
              fontWeight: '500',
              paddingVertical: TX_INPUT_PAD_V,
              paddingHorizontal: 2,
              ...sans,
            },
            underline('desc'),
          ]}
        />
      </View>
      <View style={{ width: COL.actions, alignItems: 'flex-end', justifyContent: 'center' }}>
        {saveMut.isPending || delMut.isPending ? (
          <ActivityIndicator size="small" color={brand.primary} />
        ) : (
          <Pressable
            onPress={confirmDelete}
            hitSlop={8}
            accessibilityLabel="Удалить транзакцию"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(251,113,133,0.12)',
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#FB7185" />
          </Pressable>
        )}
      </View>
    </View>
    {saveErr ? (
      <Text style={{ fontSize: 11, color: colors.danger, paddingHorizontal: 12, paddingBottom: 6 }} numberOfLines={2}>
        {saveErr}
      </Text>
    ) : null}
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
  const [dateYmd, setDateYmd] = useState(localYmd);
  const [amountDraft, setAmountDraft] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillCategoryName != null && prefillCategoryName.trim()) {
      setCategoryName(prefillCategoryName.trim());
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
    minHeight: 40,
    padding: '8px 4px',
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
      if (overview.expenseCategories.length > 0 && !cat) {
        throw new Error('Выбери категорию');
      }
      await createFinanceTransaction(userId, {
        type: 'expense',
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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: TX_ROW_PAD_V, paddingHorizontal: 12 }}>
        <View style={{ width: COL.date, paddingRight: 6 }}>
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'date',
              className: 'finance-web-date',
              value: dateYmd,
              onFocus: () => setFocusKey('date'),
              onBlur: () => setFocusKey((k) => (k === 'date' ? null : k)),
              onChange: (e: { target: { value: string } }) => setDateYmd(e.target.value),
              style: {
                ...webSelectStyle('date'),
                minWidth: COL.date,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'text',
                colorScheme: isLight ? undefined : ('dark' as const),
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
                {
                  color: inputTextColor,
                  fontSize: 13,
                  fontWeight: '600',
                  paddingVertical: TX_INPUT_PAD_V,
                  paddingHorizontal: 2,
                  ...sans,
                },
                underline('date'),
              ]}
            />
          )}
        </View>

        <View style={{ width: COL.amount, paddingRight: 6, alignItems: 'flex-end' }}>
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
                width: '100%',
                textAlign: 'right',
                color: inputTextColor,
                fontSize: 14,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                paddingVertical: TX_INPUT_PAD_V,
                paddingHorizontal: 2,
                ...sans,
              },
              underline('amount'),
            ]}
          />
        </View>

        <View style={{ width: COL.category, paddingRight: 6 }}>
          {Platform.OS === 'web' && overview.expenseCategories.length > 0 ? (
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
              ...expenseCategorySelectOptions(overview.expenseCategories).map((o) =>
                createElement('option', { key: o.value, value: o.value }, o.label)
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
                {
                  color: inputTextColor,
                  fontSize: 13,
                  fontWeight: '600',
                  paddingVertical: TX_INPUT_PAD_V,
                  paddingHorizontal: 2,
                  ...sans,
                },
                underline('cat'),
              ]}
            />
          )}
        </View>

        <View style={{ flex: 1, flexBasis: 0, minWidth: 72, paddingRight: 8 }}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Описание (необязательно)"
            placeholderTextColor={placeholderColor}
            onFocus={() => setFocusKey('desc')}
            onBlur={() => setFocusKey((k) => (k === 'desc' ? null : k))}
            style={[
              {
                color: inputTextColor,
                fontSize: 13,
                fontWeight: '500',
                paddingVertical: TX_INPUT_PAD_V,
                paddingHorizontal: 2,
                ...sans,
              },
              underline('desc'),
            ]}
          />
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
  prefillCategoryName?: string | null;
};

export function FinanceTransactionTable({
  userId,
  overview,
  transactions,
  onSaved,
  prefillCategoryName,
}: Props) {
  const { colors, typography, isLight, brand } = useAppTheme();
  const webCsvInputRef = useRef<HTMLInputElement | null>(null);
  const [csvImportText, setCsvImportText] = useState<string | null>(null);

  const openCsvPicker = () => {
    if (Platform.OS === 'web') {
      webCsvInputRef.current?.click();
      return;
    }
    Alert.alert(
      'Импорт CSV',
      'Выбор файла CSV сейчас доступен в веб-версии Sophia. Открой приложение в браузере на компьютере и вкладку «Транзакции».'
    );
  };

  const webCsvFileInput =
    Platform.OS === 'web'
      ? createElement('input', {
          type: 'file',
          accept: '.csv,text/csv',
          style: { display: 'none' },
          ref: (el: HTMLInputElement | null) => {
            webCsvInputRef.current = el;
          },
          onChange: (e: { target: HTMLInputElement }) => {
            const input = e.target;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const text = typeof reader.result === 'string' ? reader.result : '';
              setCsvImportText(text);
            };
            reader.readAsText(file, 'UTF-8');
          },
        })
      : null;

  const webDatePickerStyles =
    Platform.OS === 'web' && !isLight
      ? createElement('style', {
          dangerouslySetInnerHTML: {
            __html: `
input.finance-web-date { color-scheme: dark; }
input.finance-web-date::-webkit-calendar-picker-indicator {
  opacity: 1;
  cursor: pointer;
  filter: invert(62%) sepia(53%) saturate(1286%) hue-rotate(228deg) brightness(103%) contrast(97%);
}
input.finance-web-date::-webkit-calendar-picker-indicator:hover {
  filter: invert(70%) sepia(45%) saturate(1200%) hue-rotate(228deg) brightness(108%) contrast(100%);
}
`.trim(),
          },
        })
      : null;

  const headerBorder = isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.1)';

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
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
          ['ДЕЙСТВИЯ', COL.actions],
        ] as const
      ).map(([label, w], i) => (
        <View
          key={`h-${i}`}
          style={
            w != null
              ? { width: w, paddingRight: 6, ...(label === 'СУММА' ? ({ alignItems: 'flex-end' } as const) : {}) }
              : { flex: 1, flexBasis: 0, minWidth: 72, paddingRight: 8 }
          }
        >
          {label ? (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.1,
                color: colors.textMuted,
                ...(label === 'СУММА' ? ({ textAlign: 'right' as const, width: '100%' as const }) : {}),
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
        <EditableTransactionRow key={t.id} t={t} overview={overview} userId={userId} onSaved={onSaved} />
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

  const tableShell = (
    <View style={[{ width: '100%', maxWidth: '100%', paddingBottom: 4 }, tableShellOuter(isLight)]}>
      {body}
    </View>
  );

  return (
    <View style={{ marginTop: 4, width: '100%', alignSelf: 'stretch' }}>
      {webDatePickerStyles}
      {webCsvFileInput}
      <FinanceCsvImportModal
        visible={csvImportText != null}
        csvText={csvImportText}
        userId={userId}
        overview={overview}
        onClose={() => setCsvImportText(null)}
        onImported={onSaved}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
        <Text style={[typography.caption, { color: colors.textMuted, flex: 1, letterSpacing: 0.4 }]}>Операции</Text>
        <Pressable onPress={openCsvPicker} hitSlop={8}>
          <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>Импорт CSV</Text>
        </Pressable>
      </View>

      {tableShell}
    </View>
  );
}
