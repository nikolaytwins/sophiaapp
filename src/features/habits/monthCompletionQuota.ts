import type { Habit } from '@/entities/models';

export function daysInCalendarMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function isRitualDaily(h: Habit): boolean {
  return h.cadence === 'daily' && h.required !== false;
}

/**
 * Месячный счётчик только для **ежедневных обязательных** привычек:
 * max = число дней в месяце × число таких привычек;
 * filled = уникальные пары (день, привычка) с отметкой в месяце.
 */
export function monthHabitQuota(habits: Habit[], year: number, month: number): {
  max: number;
  filled: number;
  percent: number;
  progress01: number;
} {
  const dim = daysInCalendarMonth(year, month);
  const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;

  const dailyRitual = habits.filter(isRitualDaily);
  if (dailyRitual.length === 0 || dim <= 0) {
    return { max: 0, filled: 0, percent: 0, progress01: 0 };
  }

  const max = dim * dailyRitual.length;
  let filled = 0;

  for (const h of dailyRitual) {
    const dates = h.completionDates ?? [];
    const inMonth = [...new Set(dates.filter((d) => d.startsWith(ymPrefix)))];
    filled += inMonth.length;
  }

  const progress01 = max > 0 ? Math.min(1, filled / max) : 0;
  return {
    max,
    filled,
    percent: Math.round(progress01 * 100),
    progress01,
  };
}
