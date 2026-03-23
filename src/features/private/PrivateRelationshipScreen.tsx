import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BandLabel } from '@/entities/private/models';
import { useRelationshipDynamics } from '@/hooks/usePrivateModule';
import { privateColors, privateRadius } from '@/theme/privateTokens';

import { PrivateCard } from './components/PrivateCard';
import { PrivateQueryError } from './components/PrivateQueryError';
import { PrivateShell } from './components/PrivateShell';

function intensityRu(i: BandLabel) {
  if (i === 'low') return 'низкая';
  if (i === 'high') return 'высокая';
  return 'средняя';
}

function intensityColor(i: BandLabel) {
  if (i === 'high') return privateColors.riskHigh;
  if (i === 'medium') return privateColors.riskMid;
  return privateColors.riskLow;
}

export function PrivateRelationshipScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useRelationshipDynamics();

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
        <Text style={styles.kicker}>Динамика пары</Text>
        <Text style={styles.title}>Отношения</Text>

        <PrivateCard glow>
          <Text style={styles.headline}>{data.headline}</Text>
          <Text style={styles.forecast}>{data.forecast}</Text>
        </PrivateCard>

        <Text style={styles.section}>Что усиливает контакт</Text>
        <PrivateCard>
          {data.doList.map((line) => (
            <Text key={line} style={styles.bullet}>
              · {line}
            </Text>
          ))}
        </PrivateCard>

        <Text style={styles.section}>Что обходить</Text>
        <PrivateCard>
          {data.avoidList.map((line) => (
            <Text key={line} style={styles.bulletMuted}>
              · {line}
            </Text>
          ))}
        </PrivateCard>

        <Text style={styles.section}>Метки на линии</Text>
        <Text style={styles.hint}>Ориентиры по дням, не жёсткий сценарий.</Text>
        {data.markers.map((m) => (
          <View key={`${m.date}-${m.label}`} style={styles.markerRow}>
            <View style={[styles.markerDot, { backgroundColor: intensityColor(m.intensity) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.markerDate}>{m.date}</Text>
              <Text style={styles.markerLabel}>{m.label}</Text>
              <Text style={styles.markerInt}>Интенсивность: {intensityRu(m.intensity)}</Text>
            </View>
          </View>
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
    marginBottom: 18,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: privateColors.text,
    lineHeight: 24,
  },
  forecast: {
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
    marginTop: 22,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: privateColors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
  },
  bullet: { fontSize: 14, color: privateColors.textSecondary, marginTop: 6, lineHeight: 20 },
  bulletMuted: { fontSize: 13, color: privateColors.textMuted, marginTop: 6, lineHeight: 19 },
  markerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: privateRadius.md,
    borderWidth: 1,
    borderColor: privateColors.border,
    backgroundColor: privateColors.surface,
    marginBottom: 10,
  },
  markerDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  markerDate: { fontSize: 12, color: privateColors.textMuted },
  markerLabel: { fontSize: 15, fontWeight: '600', color: privateColors.text, marginTop: 4 },
  markerInt: { fontSize: 12, color: privateColors.textSecondary, marginTop: 6 },
});
