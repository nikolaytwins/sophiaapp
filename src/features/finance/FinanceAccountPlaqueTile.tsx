import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { FinanceAccount } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

export function fmtFinanceAccountMoney(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

/**
 * Плитка счёта в блоке «СЧЕТА» (Доступные / Замороженные / Резервы) на дашборде финансов.
 */
export function FinanceAccountPlaqueTile({
  account,
  editing,
  onBeginEdit,
  onEndEdit,
  onSaveBalance,
  pending,
}: {
  account: FinanceAccount;
  editing: boolean;
  onBeginEdit: () => void;
  onEndEdit: () => void;
  onSaveBalance: (n: number) => void;
  pending: boolean;
}) {
  const { colors, radius } = useAppTheme();
  const [draft, setDraft] = useState(String(Math.round(account.balance)));
  useEffect(() => {
    setDraft(String(Math.round(account.balance)));
  }, [account.balance, account.id]);

  return (
    <View
      style={{
        width: 186,
        minHeight: 118,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.45)',
        backgroundColor: 'rgba(18,18,22,0.95)',
        paddingVertical: 16,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.2 }} numberOfLines={2}>
        {account.name}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }} numberOfLines={1}>
        {account.type}
      </Text>
      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          keyboardType="decimal-pad"
          editable={!pending}
          onBlur={() => {
            const n = Number(draft.replace(/\s/g, '').replace(',', '.'));
            if (!Number.isFinite(n)) {
              setDraft(String(Math.round(account.balance)));
              onEndEdit();
              return;
            }
            if (Math.abs(n - account.balance) > 0.01) onSaveBalance(n);
            onEndEdit();
          }}
          style={{
            marginTop: 10,
            fontSize: 20,
            fontWeight: '900',
            color: '#FAFAFC',
            fontVariant: ['tabular-nums'],
            borderBottomWidth: 2,
            borderBottomColor: 'rgba(167,139,250,0.55)',
            paddingVertical: 4,
          }}
        />
      ) : (
        <Pressable onPress={onBeginEdit} disabled={pending} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#FAFAFC', fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {fmtFinanceAccountMoney(account.balance)}
          </Text>
          <Text style={{ fontSize: 10, color: 'rgba(196,181,253,0.65)', marginTop: 6 }}>тап по сумме — правка</Text>
        </Pressable>
      )}
    </View>
  );
}
