import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { buildMatrixModels, FinanceCategoryMonthMatrix } from '@/features/finance/FinanceCategoryMonthMatrix';
import type { FinanceExpenseAnalytics } from '@/features/finance/financeApi';
import { loadFinanceTxBucketLife, loadFinanceTxBucketWork } from '@/features/finance/financeTxDashboardStorage';
import type { FinanceOverview } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

type ChartTab = {
  key: string;
  label: string;
  amounts: number[];
};

function normName(s: string): string {
  return s.trim().toLowerCase();
}

function aggregateByNames(
  series: { category: string; amounts: number[] }[],
  names: Set<string>,
  len: number
): number[] {
  const out = new Array(len).fill(0);
  const set = new Set([...names].map(normName));
  for (const s of series) {
    if (!set.has(normName(s.category))) continue;
    for (let i = 0; i < len; i++) out[i] += s.amounts[i] ?? 0;
  }
  return out;
}

function ExpenseLineChart({
  labels,
  amounts,
  color,
  width,
  height,
  gridColor,
  labelColor,
}: {
  labels: string[];
  amounts: number[];
  color: string;
  width: number;
  height: number;
  gridColor: string;
  labelColor: string;
}) {
  const padL = 4;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = Math.max(1, height - padT - padB);
  const maxV = Math.max(1, ...amounts);
  const n = amounts.length;
  const step = n <= 1 ? innerW : innerW / (n - 1);
  const pts = amounts
    .map((v, i) => {
      const x = padL + i * step;
      const y = padT + innerH - (v / maxV) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke={gridColor} strokeWidth={1} />
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 2,
          maxHeight: 26,
        }}
        contentContainerStyle={{ paddingHorizontal: padL, gap: 10, alignItems: 'center' }}
      >
        {labels.map((lab, i) => (
          <Text key={`${lab}-${i}`} style={{ fontSize: 9, fontWeight: '700', color: labelColor }} numberOfLines={1}>
            {lab}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

type Props = {
  overview: FinanceOverview;
  analytics: FinanceExpenseAnalytics | undefined;
  loading: boolean;
  error: boolean;
  onOpenSettings: () => void;
};

export function FinanceCategoryExpenseTableBlock({ overview, analytics, loading, error, onOpenSettings }: Props) {
  const { colors, typography, spacing, radius, brand, isLight } = useAppTheme();
  const [blockW, setBlockW] = useState(0);
  const [matrixCollapsed, setMatrixCollapsed] = useState(false);
  const [chartMode, setChartMode] = useState(false);
  const [lifeNames, setLifeNames] = useState<string[]>([]);
  const [workNames, setWorkNames] = useState<string[]>([]);
  const [chartTabKey, setChartTabKey] = useState('all');

  useEffect(() => {
    let c = false;
    void (async () => {
      const [life, work] = await Promise.all([loadFinanceTxBucketLife(), loadFinanceTxBucketWork()]);
      if (!c) {
        setLifeNames(life);
        setWorkNames(work);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const onBlockLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setBlockW(w);
  }, []);

  const chartTabs = useMemo((): ChartTab[] => {
    if (!analytics) return [];
    const len = analytics.monthKeys.length;
    const lifeSet = new Set(lifeNames.map(normName));
    const workSet = new Set(workNames.map(normName));
    const tabs: ChartTab[] = [
      { key: 'all', label: 'Все', amounts: [...analytics.monthlyExpenseTotal] },
      {
        key: 'life',
        label: 'На жизнь',
        amounts: aggregateByNames(analytics.categorySeries, lifeSet, len),
      },
      {
        key: 'work',
        label: 'На работу',
        amounts: aggregateByNames(analytics.categorySeries, workSet, len),
      },
    ];
    const { roots, extras } = buildMatrixModels(analytics, overview.budgetLines.map((l) => l.title), overview.expenseCategories);
    for (const r of roots) {
      tabs.push({ key: `root:${r.name}`, label: r.name, amounts: [...r.rolled.amounts] });
    }
    for (const ex of extras.slice(0, 20)) {
      tabs.push({ key: `cat:${ex.series.category}`, label: ex.series.category, amounts: [...ex.series.amounts] });
    }
    return tabs;
  }, [analytics, overview.budgetLines, overview.expenseCategories, lifeNames, workNames]);

  const chartTabKeys = useMemo(() => new Set(chartTabs.map((t) => t.key)), [chartTabs]);
  useEffect(() => {
    if (chartTabs.length === 0) return;
    if (!chartTabKeys.has(chartTabKey)) setChartTabKey('all');
  }, [chartTabs.length, chartTabKeys, chartTabKey]);

  const activeChartSeries = useMemo(() => {
    return chartTabs.find((t) => t.key === chartTabKey) ?? chartTabs[0];
  }, [chartTabs, chartTabKey]);

  const toggleCollapse = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setMatrixCollapsed((v) => !v);
  };

  const gridColor = isLight ? 'rgba(15,17,24,0.12)' : 'rgba(255,255,255,0.12)';
  const chartLabelColor = isLight ? 'rgba(15,17,24,0.45)' : 'rgba(255,255,255,0.45)';

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';

  return (
    <View
      onLayout={onBlockLayout}
      style={{
        marginBottom: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: shellBorder,
        backgroundColor: shellBg,
        overflow: 'hidden',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: matrixCollapsed ? spacing.md : spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            flex: 1,
            flexShrink: 1,
            fontSize: 22,
            fontWeight: '900',
            color: colors.text,
            letterSpacing: -0.5,
            paddingRight: spacing.xs,
          }}
        >
          Таблица расходов
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Pressable onPress={onOpenSettings} hitSlop={8}>
            <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>Настройки</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setChartMode((c) => {
                const next = !c;
                if (next) setChartTabKey('all');
                return next;
              });
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: 'transparent',
            }}
          >
            <Text style={{ fontWeight: '800', color: colors.textMuted, fontSize: 13 }}>
              {chartMode ? 'Показать таблицей' : 'Показать графиком'}
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleCollapse}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={matrixCollapsed ? 'Развернуть таблицу' : 'Свернуть таблицу'}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLight ? 'rgba(15,17,24,0.04)' : 'rgba(255,255,255,0.04)',
            }}
          >
            <Ionicons name={matrixCollapsed ? 'chevron-down' : 'chevron-up'} size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {!matrixCollapsed && loading ? (
        <Text style={[typography.caption, { color: colors.textMuted, paddingVertical: spacing.md }]}>Загрузка…</Text>
      ) : null}
      {!matrixCollapsed && error ? (
        <Text style={{ color: colors.danger, paddingVertical: spacing.sm }}>Не удалось загрузить данные по месяцам.</Text>
      ) : null}
      {!matrixCollapsed && analytics && !loading && !error ? (
        chartMode ? (
          <View style={{ marginTop: spacing.xs }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.sm }}>
              {chartTabs.map((t) => {
                const on = t.key === chartTabKey;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setChartTabKey(t.key);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: on ? brand.primary : colors.border,
                      backgroundColor: on ? (isLight ? brand.primaryMuted : 'rgba(168,85,247,0.18)') : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 13,
                        color: on ? brand.primary : colors.text,
                        maxWidth: 160,
                      }}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              {blockW > 40 && activeChartSeries ? (
                <ExpenseLineChart
                  labels={analytics.monthLabels}
                  amounts={activeChartSeries.amounts}
                  color={brand.primary}
                  width={Math.max(60, blockW - spacing.md * 2)}
                  height={200}
                  gridColor={gridColor}
                  labelColor={chartLabelColor}
                />
              ) : null}
            </View>
          </View>
        ) : (
          <FinanceCategoryMonthMatrix
            embedded
            analytics={analytics}
            budgetRootTitles={overview.budgetLines.map((l) => l.title)}
            expenseCategories={overview.expenseCategories}
            containerWidth={blockW > 0 ? blockW - spacing.md * 2 : undefined}
          />
        )
      ) : null}
    </View>
  );
}
