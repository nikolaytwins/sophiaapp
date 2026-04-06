import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FinanceAccountEditModal } from '@/features/finance/FinanceAccountEditModal';
import { accountBucketFromType, loadFinanceOverview } from '@/features/finance/financeApi';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import type { FinanceAccount, FinanceAccountBucket } from '@/features/finance/finance.types';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const HERO_BASE_GRADIENT = ['#141018', '#0a090f', '#06060a'] as const;
const HERO_GLOW_A = ['rgba(76,29,149,0.45)', 'rgba(20,16,28,0.25)', 'transparent'] as const;
const HERO_GLOW_B = ['transparent', 'rgba(109,40,217,0.14)', 'rgba(167,139,250,0.22)'] as const;

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

const SECTION_META: Record<
  FinanceAccountBucket,
  { title: string; icon: keyof typeof Ionicons.glyphMap; accent: string; iconBg: string }
> = {
  available: {
    title: 'Доступные деньги',
    icon: 'wallet-outline',
    accent: '#4ADE80',
    iconBg: 'rgba(74,222,128,0.18)',
  },
  frozen: {
    title: 'Замороженные деньги',
    icon: 'snow-outline',
    accent: '#FB7185',
    iconBg: 'rgba(251,113,133,0.18)',
  },
  reserve: {
    title: 'Резервы и цели',
    icon: 'flag-outline',
    accent: '#A855F7',
    iconBg: 'rgba(168,85,247,0.22)',
  },
};

const BUCKET_ORDER: FinanceAccountBucket[] = ['available', 'frozen', 'reserve'];

function AccountRow({
  a,
  accent,
  onEditPress,
  onAmountPress,
}: {
  a: FinanceAccount;
  accent: string;
  onEditPress: () => void;
  onAmountPress: () => void;
}) {
  const { colors, radius, typography, brand } = useAppTheme();
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
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: 'rgba(168,85,247,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="layers-outline" size={20} color={accent} />
      </View>
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={[typography.body, { fontWeight: '800', color: colors.text }]} numberOfLines={2}>
          {a.name}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 3 }]} numberOfLines={1}>
          {a.type} · {a.currency}
        </Text>
      </View>
      <Pressable
        onPress={onAmountPress}
        hitSlop={8}
        style={{ paddingVertical: 6, paddingHorizontal: 10, marginRight: 4 }}
      >
        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {fmtMoney(a.balance)}
        </Text>
      </Pressable>
      <Pressable
        onPress={onEditPress}
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(168,85,247,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="pencil" size={18} color={brand.primary} />
      </Pressable>
    </View>
  );
}

export function FinanceDetailScreen() {
  const { colors, typography, spacing, radius, brand, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<FinanceAccount | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const grouped = useMemo(() => {
    const g: Record<FinanceAccountBucket, FinanceAccount[]> = {
      available: [],
      frozen: [],
      reserve: [],
    };
    if (!data?.accounts) return g;
    for (const a of data.accounts) {
      g[accountBucketFromType(a.type)].push(a);
    }
    const sortFn = (a: FinanceAccount, b: FinanceAccount) =>
      a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru');
    for (const k of BUCKET_ORDER) g[k].sort(sortFn);
    return g;
  }, [data?.accounts]);

  const openEditor = useCallback((a: FinanceAccount) => {
    setEditAccount(a);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditAccount(null);
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Счета',
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
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
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
                  borderRadius: 26,
                  overflow: 'hidden',
                  position: 'relative',
                  borderWidth: 1,
                  borderColor: 'rgba(139,92,246,0.35)',
                  marginBottom: spacing.lg,
                }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_BASE_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_GLOW_A]}
                  start={{ x: 0, y: 0.4 }}
                  end={{ x: 0.65, y: 0.6 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_GLOW_B]}
                  start={{ x: 0.4, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <View style={{ paddingVertical: 22, paddingHorizontal: 20, position: 'relative', zIndex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 2,
                      color: 'rgba(255,255,255,0.82)',
                      textAlign: 'center',
                    }}
                  >
                    ВСЕГО
                  </Text>
                  <Text
                    style={{
                      fontSize: 34,
                      fontWeight: '900',
                      color: '#FAFAFC',
                      textAlign: 'center',
                      marginTop: 8,
                      letterSpacing: -0.8,
                    }}
                  >
                    {fmtMoney(data.totalBalance)}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 20,
                      paddingTop: 18,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: 'rgba(255,255,255,0.18)',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }}>
                        ДОСТУПНО
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: '#4ADE80',
                          marginTop: 6,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {fmtMoney(data.availableBalance)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }}>
                        ЗАМОРОЗКА
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: '#FB7185',
                          marginTop: 6,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {fmtMoney(data.frozenBalance)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }}>
                        РЕЗЕРВЫ
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: '#E9D5FF',
                          marginTop: 6,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {fmtMoney(data.reserveBalance)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: colors.textMuted,
                  marginBottom: spacing.sm,
                  letterSpacing: 0.6,
                }}
              >
                СТРУКТУРА СЧЕТОВ
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textMuted,
                    marginBottom: spacing.md,
                    lineHeight: 20,
                  },
                ]}
              >
                Как в Twinworks: три группы по типу счёта. Нажми сумму или карандаш, чтобы изменить название, баланс или
                группу.
              </Text>

              {BUCKET_ORDER.map((bucket) => {
                const meta = SECTION_META[bucket];
                const list = grouped[bucket];
                const subtotal = list.reduce((s, x) => s + x.balance, 0);
                return (
                  <View key={bucket} style={{ marginBottom: spacing.xl }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: isLight ? meta.iconBg : 'rgba(255,255,255,0.06)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={meta.icon} size={22} color={meta.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>{meta.title}</Text>
                        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                          Итого: {fmtMoney(subtotal)} · {list.length} сч.
                        </Text>
                      </View>
                    </View>
                    {list.length === 0 ? (
                      <Text style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 }]}>
                        Нет счетов в этой группе.
                      </Text>
                    ) : (
                      list.map((a) => (
                        <AccountRow
                          key={a.id}
                          a={a}
                          accent={meta.accent}
                          onEditPress={() => openEditor(a)}
                          onAmountPress={() => openEditor(a)}
                        />
                      ))
                    )}
                  </View>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      </ScreenCanvas>

      <FinanceAccountEditModal
        visible={modalVisible && editAccount != null}
        account={editAccount}
        onClose={closeModal}
        userId={userId ?? ''}
      />
    </>
  );
}
