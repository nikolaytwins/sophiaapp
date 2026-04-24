import type { PlannerCalendarEventRow } from '@/features/calendar/calendar.types';
import { isoToLocalDateKey, isoToLocalMinutesSinceMidnight, plannerEventDateKey } from '@/features/calendar/calendarLocalTime';

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

/**
 * События с интервалом в колонке дня недели.
 * Для событий с `event_date` колонка = эта дата (как у «весь день»), иначе — по локальной дате `starts_at`.
 * Так вертикальная позиция не расходится с днём карточки при рассинхроне timestamptz и `event_date`.
 */
export function timedEventsStartingOnDay(events: PlannerCalendarEventRow[], dayKey: string): PlannerCalendarEventRow[] {
  return events.filter((e) => {
    if (!e.starts_at || !e.ends_at) return false;
    const pin = plannerEventDateKey(e.event_date);
    if (pin != null) return pin === dayKey;
    return isoToLocalDateKey(e.starts_at) === dayKey;
  });
}

/** События на день без интервала: только дата, без начала и конца (строго «целый день»). */
export function allDayEventsOnDay(events: PlannerCalendarEventRow[], dayKey: string): PlannerCalendarEventRow[] {
  return events.filter((e) => {
    if (plannerEventDateKey(e.event_date) !== dayKey) return false;
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
  const pin = plannerEventDateKey(ev.event_date);
  if (pin != null) {
    if (pin !== dayKey) return null;
  } else if (isoToLocalDateKey(ev.starts_at) !== dayKey) {
    return null;
  }

  const [y, m, d] = dayKey.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dayMidnight = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const startMs = new Date(ev.starts_at).getTime();
  const endMs = new Date(ev.ends_at).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

  const startLocalKey = isoToLocalDateKey(ev.starts_at);
  /**
   * Минуты от полуночи до начала события.
   * Если локальная дата `starts_at` совпадает с колонкой — берём те же поля, что и для подписи HH:mm (`isoToHm`),
   * чтобы сетка не расходилась с текстом из‑за краевых случаев с полуночью/строкой даты.
   * Если событие «приклеено» к дню через `event_date`, а `starts_at` в другой локальный день — считаем от полуночи колонки.
   */
  const startMinOfDay =
    startLocalKey === dayKey
      ? isoToLocalMinutesSinceMidnight(ev.starts_at)
      : (startMs - dayMidnight) / 60_000;
  const gridStartMin = WEEK_GRID_HOUR_START * 60;
  const gridEndMin = (WEEK_GRID_HOUR_END + 1) * 60;
  let t0 = startMinOfDay - gridStartMin;
  if (t0 < 0) t0 = 0;
  const durMin = Math.max(15, Math.round((endMs - startMs) / 60_000));
  const top = (t0 / 60) * WEEK_GRID_SLOT_PX;
  let height = (durMin / 60) * WEEK_GRID_SLOT_PX;
  height = Math.max(24, Math.min(height, weekGridTotalHeightPx() - top));
  const startMinWhole = Math.floor(startMinOfDay);
  if (startMinWhole + durMin > gridEndMin) {
    const maxH = ((gridEndMin - Math.max(gridStartMin, startMinWhole)) / 60) * WEEK_GRID_SLOT_PX;
    height = Math.max(24, maxH);
  }
  return { top, height };
}
