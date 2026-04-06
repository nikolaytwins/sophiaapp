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
  accountBucketFromType,
  defaultAccountTypeForBucket,
  updateFinanceAccount,
} from '@/features/finance/financeApi';
import type { FinanceAccount, FinanceAccountBucket } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

const BUCKET_OPTIONS: { id: FinanceAccountBucket; label: string; hint: string }[] = [
  { id: 'available', label: 'Доступные деньги', hint: 'Повседневные счета' },
  { id: 'frozen', label: 'Замороженные', hint: 'Тип other в Twinworks' },
  { id: 'reserve', label: 'Резервы и цели', hint: 'Накопления, инвестиции' },
];

type Props = {
  visible: boolean;
  account: FinanceAccount | null;
  onClose: () => void;
  userId: string;
};

export function FinanceAccountEditModal({ visible, account, onClose, userId }: Props) {
  const { colors, radius, typography, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [balanceDraft, setBalanceDraft] = useState('');
  const [bucket, setBucket] = useState<FinanceAccountBucket>('available');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !account) return;
    setError(null);
    setName(account.name);
    setBalanceDraft(String(Math.round(account.balance)));
    setBucket(accountBucketFromType(account.type));
  }, [visible, account]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Нет счёта');
      const n = name.trim();
      if (!n) throw new Error('Введи название');
      const bal = Number(balanceDraft.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(bal)) throw new Error('Некорректный баланс');
      const prevBucket = accountBucketFromType(account.type);
      const typeToSave =
        bucket === prevBucket ? account.type : defaultAccountTypeForBucket(bucket);
      await updateFinanceAccount(userId, account.id, {
        name: n,
        balance: bal,
        type: typeToSave,
      });
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

  if (!account) return null;

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
            maxHeight: '88%',
          }}
        >
          <Text style={[typography.title2, { color: colors.text, marginBottom: 6 }]}>Счёт</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 16, lineHeight: 20 }]}>
            Технический тип в БД: {account.type}. При смене группы тип будет упрощён (checking / other / savings).
          </Text>

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Название</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Название счёта"
            placeholderTextColor={colors.textMuted}
            style={[inputStyle, { marginBottom: 14 }]}
          />

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>Баланс, ₽</Text>
          <TextInput
            value={balanceDraft}
            onChangeText={setBalanceDraft}
            keyboardType="decimal-pad"
            style={[inputStyle, { marginBottom: 14 }]}
          />

          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 10 }]}>Группа</Text>
          <View style={{ gap: 10, marginBottom: 18 }}>
            {BUCKET_OPTIONS.map((opt) => {
              const on = bucket === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setBucket(opt.id)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: on ? brand.primary : colors.border,
                    backgroundColor: on ? 'rgba(168,85,247,0.1)' : colors.surface,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: colors.text }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{opt.hint}</Text>
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
