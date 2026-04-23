/** Палитра карточек событий (без «золотого» accent из палитры приложения). */
export const CAL_EVENT_CHIP_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#A855F7', '#EC4899', '#F97316'] as const;

export function calendarChipColorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CAL_EVENT_CHIP_COLORS[h % CAL_EVENT_CHIP_COLORS.length]!;
}
