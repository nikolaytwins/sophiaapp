import type { Habit } from '@/entities/models';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';

/** Сумма «слотов выполнено»: для каждого дня месяца считаем, сколько привычек закрыто в этот день. */
export function totalHabitCompletionsInMonth(
  habits: Habit[],
  year: number,
  month: number,
  todayKey: string
): number {
  const dim = new Date(year, month, 0).getDate();
  let total = 0;
  for (let d = 1; d <= dim; d++) {
    const dk = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dk > todayKey) break;
    for (const h of habits) {
      if (habitDoneOnDate(h, dk)) total += 1;
    }
  }
  return total;
}

export type MonthBucket = { y: number; m: number; label: string };

/** Последние `count` календарных месяцев до `todayKey`, от старых к новым. */
export function lastNCalendarMonths(count: number, todayKey: string): MonthBucket[] {
  const [ty, tm] = todayKey.split('-').map(Number);
  const out: MonthBucket[] = [];
  let y = ty;
  let m = tm;
  for (let i = 0; i < count; i++) {
    const raw = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'short' });
    const label = raw.replace(/\.$/, '').trim();
    out.push({ y, m, label });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out.reverse();
}

/**
 * Верхняя граница шкалы только по фактическим значениям видимого окна (+ небольшой запас).
 * Без «теоретического» максимума (число привычек × дни и т.п.).
 */
export function chartYMaxFromWindowValues(values: number[]): number {
  const maxV = Math.max(0, ...values);
  if (maxV <= 0) return 1;
  return Math.max(1, Math.ceil(maxV * 1.06));
}
