import { useMemo } from 'react';

import { darkPalette, lightPalette } from './palettes';
import { createShadows, createTypography, radius, spacing } from './tokens';
import { useThemeStore } from '@/stores/theme.store';

export function useAppTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggle = useThemeStore((s) => s.toggle);

  const colors = mode === 'light' ? lightPalette : darkPalette;

  const typography = useMemo(() => createTypography(colors), [colors]);
  const shadows = useMemo(() => createShadows(mode), [mode]);

  return {
    mode,
    isLight: mode === 'light',
    colors,
    typography,
    shadows,
    radius,
    spacing,
    setMode,
    toggle,
  };
}
