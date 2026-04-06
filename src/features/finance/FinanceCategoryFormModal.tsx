import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createFinanceExpenseCategory,
  updateFinanceExpenseCategory,
  type FinanceCategoryInput,
} from '@/features/finance/financeApi';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  mode: 'create' | 'edit';
  categoryId?: string;
  initial?: FinanceCategoryInput;
};

export function FinanceCategoryFormModal({ visible, onClose, userId, mode, categoryId, initial }: Props) {
  const { colors, radius, typography, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [amountDraft, setAmountDraft] = useState('');
  const [kind, setKind] = useState<'personal' | 'business'>('personal');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setAmountDraft(String(Math.round(initial.expectedMonthly)));
      setKind(initial.type);
    } else {
      setName('');
      setAmountDraft('0');
      setKind('personal');
    }
  }, [visible, mode, initial]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error('Введи название');
      const exp = Number(amountDraft.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(exp) || exp < 0) throw new Error('Некорректная сумма лимита');
      const payload: FinanceCategoryInput = { name: n, type: kind, expectedMonthly: exp };
      if (mode === 'create') {
        await createFinanceExpenseCategory(userId, payload);
      } else {
        if (!categoryId) throw new Error('Нет id категории');
        await updateFinanceExpenseCategory(userId, categoryId, payload);
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
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={[typography.title2, { color: colors.text, marginBottom: 6 }]}>
            {mode === 'create' ? 'Новая категория' : 'Категория расходов'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 16, lineHeight: 20 }]}>
            Название и месячный лимит (план). Тип влияет на цвет карточки в обзоре.
          </Text>

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Название</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Например, Продукты"
            placeholderTextColor={colors.textMuted}
            style={[inputStyle, { marginBottom: 14 }]}
          />

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Лимит в месяц, ₽</Text>
          <TextInput
            value={amountDraft}
            onChangeText={setAmountDraft}
            keyboardType="decimal-pad"
            style={[inputStyle, { marginBottom: 14 }]}
          />

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Тип</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            {(
              [
                { id: 'personal' as const, label: 'Личное' },
                { id: 'business' as const, label: 'Бизнес' },
              ] as const
            ).map((opt) => {
              const on = kind === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setKind(opt.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: on ? brand.primary : colors.border,
                    backgroundColor: on ? 'rgba(168,85,247,0.12)' : colors.surface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: '800', color: on ? brand.primary : colors.textMuted }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12 }}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
