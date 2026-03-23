import { memo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { PeriodForecastPoint } from '@/entities/private/models';
import { privateColors } from '@/theme/privateTokens';

const W = Math.min(Dimensions.get('window').width - 72, 340);
const H = 140;
const PAD = 12;

type SeriesKey = 'sensualEnergy' | 'flirtOpenness' | 'impulseRisk' | 'relationshipTension';

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'sensualEnergy', label: 'Энергия', color: privateColors.rose },
  { key: 'flirtOpenness', label: 'Флирт', color: privateColors.accent },
  { key: 'impulseRisk', label: 'Импульс', color: privateColors.riskMid },
  { key: 'relationshipTension', label: 'Тон', color: privateColors.burgundy },
];

function buildPath(points: PeriodForecastPoint[], key: SeriesKey): string {
  if (points.length === 0) return '';
  const xs = points.map((_, i) => PAD + (i / Math.max(1, points.length - 1)) * (W - 2 * PAD));
  const vals = points.map((p) => p[key]);
  const min = 0;
  const max = 100;
  const ys = vals.map((v) => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD));
  return xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ');
}

function PrivateMultiLineChartInner({ points }: { points: PeriodForecastPoint[] }) {
  if (points.length === 0) {
    return <Text style={styles.empty}>Нет точек для графика</Text>;
  }

  return (
    <View>
      <Svg width={W} height={H}>
        {SERIES.map((s) => (
          <Path
            key={s.key}
            d={buildPath(points, s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeOpacity={0.85}
          />
        ))}
      </Svg>
      <View style={styles.legend}>
        {SERIES.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendTxt}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const PrivateMultiLineChart = memo(PrivateMultiLineChartInner);

const styles = StyleSheet.create({
  empty: { color: privateColors.textMuted, fontSize: 13 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: privateColors.textMuted, fontSize: 11 },
});
