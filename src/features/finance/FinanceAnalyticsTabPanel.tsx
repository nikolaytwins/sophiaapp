import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { type Href, Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { FinanceCategoryExpenseTableBlock } from '@/features/finance/FinanceCategoryExpenseTableBlock';
import type { DonutSegment } from '@/features/finance/FinanceExpenseDonut';
import { FinanceExpenseDonut } from '@/features/finance/FinanceExpenseDonut';
import { FinanceMonthBarChart } from '@/features/finance/FinanceMonthBarChart';
import { FinancePremiumChart } from '@/features/finance/FinancePremiumChart';
import {
  loadFinanceExpenseAnalytics,
  loadFinanceOverview,
  type FinanceExpenseAnalytics,
} from '@/features/finance/financeApi';
import type { FinanceExpenseCategory } from '@/features/finance/finance.types';
import { rollupExpenseCategoryToRootName } from '@/features/finance/financeBudgetTree';
import { FINANCE_QUERY_KEY, financeExpenseAnalyticsKey } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

const DONUT_MUTED: string[] = [
  'rgba(139,92,246,0.55)',
  'rgba(99,102,241,0.5)',
  'rgba(129,140,248,0.48)',
  'rgba(94,129,172,0.5)',
  'rgba(100,116,139,0.45)',
  'rgba(120,113,108,0.48)',
  'rgba(107,114,128,0.45)',
];

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type Props = {
  userId: string | null;
};

function buildDonutForMonth(
  analytics: FinanceExpenseAnalytics,
  expenseCategories: FinanceExpenseCategory[],
  monthIdx: number
): DonutSegment[] {
  const rolled = new Map<string, number>();
  for (const s of analytics.categorySeries) {
    const v = s.amounts[monthIdx] ?? 0;
    if (v <= 0) continue;
    const root =
      expenseCategories.length > 0 ? rollupExpenseCategoryToRootName(expenseCategories, s.category) : s.category.trim();
    rolled.set(root, (rolled.get(root) ?? 0) + v);
  }
  const rows = [...rolled.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const top = rows.slice(0, 6);
  const restSum = rows.slice(6).reduce((a, r) => a + r.value, 0);
  const out: DonutSegment[] = top.map((r, i) => ({
    label: r.label,
    value: r.value,
    color: DONUT_MUTED[i % DONUT_MUTED.length]!,
  }));
  if (restSum > 0) {
    out.push({
      label: 'Прочее',
      value: restSum,
      color: DONUT_MUTED[out.length % DONUT_MUTED.length]!,
    });
  }
  return out;
}

/**
 * Вкладка «Финансы» на экране аналитики привычек: те же графики и таблица, что в разделе «Финансы».
 */
export function FinanceAnalyticsTabPanel({ userId }: Props) {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const router = useRouter();
  const supabaseOn = useSupabaseConfigured;

  const analyticsQ = useQuery({
    queryKey: financeExpenseAnalyticsKey(userId),
    queryFn: () => loadFinanceExpenseAnalytics(userId!),
    enabled: Boolean(supabaseOn && userId),
  });

  const overviewQ = useQuery({
    queryKey: [...FINANCE_QUERY_KEY, 'overview', userId],
    queryFn: () => loadFinanceOverview(userId!),
    enabled: Boolean(supabaseOn && userId),
  });

  const [donutMonthIdx, setDonutMonthIdx] = useState(-1);

  const analytics = analyticsQ.data;
  const overview = overviewQ.data;

  const monthCount = analytics?.monthKeys.length ?? 0;
  const donutIdx = useMemo(() => {
    if (monthCount === 0) return 0;
    if (donutMonthIdx < 0) return monthCount - 1;
    return Math.min(Math.max(0, donutMonthIdx), monthCount - 1);
  }, [monthCount, donutMonthIdx]);

  const donutSegments = useMemo(() => {
    if (!analytics || !overview?.expenseCategories) return [];
    return buildDonutForMonth(analytics, overview.expenseCategories, donutIdx);
  }, [analytics, overview?.expenseCategories, donutIdx]);

  const donutLabel = analytics?.monthLabels?.[donutIdx] ?? '';

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';

  const lastIdx = monthCount > 0 ? monthCount - 1 : -1;
  const prevIdx = lastIdx > 0 ? lastIdx - 1 : -1;
  const curTotal = lastIdx >= 0 && analytics ? (analytics.monthlyExpenseTotal[lastIdx] ?? 0) : 0;
  const prevTotal = prevIdx >= 0 && analytics ? (analytics.monthlyExpenseTotal[prevIdx] ?? 0) : 0;
  const delta = curTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? Math.round((delta / prevTotal) * 100) : null;

  if (!supabaseOn || !userId) {
    return (
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
          Подключи облако и войди, чтобы видеть финансовую аналитику.
        </Text>
        <Link href={'/cloud' as Href} asChild>
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
    );
  }

  if (analyticsQ.isLoading || overviewQ.isLoading) {
    return <ActivityIndicator color={brand.primary} style={{ marginTop: spacing.xl }} />;
  }

  if (analyticsQ.isError || !analytics) {
    return (
      <Text style={{ marginTop: spacing.lg, color: colors.danger }}>
        Не удалось загрузить аналитику расходов.
      </Text>
    );
  }

  if (overviewQ.isError || !overview) {
    return (
      <Text style={{ marginTop: spacing.lg, color: colors.danger }}>
        Не удалось загрузить категории и бюджет для графиков.
      </Text>
    );
  }

  return (
    <ScrollView
      style={{ marginTop: spacing.md }}
      contentContainerStyle={{ paddingBottom: spacing.xl * 2, gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: shellBorder,
          backgroundColor: shellBg,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
              fontWeight: '800',
            },
          ]}
        >
          Текущий месяц
        </Text>
        <Text style={[typography.hero, { fontSize: 28, color: colors.text, fontVariant: ['tabular-nums'] }]}>
          {fmtMoney(curTotal)}
        </Text>
        {prevIdx >= 0 ? (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              к прошлому: {delta >= 0 ? '+' : '−'}
              {fmtMoney(Math.abs(delta))}
            </Text>
            {deltaPct != null ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: delta <= 0 ? 'rgba(110,160,130,0.95)' : 'rgba(196,150,130,0.95)',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {delta >= 0 ? '+' : ''}
                  {deltaPct}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: shellBorder,
          backgroundColor: shellBg,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
              fontWeight: '800',
            },
          ]}
        >
          Расходы по месяцам
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 }]}>
          Сумма расходов за календарный месяц (как на дашборде финансов).
        </Text>
        <FinanceMonthBarChart
          values={analytics.monthlyExpenseTotal}
          labels={analytics.monthLabels}
          height={176}
          isLight={isLight}
        />
      </View>

      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: shellBorder,
          backgroundColor: shellBg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontWeight: '800',
              },
            ]}
          >
            Структура расходов
          </Text>
          {monthCount > 1 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={() => setDonutMonthIdx((i) => Math.max(0, (i < 0 ? monthCount - 1 : i) - 1))}
                disabled={donutIdx <= 0}
                hitSlop={8}
                style={{ opacity: donutIdx <= 0 ? 0.35 : 1, padding: 6 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
              </Pressable>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, minWidth: 56, textAlign: 'center' }}>
                {donutLabel}
              </Text>
              <Pressable
                onPress={() => setDonutMonthIdx((i) => Math.min(monthCount - 1, (i < 0 ? monthCount - 1 : i) + 1))}
                disabled={donutIdx >= monthCount - 1}
                hitSlop={8}
                style={{ opacity: donutIdx >= monthCount - 1 ? 0.35 : 1, padding: 6 }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{donutLabel}</Text>
          )}
        </View>
        {donutSegments.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Нет расходов за этот месяц.</Text>
        ) : (
          <FinanceExpenseDonut segments={donutSegments} height={220} isLight={isLight} />
        )}
      </View>

      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: shellBorder,
          backgroundColor: shellBg,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
              fontWeight: '800',
            },
          ]}
        >
          Динамика суммы (линия)
        </Text>
        <View style={{ width: '100%', minHeight: 200, alignItems: 'stretch' }}>
          <FinancePremiumChart
            values={analytics.monthlyExpenseTotal}
            labels={analytics.monthLabels}
            color={brand.primary}
            height={200}
            isLight={isLight}
          />
        </View>
      </View>

      <FinanceCategoryExpenseTableBlock
        overview={overview}
        analytics={analytics}
        loading={false}
        error={false}
        onOpenSettings={() => router.push('/finance')}
      />

      <Link href={'/finance' as Href} asChild>
        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.45)',
            backgroundColor: 'rgba(168,85,247,0.12)',
          }}
        >
          <Text style={{ fontWeight: '800', color: brand.primary }}>Открыть раздел «Финансы»</Text>
          <Ionicons name="chevron-forward" size={18} color={brand.primary} />
        </Pressable>
      </Link>
    </ScrollView>
  );
}
