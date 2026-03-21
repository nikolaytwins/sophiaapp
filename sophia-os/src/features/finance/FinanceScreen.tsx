import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { useAppTheme } from '@/theme';

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
}

export function FinanceScreen() {
  const { colors, typography, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const fin = useQuery({ queryKey: ['finance'], queryFn: () => repos.finance.getSummary() });

  const data = fin.data;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: spacing.lg,
        },
        bar: {
          marginTop: spacing.md,
          height: 8,
          borderRadius: 8,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        },
        barFill: {
          height: '100%',
          backgroundColor: colors.accent2,
        },
        catRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        },
        miniBar: {
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        },
        miniFill: {
          height: '100%',
          backgroundColor: colors.accent,
        },
      }),
    [colors, spacing]
  );

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={typography.caption}>Обзор</Text>
      <Text style={typography.hero}>Финансы</Text>
      <Text style={[typography.body, { marginTop: spacing.sm }]}>
        Синхронизация с веб-сервисом — через finance repository.
      </Text>

      {data ? (
        <>
          <GlassCard style={{ marginTop: spacing.xl }} glow>
            <Text style={typography.caption}>БАЛАНС</Text>
            <Text style={[typography.hero, { marginTop: spacing.sm }]}>{fmt(data.balance)}</Text>
            <View style={styles.row}>
              <View>
                <Text style={typography.caption}>Доход</Text>
                <Text style={typography.title2}>{fmt(data.monthlyIncome)}</Text>
              </View>
              <View>
                <Text style={typography.caption}>Расход</Text>
                <Text style={typography.title2}>{fmt(data.monthlyExpense)}</Text>
              </View>
            </View>
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Накопления" />
            <GlassCard>
              <Text style={typography.body}>Цель: {fmt(data.savingsGoal)}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.round(data.savingsProgress01 * 100)}%` }]} />
              </View>
              <Text style={typography.caption}>{Math.round(data.savingsProgress01 * 100)}%</Text>
            </GlassCard>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Категории" />
            <View style={{ gap: spacing.sm }}>
              {data.categories.map((c) => (
                <GlassCard key={c.id}>
                  <View style={styles.catRow}>
                    <Text style={typography.title2}>{c.label}</Text>
                    <Text style={typography.title2}>{fmt(c.amount)}</Text>
                  </View>
                  <View style={styles.miniBar}>
                    <View style={[styles.miniFill, { width: `${Math.round(c.pct * 100)}%` }]} />
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        </>
      ) : (
        <Text style={[typography.body, { marginTop: spacing.lg }]}>Загрузка…</Text>
      )}
    </ScrollView>
  );
}
