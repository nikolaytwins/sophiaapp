import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { FinanceCategoryMonthSeries, FinanceExpenseAnalytics } from '@/features/finance/financeApi';
import { useAppTheme } from '@/theme';

const CAT_COL_W = 108;
const MONTH_COL_W = 56;

function fmtCell(n: number) {
  if (n <= 0) return '—';
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ');
}

function buildOrderedRows(
  analytics: FinanceExpenseAnalytics,
  budgetCategoryTitles: string[]
): FinanceCategoryMonthSeries[] {
  const byCat = new Map(analytics.categorySeries.map((s) => [s.category, s]));
  const used = new Set<string>();
  const len = analytics.monthKeys.length;
  const zeros = (): number[] => new Array(len).fill(0);
  const out: FinanceCategoryMonthSeries[] = [];
  for (const t of budgetCategoryTitles) {
    const s = byCat.get(t);
    if (s) {
      out.push(s);
      used.add(t);
    } else {
      out.push({ category: t, amounts: zeros(), total: 0 });
    }
  }
  for (const s of analytics.categorySeries) {
    if (!used.has(s.category)) out.push(s);
  }
  return out;
}

type Props = {
  analytics: FinanceExpenseAnalytics;
  budgetCategoryTitles: string[];
};

export function FinanceCategoryMonthMatrix({ analytics, budgetCategoryTitles }: Props) {
  const { colors, typography, radius, spacing, isLight } = useAppTheme();
  const rows = useMemo(
    () => buildOrderedRows(analytics, budgetCategoryTitles),
    [analytics, budgetCategoryTitles]
  );
  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';
  const headerBg = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.05)';

  return (
    <View
      style={{
        marginBottom: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: shellBorder,
        backgroundColor: shellBg,
        overflow: 'hidden',
      }}
    >
      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            marginBottom: spacing.xs,
          },
        ]}
      >
        Расходы по месяцам
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: colors.textMuted,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.sm,
            fontSize: 13,
            lineHeight: 18,
          },
        ]}
      >
        Сравнение категорий за 12 месяцев (₽). Сначала категории из бюджета.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <View style={{ minWidth: CAT_COL_W + analytics.monthLabels.length * MONTH_COL_W }}>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: headerBg,
            }}
          >
            <View style={{ width: CAT_COL_W, paddingVertical: 10, paddingHorizontal: 10, justifyContent: 'center' }}>
              <Text style={[typography.caption, { fontWeight: '800', color: colors.textMuted }]}>Категория</Text>
            </View>
            {analytics.monthLabels.map((lab, i) => (
              <View
                key={analytics.monthKeys[i]}
                style={{
                  width: MONTH_COL_W,
                  paddingVertical: 10,
                  paddingHorizontal: 4,
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

          {rows.map((row) => (
            <View
              key={row.category}
              style={{
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: CAT_COL_W,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  justifyContent: 'center',
                }}
              >
                <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>
                  {row.category}
                </Text>
              </View>
              {row.amounts.map((amt, i) => (
                <View
                  key={`${row.category}-${analytics.monthKeys[i]}`}
                  style={{
                    width: MONTH_COL_W,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
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
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
