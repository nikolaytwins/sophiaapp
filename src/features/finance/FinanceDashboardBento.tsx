import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTeamtrackerAgencyIncomeConfigured } from '@/config/env';
import {
  accountBucketFromType,
  compareExpenseCategories,
  coerceFinanceViewMonth,
  createFinanceAccount,
  updateFinanceAccount,
  updateFinanceExpenseCategory,
} from '@/features/finance/financeApi';
import type { FinanceExpenseAnalytics } from '@/features/finance/financeApi';
import {
  DEFAULT_FINANCE_DASHBOARD_PREFS,
  loadFinanceDashboardPrefs,
  saveFinanceDashboardPrefs,
  type FinanceDashboardPrefs,
} from '@/features/finance/financeDashboardStorage';
import {
  canonicalizeBucketSelectionNames,
  expandCategoryBucketForMatching,
  normFinanceCatName,
  rollupExpenseCategoryToRootName,
} from '@/features/finance/financeBudgetTree';
import {
  loadFinanceTxBucketLife,
  loadFinanceTxBucketWork,
  saveFinanceTxBucketLife,
  saveFinanceTxBucketWork,
} from '@/features/finance/financeTxDashboardStorage';
import { computeExpectedMonthlyExpense } from '@/features/finance/financeExpectedExpensePlan';
import { computeFinanceMonthTxStats } from '@/features/finance/financeMonthTxStats';
import type { FinanceAccount, FinanceBudgetLine, FinanceOverview } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY, teamtrackerAgencyProfitKey } from '@/features/finance/queryKeys';
import { fetchTeamtrackerAgencyProfitForMonth } from '@/features/finance/teamtrackerAgencyProfit';
import { WEB_NAV_LG_MIN } from '@/navigation/navConstants';
import { useAppTheme } from '@/theme';
import type { DonutSegment } from '@/features/finance/FinanceExpenseDonut';
import { FinanceExpenseDonut } from '@/features/finance/FinanceExpenseDonut';
import { FinanceMonthBarChart } from '@/features/finance/FinanceMonthBarChart';
import { FinancePremiumChart } from '@/features/finance/FinancePremiumChart';
import { FinanceSophiaHero } from '@/features/finance/FinanceSophiaHero';

import type { EnrichedMonthRow } from '@/features/finance/FinanceMonthHistoryViews';

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type ChartTab = 'income' | 'expense' | 'capital';
type ChartViz = 'line' | 'bars';

const DONUT_PALETTE = ['#A855F7', '#C084FC', '#7C3AED', '#E879F9', '#38BDF8', '#34D399', '#FBBF24'] as const;

/** Карточка бенто в духе календаря: стекло, фиолетовая кайма, мягкая тень. */
function BentoShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors, brand, isLight } = useAppTheme();
  const shell = isLight
    ? {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(15,17,24,0.08)',
        backgroundColor: '#FFFFFF',
        padding: 20,
        ...(Platform.OS === 'web' ? ({ boxShadow: '0 10px 36px rgba(15,17,24,0.07)' } as object) : {}),
      }
    : {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(157, 107, 255, 0.22)',
        backgroundColor: 'rgba(18,18,22,0.78)',
        padding: 20,
        ...(Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(18px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,0.5), 0 0 56px rgba(123,92,255,0.18)',
            } as object)
          : {}),
      };
  return <View style={[shell, style]}>{children}</View>;
}

type Props = {
  overview: FinanceOverview;
  userId: string;
  /** Календарный месяц обзора (совпадает с выбором на экране «Финансы»). */
  calendarMonth: { y: number; m: number };
  monthHistoryRows: EnrichedMonthRow[];
  expenseAnalytics: FinanceExpenseAnalytics | undefined;
  expenseAnalyticsLoading: boolean;
  onRefresh: () => void;
};

export function FinanceDashboardBento({
  overview,
  userId,
  calendarMonth,
  monthHistoryRows,
  expenseAnalytics,
  expenseAnalyticsLoading,
  onRefresh,
}: Props) {
  const { colors, spacing, radius, brand, isLight } = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { width: winW } = useWindowDimensions();
  const colGap = 16;
  const desktopBento = Platform.OS === 'web' && winW >= WEB_NAV_LG_MIN;
  const calendarMonthSafe = coerceFinanceViewMonth(calendarMonth);

  const [prefs, setPrefs] = useState<FinanceDashboardPrefs>({ ...DEFAULT_FINANCE_DASHBOARD_PREFS });
  const [lifeNames, setLifeNames] = useState<string[]>([]);
  const [workNames, setWorkNames] = useState<string[]>([]);
  const [limitModal, setLimitModal] = useState(false);
  const [limitDraft, setLimitDraft] = useState('');
  const [pinModal, setPinModal] = useState(false);
  const [keySpendLimitModal, setKeySpendLimitModal] = useState<{
    categoryId: string;
    title: string;
    draft: string;
  } | null>(null);
  const [chartTab, setChartTab] = useState<ChartTab>('income');
  const [chartViz, setChartViz] = useState<ChartViz>('line');
  const [addAccountBucket, setAddAccountBucket] = useState<'available' | 'frozen' | 'reserve' | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  /** −1: показывать последний месяц в аналитике; иначе индекс месяца (стрелки). */
  const [donutMonthIdx, setDonutMonthIdx] = useState(-1);
  const [expectedIncomeModal, setExpectedIncomeModal] = useState(false);
  const [expectedIncomeDraft, setExpectedIncomeDraft] = useState('');

  const reloadLocalPrefs = useCallback(async () => {
    const [p, lifeRaw, workRaw] = await Promise.all([
      loadFinanceDashboardPrefs(),
      loadFinanceTxBucketLife(),
      loadFinanceTxBucketWork(),
    ]);
    setPrefs(p);
    const cats = overview?.expenseCategories ?? [];
    const life = cats.length > 0 ? canonicalizeBucketSelectionNames(cats, lifeRaw) : lifeRaw;
    const work = cats.length > 0 ? canonicalizeBucketSelectionNames(cats, workRaw) : workRaw;
    setLifeNames(life);
    setWorkNames(work);
    if (cats.length > 0) {
      const pack = (a: string[]) =>
        [...a]
          .map((x) => x.trim())
          .filter(Boolean)
          .sort((x, y) => x.localeCompare(y, 'ru'))
          .join('\x1e');
      if (pack(life) !== pack(lifeRaw)) await saveFinanceTxBucketLife(life);
      if (pack(work) !== pack(workRaw)) await saveFinanceTxBucketWork(work);
    }
  }, [overview?.expenseCategories]);

  useFocusEffect(
    useCallback(() => {
      void reloadLocalPrefs();
    }, [reloadLocalPrefs])
  );

  const persistPrefs = useCallback(async (patch: Partial<FinanceDashboardPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await saveFinanceDashboardPrefs(patch);
  }, [prefs]);

  const txStats = useMemo(
    () => computeFinanceMonthTxStats(overview.transactionsThisMonth, lifeNames, workNames, overview.expenseCategories),
    [overview.transactionsThisMonth, lifeNames, workNames, overview.expenseCategories]
  );

  const lifeExpandedSet = useMemo(
    () => expandCategoryBucketForMatching(overview.expenseCategories, lifeNames),
    [overview.expenseCategories, lifeNames]
  );
  const workExpandedSet = useMemo(
    () => expandCategoryBucketForMatching(overview.expenseCategories, workNames),
    [overview.expenseCategories, workNames]
  );

  const ttIncomeQ = useQuery({
    queryKey: teamtrackerAgencyProfitKey(calendarMonthSafe.y, calendarMonthSafe.m),
    queryFn: () => fetchTeamtrackerAgencyProfitForMonth(calendarMonthSafe.y, calendarMonthSafe.m),
    enabled: useTeamtrackerAgencyIncomeConfigured,
    staleTime: 60_000,
    retry: 1,
  });

  const ttIncomeOk = useTeamtrackerAgencyIncomeConfigured && ttIncomeQ.isSuccess;
  /** Плитка «Прибыль»: ожидаемая прибыль TT или то же поле вручную, если интеграции нет. */
  const expectedProfitForDelta = ttIncomeOk ? ttIncomeQ.data.expectedProfit : prefs.expectedIncomeMonthly;
  const expectedProfitDisplay = ttIncomeOk
    ? fmtMoney(ttIncomeQ.data.expectedProfit)
    : prefs.expectedIncomeMonthly > 0
      ? fmtMoney(prefs.expectedIncomeMonthly)
      : '—';
  const profitSub = ttIncomeOk
    ? 'ожидаемая (агентство, Teamtracker)'
    : prefs.expectedIncomeMonthly > 0
      ? 'ожидаемая (задано вручную)'
      : useTeamtrackerAgencyIncomeConfigured
        ? 'ожидаемая (Teamtracker или вручную)'
        : 'ожидаемая (вручную — тап по блоку)';
  const profitTiny = ttIncomeOk
    ? `факт прибыль: ${fmtMoney(ttIncomeQ.data.actualProfit)} · выручка: ${fmtMoney(ttIncomeQ.data.actualRevenue)}`
    : useTeamtrackerAgencyIncomeConfigured && ttIncomeQ.isError
      ? `факт по счетам: ${fmtMoney(overview.monthIncome)} · TT не ответил — укажите ожидаемую прибыль тапом`
      : `факт по счетам: ${fmtMoney(overview.monthIncome)}`;

  const lifeLimit = prefs.lifeSpendLimitMonthly;
  const lifeProgress = lifeLimit > 0 ? Math.min(1, txStats.lifeExpense / lifeLimit) : 0;
  const lifeOver = lifeLimit > 0 && txStats.lifeExpense > lifeLimit;

  const rootCategories = useMemo(
    () => overview.expenseCategories.filter((c) => !c.parentId).sort(compareExpenseCategories),
    [overview.expenseCategories]
  );

  const pinnedLines = useMemo(() => {
    const set = new Set(prefs.pinnedCategoryIds);
    const picked = rootCategories.filter((c) => set.has(c.id));
    const lines = picked.length > 0 ? picked : rootCategories.slice(0, 4);
    return overview.budgetLines.filter((bl) => lines.some((c) => c.id === bl.id));
  }, [overview.budgetLines, prefs.pinnedCategoryIds, rootCategories]);

  const accountsByBucket = useMemo(() => {
    const m: Record<'available' | 'frozen' | 'reserve', FinanceAccount[]> = {
      available: [],
      frozen: [],
      reserve: [],
    };
    for (const a of overview.accounts) {
      m[accountBucketFromType(a.type)].push(a);
    }
    return m;
  }, [overview.accounts]);

  const updateAccMut = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) => updateFinanceAccount(userId, id, { balance }),
    onSuccess: onRefresh,
    onError: (e: Error) => Alert.alert('Счёт', e.message),
  });

  const createAccMut = useMutation({
    mutationFn: ({ name, bucket }: { name: string; bucket: 'available' | 'frozen' | 'reserve' }) => {
      const type =
        bucket === 'frozen' ? 'other' : bucket === 'reserve' ? 'savings' : 'checking';
      return createFinanceAccount(userId, { name, balance: 0, type });
    },
    onSuccess: () => {
      setAddAccountBucket(null);
      setNewAccountName('');
      void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
      onRefresh();
    },
    onError: (e: Error) => Alert.alert('Счёт', e.message),
  });

  const updateCategoryLimitMut = useMutation({
    mutationFn: ({ categoryId, expectedMonthly }: { categoryId: string; expectedMonthly: number }) =>
      updateFinanceExpenseCategory(userId, categoryId, { expectedMonthly }),
    onSuccess: () => {
      setKeySpendLimitModal(null);
      void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
      onRefresh();
    },
    onError: (e: Error) => Alert.alert('Лимит категории', e.message),
  });

  const openKeySpendLimitEditor = useCallback((line: FinanceBudgetLine) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setKeySpendLimitModal({
      categoryId: line.id,
      title: line.title,
      draft: line.expectedMonthly > 0 ? String(Math.round(line.expectedMonthly)) : '',
    });
  }, []);

  const chartRowsAsc = useMemo(() => [...monthHistoryRows].reverse(), [monthHistoryRows]);

  const chartSeries = useMemo(() => {
    const labels = chartRowsAsc.map((r) =>
      new Date(r.snapshot.year, r.snapshot.month - 1, 1).toLocaleDateString('ru-RU', { month: 'short' })
    );
    if (chartTab === 'income') {
      return {
        labels,
        values: chartRowsAsc.map((r) => r.snapshot.totalRevenue ?? 0),
        color: '#4ADE80',
      };
    }
    if (chartTab === 'expense') {
      return {
        labels,
        values: chartRowsAsc.map((r) => r.snapshot.personalExpenses + r.snapshot.businessExpenses),
        color: '#FB7185',
      };
    }
    return {
      labels,
      values: chartRowsAsc.map((r) => r.capitalDelta ?? 0),
      color: brand.primary,
    };
  }, [chartRowsAsc, chartTab, brand.primary]);

  const donutMonthCount = expenseAnalytics?.monthKeys?.length ?? 0;
  const donutLastIdx = Math.max(0, donutMonthCount - 1);
  const donutIdxSafe =
    donutMonthCount === 0 ? 0 : donutMonthIdx < 0 ? donutLastIdx : Math.min(Math.max(0, donutMonthIdx), donutLastIdx);
  const donutMonthLabel =
    expenseAnalytics?.monthLabels?.[donutIdxSafe] ??
    (donutMonthCount ? expenseAnalytics!.monthKeys[donutIdxSafe] : '');

  const donutSegments = useMemo((): DonutSegment[] => {
    if (!expenseAnalytics?.monthKeys?.length) return [];
    const idx = donutIdxSafe;
    const cats = overview.expenseCategories;
    const rowsRaw = expenseAnalytics.categorySeries
      .map((s) => ({ label: s.category, value: s.amounts[idx] ?? 0 }))
      .filter(
        (r) =>
          r.value > 0 &&
          lifeExpandedSet.has(normFinanceCatName(r.label)) &&
          !workExpandedSet.has(normFinanceCatName(r.label))
      );
    const rolled = new Map<string, number>();
    for (const r of rowsRaw) {
      const rootKey =
        cats.length > 0 ? rollupExpenseCategoryToRootName(cats, r.label) : r.label.trim();
      rolled.set(rootKey, (rolled.get(rootKey) ?? 0) + r.value);
    }
    const rows = [...rolled.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const top = rows.slice(0, 6);
    const restSum = rows.slice(6).reduce((a, r) => a + r.value, 0);
    const out: DonutSegment[] = top.map((r, i) => ({
      label: r.label,
      value: r.value,
      color: DONUT_PALETTE[i % DONUT_PALETTE.length]!,
    }));
    if (restSum > 0) {
      out.push({
        label: 'Прочее',
        value: restSum,
        color: DONUT_PALETTE[out.length % DONUT_PALETTE.length]!,
      });
    }
    return out;
  }, [expenseAnalytics, donutIdxSafe, lifeExpandedSet, workExpandedSet, overview.expenseCategories]);

  const lifeSpendByCategory = useMemo(() => {
    const m = new Map<string, number>();
    const cats = overview.expenseCategories;
    for (const t of overview.transactionsThisMonth) {
      if (t.type !== 'expense') continue;
      const key = (t.category ?? '').trim();
      if (!key) continue;
      if (!lifeExpandedSet.has(normFinanceCatName(key))) continue;
      const rootKey = cats.length > 0 ? rollupExpenseCategoryToRootName(cats, key) : key;
      m.set(rootKey, (m.get(rootKey) ?? 0) + t.amount);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [overview.transactionsThisMonth, lifeExpandedSet, overview.expenseCategories]);

  const hasExpensePlan = prefs.plannedFixedMonthlyRub > 0 || prefs.plannedDailyAllowanceRub > 0;
  const expectedExpenseMonthly = useMemo(
    () => computeExpectedMonthlyExpense(prefs.plannedFixedMonthlyRub, prefs.plannedDailyAllowanceRub),
    [prefs.plannedFixedMonthlyRub, prefs.plannedDailyAllowanceRub]
  );
  const actualExpenseDisplay = fmtMoney(txStats.lifeExpense);
  const expenseSubline = hasExpensePlan
    ? `План расходов: ${fmtMoney(expectedExpenseMonthly)} · факт «на жизнь»: ${fmtMoney(txStats.lifeExpense)}`
    : 'Фактические расходы только «на жизнь» (без рабочих категорий)';

  /** Ожидаемая прибыль (TT или вручную) минус факт «на жизнь». */
  const plannedProfitMinusLifeExpense = expectedProfitForDelta - txStats.lifeExpense;
  const factProfitOrAccountIncome = ttIncomeOk ? ttIncomeQ.data.actualProfit : overview.monthIncome;
  const actualDelta = factProfitOrAccountIncome - txStats.lifeExpense;

  const chartTabs = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {(
        [
          { id: 'income' as const, label: 'Выручка' },
          { id: 'expense' as const, label: 'Расходы' },
          { id: 'capital' as const, label: 'Капитал (Δ)' },
        ] as const
      ).map((t) => {
        const on = chartTab === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              setChartTab(t.id);
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: on ? brand.primary : colors.border,
              backgroundColor: on ? (isLight ? brand.primaryMuted : 'rgba(168,85,247,0.15)') : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 13, color: on ? brand.primary : colors.text }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const chartVizTabs = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, marginTop: 4 }}>
      {(
        [
          { id: 'line' as const, label: 'Линия' },
          { id: 'bars' as const, label: 'Столбцы' },
        ] as const
      ).map((t) => {
        const on = chartViz === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              setChartViz(t.id);
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
            }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: on ? 'rgba(167,139,250,0.55)' : colors.border,
              backgroundColor: on ? 'rgba(168,85,247,0.18)' : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 12, color: on ? '#E9D5FF' : colors.textMuted }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const signedCapital = chartTab === 'capital';

  const chartBody =
    chartRowsAsc.length < 1 ? (
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        Добавьте снимок месяца во вкладке «История» — график подтянет доход и расход.
      </Text>
    ) : chartViz === 'line' ? (
      <FinancePremiumChart
        values={chartSeries.values}
        labels={chartSeries.labels}
        color={chartSeries.color}
        height={240}
        isLight={isLight}
        signedDiverging={signedCapital}
      />
    ) : (
      <FinanceMonthBarChart
        values={chartSeries.values}
        labels={chartSeries.labels}
        height={240}
        isLight={isLight}
        signedFromZero={signedCapital}
      />
    );

  const deltaPositive = plannedProfitMinusLifeExpense >= 0;

  const metricTileShell = (child: ReactNode, key: string) => (
    <BentoShell
      key={key}
      style={{
        flex: desktopBento ? 1 : undefined,
        flexBasis: desktopBento ? '22%' : '47%',
        minWidth: desktopBento ? 120 : 148,
        maxWidth: desktopBento ? undefined : '48%',
        paddingVertical: 18,
        paddingHorizontal: 16,
        minHeight: desktopBento ? 168 : 156,
      }}
    >
      {child}
    </BentoShell>
  );

  return (
    <View
      style={{
        marginTop: spacing.md,
        marginHorizontal: isLight ? 0 : -spacing.xl,
        paddingHorizontal: isLight ? 0 : spacing.xl,
        paddingBottom: spacing.md,
        backgroundColor: isLight ? undefined : '#000000',
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: colGap }}>
        {metricTileShell(
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.8 }}>КАПИТАЛ</Text>
              <Ionicons name="wallet-outline" size={20} color="rgba(167,139,250,0.9)" />
            </View>
            <Text
              style={{
                marginTop: 10,
                fontSize: desktopBento ? 26 : 22,
                fontWeight: '900',
                color: colors.text,
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fmtMoney(overview.totalBalance)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>По всем счетам · ₽</Text>
          </>,
          'cap'
        )}
        {metricTileShell(
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setExpectedIncomeDraft(prefs.expectedIncomeMonthly > 0 ? String(Math.round(prefs.expectedIncomeMonthly)) : '');
              setExpectedIncomeModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Задать ожидаемую прибыль в месяц"
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.8 }}>ПРИБЫЛЬ</Text>
              <Ionicons name="trending-up-outline" size={20} color="#4ADE80" />
            </View>
            <Text
              style={{
                marginTop: 10,
                fontSize: desktopBento ? 26 : 22,
                fontWeight: '900',
                color: '#BBF7D0',
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
            >
              {expectedProfitDisplay}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }} numberOfLines={4}>
              {profitSub} · {profitTiny}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: brand.primary, marginTop: 6 }}>Тап — ожидаемая прибыль, ₽</Text>
          </Pressable>,
          'inc'
        )}
        {metricTileShell(
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.8 }}>РАСХОДЫ</Text>
              <Ionicons name="trending-down-outline" size={20} color="#FB7185" />
            </View>
            <Text
              style={{
                marginTop: 10,
                fontSize: desktopBento ? 26 : 22,
                fontWeight: '900',
                color: '#FECDD3',
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
            >
              {actualExpenseDisplay}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }} numberOfLines={2}>
              {expenseSubline}
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                router.push('/finance-planned-expenses' as Href);
              }}
              style={{ marginTop: 8 }}
            >
              <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 12 }}>План расходов →</Text>
            </Pressable>
          </>,
          'exp'
        )}
        {metricTileShell(
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.8 }}>ДЕЛЬТА</Text>
              <Ionicons name="analytics-outline" size={20} color={deltaPositive ? '#4ADE80' : '#FB7185'} />
            </View>
            <Text
              style={{
                marginTop: 10,
                fontSize: desktopBento ? 26 : 22,
                fontWeight: '900',
                color: deltaPositive ? '#BBF7D0' : '#FECDD3',
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
            >
              {fmtMoney(plannedProfitMinusLifeExpense)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }} numberOfLines={2}>
              Ожидаемая прибыль минус факт расходов «на жизнь».
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              Факт (прибыль TT или доход по счетам) − жизнь: {fmtMoney(actualDelta)}
            </Text>
          </>,
          'delta'
        )}
      </View>

      <FinanceSophiaHero fullWidth />

      {desktopBento ? (
        <>
          <View style={{ marginTop: colGap, flexDirection: 'row', gap: colGap, alignItems: 'stretch' }}>
            <BentoShell style={{ flex: 1.2, minWidth: 0, paddingBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.6, marginBottom: 6 }}>
                ДИНАМИКА ПО МЕСЯЦАМ
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 10 }}>График</Text>
              {chartTabs}
              {chartVizTabs}
              {chartBody}
              {chartTab === 'expense' && expenseAnalyticsLoading ? (
                <ActivityIndicator style={{ marginTop: 8 }} color={brand.primary} />
              ) : null}
              {chartTab === 'expense' && expenseAnalytics && !expenseAnalyticsLoading ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                  Детализация расходов по категориям — вкладка «Категории».
                </Text>
              ) : null}
              {chartTab === 'capital' ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                  Капитал (Δ): зелёный — плюс по снимку, красный — минус. Шкала с нулём на «Линия»; «Столбцы» — от нуля вверх/вниз.
                </Text>
              ) : null}
            </BentoShell>
            <BentoShell style={{ flex: 0.95, minWidth: 280, paddingVertical: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.6, marginBottom: 6 }}>
                ТРАТЫ ПО КАТЕГОРИЯМ
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>
                Только корзина «на жизнь» (родитель покрывает подкатегории); суммы по корню без двойного счёта; работа исключена.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    setDonutMonthIdx((prev) => {
                      const cur = prev < 0 ? donutLastIdx : prev;
                      return Math.max(0, cur - 1);
                    });
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                  disabled={donutMonthCount === 0 || donutIdxSafe <= 0}
                  hitSlop={8}
                  style={{ opacity: donutMonthCount === 0 || donutIdxSafe <= 0 ? 0.35 : 1 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#E9D5FF" />
                </Pressable>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center', flex: 1 }} numberOfLines={1}>
                  {donutMonthLabel || '—'}
                </Text>
                <Pressable
                  onPress={() => {
                    setDonutMonthIdx((prev) => {
                      const cur = prev < 0 ? donutLastIdx : prev;
                      return Math.min(donutLastIdx, cur + 1);
                    });
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                  disabled={donutMonthCount === 0 || donutIdxSafe >= donutLastIdx}
                  hitSlop={8}
                  style={{ opacity: donutMonthCount === 0 || donutIdxSafe >= donutLastIdx ? 0.35 : 1 }}
                >
                  <Ionicons name="chevron-forward" size={22} color="#E9D5FF" />
                </Pressable>
              </View>
              {expenseAnalyticsLoading ? <ActivityIndicator color={brand.primary} style={{ marginTop: 24 }} /> : null}
              {!expenseAnalyticsLoading ? (
                <FinanceExpenseDonut segments={donutSegments} height={240} isLight={isLight} />
              ) : null}
            </BentoShell>
          </View>

          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ padding: 22, borderWidth: 2, borderColor: 'rgba(232,121,249,0.55)' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
                <View style={{ flex: 1, minWidth: 280, flexBasis: desktopBento ? '48%' : '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(196,181,253,0.9)', letterSpacing: 1.4 }}>ЛИМИТ</Text>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 8 }}>Траты «на жизнь»</Text>
                      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 }}>
                        Те же категории, что в транзакциях. Карандаш — лимит месяца.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setLimitDraft(lifeLimit > 0 ? String(Math.round(lifeLimit)) : '');
                        setLimitModal(true);
                      }}
                      hitSlop={10}
                      style={{ padding: 10, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.2)' }}
                      accessibilityLabel="Задать лимит"
                    >
                      <Ionicons name="pencil" size={22} color="#E9D5FF" />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] }}>
                      {fmtMoney(txStats.lifeExpense)}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                      {lifeLimit > 0 ? `из ${fmtMoney(lifeLimit)}` : 'лимит не задан'}
                    </Text>
                  </View>
                  <View style={{ marginTop: 18, height: 22, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <LinearGradient
                      colors={lifeOver ? (['#FB7185', '#F43F5E'] as const) : (['#C084FC', '#9333EA', '#6D28D9'] as const)}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{
                        width: `${Math.round(lifeProgress * 100)}%`,
                        height: '100%',
                        borderRadius: 12,
                      }}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 280, flexBasis: desktopBento ? '48%' : '100%' }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(196,181,253,0.85)', letterSpacing: 1.2 }}>КАТЕГОРИИ</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 6 }}>На жизнь в этом месяце</Text>
                  {lifeSpendByCategory.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>Нет трат в категориях «жизнь» за месяц.</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 220, marginTop: 12 }} nestedScrollEnabled showsVerticalScrollIndicator>
                      {lifeSpendByCategory.map(([name, amt]) => (
                        <View
                          key={name}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={2}>
                            {name}
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                            {fmtMoney(amt)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </BentoShell>
          </View>

          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ padding: 22, borderWidth: 2, borderColor: 'rgba(167,139,250,0.5)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(196,181,253,0.9)', letterSpacing: 1.4 }}>КАТЕГОРИИ</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 6 }}>Ключевые траты</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 }}>
                    Карандаш у категории — лимит плана на месяц.
                  </Text>
                </View>
                <Pressable onPress={() => setPinModal(true)} hitSlop={8} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: brand.primary }}>Настроить</Text>
                </Pressable>
              </View>
              {pinnedLines.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 15 }}>Нет категорий в бюджете.</Text>
              ) : (
                pinnedLines.map((line) => (
                  <View key={line.id} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, flexShrink: 1 }} numberOfLines={2}>
                          {line.title}
                        </Text>
                        <Pressable
                          onPress={() => openKeySpendLimitEditor(line)}
                          hitSlop={10}
                          accessibilityLabel={`Лимит месяца для ${line.title}`}
                          style={{ padding: 4, opacity: 0.55 }}
                        >
                          <Ionicons name="pencil" size={18} color={brand.primary} />
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                        {fmtMoney(line.spent)}
                        {line.expectedMonthly > 0 ? (
                          <Text style={{ fontWeight: '700', color: colors.textMuted }}>{` / ${fmtMoney(line.expectedMonthly)}`}</Text>
                        ) : null}
                      </Text>
                    </View>
                    <View style={{ height: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <LinearGradient
                        colors={line.overLimit ? (['#FB7185', '#F43F5E'] as const) : (['#E879F9', '#A855F7'] as const)}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          width: `${Math.round(Math.min(1, line.progress01) * 100)}%`,
                          height: '100%',
                          borderRadius: 10,
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </BentoShell>
          </View>
        </>
      ) : (
        <>
          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ paddingBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.6, marginBottom: 6 }}>
                ДИНАМИКА ПО МЕСЯЦАМ
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 10 }}>График</Text>
              {chartTabs}
              {chartVizTabs}
              {chartBody}
              {chartTab === 'expense' && expenseAnalyticsLoading ? (
                <ActivityIndicator style={{ marginTop: 8 }} color={brand.primary} />
              ) : null}
              {chartTab === 'expense' && expenseAnalytics && !expenseAnalyticsLoading ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                  Детализация расходов по категориям — вкладка «Категории».
                </Text>
              ) : null}
              {chartTab === 'capital' ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                  Капитал (Δ): зелёный — плюс, красный — минус; нулевая линия на «Линия».
                </Text>
              ) : null}
            </BentoShell>
          </View>

          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ paddingVertical: 18 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 4 }}>Траты по категориям</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
                Корзина «на жизнь» по дереву категорий; сегменты свёрнуты в родителя.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    setDonutMonthIdx((prev) => {
                      const cur = prev < 0 ? donutLastIdx : prev;
                      return Math.max(0, cur - 1);
                    });
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                  disabled={donutMonthCount === 0 || donutIdxSafe <= 0}
                  hitSlop={8}
                  style={{ opacity: donutMonthCount === 0 || donutIdxSafe <= 0 ? 0.35 : 1 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#E9D5FF" />
                </Pressable>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text, flex: 1, textAlign: 'center' }} numberOfLines={1}>
                  {donutMonthLabel || '—'}
                </Text>
                <Pressable
                  onPress={() => {
                    setDonutMonthIdx((prev) => {
                      const cur = prev < 0 ? donutLastIdx : prev;
                      return Math.min(donutLastIdx, cur + 1);
                    });
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                  disabled={donutMonthCount === 0 || donutIdxSafe >= donutLastIdx}
                  hitSlop={8}
                  style={{ opacity: donutMonthCount === 0 || donutIdxSafe >= donutLastIdx ? 0.35 : 1 }}
                >
                  <Ionicons name="chevron-forward" size={22} color="#E9D5FF" />
                </Pressable>
              </View>
              {expenseAnalyticsLoading ? <ActivityIndicator color={brand.primary} /> : null}
              {!expenseAnalyticsLoading ? <FinanceExpenseDonut segments={donutSegments} height={220} isLight={isLight} /> : null}
            </BentoShell>
          </View>

          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ padding: 20, borderWidth: 2, borderColor: 'rgba(232,121,249,0.55)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(196,181,253,0.9)', letterSpacing: 1.4 }}>ЛИМИТ</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 6 }}>Траты «на жизнь»</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Категории как в транзакциях</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setLimitDraft(lifeLimit > 0 ? String(Math.round(lifeLimit)) : '');
                    setLimitModal(true);
                  }}
                  style={{ padding: 10, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.2)' }}
                >
                  <Ionicons name="pencil" size={22} color="#E9D5FF" />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] }}>
                  {fmtMoney(txStats.lifeExpense)}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                  {lifeLimit > 0 ? `из ${fmtMoney(lifeLimit)}` : 'лимит не задан'}
                </Text>
              </View>
              <View style={{ marginTop: 14, height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <LinearGradient
                  colors={lifeOver ? (['#FB7185', '#F43F5E'] as const) : (['#C084FC', '#9333EA'] as const)}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ width: `${Math.round(lifeProgress * 100)}%`, height: '100%', borderRadius: 10 }}
                />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, marginTop: 16 }}>На жизнь по категориям</Text>
              {lifeSpendByCategory.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>Нет трат в категориях «жизнь».</Text>
              ) : (
                <ScrollView style={{ maxHeight: 200, marginTop: 8 }} nestedScrollEnabled showsVerticalScrollIndicator>
                  {lifeSpendByCategory.map(([name, amt]) => (
                    <View
                      key={name}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={2}>
                        {name}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                        {fmtMoney(amt)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </BentoShell>
          </View>

          <View style={{ marginTop: colGap }}>
            <BentoShell style={{ padding: 20, borderWidth: 2, borderColor: 'rgba(167,139,250,0.5)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Ключевые траты</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 }}>
                    Карандаш у категории — лимит плана на месяц.
                  </Text>
                </View>
                <Pressable onPress={() => setPinModal(true)}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: brand.primary }}>Настроить</Text>
                </Pressable>
              </View>
              {pinnedLines.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Нет категорий в бюджете.</Text>
              ) : (
                pinnedLines.map((line) => (
                  <View key={line.id} style={{ marginBottom: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, flexShrink: 1 }} numberOfLines={2}>
                          {line.title}
                        </Text>
                        <Pressable
                          onPress={() => openKeySpendLimitEditor(line)}
                          hitSlop={10}
                          accessibilityLabel={`Лимит месяца для ${line.title}`}
                          style={{ padding: 4, opacity: 0.55 }}
                        >
                          <Ionicons name="pencil" size={17} color={brand.primary} />
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                        {fmtMoney(line.spent)}
                        {line.expectedMonthly > 0 ? ` / ${fmtMoney(line.expectedMonthly)}` : ''}
                      </Text>
                    </View>
                    <View style={{ height: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <LinearGradient
                        colors={line.overLimit ? (['#FB7185', '#F43F5E'] as const) : (['#E879F9', '#A855F7'] as const)}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          width: `${Math.round(Math.min(1, line.progress01) * 100)}%`,
                          height: '100%',
                          borderRadius: 8,
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </BentoShell>
          </View>
        </>
      )}

      <View style={{ marginTop: colGap + 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(196,181,253,0.9)', letterSpacing: 1.4, marginBottom: 10 }}>СЧЕТА</Text>
        {(['available', 'frozen', 'reserve'] as const).map((bucket) => {
          const meta =
            bucket === 'available'
              ? { title: 'Доступные деньги', icon: 'wallet-outline' as const, tint: '#4ADE80' }
              : bucket === 'frozen'
                ? { title: 'Замороженные активы', icon: 'snow-outline' as const, tint: '#FB7185' }
                : { title: 'Резервы и накопления', icon: 'flag-outline' as const, tint: brand.primary };
          const list = accountsByBucket[bucket];
          return (
            <View key={bucket} style={{ marginBottom: colGap + 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name={meta.icon} size={18} color={meta.tint} />
                  <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>{meta.title}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setAddAccountBucket(bucket);
                    setNewAccountName('');
                  }}
                  hitSlop={10}
                  accessibilityLabel={`Добавить счёт: ${meta.title}`}
                  style={{ padding: 6, opacity: 0.38 }}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {list.map((acc) => (
                  <AccountPlaqueTile
                    key={acc.id}
                    account={acc}
                    editing={editingAccountId === acc.id}
                    onBeginEdit={() => setEditingAccountId(acc.id)}
                    onEndEdit={() => setEditingAccountId(null)}
                    onSaveBalance={(bal) => updateAccMut.mutate({ id: acc.id, balance: bal })}
                    pending={updateAccMut.isPending}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setLimitModal(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: radius.xl,
              backgroundColor: isLight ? colors.surface : '#16161c',
              padding: spacing.lg,
              borderWidth: isLight ? 1 : 0,
              borderColor: colors.border,
              ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object) : {}),
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 10 }}>Лимит «на жизнь», ₽</Text>
            <TextInput
              value={limitDraft}
              onChangeText={setLimitDraft}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: 14,
                fontSize: 17,
                fontWeight: '800',
                color: colors.text,
                marginBottom: 14,
              }}
            />
            <Pressable
              onPress={() => {
                const n = Number(limitDraft.replace(/\s/g, '').replace(',', '.'));
                void persistPrefs({ lifeSpendLimitMonthly: Number.isFinite(n) && n >= 0 ? n : 0 });
                setLimitModal(false);
              }}
              style={{ paddingVertical: 14, borderRadius: radius.lg, backgroundColor: brand.primary, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>Сохранить</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={expectedIncomeModal} transparent animationType="fade" onRequestClose={() => setExpectedIncomeModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setExpectedIncomeModal(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: radius.xl,
              backgroundColor: isLight ? colors.surface : '#16161c',
              padding: spacing.lg,
              borderWidth: isLight ? 1 : 0,
              borderColor: colors.border,
              ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object) : {}),
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 8 }}>Ожидаемая прибыль в месяц, ₽</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Для плитки «Прибыль» и «Дельты», если Teamtracker недоступен (по смыслу — ожидаемая прибыль агентства).
            </Text>
            <TextInput
              value={expectedIncomeDraft}
              onChangeText={setExpectedIncomeDraft}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: 14,
                fontSize: 17,
                fontWeight: '800',
                color: colors.text,
                marginBottom: 14,
              }}
            />
            <Pressable
              onPress={() => {
                const n = Number(expectedIncomeDraft.replace(/\s/g, '').replace(',', '.'));
                void persistPrefs({ expectedIncomeMonthly: Number.isFinite(n) && n >= 0 ? n : 0 });
                setExpectedIncomeModal(false);
              }}
              style={{ paddingVertical: 14, borderRadius: radius.lg, backgroundColor: brand.primary, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>Сохранить</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={pinModal} animationType="fade" transparent onRequestClose={() => setPinModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setPinModal(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: radius.xl,
              maxHeight: '78%',
              backgroundColor: isLight ? colors.surface : '#16161c',
              padding: spacing.lg,
              borderWidth: isLight ? 1 : 0,
              borderColor: colors.border,
              ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object) : {}),
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 6 }}>Категории на дашборде</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 17 }}>
              Отметь до четырёх корневых категорий. Лимит плана на месяц задаётся карандашом у строки в блоке «Ключевые траты».
            </Text>
            <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled showsVerticalScrollIndicator>
              {rootCategories.map((c) => {
                const on = prefs.pinnedCategoryIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setPrefs((prev) => {
                        const set = new Set(prev.pinnedCategoryIds);
                        if (set.has(c.id)) set.delete(c.id);
                        else set.add(c.id);
                        const pinnedCategoryIds = [...set];
                        void saveFinanceDashboardPrefs({ pinnedCategoryIds });
                        return { ...prev, pinnedCategoryIds };
                      });
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{c.name}</Text>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? brand.primary : colors.textMuted} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setPinModal(false)} style={{ marginTop: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: brand.primary }}>Готово</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={keySpendLimitModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setKeySpendLimitModal(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }}
          onPress={() => setKeySpendLimitModal(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: radius.xl,
              backgroundColor: isLight ? colors.surface : '#16161c',
              padding: spacing.lg,
              borderWidth: isLight ? 1 : 0,
              borderColor: colors.border,
              ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object) : {}),
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 6 }}>
              Лимит месяца (план), ₽
            </Text>
            {keySpendLimitModal ? (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }} numberOfLines={2}>
                Категория «{keySpendLimitModal.title}». Используется для полосы «потрачено / лимит».
              </Text>
            ) : null}
            <TextInput
              value={keySpendLimitModal?.draft ?? ''}
              onChangeText={(t) =>
                setKeySpendLimitModal((prev) => (prev ? { ...prev, draft: t } : prev))
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: 14,
                fontSize: 17,
                fontWeight: '800',
                color: colors.text,
                marginBottom: 14,
              }}
            />
            <Pressable
              onPress={() => {
                if (!keySpendLimitModal) return;
                const n = Number(keySpendLimitModal.draft.replace(/\s/g, '').replace(',', '.'));
                const v = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
                updateCategoryLimitMut.mutate({ categoryId: keySpendLimitModal.categoryId, expectedMonthly: v });
              }}
              disabled={updateCategoryLimitMut.isPending}
              style={{
                paddingVertical: 14,
                borderRadius: radius.lg,
                backgroundColor: brand.primary,
                alignItems: 'center',
                opacity: updateCategoryLimitMut.isPending ? 0.65 : 1,
              }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>Сохранить</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addAccountBucket != null} transparent animationType="fade" onRequestClose={() => setAddAccountBucket(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setAddAccountBucket(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: radius.xl,
              backgroundColor: isLight ? colors.surface : '#16161c',
              padding: spacing.lg,
              borderWidth: isLight ? 1 : 0,
              borderColor: colors.border,
              ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.45)' } as object) : {}),
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 10 }}>Новый счёт</Text>
            <TextInput
              value={newAccountName}
              onChangeText={setNewAccountName}
              placeholder="Название"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: 14,
                fontSize: 16,
                color: colors.text,
                marginBottom: 14,
              }}
            />
            <Pressable
              onPress={() => {
                if (!addAccountBucket) return;
                const n = newAccountName.trim();
                if (!n) return;
                createAccMut.mutate({ name: n, bucket: addAccountBucket });
              }}
              style={{ paddingVertical: 14, borderRadius: radius.lg, backgroundColor: brand.primary, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>Создать</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function AccountPlaqueTile({
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

  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';

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
            {fmt(account.balance)}
          </Text>
          <Text style={{ fontSize: 10, color: 'rgba(196,181,253,0.65)', marginTop: 6 }}>тап по сумме — правка</Text>
        </Pressable>
      )}
    </View>
  );
}
