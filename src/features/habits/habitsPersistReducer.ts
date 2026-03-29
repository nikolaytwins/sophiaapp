import type { HabitPersisted } from '@/entities/models';
import { DEFAULT_HABIT_SEEDS } from '@/features/habits/defaultHabits';
import {
  appendWeeklyCompletion,
  localDateKey,
  toggleDailyCompletion,
  undoLastWeeklyIfToday,
} from '@/features/habits/habitLogic';

export type HabitsPersistSlice = {
  habits: HabitPersisted[];
  defaultsSeeded: boolean;
  heroHistory: Record<string, { done: number; total: number }>;
};

export const HABITS_SEED_ROWS: HabitPersisted[] = DEFAULT_HABIT_SEEDS.map((h) => ({
  ...h,
  createdAt: new Date().toISOString(),
}));

function isRitualHabit(h: HabitPersisted): boolean {
  return h.required !== false;
}

function habitDoneOnDate(h: HabitPersisted, dateKey: string): boolean {
  if (h.cadence === 'daily') {
    return h.completionDates.includes(dateKey);
  }
  return h.completionDates.some((d) => d === dateKey);
}

/** Счёт «ритма дня»: только привычки с required !== false; день закрыт, если есть отметка в этот день. */
export function ritualScoreForDayPersisted(
  habits: HabitPersisted[],
  dateKey: string
): { done: number; total: number } {
  const list = habits.filter(isRitualHabit);
  let done = 0;
  for (const h of list) {
    if (habitDoneOnDate(h, dateKey)) done++;
  }
  return { done, total: list.length };
}

export type CreateHabitPersistInput = {
  name: string;
  icon: string;
  cadence: HabitPersisted['cadence'];
  weeklyTarget?: number;
  section?: HabitPersisted['section'];
  /** По умолчанию true — в ритме. */
  required?: boolean;
};

export function ensureDefaultHabitsSlice(s: HabitsPersistSlice): HabitsPersistSlice {
  if (s.defaultsSeeded) return s;
  if (s.habits.length > 0) return { ...s, defaultsSeeded: true };
  return {
    habits: HABITS_SEED_ROWS.map((h) => ({ ...h, createdAt: new Date().toISOString() })),
    defaultsSeeded: true,
    heroHistory: s.heroHistory,
  };
}

export function createHabitSlice(s: HabitsPersistSlice, input: CreateHabitPersistInput): HabitsPersistSlice {
  const s1 = ensureDefaultHabitsSlice(s);
  const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const wt =
    input.cadence === 'weekly' ? Math.min(7, Math.max(1, input.weeklyTarget ?? 3)) : undefined;
  const row: HabitPersisted = {
    id,
    name: input.name.trim(),
    icon: input.icon,
    cadence: input.cadence,
    weeklyTarget: wt,
    required: input.required !== false,
    ...(input.section === 'media' ? { section: 'media' as const } : {}),
    createdAt: new Date().toISOString(),
    completionDates: [],
  };
  return { ...s1, habits: [...s1.habits, row], defaultsSeeded: true };
}

export function setRequiredSlice(s: HabitsPersistSlice, id: string, required: boolean): HabitsPersistSlice {
  const s1 = ensureDefaultHabitsSlice(s);
  const nextHabits = s1.habits.map((h) => (h.id === id ? { ...h, required } : h));
  const today = localDateKey();
  return {
    ...s1,
    habits: nextHabits,
    heroHistory: { ...s1.heroHistory, [today]: ritualScoreForDayPersisted(nextHabits, today) },
  };
}

export function removeHabitSlice(s: HabitsPersistSlice, id: string): HabitsPersistSlice {
  const nextHabits = s.habits.filter((h) => h.id !== id);
  const today = localDateKey();
  return {
    ...s,
    habits: nextHabits,
    heroHistory: { ...s.heroHistory, [today]: ritualScoreForDayPersisted(nextHabits, today) },
  };
}

export function checkInSlice(s: HabitsPersistSlice, id: string, dateKey?: string): HabitsPersistSlice {
  const dk = dateKey ?? localDateKey();
  const nextHabits = s.habits.map((h) => {
    if (h.id !== id) return h;
    if (h.cadence === 'daily') {
      return { ...h, completionDates: toggleDailyCompletion(h.completionDates, dk) };
    }
    return { ...h, completionDates: appendWeeklyCompletion(h.completionDates, dk) };
  });

  return {
    ...s,
    habits: nextHabits,
    heroHistory: { ...s.heroHistory, [dk]: ritualScoreForDayPersisted(nextHabits, dk) },
  };
}

export function undoWeeklySlice(s: HabitsPersistSlice, id: string, dateKey?: string): HabitsPersistSlice {
  const dk = dateKey ?? localDateKey();
  const nextHabits = s.habits.map((h) =>
    h.id === id && h.cadence === 'weekly'
      ? { ...h, completionDates: undoLastWeeklyIfToday(h.completionDates, dk) }
      : h
  );

  return {
    ...s,
    habits: nextHabits,
    heroHistory: { ...s.heroHistory, [dk]: ritualScoreForDayPersisted(nextHabits, dk) },
  };
}

export function totalCompletionCount(s: HabitsPersistSlice): number {
  return s.habits.reduce((n, h) => n + h.completionDates.length, 0);
}
