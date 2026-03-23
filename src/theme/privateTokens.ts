/**
 * After Dark / Private Mode — отдельная премиальная палитра.
 * Не смешивать с основным tokens.ts без явного импорта.
 */
export const privateColors = {
  bg: '#0B060D',
  bgElevated: '#140C18',
  surface: '#1A0F22',
  surface2: '#22142C',
  plum: '#4A2D5C',
  plumDeep: '#2D1A38',
  burgundy: '#5C2438',
  burgundySoft: 'rgba(92,36,56,0.25)',
  graphite: '#151218',
  text: '#F5F0F7',
  textSecondary: 'rgba(245,240,247,0.68)',
  textMuted: 'rgba(245,240,247,0.45)',
  accent: '#C9A86C',
  accentSoft: 'rgba(201,168,108,0.18)',
  rose: '#B86B7A',
  roseSoft: 'rgba(184,107,122,0.2)',
  glow: 'rgba(201,168,108,0.35)',
  riskLow: 'rgba(94,212,168,0.85)',
  riskMid: 'rgba(232,197,71,0.9)',
  riskHigh: 'rgba(184,107,122,0.95)',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const;

export const privateRadius = {
  md: 14,
  lg: 20,
  xl: 26,
} as const;

export const privateShadows = {
  hero: {
    shadowColor: '#C9A86C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
} as const;
