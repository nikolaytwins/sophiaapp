import type { Habit, HabitPersisted } from '@/entities/models';
import { checkInSlice, counterAdjustSlice } from '@/features/habits/habitsPersistReducer';
import { habitRowToView } from '@/stores/habits.store';

function habitToPersisted(h: Habit): HabitPersisted {
  return {
    id: h.id,
    name: h.name,
    icon: h.icon,
    cadence: h.cadence,
    checkInKind: h.checkInKind,
    dailyTarget: h.dailyTarget,
    countsByDate: h.countsByDate ? { ...h.countsByDate } : undefined,
    counterUnit: h.counterUnit,
    weeklyTarget: h.weeklyTarget,
    section: h.section,
    required: h.required,
    createdAt: h.createdAt,
    completionDates: [...(h.completionDates ?? [])],
  };
}

const emptySlice = (habits: HabitPersisted[]) => ({
  habits,
  defaultsSeeded: true as const,
  heroHistory: {} as Record<string, { done: number; total: number }>,
});

/** Мгновенный превью списка после checkIn (до ответа сервера). */
export function optimisticApplyCheckIn(habits: Habit[], habitId: string, dateKey: string, todayKey: string): Habit[] {
  const persisted = habits.map(habitToPersisted);
  const nextSlice = checkInSlice(emptySlice(persisted), habitId, dateKey);
  const byId = new Map(nextSlice.habits.map((row) => [row.id, habitRowToView(row, todayKey)]));
  return habits.map((h) => byId.get(h.id) ?? h);
}

/** Мгновенный превью после +/- счётчика. */
export function optimisticApplyCounterDelta(
  habits: Habit[],
  habitId: string,
  dateKey: string,
  delta: 1 | -1,
  todayKey: string
): Habit[] {
  const persisted = habits.map(habitToPersisted);
  const nextSlice = counterAdjustSlice(emptySlice(persisted), habitId, dateKey, delta);
  const byId = new Map(nextSlice.habits.map((row) => [row.id, habitRowToView(row, todayKey)]));
  return habits.map((h) => byId.get(h.id) ?? h);
}
