import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

type Props = {
  children: ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/** Общая тёмная карточка для `day` / `habits` / `goals`. */
export function AppSurfaceCard({ children, glow, style, padded = true }: Props) {
  const { brand, radius, spacing } = useAppTheme();

  return (
    <View
      style={[
        {
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: glow ? brand.surfaceGlow : brand.surfaceBorder,
          backgroundColor: brand.surface,
          padding: padded ? spacing.lg : 0,
          ...(Platform.OS === 'web'
            ? {}
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: glow ? 0.42 : 0.35,
                shadowRadius: glow ? 24 : 20,
                elevation: glow ? 8 : 6,
              }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
