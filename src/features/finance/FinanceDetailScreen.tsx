import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFrozenAccountType, loadFinanceOverview } from '@/features/finance/financeApi';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import type { FinanceAccount } from '@/features/finance/finance.types';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

function AccountRow({ a }: { a: FinanceAccount }) {
  const { colors, radius, typography } = useAppTheme();
  const frozen = isFrozenAccountType(a.type);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: frozen ? 'rgba(251,113,133,0.15)' : 'rgba(74,222,128,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={frozen ? 'snow-outline' : 'wallet-outline'}
          size={20}
          color={frozen ? '#FB7185' : '#4ADE80'}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={[typography.body, { fontWeight: '700', color: colors.text }]} numberOfLines={2}>
          {a.name}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
          {a.type} · {a.currency}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
        {fmtMoney(a.balance)}
      </Text>
    </View>
  );
}

export function FinanceDetailScreen() {
  const { colors, typography, spacing, radius, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUserId(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: [...FINANCE_QUERY_KEY, 'overview', userId],
    queryFn: () => loadFinanceOverview(userId!),
    enabled: Boolean(supabaseOn && userId),
  });

  const data = q.data;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Счета и структура',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScreenCanvas>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {!supabaseOn || !userId ? (
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              Включи облако и войди в аккаунт — структура счетов подтянется из Supabase.
            </Text>
          ) : q.isLoading ? (
            <ActivityIndicator color={brand.primary} style={{ marginTop: 24 }} />
          ) : q.isError ? (
            <Text style={{ color: colors.danger }}>Не удалось загрузить данные.</Text>
          ) : data ? (
            <>
              <View
                style={{
                  padding: spacing.md,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  marginBottom: spacing.lg,
                }}
              >
                <Text style={[typography.caption, { color: colors.textMuted }]}>ВСЕГО</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                  {fmtMoney(data.totalBalance)}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: '#4ADE80' }]}>Доступно</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 }}>
                      {fmtMoney(data.availableBalance)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: '#FB7185' }]}>Заморожено</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 }}>
                      {fmtMoney(data.frozenBalance)}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 }]}>
                  Заморожено: счета с типом «other» (как в Twinworks). Редактирование счетов в приложении — в
                  следующих версиях; сейчас данные задаются импортом в Supabase.
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>
                СЧЕТА
              </Text>
              {[...data.accounts]
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map((a) => (
                  <AccountRow key={a.id} a={a} />
                ))}
            </>
          ) : null}
        </ScrollView>
      </ScreenCanvas>
    </>
  );
}
