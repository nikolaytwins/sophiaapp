import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

/** Вертикальный ритм и скругления для экрана «Стратегия». */
export const STRATEGY = {
  sectionGap: 28,
  blockGap: 20,
  cardRadiusLg: 20,
  cardRadiusMd: 16,
  timelineBarHeight: 48,
  timelineBarRadius: 14,
} as const;

export function strategyEyebrow(mutedColor: string): TextStyle {
  return {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.15,
    textTransform: 'uppercase',
    color: mutedColor,
    opacity: 0.88,
  };
}

type PressState = { pressed?: boolean; hovered?: boolean };

/**
 * Лёгкий lift при наведении (web) / нажатии; на native только прозрачность.
 * Для `Pressable` style-callback.
 */
export function strategySurfacePressStyle(state: PressState): Record<string, unknown> {
  if (Platform.OS !== 'web') {
    return { opacity: state.pressed ? 0.94 : 1 };
  }
  const lift = Boolean(state.hovered || state.pressed);
  return {
    transform: [{ scale: lift ? 1.012 : 1 }],
    opacity: state.pressed ? 0.96 : 1,
    cursor: 'pointer',
    boxShadow: lift
      ? '0 18px 50px rgba(0,0,0,0.42), 0 0 0 1px rgba(168,85,247,0.14)'
      : '0 10px 36px rgba(0,0,0,0.28)',
    transition: 'transform 0.22s ease, box-shadow 0.24s ease, opacity 0.15s ease',
  };
}
