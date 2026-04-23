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
