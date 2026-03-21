import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ForecastPeriodKind } from '@/entities/private/models';
import { usePrivatePeriod } from '@/hooks/usePrivateModule';
import { privateColors, privateRadius } from '@/theme/privateTokens';

import { PrivateCard } from './components/PrivateCard';
import { PrivateMultiLineChart } from './components/PrivateMultiLineChart';
import { PrivateQueryError } from './components/PrivateQueryError';
import { PrivateShell } from './components/PrivateShell';

const KINDS: { k: ForecastPeriodKind; label: string }[] = [
  { k: 'day', label: 'День' },
  { k: 'three_days', label: '3 дня' },
  { k: 'week', label: 'Неделя' },
  { k: 'month', label: 'Месяц' },
  { k: 'season', label: 'Сезон' },
];

export function PrivatePeriodsScreen() {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<ForecastPeriodKind>('week');
  const { data, isLoading, isError, error, refetch } = usePrivatePeriod(kind);

  if (isError) {
    return (
      <PrivateQueryError
        message={error instanceof Error ? error.message : String(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <PrivateShell>
        <View style={[styles.loader, { paddingTop: insets.top }]}>
          <ActivityIndicator color={privateColors.accent} />
        </View>
      </PrivateShell>
    );
  }

  return (
    <PrivateShell>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Навигатор периодов</Text>
        <Text style={styles.title}>Периоды</Text>
        <Text style={styles.lead}>
          Кривые — ориентир по транзитам и слою интерпретации, не календарь судьбы.
        </Text>

        <View style={styles.segmentRow}>
          {KINDS.map(({ k, label }) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.segment, kind === k && styles.segmentActive]}
            >
              <Text style={[styles.segmentTxt, kind === k && styles.segmentTxtActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <PrivateCard glow style={styles.themeCard}>
          <Text style={styles.themeLabel}>Тема</Text>
          <Text style={styles.themeTitle}>{data.theme}</Text>
          <Text style={styles.narrative}>{data.narrative}</Text>
        </PrivateCard>

        <Text style={styles.section}>Динамика</Text>
        <PrivateCard>
          <PrivateMultiLineChart points={data.points} />
        </PrivateCard>

        <Text style={styles.section}>Акценты</Text>
        {data.highlights.map((h) => (
          <PrivateCard key={`${h.from}-${h.to}`} style={styles.highlightCard}>
            <Text style={styles.hlLabel}>{h.label}</Text>
            <Text style={styles.hlDates}>
              {h.from} — {h.to}
            </Text>
            <Text style={styles.hlNote}>{h.note}</Text>
          </PrivateCard>
        ))}
      </ScrollView>
    </PrivateShell>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: privateColors.text,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  lead: {
    fontSize: 13,
    color: privateColors.textSecondary,
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: privateRadius.md,
    borderWidth: 1,
    borderColor: privateColors.borderStrong,
    backgroundColor: privateColors.surface,
  },
  segmentActive: {
    borderColor: privateColors.accent,
    backgroundColor: privateColors.accentSoft,
  },
  segmentTxt: { fontSize: 12, color: privateColors.textMuted, fontWeight: '600' },
  segmentTxtActive: { color: privateColors.accent },
  themeCard: { marginTop: 18 },
  themeLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
  },
  themeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: privateColors.text,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  narrative: {
    fontSize: 14,
    color: privateColors.textSecondary,
    lineHeight: 21,
    marginTop: 12,
  },
  section: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },
  highlightCard: { marginBottom: 10 },
  hlLabel: { fontSize: 15, fontWeight: '600', color: privateColors.accent },
  hlDates: { fontSize: 12, color: privateColors.textMuted, marginTop: 6 },
  hlNote: { fontSize: 14, color: privateColors.textSecondary, marginTop: 10, lineHeight: 20 },
});
