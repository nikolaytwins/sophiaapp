import { addDays, endOfCalendarMonthKey, startOfWeekMondayKey } from '@/features/habits/habitLogic';

/** month1 — 1..12, локальный календарь. */
export function monthGridRange(year: number, month1: number): { gridStart: string; gridEnd: string } {
  const mm = String(month1).padStart(2, '0');
  const monthStart = `${year}-${mm}-01`;
  const monthEnd = endOfCalendarMonthKey(monthStart);
  const gridStart = startOfWeekMondayKey(monthStart);
  const gridEnd = addDays(startOfWeekMondayKey(monthEnd), 6);
  return { gridStart, gridEnd };
}

/** Строки по 7 дней (пн–вс), покрывающие сетку месяца. */
export function monthCalendarRows(year: number, month1: number): string[][] {
  const { gridStart, gridEnd } = monthGridRange(year, month1);
  const rows: string[][] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    const row: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      row.push(addDays(cur, i));
    }
    rows.push(row);
    cur = addDays(cur, 7);
  }
  return rows;
}

export function shiftCalendarMonth(year: number, month1: number, delta: number): { y: number; m: number } {
  const d = new Date(year, month1 - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
