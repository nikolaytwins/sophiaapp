import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { loadFinanceExpenseAnalytics } from '@/features/finance/financeApi';
import { financeExpenseAnalyticsKey } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

const CHART_HEIGHT = 152;
const BAR_PURPLE: [string, string] = ['#FB7185', '#BE123C'];
const ACCENT = '#A855F7';

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type Props = {
  userId: string | null;
};

export function FinanceAnalyticsTabPanel({ userId }: Props) {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const supabaseOn = useSupabaseConfigured;

  const q = useQuery({
    queryKey: financeExpenseAnalyticsKey(userId),
    queryFn: () => loadFinanceExpenseAnalytics(userId!),
    enabled: Boolean(supabaseOn && userId),
  });

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';
  const trackBg = 'rgba(255,255,255,0.08)';

  const analytics = q.data;
  const n = analytics?.monthlyExpenseTotal.length ?? 0;
  const lastIdx = n > 0 ? n - 1 : -1;
  const prevIdx = lastIdx > 0 ? lastIdx - 1 : -1;
  const curTotal = lastIdx >= 0 ? (analytics!.monthlyExpenseTotal[lastIdx] ?? 0) : 0;
  const prevTotal = prevIdx >= 0 ? (analytics!.monthlyExpenseTotal[prevIdx] ?? 0) : 0;
  const delta = curTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? Math.round((delta / prevTotal) * 100) : null;

  const yMax = analytics ? Math.max(1, ...analytics.monthlyExpenseTotal.map((v) => v)) : 1;
  const top5 =
    analytics && lastIdx >= 0
      ? analytics.categorySeries
          .map((s) => ({ category: s.category, amount: s.amounts[lastIdx] ?? 0 }))
          .filter((x) => x.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
      : [];
  const top5max = top5.length ? Math.max(...top5.map((x) => x.amount)) : 1;

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

  if (q.isLoading) {
    return <ActivityIndicator color={brand.primary} style={{ marginTop: spacing.xl }} />;
  }

  if (q.isError || !analytics) {
    return (
      <Text style={{ marginTop: spacing.lg, color: colors.danger }}>
        Не удалось загрузить аналитику расходов.
      </Text>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.md,
          backgroundColor: shellBg,
          borderWidth: 1,
          borderColor: shellBorder,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: 'rgba(196,181,253,0.85)',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
            },
          ]}
        >
          Расходы по месяцам
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 }]}>
          Сумма всех расходов за календарный месяц (12 мес.).
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, paddingTop: 8, gap: 4 }}>
          {analytics.monthLabels.map((lab, j) => {
            const v = analytics.monthlyExpenseTotal[j] ?? 0;
            const hRatio = yMax > 0 ? v / yMax : 0;
            const fillH = Math.max(hRatio * 100, v > 0 ? 6 : 0);
            return (
              <View key={analytics.monthKeys[j]} style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
                <View
                  style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: 22,
                    justifyContent: 'flex-end',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      borderRadius: 999,
                      backgroundColor: trackBg,
                      overflow: 'hidden',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <LinearGradient
                      colors={BAR_PURPLE}
                      start={{ x: 0.5, y: 1 }}
                      end={{ x: 0.5, y: 0 }}
                      style={{
                        width: '100%',
                        height: `${fillH}%`,
                        minHeight: v > 0 ? 4 : 0,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 9,
                    fontWeight: '700',
                    color: colors.textMuted,
                    textTransform: 'lowercase',
                  }}
                  numberOfLines={1}
                >
                  {lab}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View
        style={{
          borderRadius: radius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: shellBorder,
          backgroundColor: shellBg,
        }}
      >
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing.sm }]}>
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
                  backgroundColor: delta <= 0 ? 'rgba(74,222,128,0.14)' : 'rgba(251,113,133,0.14)',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: delta <= 0 ? '#4ADE80' : '#FB7185',
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
            { color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
          ]}
        >
          Топ категорий (этот месяц)
        </Text>
        {top5.length === 0 ? (
          <Text style={{ color: colors.textMuted, lineHeight: 20 }}>В этом месяце расходов по категориям нет.</Text>
        ) : (
          top5.map((row) => {
            const w = top5max > 0 ? Math.round((row.amount / top5max) * 100) : 0;
            return (
              <View key={row.category} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text
                    style={[typography.caption, { color: colors.text, fontWeight: '700', flex: 1, paddingRight: 8 }]}
                    numberOfLines={1}
                  >
                    {row.category}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
                    {fmtMoney(row.amount)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 8,
                    backgroundColor: trackBg,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${w}%`,
                      height: '100%',
                      borderRadius: 8,
                      backgroundColor: ACCENT,
                    }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

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
          <Text style={{ fontWeight: '800', color: brand.primary }}>Открыть финансы</Text>
          <Ionicons name="chevron-forward" size={18} color={brand.primary} />
        </Pressable>
      </Link>
    </View>
  );
}
