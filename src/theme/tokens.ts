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

export type AppBrand = {
  primary: string;
  primarySoft: string;
  primaryMuted: string;
  canvasBase: string;
  canvasGradient: [string, string, string];
  surface: string;
  surfaceBorder: string;
  surfaceBorderStrong: string;
  surfaceGlow: string;
  callout: string;
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
    screenTitle: {
      ...base,
      fontSize: 34,
      fontWeight: '800' as const,
      letterSpacing: -1.1,
    },
    sectionTitle: {
      ...base,
      fontSize: 24,
      fontWeight: '800' as const,
      letterSpacing: -0.6,
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

export function createBrand(mode: 'light' | 'dark'): AppBrand {
  if (mode === 'light') {
    return {
      primary: '#7C3AED',
      primarySoft: '#A78BFA',
      primaryMuted: 'rgba(124,58,237,0.12)',
      canvasBase: '#F5F6FA',
      canvasGradient: ['#F8F8FC', '#F2F3F8', '#F7F8FB'],
      surface: '#FFFFFF',
      surfaceBorder: 'rgba(15,17,24,0.08)',
      surfaceBorderStrong: 'rgba(124,58,237,0.24)',
      surfaceGlow: 'rgba(124,58,237,0.14)',
      callout: 'rgba(124,58,237,0.08)',
    };
  }
  return {
    primary: '#A855F7',
    primarySoft: '#C4B5FD',
    primaryMuted: 'rgba(168,85,247,0.12)',
    canvasBase: '#030304',
    canvasGradient: ['#020203', '#0A0A10', '#050506'],
    surface: 'rgba(18,18,22,0.92)',
    surfaceBorder: 'rgba(255,255,255,0.07)',
    surfaceBorderStrong: 'rgba(168,85,247,0.28)',
    surfaceGlow: 'rgba(168,85,247,0.22)',
    callout: 'rgba(168,85,247,0.08)',
  };
}

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
