import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { privateColors } from '@/theme/privateTokens';

export function PrivateShell({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={[privateColors.bg, privateColors.graphite, privateColors.plumDeep]} style={styles.root}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
