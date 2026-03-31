import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

type Props = {
  children: ReactNode;
};

/** Единый фон экранов приложения в духе `habits`. */
export function ScreenCanvas({ children }: Props) {
  const { brand } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: brand.canvasBase }}>
      <LinearGradient pointerEvents="none" colors={[...brand.canvasGradient]} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
}
