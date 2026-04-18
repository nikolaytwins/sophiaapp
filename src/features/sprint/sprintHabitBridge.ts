import type { HabitPersisted } from '@/entities/models';
import { useSprintStore } from '@/stores/sprint.store';

function completionDeltaForCheckIn(prev: HabitPersisted, next: HabitPersisted, dateKey: string): number {
  if (prev.analyticsHeatMode === 'negative' || next.analyticsHeatMode === 'negative') return 0;
  if (prev.cadence === 'daily') {
    if (prev.checkInKind === 'counter' && prev.dailyTarget != null) {
      const t = prev.dailyTarget;
      const was = (prev.countsByDate?.[dateKey] ?? 0) >= t;
      const now = (next.countsByDate?.[dateKey] ?? 0) >= t;
      if (!was && now) return 1;
      if (was && !now) return -1;
      return 0;
    }
    const was = prev.completionDates.includes(dateKey);
    const now = next.completionDates.includes(dateKey);
    if (!was && now) return 1;
    if (was && !now) return -1;
    return 0;
  }
  if (prev.cadence === 'weekly') {
    const was = prev.completionDates.includes(dateKey);
    const now = next.completionDates.includes(dateKey);
    if (!was && now) return 1;
    if (was && !now) return -1;
    return 0;
  }
  return next.completionDates.length - prev.completionDates.length;
}

function completionDeltaForUndoWeekly(prev: HabitPersisted, next: HabitPersisted): number {
  return next.completionDates.length - prev.completionDates.length;
}

/**
 * Вызывать после успешного checkIn в сторе привычек.
 * Учитывает ежедневный toggle (−1) и еженедельные несколько отметок за раз.
 */
export function applySprintAfterHabitCheckIn(
  habitId: string,
  prev: HabitPersisted,
  next: HabitPersisted,
  dateKey: string
): void {
  const delta = completionDeltaForCheckIn(prev, next, dateKey);
  if (delta === 0) return;
  useSprintStore.getState().applyHabitContribution(habitId, delta);
}

/** После undo еженедельной отметки за сегодня. */
export function applySprintAfterHabitUndoWeekly(habitId: string, prev: HabitPersisted, next: HabitPersisted): void {
  const delta = completionDeltaForUndoWeekly(prev, next);
  if (delta === 0) return;
  useSprintStore.getState().applyHabitContribution(habitId, delta);
}
