import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { compareExpenseCategories } from '@/features/finance/financeApi';
import type { FinanceCategoryMonthSeries, FinanceExpenseAnalytics } from '@/features/finance/financeApi';
import type { FinanceExpenseCategory } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

const FALLBACK_CAT_COL = 108;
const FALLBACK_MONTH_COL = 56;
const CHEVRON_COL = 28;

function fmtCell(n: number) {
  if (n <= 0) return '—';
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ');
}

function zeroAmounts(len: number): number[] {
  return new Array(len).fill(0);
}

function addAmounts(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

function getSeriesAmounts(seriesByName: Map<string, FinanceCategoryMonthSeries>, name: string, len: number): number[] {
  return seriesByName.get(name)?.amounts ?? zeroAmounts(len);
}

function seriesTotal(amounts: number[]): number {
  return amounts.reduce((x, y) => x + y, 0);
}

type RootRowModel = {
  kind: 'root';
  name: string;
  rolled: FinanceCategoryMonthSeries;
  children: FinanceCategoryMonthSeries[];
};

type ExtraRowModel = {
  kind: 'extra';
  series: FinanceCategoryMonthSeries;
};

export function buildMatrixModels(
  analytics: FinanceExpenseAnalytics,
  budgetRootTitles: string[],
  expenseCategories: FinanceExpenseCategory[]
): { roots: RootRowModel[]; extras: ExtraRowModel[] } {
  const len = analytics.monthKeys.length;
  const seriesByName = new Map(analytics.categorySeries.map((s) => [s.category, s]));

  const managed = new Set<string>();
  const roots: RootRowModel[] = [];

  const subtreeSpend = (catId: string): number[] => {
    const self = expenseCategories.find((c) => c.id === catId);
    let a = self ? getSeriesAmounts(seriesByName, self.name, len) : zeroAmounts(len);
    for (const ch of expenseCategories.filter((c) => c.parentId === catId)) {
      a = addAmounts(a, subtreeSpend(ch.id));
    }
    return a;
  };

  const markManagedSubtree = (catId: string) => {
    const self = expenseCategories.find((c) => c.id === catId);
    if (self) managed.add(self.name);
    for (const ch of expenseCategories.filter((c) => c.parentId === catId)) markManagedSubtree(ch.id);
  };

  for (const title of budgetRootTitles) {
    const cat = expenseCategories.find((c) => !c.parentId && c.name === title);
    if (!cat) continue;
    const children = expenseCategories.filter((c) => c.parentId === cat.id).sort(compareExpenseCategories);
    const amounts = subtreeSpend(cat.id);
    const childSeries: FinanceCategoryMonthSeries[] = [];
    for (const ch of children) {
      const chAmt = subtreeSpend(ch.id);
      childSeries.push({
        category: ch.name,
        amounts: chAmt,
        total: seriesTotal(chAmt),
      });
    }
    markManagedSubtree(cat.id);
    roots.push({
      kind: 'root',
      name: cat.name,
      rolled: {
        category: cat.name,
        amounts,
        total: seriesTotal(amounts),
      },
      children: childSeries,
    });
  }

  const extras: ExtraRowModel[] = [];
  for (const s of analytics.categorySeries) {
    if (!managed.has(s.category)) extras.push({ kind: 'extra', series: s });
  }
  extras.sort((a, b) => b.series.total - a.series.total);

  return { roots, extras };
}

function computeColumnWidths(containerWidth: number | undefined, monthCount: number) {
  if (!containerWidth || containerWidth < 280) {
    return { catW: FALLBACK_CAT_COL, monthW: FALLBACK_MONTH_COL, tableMinW: FALLBACK_CAT_COL + monthCount * FALLBACK_MONTH_COL, useScroll: true };
  }
  const minMonth = 38;
  const minCat = 112;
  const maxCat = Math.min(220, Math.round(containerWidth * 0.34));
  let catW = maxCat;
  let monthW = (containerWidth - catW) / monthCount;
  if (monthW < minMonth) {
    monthW = minMonth;
    catW = Math.max(minCat, containerWidth - monthW * monthCount);
  }
  const tableMinW = catW + monthW * monthCount;
  const useScroll = tableMinW > containerWidth + 0.5;
  return {
    catW: Math.round(catW),
    monthW: Math.round(monthW),
    tableMinW: Math.round(tableMinW),
    useScroll,
  };
}

type Props = {
  analytics: FinanceExpenseAnalytics;
  /** Корневые категории в порядке бюджета (как `budgetLines.map(l => l.title)`). */
  budgetRootTitles: string[];
  expenseCategories: FinanceExpenseCategory[];
  /** Ширина области таблицы (без внешних отступов блока) — для подгонки колонок под блок. */
  containerWidth?: number;
  /** Без внешней рамки (родитель уже оформил блок). */
  embedded?: boolean;
};

export function FinanceCategoryMonthMatrix({
  analytics,
  budgetRootTitles,
  expenseCategories,
  containerWidth,
  embedded,
}: Props) {
  const { colors, typography, radius, spacing, isLight, brand } = useAppTheme();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const { roots, extras } = useMemo(
    () => buildMatrixModels(analytics, budgetRootTitles, expenseCategories),
    [analytics, budgetRootTitles, expenseCategories]
  );

  const { catW, monthW, tableMinW, useScroll } = useMemo(
    () => computeColumnWidths(containerWidth, analytics.monthKeys.length),
    [containerWidth, analytics.monthKeys.length]
  );

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';
  const headerBg = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.05)';

  const renderAmountCells = (amounts: number[], rowKey: string) =>
    amounts.map((amt, i) => (
      <View
        key={`${rowKey}-${analytics.monthKeys[i]}`}
        style={{
          width: monthW,
          paddingVertical: 10,
          paddingHorizontal: 4,
          paddingRight: 10,
          alignItems: 'center',
          justifyContent: 'center',
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: amt > 0 ? colors.text : colors.textMuted,
            fontVariant: ['tabular-nums'],
          }}
          numberOfLines={1}
        >
          {fmtCell(amt)}
        </Text>
      </View>
    ));

  const renderNameCell = (
    label: string,
    opts: {
      expandable?: boolean;
      expandedNow?: boolean;
      onToggle?: () => void;
      isChild?: boolean;
    }
  ) => (
    <View
      style={{
        width: catW,
        minHeight: 44,
        paddingVertical: 10,
        paddingLeft: 8,
        paddingRight: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.border,
      }}
    >
      <View style={{ width: CHEVRON_COL, alignItems: 'center', justifyContent: 'center' }}>
        {opts.expandable ? (
          <Pressable onPress={opts.onToggle} hitSlop={8} style={{ padding: 2 }}>
            <Ionicons name={opts.expandedNow ? 'chevron-down' : 'chevron-forward'} size={16} color={brand.primary} />
          </Pressable>
        ) : (
          <View style={{ width: CHEVRON_COL }} />
        )}
      </View>
      <Text
        style={[
          typography.caption,
          {
            flex: 1,
            color: colors.text,
            fontWeight: '700',
            paddingLeft: opts.isChild ? 4 : 0,
          },
        ]}
        numberOfLines={2}
      >
        {opts.isChild ? `· ${label}` : label}
      </Text>
    </View>
  );

  const tableInner = (
    <View
      style={{
        minWidth: useScroll ? tableMinW : containerWidth ?? '100%',
        width: useScroll ? undefined : containerWidth ?? '100%',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: headerBg,
        }}
      >
        <View
          style={{
            width: catW,
            paddingVertical: 10,
            paddingLeft: 8,
            paddingRight: 12,
            justifyContent: 'center',
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
        >
          <Text style={[typography.caption, { fontWeight: '800', color: colors.textMuted }]}>Категория</Text>
        </View>
        {analytics.monthLabels.map((lab, i) => (
          <View
            key={analytics.monthKeys[i]}
            style={{
              width: monthW,
              paddingVertical: 10,
              paddingHorizontal: 4,
              paddingRight: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: colors.textMuted,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {lab}
            </Text>
          </View>
        ))}
      </View>

      {roots.map((row) => {
        const isOpen = expanded.has(row.name);
        const hasKids = row.children.length > 0;
        return (
          <View key={row.name}>
            <View
              style={{
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {renderNameCell(row.name, {
                expandable: hasKids,
                expandedNow: isOpen,
                onToggle: hasKids ? () => toggle(row.name) : undefined,
                isChild: false,
              })}
              {renderAmountCells(row.rolled.amounts, `p-${row.name}`)}
            </View>
            {hasKids && isOpen
              ? row.children.map((ch) => (
                  <View
                    key={ch.category}
                    style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: isLight ? 'rgba(15,17,24,0.03)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {renderNameCell(ch.category, { isChild: true })}
                    {renderAmountCells(ch.amounts, `c-${ch.category}`)}
                  </View>
                ))
              : null}
          </View>
        );
      })}

      {extras.map((ex) => (
        <View
          key={`x-${ex.series.category}`}
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {renderNameCell(ex.series.category, {})}
          {renderAmountCells(ex.series.amounts, `x-${ex.series.category}`)}
        </View>
      ))}
    </View>
  );

  const scrollBody =
    useScroll ? (
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        {tableInner}
      </ScrollView>
    ) : (
      <View style={{ width: '100%' }}>{tableInner}</View>
    );

  if (embedded) {
    return scrollBody;
  }

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: shellBorder,
        backgroundColor: shellBg,
        overflow: 'hidden',
      }}
    >
      {scrollBody}
    </View>
  );
}
