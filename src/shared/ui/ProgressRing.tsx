import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/theme';

type Props = {
  value01: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  labelFontSize?: number;
  /** Фон кольца (по умолчанию из темы — на экранах «Ритм» задавайте нейтральный тёмный трек). */
  trackColor?: string;
  /** Дуга прогресса (по умолчанию accent темы). */
  progressColor?: string;
  /** Подпись под числом, напр. «%». */
  sublabelColor?: string;
};

export function ProgressRing({
  value01,
  size = 132,
  stroke = 10,
  label,
  sublabel,
  labelFontSize,
  trackColor,
  progressColor,
  sublabelColor,
}: Props) {
  const { colors, typography } = useAppTheme();
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value01));
  const dash = circumference * (1 - clamped);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          ...typography.hero,
          fontSize: labelFontSize ?? 36,
          color: colors.text,
        },
        sub: {
          ...typography.caption,
          marginTop: 2,
          color: sublabelColor ?? colors.textMuted,
        },
      }),
    [colors, labelFontSize, sublabelColor, typography]
  );

  const track = trackColor ?? colors.borderStrong;
  const arc = progressColor ?? colors.accent;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={arc}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {sublabel ? <Text style={styles.sub}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}
