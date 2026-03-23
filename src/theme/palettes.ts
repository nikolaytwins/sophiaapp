export type AppPalette = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  accent2Soft: string;
  success: string;
  warning: string;
  danger: string;
};

/**
 * Основная тёмная тема: глубокий plum, тёплое золото, бирюза вторичным акцентом.
 */
export const darkPalette: AppPalette = {
  bg: '#07060B',
  surface: 'rgba(201,168,108,0.07)',
  surface2: 'rgba(139,124,255,0.10)',
  text: '#F7F4FA',
  textMuted: 'rgba(247,244,250,0.5)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(201,168,108,0.28)',
  accent: '#D4B87A',
  accentSoft: 'rgba(212,184,122,0.16)',
  accent2: '#7DD3C0',
  accent2Soft: 'rgba(125,211,192,0.14)',
  success: '#6EE7A8',
  warning: '#F5D07A',
  danger: '#F0A0B0',
};

export const lightPalette: AppPalette = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surface2: '#ECEEF5',
  text: '#0F1118',
  textMuted: 'rgba(15,17,24,0.52)',
  border: 'rgba(15,17,24,0.08)',
  borderStrong: 'rgba(15,17,24,0.16)',
  accent: '#5B4BFF',
  accentSoft: 'rgba(91,75,255,0.12)',
  accent2: '#0D9488',
  accent2Soft: 'rgba(13,148,136,0.12)',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#E11D48',
};
