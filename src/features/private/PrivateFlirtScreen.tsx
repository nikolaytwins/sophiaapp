import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BandLabel, ConfidenceLevel } from '@/entities/private/models';
import { useFlirtWindows } from '@/hooks/usePrivateModule';
import { privateColors } from '@/theme/privateTokens';

import { PrivateCard } from './components/PrivateCard';
import { PrivateQueryError } from './components/PrivateQueryError';
import { PrivateShell } from './components/PrivateShell';

function bandRu(b: BandLabel) {
  if (b === 'low') return 'низкая';
  if (b === 'high') return 'высокая';
  return 'средняя';
}

function confRu(c: ConfidenceLevel) {
  const map: Record<ConfidenceLevel, string> = {
    very_low: 'очень низкая',
    low: 'низкая',
    medium: 'средняя',
    high: 'высокая',
  };
  return map[c];
}

function formatWindow(start: string, end: string) {
  try {
    const a = new Date(start);
    const b = new Date(end);
    const tf = { hour: '2-digit', minute: '2-digit' } as const;
    return `${a.toLocaleTimeString('ru-RU', tf)} — ${b.toLocaleTimeString('ru-RU', tf)}`;
  } catch {
    return '';
  }
}

export function PrivateFlirtScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useFlirtWindows();

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
        <Text style={styles.kicker}>Социальная химия</Text>
        <Text style={styles.title}>Окна флирта</Text>
        <Text style={styles.headline}>{data.headline}</Text>
        <Text style={styles.timelineNote}>{data.timelineNote}</Text>

        {data.windows.map((w) => (
          <PrivateCard key={w.id} glow>
            <Text style={styles.winTitle}>{w.label}</Text>
            <Text style={styles.winTime}>{formatWindow(w.windowStart, w.windowEnd)}</Text>
            <Text style={styles.meta}>
              Открытость: {bandRu(w.openness)} · уверенность: {confRu(w.confidence)}
            </Text>
            <Text style={styles.body}>{w.charismaHint}</Text>
            <Text style={styles.bodyMuted}>{w.suggestion}</Text>
          </PrivateCard>
        ))}

        <Text style={styles.section}>На практике</Text>
        <PrivateCard>
          {data.practical.map((line) => (
            <Text key={line} style={styles.bullet}>
              · {line}
            </Text>
          ))}
        </PrivateCard>
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
  headline: {
    fontSize: 17,
    fontWeight: '600',
    color: privateColors.accent,
    marginTop: 14,
    lineHeight: 24,
  },
  timelineNote: {
    fontSize: 12,
    color: privateColors.textMuted,
    marginTop: 10,
    lineHeight: 17,
  },
  winTitle: { fontSize: 16, fontWeight: '700', color: privateColors.text },
  winTime: { fontSize: 12, color: privateColors.textMuted, marginTop: 8 },
  meta: { fontSize: 12, color: privateColors.rose, marginTop: 10 },
  body: { fontSize: 14, color: privateColors.textSecondary, marginTop: 10, lineHeight: 21 },
  bodyMuted: { fontSize: 13, color: privateColors.textMuted, marginTop: 8, lineHeight: 18 },
  section: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  bullet: { fontSize: 14, color: privateColors.textSecondary, marginTop: 6, lineHeight: 20 },
});
