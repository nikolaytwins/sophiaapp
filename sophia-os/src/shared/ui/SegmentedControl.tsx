import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>) {
  const { colors, typography, radius, spacing } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: 'row',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          padding: 3,
          borderWidth: 1,
          borderColor: colors.border,
        },
        segment: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          alignItems: 'center',
        },
        segmentActive: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        label: {
          ...typography.caption,
          color: colors.textMuted,
        },
        labelActive: {
          color: colors.text,
          fontWeight: '600',
        },
      }),
    [colors, typography, radius, spacing.sm]
  );

  return (
    <View style={styles.track}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
