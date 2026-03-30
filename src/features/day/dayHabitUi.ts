import type { Habit } from '@/entities/models';
import { addDays, startOfWeekMondayKey } from '@/features/habits/habitLogic';

/** 7 дат пн–вс для недели, в которой лежит anchorDateKey. */
export function getWeekDayKeys(anchorDateKey: string): string[] {
  const mon = startOfWeekMondayKey(anchorDateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** Отметка на конкретный день (для UI выбранного дня в календаре «Дня»). */
export function habitDoneOnDate(h: Habit, dayKey: string): boolean {
  const dates = h.completionDates ?? [];
  if (h.cadence === 'daily') return dates.includes(dayKey);
  return dates.some((d) => d === dayKey);
}

export function habitCadenceLabel(h: Habit): string {
  if (h.cadence === 'daily') return 'Каждый день';
  const t = h.weeklyTarget ?? 1;
  if (t === 1) return '1 раз в неделю';
  if (t >= 2 && t <= 4) return `${t} раза в неделю`;
  return `${t} раз в неделю`;
}

/** Короткие подписи дней недели (пн–вс). */
export const WEEKDAY_SHORT_RU = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

/** Пары под две колонки — в строке одинаковая высота через flex + stretch. */
export function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}
