import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { useTeamtrackerAgencyIncomeConfigured } from '@/config/env';
import {
  accountBucketFromType,
  compareExpenseCategories,
  createFinanceAccount,
  loadFinanceTxBucketLife,
  loadFinanceTxBucketWork,
  updateFinanceAccount,
} from '@/features/finance/financeApi';
import type { FinanceExpenseAnalytics } from '@/features/finance/financeApi';
import {
  DEFAULT_FINANCE_DASHBOARD_PREFS,
  loadFinanceDashboardPrefs,
  saveFinanceDashboardPrefs,
  type FinanceDashboardPrefs,
} from '@/features/finance/financeDashboardStorage';
import { computeExpectedMonthlyExpense } from '@/features/finance/financeExpectedExpensePlan';
import { computeFinanceMonthTxStats } from '@/features/finance/financeMonthTxStats';
import type { FinanceAccount, FinanceOverview } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY, teamtrackerAgencyProfitKey } from '@/features/finance/queryKeys';
import { fetchTeamtrackerAgencyProfitForMonth } from '@/features/finance/teamtrackerAgencyProfit';
import { ANNUAL_SPHERE_TITLE, type AnnualSphere } from '@/features/goals/annualGoals.types';
import { useAnnualGoalsStore } from '@/stores/annualGoals.store';
import { useAppTheme } from '@/theme';

import type { EnrichedMonthRow } from '@/features/finance/FinanceMonthHistoryViews';

const FINANCE_HERO_IMAGE = require('../../assets/images/finance-hero-sophia.png');

const SPHERES: AnnualSphere[] = ['relationships', 'energy', 'work'];

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type ChartTab = 'income' | 'expense' | 'capital';

function MiniLineChart({
  values,
  labels,
  color,
  width,
  height,
  gridColor,
}: {
  values: number[];
  labels: string[];
  color: string;
  width: number;
  height: number;
  gridColor: string;
}) {
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = Math.max(1, height - padT - padB);
  const minV = values.length ? Math.min(...values) : 0;
  const maxV = values.length ? Math.max(...values) : 1;
  const span = Math.max(maxV - minV, 1);
  const n = values.length;
  const step = n <= 1 ? innerW : innerW / (n - 1);
  const pts = values
    .map((v, i) => {
      const x = padL + i * step;
      const t = (v - minV) / span;
      const y = padT + innerH - t * innerH;
      return `${x},${y}`;
    })
    .join(' ');
  const baselineY = padT + innerH;
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padL} y1={baselineY} x2={width - padR} y2={baselineY} stroke={gridColor} strokeWidth={1} />
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: 20 }}
        contentContainerStyle={{ paddingHorizontal: padL, gap: 8 }}
      >
        {labels.map((lab, i) => (
          <Text key={`${i}-${lab}`} style={{ fontSize: 9, fontWeight: '700', color: gridColor }} numberOfLines={1}>
            {lab}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function BentoShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors, radius, brand, isLight } = useAppTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: isLight ? colors.border : brand.surfaceBorderStrong,
          backgroundColor: colors.surface,
          padding: 16,
          ...(Platform.OS === 'web' && !isLight
            ? ({ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' } as object)
            : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type Props = {
  overview: FinanceOverview;
  userId: string;
  monthHistoryRows: EnrichedMonthRow[];
  expenseAnalytics: FinanceExpenseAnalytics | undefined;
  expenseAnalyticsLoading: boolean;
  onRefresh: () => void;
};

export function FinanceDashboardBento({
  overview,
  userId,
  monthHistoryRows,
  expenseAnalytics: _expenseAnalytics,
  expenseAnalyticsLoading,
  onRefresh,
}: Props) {
  const { colors, typography, spacing, radius, brand, isLight } = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { width: winW } = Dimensions.get('window');
  const colGap = 12;
  const tileMinW = Math.min(360, (winW - spacing.xl * 2 - colGap) / 2);

  const [prefs, setPrefs] = useState<FinanceDashboardPrefs>({ ...DEFAULT_FINANCE_DASHBOARD_PREFS });
  const [lifeNames, setLifeNames] = useState<string[]>([]);
  const [workNames, setWorkNames] = useState<string[]>([]);
  const [limitModal, setLimitModal] = useState(false);
  const [limitDraft, setLimitDraft] = useState('');
  const [pinModal, setPinModal] = useState(false);
  const [chartTab, setChartTab] = useState<ChartTab>('income');
  const [addAccountBucket, setAddAccountBucket] = useState<'available' | 'frozen' | 'reserve' | null>(null);
  const [newAccountName, setNewAccountName] = useState('');

  const annualDoc = useAnnualGoalsStore((s) => s.doc);

  const reloadLocalPrefs = useCallback(async () => {
    const [p, life, work] = await Promise.all([
      loadFinanceDashboardPrefs(),
      loadFinanceTxBucketLife(),
      loadFinanceTxBucketWork(),
    ]);
    setPrefs(p);
    setLifeNames(life);
    setWorkNames(work);
  }, []);

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
    () => computeFinanceMonthTxStats(overview.transactionsThisMonth, lifeNames, workNames),
    [overview.transactionsThisMonth, lifeNames, workNames]
  );

  const calendarMonth = useMemo(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }, []);

  const ttIncomeQ = useQuery({
    queryKey: teamtrackerAgencyProfitKey(calendarMonth.y, calendarMonth.m),
    queryFn: () => fetchTeamtrackerAgencyProfitForMonth(calendarMonth.y, calendarMonth.m),
    enabled: useTeamtrackerAgencyIncomeConfigured,
    staleTime: 60_000,
    retry: 1,
  });

  const ttIncomeOk = useTeamtrackerAgencyIncomeConfigured && ttIncomeQ.isSuccess;
  const expectedIncomeForDelta = ttIncomeOk ? ttIncomeQ.data.expectedRevenue : prefs.expectedIncomeMonthly;
  const expectedIncomeDisplay = ttIncomeOk
    ? fmtMoney(ttIncomeQ.data.expectedRevenue)
    : prefs.expectedIncomeMonthly > 0
      ? fmtMoney(prefs.expectedIncomeMonthly)
      : '—';
  const incomeSub = ttIncomeOk ? 'ожидаемый (агентство, Teamtracker)' : 'ожидаемый';
  const incomeTiny = ttIncomeOk
    ? `реально (выручка агентства): ${fmtMoney(ttIncomeQ.data.actualRevenue)}`
    : useTeamtrackerAgencyIncomeConfigured && ttIncomeQ.isError
      ? `реально: ${fmtMoney(overview.monthIncome)} · Teamtracker недоступен`
      : `реально: ${fmtMoney(overview.monthIncome)}`;

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

  const goalTrackerRows = useMemo(() => {
    const out: { id: string; title: string; imageUri?: string | null; tag: string }[] = [];
    for (const sp of SPHERES) {
      const card = annualDoc.spheres[sp].cards[0];
      if (card) {
        out.push({
          id: `${sp}-${card.id}`,
          title: card.title,
          imageUri: card.imageUri,
          tag: ANNUAL_SPHERE_TITLE[sp],
        });
      }
    }
    for (const g of annualDoc.generalGoals) {
      out.push({ id: `g-${g.id}`, title: g.title, imageUri: g.imageUri, tag: 'Общая цель' });
    }
    return out;
  }, [annualDoc]);

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

  const hasExpensePlan = prefs.plannedFixedMonthlyRub > 0 || prefs.plannedDailyAllowanceRub > 0;
  const expectedExpenseMonthly = useMemo(
    () => computeExpectedMonthlyExpense(prefs.plannedFixedMonthlyRub, prefs.plannedDailyAllowanceRub),
    [prefs.plannedFixedMonthlyRub, prefs.plannedDailyAllowanceRub]
  );
  const expectedExpenseDisplay =
    hasExpensePlan || expectedExpenseMonthly > 0 ? fmtMoney(expectedExpenseMonthly) : '—';

  const expectedDelta = expectedIncomeForDelta - expectedExpenseMonthly;
  const actualDelta = overview.monthIncome - overview.monthExpense;

  const gridColor = isLight ? 'rgba(15,17,24,0.12)' : 'rgba(255,255,255,0.12)';

  const statCard = (
    icon: keyof typeof Ionicons.glyphMap,
    iconBg: string,
    footer: string,
    big: string,
    sub?: string,
    tiny?: string,
    planLink?: { label: string; onPress: () => void }
  ) => (
    <BentoShell style={{ width: tileMinW, flexGrow: 1, minWidth: 156 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }} numberOfLines={2}>
            {big}
          </Text>
          {sub ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>{sub}</Text>
          ) : null}
          {tiny ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(148,163,184,0.95)', marginTop: 6 }}>{tiny}</Text>
          ) : null}
          {planLink ? (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                planLink.onPress();
              }}
              hitSlop={6}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 12 }}>{planLink.label}</Text>
            </Pressable>
          ) : null}
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 10, letterSpacing: 0.6 }}>
            {footer}
          </Text>
        </View>
      </View>
    </BentoShell>
  );

  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: colGap }}>
        {statCard(
          'wallet-outline',
          'rgba(168,85,247,0.35)',
          'Текущий баланс',
          fmtMoney(overview.totalBalance),
          undefined,
          undefined
        )}
        {statCard(
          'trending-up-outline',
          'rgba(74,222,128,0.35)',
          'Доход за месяц',
          expectedIncomeDisplay,
          incomeSub,
          incomeTiny
        )}
        {statCard(
          'trending-down-outline',
          'rgba(251,113,133,0.35)',
          'Расходы за месяц',
          expectedExpenseDisplay,
          'ожидаемые',
          `реально: ${fmtMoney(overview.monthExpense)}`,
          {
            label: 'План расходов →',
            onPress: () => router.push('/finance-planned-expenses' as Href),
          }
        )}
        {statCard(
          'analytics-outline',
          'rgba(99,102,241,0.4)',
          'Дельта (ожид.)',
          fmtMoney(expectedDelta),
          'ожидаемый доход − ожидаемые расходы',
          `факт: доход − расход = ${fmtMoney(actualDelta)}`
        )}
      </View>

      <View style={{ marginTop: colGap }}>
        <BentoShell>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image source={FINANCE_HERO_IMAGE} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>София</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 19 }}>
                Разберём доходы и расходы вместе: цели, лимиты и что поменять в первую очередь.
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  router.push('/annual-goals' as Href);
                }}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 14 }}>Перейти к целям →</Text>
              </Pressable>
            </View>
          </View>
        </BentoShell>
      </View>

      <View style={{ marginTop: colGap }}>
        <BentoShell>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>Лимит трат на месяц</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                Только «на жизнь» — те же категории, что в транзакциях
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setLimitDraft(lifeLimit > 0 ? String(Math.round(lifeLimit)) : '');
                setLimitModal(true);
              }}
              hitSlop={10}
              style={{ padding: 8, opacity: 0.45 }}
              accessibilityLabel="Задать лимит"
            >
              <Ionicons name="pencil" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={{ marginTop: 14 }}>
            <View
              style={{
                height: 14,
                borderRadius: 8,
                backgroundColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                borderWidth: lifeOver ? 1 : 0,
                borderColor: lifeOver ? 'rgba(251,113,133,0.85)' : 'transparent',
              }}
            >
              <View
                style={{
                  width: `${Math.round(lifeProgress * 100)}%`,
                  height: '100%',
                  borderRadius: 8,
                  backgroundColor: lifeOver ? '#FB7185' : '#4ADE80',
                  ...(lifeOver && Platform.OS === 'web'
                    ? ({ boxShadow: '0 0 18px rgba(251,113,133,0.55)' } as object)
                    : {}),
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{fmtMoney(txStats.lifeExpense)}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
                {lifeLimit > 0 ? fmtMoney(lifeLimit) : 'лимит не задан'}
              </Text>
            </View>
          </View>
        </BentoShell>
      </View>

      <View style={{ marginTop: colGap }}>
        <BentoShell>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Траты по ключевым категориям</Text>
            <Pressable onPress={() => setPinModal(true)} hitSlop={8}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: brand.primary }}>Настроить</Text>
            </Pressable>
          </View>
          {pinnedLines.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Нет категорий в бюджете.</Text>
          ) : (
            pinnedLines.map((line) => (
              <View key={line.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                    {line.title}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                    {fmtMoney(line.spent)}
                    {line.expectedMonthly > 0 ? ` / ${fmtMoney(line.expectedMonthly)}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 6,
                    backgroundColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(Math.min(1, line.progress01) * 100)}%`,
                      height: '100%',
                      borderRadius: 6,
                      backgroundColor: line.overLimit ? '#FB7185' : brand.primarySoft,
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </BentoShell>
      </View>

      <View style={{ marginTop: colGap }}>
        <BentoShell>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Трекер целей</Text>
            <Pressable onPress={() => router.push('/annual-goals' as Href)}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: brand.primary }}>Все цели</Text>
            </Pressable>
          </View>
          {goalTrackerRows.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Добавьте годовые цели в разделе «Цели».</Text>
          ) : (
            goalTrackerRows.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => router.push('/annual-goals' as Href)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 8,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(168,85,247,0.15)',
                  }}
                >
                  {row.imageUri ? (
                    <Image source={{ uri: row.imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="flag-outline" size={18} color={brand.primary} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, marginTop: 2 }}>{row.tag}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 16 }}>
            Суммы целей и счёт «цель» синхронизируются в следующей итерации.
          </Text>
        </BentoShell>
      </View>

      <View style={{ marginTop: colGap }}>
        <Text style={[typography.title2, { fontWeight: '900', color: colors.text, marginBottom: 10 }]}>Счета</Text>
        {(['available', 'frozen', 'reserve'] as const).map((bucket) => {
          const meta =
            bucket === 'available'
              ? { title: 'Доступные деньги', icon: 'wallet-outline' as const, tint: '#4ADE80' }
              : bucket === 'frozen'
                ? { title: 'Замороженные активы', icon: 'snow-outline' as const, tint: '#FB7185' }
                : { title: 'Цели и резервы', icon: 'flag-outline' as const, tint: brand.primary };
          const list = accountsByBucket[bucket];
          return (
            <View key={bucket} style={{ marginBottom: colGap }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name={meta.icon} size={18} color={meta.tint} />
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>{meta.title}</Text>
              </View>
              {list.map((acc) => (
                <AccountQuickTile
                  key={acc.id}
                  account={acc}
                  onSaveBalance={(bal) => updateAccMut.mutate({ id: acc.id, balance: bal })}
                  pending={updateAccMut.isPending}
                />
              ))}
              <Pressable
                onPress={() => {
                  setAddAccountBucket(bucket);
                  setNewAccountName('');
                }}
                style={{
                  marginTop: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>+ Счёт</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: colGap }}>
        <BentoShell>
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 10 }}>Динамика по месяцам</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {(
              [
                { id: 'income' as const, label: 'Доходы' },
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
          {chartRowsAsc.length < 2 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Нужна история снимков по месяцам (импорт / данные).</Text>
          ) : (
            <MiniLineChart
              values={chartSeries.values}
              labels={chartSeries.labels}
              color={chartSeries.color}
              width={Math.min(winW - spacing.xl * 2 - 32, 720)}
              height={180}
              gridColor={gridColor}
            />
          )}
          {chartTab === 'expense' && expenseAnalyticsLoading ? (
            <ActivityIndicator style={{ marginTop: 8 }} color={brand.primary} />
          ) : null}
          {chartTab === 'expense' && _expenseAnalytics && !expenseAnalyticsLoading ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
              Детализация расходов по категориям — вкладка «Категории».
            </Text>
          ) : null}
        </BentoShell>
      </View>

      <Modal visible={limitModal} transparent animationType="fade" onRequestClose={() => setLimitModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setLimitModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg }}>
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

      <Modal visible={pinModal} animationType="slide" transparent onRequestClose={() => setPinModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setPinModal(false)} />
        <View style={{ maxHeight: '70%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg }}>
          <Text style={{ fontWeight: '900', fontSize: 17, color: colors.text, marginBottom: 12 }}>Категории на дашборде</Text>
          <ScrollView>
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
        </View>
      </Modal>

      <Modal visible={addAccountBucket != null} transparent animationType="fade" onRequestClose={() => setAddAccountBucket(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setAddAccountBucket(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg }}>
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

function AccountQuickTile({
  account,
  onSaveBalance,
  pending,
}: {
  account: FinanceAccount;
  onSaveBalance: (n: number) => void;
  pending: boolean;
}) {
  const { colors, radius, brand } = useAppTheme();
  const [draft, setDraft] = useState(String(Math.round(account.balance)));
  useEffect(() => {
    setDraft(String(Math.round(account.balance)));
  }, [account.balance, account.id]);
  return (
    <BentoShell style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(168,85,247,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="layers-outline" size={20} color={brand.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }} numberOfLines={2}>
            {account.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{account.type}</Text>
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          keyboardType="decimal-pad"
          editable={!pending}
          onBlur={() => {
            const n = Number(draft.replace(/\s/g, '').replace(',', '.'));
            if (!Number.isFinite(n)) {
              setDraft(String(Math.round(account.balance)));
              return;
            }
            if (Math.abs(n - account.balance) > 0.01) onSaveBalance(n);
          }}
          style={{
            minWidth: 100,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            fontSize: 16,
            fontWeight: '900',
            color: colors.text,
            textAlign: 'right',
          }}
        />
      </View>
    </BentoShell>
  );
}
