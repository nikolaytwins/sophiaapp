import type { HabitPersisted } from '@/entities/models';
import { DEFAULT_HABIT_SEEDS } from '@/features/habits/defaultHabits';
import {
  addDays,
  appendWeeklyCompletion,
  localDateKey,
  startOfWeekMondayKey,
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

const HERO_HABIT_IDS = {
  steps: 'seed_steps_10k',
  protein: 'seed_protein_140',
  sleep: 'seed_sleep_0100',
  noComps: 'seed_no_comps',
  noAstro: 'seed_no_tarot_astro',
  reels: 'seed_reels_daily',
  agencySprint: 'seed_agency_sprint_5',
} as const;

function weekdayFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function isAgencySprintDay(dateKey: string): boolean {
  const wd = weekdayFromKey(dateKey);
  return wd === 1 || wd === 2 || wd === 3 || wd === 4 || wd === 6;
}

function hasCompletionOn(raw: HabitPersisted | undefined, dateKey: string): boolean {
  if (!raw) return false;
  return raw.completionDates.includes(dateKey);
}

function noCompsDoneWithWeeklyAllowance(h: HabitPersisted | undefined, dateKey: string): boolean {
  if (!h) return false;
  if (h.completionDates.includes(dateKey)) return true;
  const ws = startOfWeekMondayKey(dateKey);
  let misses = 0;
  let d = ws;
  while (d <= dateKey) {
    if (!h.completionDates.includes(d)) misses++;
    if (misses > 1) return false;
    d = addDays(d, 1);
  }
  return true;
}

export function heroScoreForDayPersisted(
  habits: HabitPersisted[],
  dateKey: string
): { done: number; total: number } {
  const byId = new Map(habits.map((h) => [h.id, h]));

  const checks: { id: string; done: () => boolean; enabled?: () => boolean }[] = [
    { id: HERO_HABIT_IDS.steps, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.steps), dateKey) },
    { id: HERO_HABIT_IDS.protein, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.protein), dateKey) },
    { id: HERO_HABIT_IDS.sleep, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.sleep), dateKey) },
    { id: HERO_HABIT_IDS.noAstro, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.noAstro), dateKey) },
    { id: HERO_HABIT_IDS.reels, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.reels), dateKey) },
    {
      id: HERO_HABIT_IDS.noComps,
      done: () => noCompsDoneWithWeeklyAllowance(byId.get(HERO_HABIT_IDS.noComps), dateKey),
    },
    {
      id: HERO_HABIT_IDS.agencySprint,
      enabled: () => isAgencySprintDay(dateKey),
      done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.agencySprint), dateKey),
    },
  ];

  let total = 0;
  let done = 0;
  for (const c of checks) {
    if (c.enabled && !c.enabled()) continue;
    total++;
    if (c.done()) done++;
  }
  return { done, total };
}

function updateHeroHistoryForRange(
  heroHistory: Record<string, { done: number; total: number }>,
  habits: HabitPersisted[],
  startKey: string,
  endKey: string
): Record<string, { done: number; total: number }> {
  const next = { ...heroHistory };
  let d = startKey;
  while (d <= endKey) {
    next[d] = heroScoreForDayPersisted(habits, d);
    d = addDays(d, 1);
  }
  return next;
}

export type CreateHabitPersistInput = {
  name: string;
  icon: string;
  cadence: HabitPersisted['cadence'];
  weeklyTarget?: number;
  section?: HabitPersisted['section'];
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
    ...(input.section === 'media' ? { section: 'media' as const } : {}),
    createdAt: new Date().toISOString(),
    completionDates: [],
  };
  return { ...s1, habits: [...s1.habits, row], defaultsSeeded: true };
}

export function removeHabitSlice(s: HabitsPersistSlice, id: string): HabitsPersistSlice {
  const nextHabits = s.habits.filter((h) => h.id !== id);
  const today = localDateKey();
  return {
    ...s,
    habits: nextHabits,
    heroHistory: { ...s.heroHistory, [today]: heroScoreForDayPersisted(nextHabits, today) },
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

  const today = localDateKey();
  const end = dk < today ? dk : today;
  const start = id === HERO_HABIT_IDS.noComps ? startOfWeekMondayKey(dk) : dk;

  return {
    ...s,
    habits: nextHabits,
    heroHistory: updateHeroHistoryForRange(s.heroHistory, nextHabits, start, end),
  };
}

export function undoWeeklySlice(s: HabitsPersistSlice, id: string, dateKey?: string): HabitsPersistSlice {
  const dk = dateKey ?? localDateKey();
  const nextHabits = s.habits.map((h) =>
    h.id === id && h.cadence === 'weekly'
      ? { ...h, completionDates: undoLastWeeklyIfToday(h.completionDates, dk) }
      : h
  );

  const today = localDateKey();
  const end = dk < today ? dk : today;
  const start = id === HERO_HABIT_IDS.noComps ? startOfWeekMondayKey(dk) : dk;

  return {
    ...s,
    habits: nextHabits,
    heroHistory: updateHeroHistoryForRange(s.heroHistory, nextHabits, start, end),
  };
}

export function totalCompletionCount(s: HabitsPersistSlice): number {
  return s.habits.reduce((n, h) => n + h.completionDates.length, 0);
}
