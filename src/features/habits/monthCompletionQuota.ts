import type { Habit } from '@/entities/models';
import { habitDoneOnDate } from '@/features/day/dayHabitUi';
import { localDateKey } from '@/features/habits/habitLogic';

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
  const todayKey = localDateKey();
  const [ty, tm] = todayKey.split('-').map(Number);
  const isCurrentMonth = year === ty && month === tm;

  const dailyRitual = habits.filter(isRitualDaily);
  if (dailyRitual.length === 0 || dim <= 0) {
    return { max: 0, filled: 0, percent: 0, progress01: 0 };
  }

  const max = dim * dailyRitual.length;
  let filled = 0;

  for (const h of dailyRitual) {
    for (let d = 1; d <= dim; d++) {
      const dk = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isCurrentMonth && dk > todayKey) continue;
      if (habitDoneOnDate(h, dk)) filled++;
    }
  }

  const progress01 = max > 0 ? Math.min(1, filled / max) : 0;
  return {
    max,
    filled,
    percent: Math.round(progress01 * 100),
    progress01,
  };
}
