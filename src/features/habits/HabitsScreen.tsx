import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { MetricTile } from '@/shared/ui/MetricTile';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { useAppTheme } from '@/theme';

export function HabitsScreen() {
  const { colors, typography, spacing, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => repos.habits.list() });
  const health = useQuery({
    queryKey: ['health', 'today'],
    queryFn: () => repos.health.getSnapshot(new Date().toISOString().slice(0, 10)),
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        icon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        check: {
          width: 36,
          height: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkOn: {
          backgroundColor: colors.success,
          borderColor: colors.success,
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
      <Text style={typography.caption}>Ритм</Text>
      <Text style={typography.hero}>Привычки</Text>
      <Text style={[typography.body, { marginTop: spacing.sm }]}>
        Ручной ввод, AI и Health — подключим к одному слою данных.
      </Text>

      <View style={{ marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <MetricTile
            icon="walk-outline"
            title="Шаги"
            value={`${health.data?.steps ?? '—'}`}
            progress01={
              health.data ? Math.min(1, health.data.steps / health.data.stepsGoal) : undefined
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricTile icon="flame-outline" title="Ккал" value={`${health.data?.calories ?? '—'}`} />
        </View>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader title="Сегодня" />
        <View style={{ gap: spacing.sm }}>
          {(habits.data ?? []).map((h) => (
            <GlassCard key={h.id}>
              <View style={styles.habitRow}>
                <View style={styles.icon}>
                  <Ionicons
                    name={h.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.title2}>{h.name}</Text>
                  <Text style={typography.caption}>streak {h.streak} дней</Text>
                </View>
                <View style={[styles.check, h.todayDone && styles.checkOn]}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={h.todayDone ? (isLight ? '#FFFFFF' : '#0A0B0F') : colors.textMuted}
                  />
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
