import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { GlassCard } from './GlassCard';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  hint?: string;
  progress01?: number;
  onPress?: () => void;
};

export function MetricTile({ icon, title, value, hint, progress01, onPress }: Props) {
  const { colors, typography, radius, spacing } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        row: { flexDirection: 'row', gap: spacing.md },
        iconWrap: {
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: colors.accent2Soft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        value: {
          ...typography.title1,
          fontSize: 26,
          marginTop: 4,
        },
        barTrack: {
          marginTop: spacing.sm,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        },
        barFill: {
          height: '100%',
          backgroundColor: colors.accent2,
        },
      }),
    [colors, typography, radius, spacing]
  );

  return (
    <Pressable onPress={onPress} style={styles.flex}>
      <GlassCard padding={spacing.lg}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={20} color={colors.accent2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.caption}>{title.toUpperCase()}</Text>
            <Text style={styles.value}>{value}</Text>
            {hint ? <Text style={typography.caption}>{hint}</Text> : null}
            {progress01 !== undefined ? (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(progress01 * 100)}%` }]} />
              </View>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
