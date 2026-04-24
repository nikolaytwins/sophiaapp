import type { PlannerCalendarEventKind, PlannerCalendarEventRow } from '@/features/calendar/calendar.types';

/** Палитра карточек событий (без «золотого» accent из палитры приложения). */
export const CAL_EVENT_CHIP_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#A855F7', '#EC4899', '#F97316'] as const;

export function normalizeEventKind(v: string | null | undefined): PlannerCalendarEventKind {
  if (v === 'important' || v === 'work' || v === 'day_off' || v === 'personal') return v;
  return 'none';
}

const KIND_CHIP_HEX: Record<Exclude<PlannerCalendarEventKind, 'none'>, string> = {
  important: '#C026D3',
  work: '#4F46E5',
  day_off: '#059669',
  personal: '#DB2777',
};

export function calendarChipColorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CAL_EVENT_CHIP_COLORS[h % CAL_EVENT_CHIP_COLORS.length]!;
}

export function calendarChipColorForEvent(ev: PlannerCalendarEventRow): string {
  const k = normalizeEventKind(ev.event_kind);
  if (k === 'none') return calendarChipColorForId(ev.id);
  return KIND_CHIP_HEX[k];
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

const KIND_PASTEL: Record<Exclude<PlannerCalendarEventKind, 'none'>, EventPastel> = {
  important: { fill: '#FAE8FF', border: '#E879F9', text: '#701A75', sub: '#A21CAF' },
  work: { fill: '#E0E7FF', border: '#A5B4FC', text: '#1E1B4B', sub: '#4338CA' },
  day_off: { fill: '#D1FAE5', border: '#6EE7B7', text: '#064E3B', sub: '#047857' },
  personal: { fill: '#FCE7F3', border: '#F9A8D4', text: '#831843', sub: '#BE185D' },
};

export function eventPastelForEvent(ev: PlannerCalendarEventRow): EventPastel {
  const k = normalizeEventKind(ev.event_kind);
  if (k === 'none') return eventPastelForId(ev.id);
  return KIND_PASTEL[k];
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
  /** Сильнее свечение и тень (важное событие). */
  isAccent?: boolean;
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

const IMPORTANT_GEM: EventGemStyle = {
  gradient: ['#12040f', '#86198f'] as const,
  text: 'rgba(255,255,255,0.99)',
  sub: 'rgba(250, 232, 255, 0.96)',
  border: 'rgba(232, 121, 249, 0.65)',
  glowRgb: '217, 70, 239',
  isAccent: true,
};

const KIND_GEM: Record<Exclude<PlannerCalendarEventKind, 'none'>, EventGemStyle> = {
  important: IMPORTANT_GEM,
  work: EVENT_GEMS[0],
  day_off: EVENT_GEMS[2],
  personal: EVENT_GEMS[1],
};

export function eventGemForEvent(ev: PlannerCalendarEventRow): EventGemStyle {
  const k = normalizeEventKind(ev.event_kind);
  if (k === 'none') return eventGemForId(ev.id);
  return KIND_GEM[k];
}

/** Внешняя тень + неоновое свечение (web), усиленное ~2×. Для `isAccent` — ещё слой ореола. */
export function eventGemWebShadow(gem: EventGemStyle): string {
  const base = `0 18px 48px rgba(0,0,0,0.78), 0 0 72px rgba(${gem.glowRgb}, 0.42), 0 0 120px rgba(${gem.glowRgb}, 0.18), 0 0 100px rgba(244,114,182,0.1)`;
  if (!gem.isAccent) return base;
  return `${base}, 0 0 160px rgba(${gem.glowRgb}, 0.45), 0 0 72px rgba(250, 204, 21, 0.2)`;
}
