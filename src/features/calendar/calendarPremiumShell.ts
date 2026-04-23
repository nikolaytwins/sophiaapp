import { Platform } from 'react-native';

/** База фона (почти чёрный + холод). */
export const CAL_PAGE_BASE = '#010104';

/** Основной неон (бренд AI). */
export const CAL_NEON_VIOLET = '#7B5CFF';
export const CAL_NEON_VIOLET_SOFT = '#9D6BFF';
export const CAL_NEON_PINK = '#F472B6';
export const CAL_NEON_BLUE = '#38BDF8';

/** Карточки: полупрозрачность под стекло. */
export const CAL_CARD_GLASS_BG = 'rgba(18, 8, 42, 0.48)';

export const CAL_CARD_BORDER = 'rgba(157, 107, 255, 0.28)';

/** Многослойная тень: парение + внутренний блик + неоновый ореол (web). */
const FUTURE_WEB_CARD_SHADOW = `
  0 0 0 1px rgba(255,255,255,0.07) inset,
  0 1px 0 rgba(255,255,255,0.14) inset,
  0 -12px 40px rgba(0,0,0,0.55) inset,
  0 28px 64px rgba(0,0,0,0.72),
  0 0 100px rgba(123, 92, 255, 0.22),
  0 0 160px rgba(236, 114, 182, 0.08)
`.replace(/\s+/g, ' ');

/** Glass + neumorphic гибрид: blur, градиентная рамка, глубина. */
export function calendarSynaptixCardStyle(): object {
  if (Platform.OS === 'web') {
    return {
      backgroundColor: CAL_CARD_GLASS_BG,
      backdropFilter: 'blur(28px) saturate(1.65)',
      WebkitBackdropFilter: 'blur(28px) saturate(1.65)',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: CAL_CARD_BORDER,
      boxShadow: FUTURE_WEB_CARD_SHADOW,
    };
  }
  return {
    backgroundColor: 'rgba(22, 12, 48, 0.88)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(157, 107, 255, 0.35)',
    elevation: 18,
    shadowColor: '#7B5CFF',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
  };
}

/** Сильное свечение кнопок / активных табов (в 2× выразительнее). */
export function calendarSynaptixGlowWeb(accentRgb: string): object {
  if (Platform.OS !== 'web') return {};
  return {
    boxShadow: `
      0 0 36px rgba(${accentRgb}, 0.75),
      0 0 72px rgba(${accentRgb}, 0.35),
      0 0 120px rgba(244, 114, 182, 0.22),
      0 14px 40px rgba(0,0,0,0.55)
    `.replace(/\s+/g, ' '),
  } as object;
}

/** Градиент основной CTA (премиум AI). */
export const CAL_PRIMARY_GRADIENT = [CAL_NEON_VIOLET, CAL_NEON_VIOLET_SOFT, '#6366F1'] as const;

/** Лёгкое свечение при hover (только web — усиливается из компонента). */
export function calendarSynaptixGlowWebHover(accentRgb: string): object {
  if (Platform.OS !== 'web') return {};
  return {
    boxShadow: `
      0 0 48px rgba(${accentRgb}, 0.95),
      0 0 96px rgba(${accentRgb}, 0.45),
      0 0 140px rgba(244, 114, 182, 0.28),
      0 18px 48px rgba(0,0,0,0.5)
    `.replace(/\s+/g, ' '),
  } as object;
}

/** Тонкая неоновая обводка для активных контролов. */
export function calendarNeonOutlineWeb(): object {
  if (Platform.OS !== 'web') return {};
  return {
    boxShadow: `0 0 0 1px rgba(157, 107, 255, 0.55), 0 0 24px rgba(123, 92, 255, 0.35)`,
  } as object;
}
