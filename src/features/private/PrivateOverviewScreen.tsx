import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BandLabel, ConfidenceLevel, PrivateMetric, RiskFlag } from '@/entities/private/models';
import { usePrivateOverview } from '@/hooks/usePrivateModule';
import { privateColors, privateRadius } from '@/theme/privateTokens';

import { PrivateCard } from './components/PrivateCard';
import { PrivateHeroRing } from './components/PrivateHeroRing';
import { PrivateQueryError } from './components/PrivateQueryError';

function bandRu(b: BandLabel) {
  if (b === 'low') return 'низкий';
  if (b === 'high') return 'высокий';
  return 'средний';
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

function riskColor(s: BandLabel) {
  if (s === 'high') return privateColors.riskHigh;
  if (s === 'medium') return privateColors.riskMid;
  return privateColors.riskLow;
}

function MetricBlock({ m }: { m: PrivateMetric }) {
  return (
    <PrivateCard style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{m.labelRu}</Text>
        <Text style={styles.metricVal}>{m.value}%</Text>
      </View>
      <Text style={styles.metricBand}>
        Уровень: {bandRu(m.band)} · уверенность: {confRu(m.confidence)}
      </Text>
      <Text style={styles.metricDesc}>{m.description}</Text>
      {m.isPlayfulEstimate ? (
        <Text style={styles.spec}>{m.speculativeNote}</Text>
      ) : null}
      {m.isPlayfulEstimate ? (
        <Text style={styles.disclaimer}>
          Прогноз открытости и контекста, не гарантия события. Навигатор, не приговор.
        </Text>
      ) : null}
    </PrivateCard>
  );
}

function RiskPill({ r }: { r: RiskFlag }) {
  return (
    <View style={[styles.riskPill, { borderColor: riskColor(r.severity) }]}>
      <View style={[styles.riskDot, { backgroundColor: riskColor(r.severity) }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.riskTitle}>{r.title}</Text>
        <Text style={styles.riskDetail}>{r.detail}</Text>
      </View>
    </View>
  );
}

export function PrivateOverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePrivateOverview();

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
      <LinearGradient colors={[privateColors.bg, privateColors.plumDeep]} style={styles.grad}>
        <View style={[styles.loader, { paddingTop: insets.top }]}>
          <ActivityIndicator color={privateColors.accent} />
        </View>
      </LinearGradient>
    );
  }

  const { sensualScore, metrics, tonight, risks, relationshipTone, socialWindows } = data;

  return (
    <LinearGradient colors={[privateColors.bg, privateColors.graphite, privateColors.plumDeep]} style={styles.grad}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backLink}>← Назад</Text>
        </Pressable>
        <Text style={styles.kicker}>After Dark · приватный режим</Text>
        <Text style={styles.liveHint}>Данные: транзиты (PyEphem) · без моков</Text>
        <Text style={styles.title}>Tonight</Text>

        <PrivateCard glow style={styles.hero}>
          <View style={styles.heroRow}>
            <PrivateHeroRing value100={sensualScore.value100} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.heroHead}>{sensualScore.headline}</Text>
              <Text style={styles.heroText}>{sensualScore.interpretation}</Text>
            </View>
          </View>
        </PrivateCard>

        <Text style={styles.section}>Индексы дня</Text>
        <View style={{ gap: 10 }}>
          {metrics.map((m) => (
            <MetricBlock key={m.id} m={m} />
          ))}
        </View>

        <Text style={styles.section}>Что лучше сегодня</Text>
        <PrivateCard>
          <Text style={styles.tone}>{tonight.tone}</Text>
          {tonight.do.map((x) => (
            <Text key={x} style={styles.bullet}>
              · {x}
            </Text>
          ))}
          <Text style={[styles.sectionMini, { marginTop: 12 }]}>Осторожнее</Text>
          {tonight.avoid.map((x) => (
            <Text key={x} style={styles.bulletMuted}>
              · {x}
            </Text>
          ))}
        </PrivateCard>

        <Text style={styles.section}>Зоны риска</Text>
        <View style={{ gap: 10 }}>
          {risks.map((r) => (
            <RiskPill key={r.id} r={r} />
          ))}
        </View>

        <Text style={styles.section}>Тон отношений</Text>
        <PrivateCard>
          <Text style={styles.body}>{relationshipTone.summary}</Text>
          <Text style={styles.meta}>
            Разговор о чувствах: {relationshipTone.betterForFeelingsTalk ? 'да' : 'подождать'} · Избегать
            конфликта: {relationshipTone.avoidConflict ? 'желательно' : 'можно аккуратно'}
          </Text>
          <Text style={styles.meta}>
            Свобода {bandRu(relationshipTone.freedomNeed)} · Близость{' '}
            {bandRu(relationshipTone.closenessNeed)} · Отражение {bandRu(relationshipTone.validationNeed)}
          </Text>
          <Text style={styles.bodyMuted}>{relationshipTone.tensionNote}</Text>
        </PrivateCard>

        <Text style={styles.section}>Социальные окна</Text>
        {socialWindows.map((w) => (
          <PrivateCard key={w.id}>
            <Text style={styles.cardTitle}>{w.label}</Text>
            <Text style={styles.body}>{w.charismaHint}</Text>
            <Text style={styles.bodyMuted}>{w.suggestion}</Text>
          </PrivateCard>
        ))}

        <Text style={styles.section}>Разделы</Text>
        <View style={styles.navGrid}>
          <Pressable style={styles.navBtn} onPress={() => router.push('/(private)/periods')}>
            <Text style={styles.navBtnText}>Периоды</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push('/(private)/relationships')}>
            <Text style={styles.navBtnText}>Отношения</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push('/(private)/flirt')}>
            <Text style={styles.navBtnText}>Флирт</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push('/(private)/chat')}>
            <Text style={styles.navBtnText}>София</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backRow: { alignSelf: 'flex-start', marginBottom: 10 },
  backLink: { fontSize: 14, fontWeight: '600', color: privateColors.accent },
  liveHint: {
    fontSize: 11,
    color: privateColors.accent,
    marginTop: 6,
    letterSpacing: 0.4,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: privateColors.text,
    letterSpacing: -0.8,
    marginTop: 6,
    marginBottom: 16,
  },
  hero: { marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroHead: {
    fontSize: 15,
    fontWeight: '600',
    color: privateColors.accent,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  heroText: { fontSize: 14, lineHeight: 20, color: privateColors.textSecondary },
  section: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: privateColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 26,
    marginBottom: 10,
  },
  sectionMini: {
    fontSize: 12,
    fontWeight: '600',
    color: privateColors.rose,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricCard: { marginBottom: 0 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metricLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: privateColors.text,
    paddingRight: 8,
  },
  metricVal: { fontSize: 20, fontWeight: '700', color: privateColors.accent },
  metricBand: { fontSize: 11, color: privateColors.textMuted, marginTop: 6 },
  metricDesc: { fontSize: 13, color: privateColors.textSecondary, marginTop: 10, lineHeight: 19 },
  spec: { fontSize: 12, color: privateColors.accent, marginTop: 10, lineHeight: 18 },
  disclaimer: { fontSize: 11, color: privateColors.textMuted, marginTop: 8, lineHeight: 16 },
  tone: { fontSize: 15, fontWeight: '600', color: privateColors.text, marginBottom: 10 },
  bullet: { fontSize: 14, color: privateColors.textSecondary, marginTop: 4, lineHeight: 20 },
  bulletMuted: { fontSize: 13, color: privateColors.textMuted, marginTop: 4, lineHeight: 19 },
  riskPill: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: privateRadius.md,
    borderWidth: 1,
    backgroundColor: privateColors.surface,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  riskTitle: { fontSize: 14, fontWeight: '600', color: privateColors.text },
  riskDetail: { fontSize: 12, color: privateColors.textSecondary, marginTop: 4, lineHeight: 17 },
  body: { fontSize: 14, color: privateColors.textSecondary, lineHeight: 21 },
  bodyMuted: { fontSize: 13, color: privateColors.textMuted, marginTop: 10, lineHeight: 19 },
  meta: { fontSize: 12, color: privateColors.textMuted, marginTop: 10, lineHeight: 17 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: privateColors.text, marginBottom: 8 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  navBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: privateRadius.md,
    borderWidth: 1,
    borderColor: privateColors.borderStrong,
    backgroundColor: privateColors.surface,
  },
  navBtnText: { fontSize: 14, color: privateColors.accent, fontWeight: '600' },
});
