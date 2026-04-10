import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { type Href, Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import {
  deleteFinanceExpenseCategory,
  loadFinanceExpenseAnalytics,
  loadFinanceOverview,
  type FinanceCategoryInput,
} from '@/features/finance/financeApi';
import { FinanceCategoryMonthMatrix } from '@/features/finance/FinanceCategoryMonthMatrix';
import { FinanceAddTransactionModal } from '@/features/finance/FinanceAddTransactionModal';
import { FinanceCategoryFormModal } from '@/features/finance/FinanceCategoryFormModal';
import { FinanceQuickTransactionBar } from '@/features/finance/FinanceQuickTransactionBar';
import {
  enrichMonthSnapshots,
  MonthHistoryCards,
  MonthHistoryTableTwin,
  type MonthHistoryViewMode,
} from '@/features/finance/FinanceMonthHistoryViews';
import { FINANCE_QUERY_KEY, financeExpenseAnalyticsKey } from '@/features/finance/queryKeys';
import type { FinanceBudgetLine, FinanceTransaction } from '@/features/finance/finance.types';
import { getSupabase } from '@/lib/supabase';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const HERO_BASE_GRADIENT = ['#141018', '#0a090f', '#06060a'] as const;
const HERO_GLOW_A = ['rgba(76,29,149,0.45)', 'rgba(20,16,28,0.25)', 'transparent'] as const;
const HERO_GLOW_B = ['transparent', 'rgba(109,40,217,0.14)', 'rgba(167,139,250,0.22)'] as const;

const GREEN_BAR = '#4ADE80';
const RED_EXPENSE = '#FB7185';

const CLOUD_HREF = '/cloud' as Href;

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type MainTab = 'overview' | 'transactions' | 'categories' | 'history';

function PaginationDots({ count, active, isLight }: { count: number; active: number; isLight: boolean }) {
  const activeC = isLight ? 'rgba(15,17,24,0.85)' : 'rgba(255,255,255,0.95)';
  const idleC = isLight ? 'rgba(15,17,24,0.22)' : 'rgba(255,255,255,0.28)';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 8 : 6,
            height: i === active ? 8 : 6,
            borderRadius: 4,
            backgroundColor: i === active ? activeC : idleC,
          }}
        />
      ))}
    </View>
  );
}

function BudgetCard({
  line,
  editable,
  onEdit,
  onDelete,
  onQuickExpense,
}: {
  line: FinanceBudgetLine;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Быстрый расход в этой категории (Twinworks). */
  onQuickExpense?: () => void;
}) {
  const { colors, radius, isLight, brand, shadows } = useAppTheme();
  const barColor = line.kind === 'personal' ? brand.primary : brand.primarySoft;
  const iconBg = line.kind === 'personal' ? brand.primaryMuted : 'rgba(167,139,250,0.2)';
  const iconName = line.kind === 'personal' ? 'cash-outline' : 'briefcase-outline';

  const shell = isLight
    ? {
        backgroundColor: colors.surface,
        borderColor: brand.surfaceBorderStrong,
        ...shadows.card,
      }
    : {
        backgroundColor: colors.surface,
        borderColor: brand.surfaceBorderStrong,
      };

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        padding: 18,
        marginBottom: 14,
        ...shell,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={26} color={barColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              {line.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={3}>
              {line.subtitle}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {fmtMoney(line.spent)}
          </Text>
          {editable && onEdit && onDelete ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {onQuickExpense ? (
                <Pressable
                  onPress={onQuickExpense}
                  hitSlop={6}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: brand.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={20} color={brand.primary} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onEdit}
                hitSlop={6}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(168,85,247,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={17} color={brand.primary} />
              </Pressable>
              <Pressable
                onPress={onDelete}
                hitSlop={6}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(251,113,133,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={{
          marginTop: 16,
          height: 8,
          borderRadius: 8,
          backgroundColor: isLight ? brand.callout : 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(Math.min(1, line.progress01) * 100)}%`,
            height: '100%',
            borderRadius: 8,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}

function TransactionRow({ t }: { t: FinanceTransaction }) {
  const { colors, radius, typography } = useAppTheme();
  const d = new Date(t.date);
  const dateLabel = Number.isFinite(d.getTime())
    ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : t.date.slice(0, 10);
  const isIncome = t.type === 'income';
  const isExpense = t.type === 'expense';
  const sign = isIncome ? '+' : isExpense ? '−' : '';
  const amountColor = isIncome ? '#4ADE80' : isExpense ? '#FB7185' : colors.text;
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
      <View style={{ width: 52 }}>
        <Text style={[typography.caption, { color: colors.textMuted, fontVariant: ['tabular-nums'] }]}>
          {dateLabel}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 8 }}>
        <Text style={[typography.body, { fontWeight: '700', color: colors.text }]} numberOfLines={2}>
          {t.description || t.category || t.type}
        </Text>
        {t.category ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {t.category}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: amountColor, fontVariant: ['tabular-nums'] }}>
        {sign}
        {fmtMoney(t.amount)}
      </Text>
    </View>
  );
}

export function FinanceScreen() {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [catModal, setCatModal] = useState<{ id: string; initial: FinanceCategoryInput } | null>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addTxPrefill, setAddTxPrefill] = useState<string | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<MonthHistoryViewMode>('table');

  const padH = spacing.xl;
  const heroPageW = SCREEN_W - padH * 2;

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

  const expenseAnalyticsQ = useQuery({
    queryKey: financeExpenseAnalyticsKey(userId),
    queryFn: () => loadFinanceExpenseAnalytics(userId!),
    enabled: Boolean(supabaseOn && userId && mainTab === 'categories'),
  });

  const overview = q.data;

  const monthHistoryRows = useMemo(
    () => (overview ? enrichMonthSnapshots(overview.snapshots) : []),
    [overview?.snapshots]
  );

  const onHeroScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / heroPageW);
      setHeroIndex(Math.max(0, Math.min(1, idx)));
    },
    [heroPageW]
  );

  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, []);

  const openDetail = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/finance-detail' as Href);
  }, [router]);

  const invalidateFinance = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const delCatMut = useMutation({
    mutationFn: (id: string) => deleteFinanceExpenseCategory(userId!, id),
    onSuccess: invalidateFinance,
  });

  const openCategoryEdit = useCallback((line: FinanceBudgetLine) => {
    setCatModal({
      id: line.id,
      initial: {
        name: line.title,
        type: line.kind === 'business' ? 'business' : 'personal',
        expectedMonthly: line.expectedMonthly,
      },
    });
  }, []);

  const confirmDeleteCategory = useCallback(
    (line: FinanceBudgetLine) => {
      Alert.alert('Удалить категорию?', `«${line.title}». Транзакции потеряют эту метку категории.`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => delCatMut.mutate(line.id),
        },
      ]);
    },
    [delCatMut]
  );

  const openCategorySettings = useCallback(() => {
    router.push('/finance-category-settings' as Href);
  }, [router]);

  const openAddTransaction = useCallback((categoryTitle?: string | null) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setAddTxPrefill(categoryTitle != null && categoryTitle !== '' ? categoryTitle : null);
    setAddTxOpen(true);
  }, []);

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: padH,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
              ]}
            >
              Обзор
            </Text>
            <Text style={[typography.hero, { fontSize: 32, letterSpacing: -0.8, color: colors.text }]}>Финансы</Text>
          </View>
          <HeaderProfileAvatar marginTop={4} />
        </View>

        <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SegmentedControl<MainTab>
            value={mainTab}
            onChange={setMainTab}
            options={[
              { value: 'overview', label: 'Обзор' },
              { value: 'transactions', label: 'Транзакции' },
              { value: 'categories', label: 'Категории' },
              { value: 'history', label: 'История' },
            ]}
          />
        </View>

        {!supabaseOn || !userId ? (
          <View
            style={{
              marginTop: spacing.lg,
              padding: spacing.lg,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
              Чтобы увидеть реальные финансы из Supabase, подключи облако и войди в аккаунт.
            </Text>
            <Link href={CLOUD_HREF} asChild>
              <Pressable
                style={{
                  marginTop: spacing.md,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(168,85,247,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.45)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '800', color: brand.primary }}>Облако и вход</Text>
              </Pressable>
            </Link>
          </View>
        ) : q.isLoading ? (
          <ActivityIndicator color={brand.primary} style={{ marginTop: 32 }} />
        ) : q.isError ? (
          <Text style={{ marginTop: spacing.lg, color: colors.danger }}>
            Не удалось загрузить финансы. Проверь миграцию 009_finance и данные в Supabase.
          </Text>
        ) : overview ? (
          <>
            {mainTab === 'transactions' ? (
              <FinanceQuickTransactionBar userId={userId} overview={overview} onSaved={invalidateFinance} />
            ) : null}
            {mainTab === 'overview' ? (
              <>
                <View style={{ marginTop: spacing.md, width: heroPageW, alignSelf: 'center' }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onHeroScrollEnd}
                    decelerationRate="fast"
                    style={{ width: heroPageW }}
                  >
                    {/* Слайд 1: баланс */}
                    <View
                      style={{
                        width: heroPageW,
                        borderRadius: 26,
                        overflow: 'hidden',
                        position: 'relative',
                        borderWidth: 1,
                        borderColor: 'rgba(139,92,246,0.35)',
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
                      <View style={{ paddingVertical: 22, paddingHorizontal: 22, position: 'relative', zIndex: 1 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            letterSpacing: 2,
                            color: 'rgba(255,255,255,0.82)',
                            textAlign: 'center',
                          }}
                        >
                          ТВОЙ БАЛАНС
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          <Text style={{ fontSize: 36, fontWeight: '800', color: '#FAFAFC', letterSpacing: -1 }}>
                            {fmtMoney(overview.totalBalance)}
                          </Text>
                          <Pressable
                            onPress={openDetail}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel="Редактировать структуру счетов"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: 'rgba(255,255,255,0.12)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.9)" />
                          </Pressable>
                        </View>
                        <Text
                          style={{
                            textAlign: 'center',
                            marginTop: 8,
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.55)',
                          }}
                        >
                          {monthLabel}
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            marginTop: 22,
                            paddingTop: 18,
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: 'rgba(255,255,255,0.18)',
                          }}
                        >
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="trending-up" size={22} color={GREEN_BAR} />
                            </View>
                            <View>
                              <Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#FAFAFC',
                                  fontVariant: ['tabular-nums'],
                                }}
                              >
                                {fmtMoney(overview.monthIncome)}
                              </Text>
                              <Text
                                style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}
                              >
                                Доход (мес.)
                              </Text>
                            </View>
                          </View>
                          <View
                            style={{
                              width: StyleSheet.hairlineWidth,
                              backgroundColor: 'rgba(255,255,255,0.22)',
                              marginHorizontal: 8,
                            }}
                          />
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="trending-down" size={22} color={RED_EXPENSE} />
                            </View>
                            <View>
                              <Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#FAFAFC',
                                  fontVariant: ['tabular-nums'],
                                }}
                              >
                                {fmtMoney(overview.monthExpense)}
                              </Text>
                              <Text
                                style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}
                              >
                                Траты (мес.)
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Слайд 2: прогноз */}
                    <View
                      style={{
                        width: heroPageW,
                        borderRadius: 26,
                        overflow: 'hidden',
                        position: 'relative',
                        borderWidth: 1,
                        borderColor: 'rgba(139,92,246,0.35)',
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
                      <View style={{ paddingVertical: 22, paddingHorizontal: 22, position: 'relative', zIndex: 1 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            letterSpacing: 2,
                            color: 'rgba(255,255,255,0.82)',
                            textAlign: 'center',
                          }}
                        >
                          ПРОГНОЗ НА КОНЕЦ МЕСЯЦА
                        </Text>
                        <Text
                          style={{
                            fontSize: 36,
                            fontWeight: '800',
                            color: '#FAFAFC',
                            letterSpacing: -1,
                            textAlign: 'center',
                            marginTop: 12,
                          }}
                        >
                          {fmtMoney(overview.forecastEndOfMonth)}
                        </Text>
                        <Text
                          style={{
                            marginTop: 14,
                            fontSize: 12,
                            lineHeight: 18,
                            color: 'rgba(255,255,255,0.62)',
                            textAlign: 'center',
                          }}
                        >
                          Упрощённая модель: текущий баланс минус неоплаченные разовые расходы за месяц и ориентир{' '}
                          {fmtMoney(overview.dailyExpenseLimit)} × дней до конца месяца (лимит из настроек Twinworks).
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                  <PaginationDots count={2} active={heroIndex} isLight={isLight} />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: spacing.xl + 4,
                    marginBottom: spacing.md,
                    gap: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '800',
                      color: colors.text,
                      letterSpacing: -0.4,
                      flex: 1,
                    }}
                  >
                    Месячный бюджет
                  </Text>
                  <Pressable onPress={openCategorySettings} hitSlop={8}>
                    <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 14 }}>Все категории</Text>
                  </Pressable>
                </View>

                {overview.budgetLines.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
                    Категории расходов не загружены. Импортируй таблицу{' '}
                    <Text style={{ fontWeight: '700' }}>expense_categories</Text> в{' '}
                    <Text style={{ fontWeight: '700' }}>finance_expense_categories</Text> (см. scripts/FINANCE_IMPORT.md).
                  </Text>
                ) : (
                  overview.budgetLines.map((line) => (
                    <BudgetCard
                      key={line.id}
                      line={line}
                      editable
                      onEdit={() => openCategoryEdit(line)}
                      onDelete={() => confirmDeleteCategory(line)}
                      onQuickExpense={() => openAddTransaction(line.title)}
                    />
                  ))
                )}
              </>
            ) : null}

            {mainTab === 'transactions' ? (
              <View style={{ marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                    Последние операции
                  </Text>
                  <Pressable onPress={() => openAddTransaction(null)} hitSlop={8}>
                    <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 14 }}>+ Операция</Text>
                  </Pressable>
                </View>
                {overview.transactionsRecent.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22 }}>Транзакций пока нет.</Text>
                ) : (
                  overview.transactionsRecent.map((t) => <TransactionRow key={t.id} t={t} />)
                )}
              </View>
            ) : null}

            {mainTab === 'categories' ? (
              <View style={{ marginTop: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.sm,
                    gap: 12,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.textMuted, flex: 1, lineHeight: 20 }]}>
                    Расходы по категориям за текущий месяц (к плану). Карандаш — лимит и название, корзина — удалить.
                  </Text>
                  <Pressable onPress={openCategorySettings} hitSlop={8}>
                    <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>Настройки</Text>
                  </Pressable>
                </View>
                {expenseAnalyticsQ.isLoading ? (
                  <ActivityIndicator color={brand.primary} style={{ marginBottom: spacing.lg }} />
                ) : expenseAnalyticsQ.isError ? (
                  <Text style={{ color: colors.danger, marginBottom: spacing.lg }}>
                    Не удалось загрузить сравнение по месяцам.
                  </Text>
                ) : expenseAnalyticsQ.data ? (
                  <FinanceCategoryMonthMatrix
                    analytics={expenseAnalyticsQ.data}
                    budgetCategoryTitles={overview.budgetLines.map((l) => l.title)}
                  />
                ) : null}
                {overview.budgetLines.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>Нет категорий.</Text>
                ) : (
                  overview.budgetLines.map((line) => (
                    <BudgetCard
                      key={`cat-${line.id}`}
                      line={line}
                      editable
                      onEdit={() => openCategoryEdit(line)}
                      onDelete={() => confirmDeleteCategory(line)}
                      onQuickExpense={() => openAddTransaction(line.title)}
                    />
                  ))
                )}
              </View>
            ) : null}

            {mainTab === 'history' ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 }]}>
                  История по месяцам (новые сверху). Динамика капитала — изменение баланса к предыдущему месяцу в списке.
                  Выручка и прибыль — если есть в Twinworks: миграция 010_finance_snapshot_revenue.sql в Supabase и при
                  необходимости повторный импорт.
                </Text>
                {overview.snapshots.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
                    Снимков нет. После импорта таблицы finance_month_snapshots здесь появится история.
                  </Text>
                ) : (
                  <>
                    <View style={{ marginBottom: spacing.md }}>
                      <SegmentedControl<MonthHistoryViewMode>
                        value={historyViewMode}
                        onChange={setHistoryViewMode}
                        options={[
                          { value: 'table', label: 'Таблица' },
                          { value: 'cards', label: 'Карточки' },
                        ]}
                      />
                    </View>
                    {historyViewMode === 'table' ? (
                      <MonthHistoryTableTwin rows={monthHistoryRows} screenInnerWidth={SCREEN_W - padH * 2} />
                    ) : (
                      <MonthHistoryCards rows={monthHistoryRows} />
                    )}
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <FinanceCategoryFormModal
        visible={catModal != null}
        onClose={() => setCatModal(null)}
        userId={userId ?? ''}
        mode="edit"
        categoryId={catModal?.id}
        initial={catModal?.initial}
      />

      {overview && userId ? (
        <FinanceAddTransactionModal
          visible={addTxOpen}
          onClose={() => {
            setAddTxOpen(false);
            setAddTxPrefill(null);
          }}
          userId={userId}
          overview={overview}
          prefillCategoryName={addTxPrefill}
        />
      ) : null}

      {overview && userId && mainTab === 'transactions' ? (
        <Pressable
          onPress={() => openAddTransaction(null)}
          style={{
            position: 'absolute',
            right: spacing.lg,
            bottom: insets.bottom + 88,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </ScreenCanvas>
  );
}
