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
    gradient: ['#121a24', '#243447'] as const,
    text: 'rgba(226,232,240,0.96)',
    sub: 'rgba(148,163,184,0.88)',
    border: 'rgba(255,255,255,0.07)',
    glowRgb: '56, 165, 201',
  },
  {
    gradient: ['#24180c', '#3d2814'] as const,
    text: 'rgba(254,243,199,0.95)',
    sub: 'rgba(252,211,77,0.78)',
    border: 'rgba(255,255,255,0.06)',
    glowRgb: '217, 119, 6',
  },
  {
    gradient: ['#0c1a12', '#153428'] as const,
    text: 'rgba(209,250,229,0.95)',
    sub: 'rgba(52,211,153,0.78)',
    border: 'rgba(255,255,255,0.06)',
    glowRgb: '16, 185, 129',
  },
  {
    gradient: ['#160d22', '#2a1a3d'] as const,
    text: 'rgba(237,233,254,0.96)',
    sub: 'rgba(196,181,253,0.82)',
    border: 'rgba(255,255,255,0.07)',
    glowRgb: '139, 92, 246',
  },
] as const;

export function eventGemForId(id: string): EventGemStyle {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return EVENT_GEMS[h % EVENT_GEMS.length]!;
}

/** Внешняя тень + мягкое цветное свечение (web). */
export function eventGemWebShadow(gem: EventGemStyle): string {
  return `0 10px 28px rgba(0,0,0,0.55), 0 0 56px rgba(${gem.glowRgb}, 0.2)`;
}
