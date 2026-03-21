import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  glow?: boolean;
};

export function GlassCard({ children, style, padding, glow }: Props) {
  const { colors, radius, spacing, shadows, isLight } = useAppTheme();
  const pad = padding ?? spacing.lg;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          ...(glow ? shadows.card : {}),
        },
        blur: {
          backgroundColor:
            Platform.OS === 'web'
              ? colors.surface
              : isLight
                ? 'rgba(255,255,255,0.85)'
                : 'rgba(255,255,255,0.08)',
        },
        inner: {
          padding: pad,
        },
      }),
    [colors.border, colors.surface, glow, isLight, pad, radius.lg, shadows.card]
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.outer, style]}>
        <View style={[styles.blur, styles.inner]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.outer, style]}>
      <BlurView intensity={isLight ? 72 : 48} tint={isLight ? 'light' : 'dark'} style={styles.blur}>
        <View style={styles.inner}>{children}</View>
      </BlurView>
    </View>
  );
}
