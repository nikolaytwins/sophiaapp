import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { privateColors } from '@/theme/privateTokens';

type Props = { value100: number; size?: number };

export function PrivateHeroRing({ value100, size = 140 }: Props) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value100)) / 100;
  const dash = c * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={privateColors.borderStrong} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={privateColors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={styles.val}>{value100}</Text>
          <Text style={styles.sub}>score</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  val: {
    fontSize: 38,
    fontWeight: '700',
    color: privateColors.text,
    letterSpacing: -1,
  },
  sub: {
    fontSize: 11,
    color: privateColors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
