import type { TextStyle } from 'react-native';

import type { AppPalette } from './palettes';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
};

export function createTypography(colors: AppPalette) {
  const base: TextStyle = { color: colors.text };

  return {
    hero: {
      ...base,
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.8,
    },
    title1: {
      ...base,
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    title2: {
      ...base,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    body: {
      ...base,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    caption: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },
  };
}

export type AppShadows = {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export function createShadows(mode: 'light' | 'dark'): AppShadows {
  if (mode === 'light') {
    return {
      card: {
        shadowColor: '#0F1118',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
      },
    };
  }
  return {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 8,
    },
  };
}
