import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

import { privateColors, privateRadius, privateShadows } from '@/theme/privateTokens';

type Props = PropsWithChildren<{ style?: ViewStyle; glow?: boolean }>;

export function PrivateCard({ children, style, glow }: Props) {
  const inner = (
    <View style={[styles.inner, glow && styles.glow]}>
      <LinearGradient
        colors={
          glow
            ? ['rgba(201,168,108,0.12)', 'rgba(74,45,92,0.15)', 'rgba(13,6,11,0.4)']
            : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.pad}>{children}</View>
    </View>
  );
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={22} tint="dark" style={[styles.wrap, privateShadows.hero, style]}>
        {inner}
      </BlurView>
    );
  }
  return <View style={[styles.wrap, styles.android, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: privateRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: privateColors.border,
  },
  android: {
    backgroundColor: privateColors.surface,
  },
  inner: { borderRadius: privateRadius.lg, overflow: 'hidden' },
  glow: { borderColor: privateColors.borderStrong },
  pad: { padding: 18 },
});
