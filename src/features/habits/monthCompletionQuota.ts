import type { Habit } from '@/entities/models';

export function daysInCalendarMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Сколько «недельных блоков» в месяце для расчёта weekly-слотов (≈4–5). */
function weekBlocksInMonth(y: number, m: number): number {
  const dim = daysInCalendarMonth(y, m);
  return Math.max(1, Math.ceil(dim / 7));
}

/**
 * Максимум слотов за месяц и сколько закрыто по текущим привычкам.
 * Daily: на каждый день месяца — 1 слот на привычку.
 * Weekly: на каждый «блок недели» — weeklyTarget слотов (как 4 раза по 1 в месяц).
 */
export function monthHabitQuota(habits: Habit[], year: number, month: number): {
  max: number;
  filled: number;
  percent: number;
  progress01: number;
} {
  const dim = daysInCalendarMonth(year, month);
  const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const blocks = weekBlocksInMonth(year, month);

  let max = 0;
  let filled = 0;

  for (const h of habits) {
    const dates = h.completionDates ?? [];
    const inMonth = dates.filter((d) => d.startsWith(ymPrefix));

    if (h.cadence === 'daily') {
      max += dim;
      filled += new Set(inMonth).size;
    } else {
      const wt = Math.min(7, Math.max(1, h.weeklyTarget ?? 3));
      max += blocks * wt;
      filled += inMonth.length;
    }
  }

  if (max <= 0) {
    return { max: 0, filled: 0, percent: 0, progress01: 0 };
  }
  const progress01 = Math.min(1, filled / max);
  return {
    max,
    filled,
    percent: Math.round(progress01 * 100),
    progress01,
  };
}
