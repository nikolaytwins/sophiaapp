import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import { isoToLocalDateKey } from '@/features/calendar/calendarLocalTime';

export const WEEK_GRID_HOUR_START = 6;
export const WEEK_GRID_HOUR_END = 22;
export const WEEK_GRID_SLOT_PX = 52;

/** Фиксированная высота шапки дня (должна совпадать с левым углом сетки). */
export const WEEK_COL_HEADER_H = 76;
/** Минимум строки «весь день»; фактическая высота — `weekAllDayRowHeightPx`. */
export const WEEK_ALLDAY_ROW_MIN_H = 48;
export const WEEK_ALLDAY_ROW_MAX_H = 120;

export function weekGridTotalHeightPx(): number {
  return (WEEK_GRID_HOUR_END - WEEK_GRID_HOUR_START + 1) * WEEK_GRID_SLOT_PX;
}

/** Событие с интервалом, начинающимся в этот календарный день (локально). */
export function timedEventsStartingOnDay(events: PlannerCalendarEventRow[], dayKey: string): PlannerCalendarEventRow[] {
  return events.filter((e) => {
    if (!e.starts_at || !e.ends_at) return false;
    return isoToLocalDateKey(e.starts_at) === dayKey;
  });
}

/** События на день без интервала: только дата, без начала и конца (строго «целый день»). */
export function allDayEventsOnDay(events: PlannerCalendarEventRow[], dayKey: string): PlannerCalendarEventRow[] {
  return events.filter((e) => {
    if (e.event_date !== dayKey) return false;
    const s = e.starts_at != null && String(e.starts_at).trim() !== '';
    const en = e.ends_at != null && String(e.ends_at).trim() !== '';
    return !s && !en;
  });
}

/** Высота строки «весь день» по максимуму чипов в колонках (все колонки одной высоты = шкала часов совпадает). */
export function weekAllDayRowHeightPx(dayKeys: string[], events: PlannerCalendarEventRow[]): number {
  let maxN = 0;
  for (const dk of dayKeys) {
    maxN = Math.max(maxN, allDayEventsOnDay(events, dk).length);
  }
  if (maxN === 0) return WEEK_ALLDAY_ROW_MIN_H;
  return Math.min(WEEK_ALLDAY_ROW_MAX_H, WEEK_ALLDAY_ROW_MIN_H + maxN * 42);
}

export type TimedLayout = { top: number; height: number };

export function layoutTimedEventOnDay(ev: PlannerCalendarEventRow, dayKey: string): TimedLayout | null {
  if (!ev.starts_at || !ev.ends_at) return null;
  if (isoToLocalDateKey(ev.starts_at) !== dayKey) return null;
  const start = new Date(ev.starts_at);
  const end = new Date(ev.ends_at);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const gridStartMin = WEEK_GRID_HOUR_START * 60;
  const gridEndMin = (WEEK_GRID_HOUR_END + 1) * 60;
  let t0 = startMin - gridStartMin;
  if (t0 < 0) t0 = 0;
  const durMin = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000));
  const top = (t0 / 60) * WEEK_GRID_SLOT_PX;
  let height = (durMin / 60) * WEEK_GRID_SLOT_PX;
  height = Math.max(24, Math.min(height, weekGridTotalHeightPx() - top));
  if (startMin + durMin > gridEndMin) {
    const maxH = ((gridEndMin - Math.max(gridStartMin, startMin)) / 60) * WEEK_GRID_SLOT_PX;
    height = Math.max(24, maxH);
  }
  return { top, height };
}
