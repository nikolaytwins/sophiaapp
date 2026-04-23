import { addDays, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import { WEEKDAY_SHORT_RU } from '@/features/day/dayHabitUi';

export function monthTitleRu(year: number, month1: number): string {
  const d = new Date(year, month1 - 1, 1);
  const s = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekRangeLabelRu(anchorDateKey: string): string {
  const mon = startOfWeekMondayKey(anchorDateKey);
  const sun = addDays(mon, 6);
  const [y1, m1, d1] = mon.split('-').map(Number);
  const [y2, m2, d2] = sun.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const b = new Date(y2, m2 - 1, d2).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${a} — ${b}`;
}

export function shortWeekdayRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const idx = day === 0 ? 6 : day - 1;
  return WEEKDAY_SHORT_RU[idx] ?? '';
}
