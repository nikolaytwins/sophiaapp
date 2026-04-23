/** Палитра карточек событий (без «золотого» accent из палитры приложения). */
export const CAL_EVENT_CHIP_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#A855F7', '#EC4899', '#F97316'] as const;

export function calendarChipColorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CAL_EVENT_CHIP_COLORS[h % CAL_EVENT_CHIP_COLORS.length]!;
}

/** Пастельные «плавающие» карточки (Apple / fintech ref). */
export type EventPastel = { fill: string; border: string; text: string; sub: string };

const EVENT_PASTELS: readonly EventPastel[] = [
  { fill: '#E0E7FF', border: '#C7D2FE', text: '#1E1B4B', sub: '#4338CA' },
  { fill: '#DCFCE7', border: '#BBF7D0', text: '#14532D', sub: '#15803D' },
  { fill: '#EDE9FE', border: '#DDD6FE', text: '#4C1D95', sub: '#6D28D9' },
  { fill: '#E0F2FE', border: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  { fill: '#FCE7F3', border: '#FBCFE8', text: '#831843', sub: '#BE185D' },
  { fill: '#FFEDD5', border: '#FED7AA', text: '#7C2D12', sub: '#C2410C' },
] as const;

export function eventPastelForId(id: string): EventPastel {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return EVENT_PASTELS[h % EVENT_PASTELS.length]!;
}

/** «Muted premium gems» — тёмные градиенты + цвет свечения (Synaptix). */
export type EventGemStyle = {
  /** [темнее, чуть светлее] для LinearGradient. */
  gradient: readonly [string, string];
  text: string;
  sub: string;
  border: string;
  /** `r, g, b` для rgba в тени. */
  glowRgb: string;
};

const EVENT_GEMS: readonly EventGemStyle[] = [
  {
    gradient: ['#0c1422', '#1e3a5c'] as const,
    text: 'rgba(240,249,255,0.97)',
    sub: 'rgba(125,211,252,0.9)',
    border: 'rgba(56,189,248,0.35)',
    glowRgb: '56, 189, 248',
  },
  {
    gradient: ['#1a0a14', '#3d1530'] as const,
    text: 'rgba(254,240,255,0.96)',
    sub: 'rgba(244,114,182,0.88)',
    border: 'rgba(244,114,182,0.38)',
    glowRgb: '244, 114, 182',
  },
  {
    gradient: ['#0a1810', '#134e32'] as const,
    text: 'rgba(209,250,229,0.96)',
    sub: 'rgba(52,211,153,0.85)',
    border: 'rgba(52,211,153,0.32)',
    glowRgb: '52, 211, 153',
  },
  {
    gradient: ['#100818', '#2d1f4a'] as const,
    text: 'rgba(237,233,254,0.97)',
    sub: 'rgba(196,181,253,0.88)',
    border: 'rgba(157,107,255,0.45)',
    glowRgb: '157, 107, 255',
  },
] as const;

export function eventGemForId(id: string): EventGemStyle {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return EVENT_GEMS[h % EVENT_GEMS.length]!;
}

/** Внешняя тень + неоновое свечение (web), усиленное ~2×. */
export function eventGemWebShadow(gem: EventGemStyle): string {
  return `0 18px 48px rgba(0,0,0,0.78), 0 0 72px rgba(${gem.glowRgb}, 0.42), 0 0 120px rgba(${gem.glowRgb}, 0.18), 0 0 100px rgba(244,114,182,0.1)`;
}
