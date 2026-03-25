import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Habit, HabitPersisted } from '@/entities/models';
import { DEFAULT_HABIT_SEEDS } from '@/features/habits/defaultHabits';
import {
  addDays,
  appendWeeklyCompletion,
  countCompletionsInWeekRange,
  dailyStreak,
  hasDailyCompletionOn,
  localDateKey,
  startOfWeekMondayKey,
  toggleDailyCompletion,
  undoLastWeeklyIfToday,
  weeklyStreak,
} from '@/features/habits/habitLogic';

function countToday(completionDates: string[], todayKey: string): number {
  return completionDates.filter((d) => d === todayKey).length;
}

/** Новый ключ — сбрасывает старый state в localStorage (обновление списка сидов). */
const STORAGE_KEY = 'sophia-os-habits-v4';

const SEED_ROWS: HabitPersisted[] = DEFAULT_HABIT_SEEDS.map((h) => ({
  ...h,
  createdAt: new Date().toISOString(),
}));

function toHabitView(raw: HabitPersisted, todayKey: string): Habit {
  const weekStart = startOfWeekMondayKey(todayKey);
  const weeklyDone =
    raw.cadence === 'weekly' && raw.weeklyTarget != null
      ? countCompletionsInWeekRange(raw.completionDates, weekStart)
      : undefined;

  const streak =
    raw.cadence === 'daily'
      ? dailyStreak(raw.completionDates, todayKey)
      : raw.cadence === 'weekly' && raw.weeklyTarget != null
        ? weeklyStreak(raw.completionDates, raw.weeklyTarget, todayKey)
        : 0;

  const todayDone =
    raw.cadence === 'daily'
      ? hasDailyCompletionOn(raw.completionDates, todayKey)
      : countToday(raw.completionDates, todayKey) > 0;

  const weekQuotaMet =
    raw.cadence === 'weekly' && raw.weeklyTarget != null && weeklyDone != null
      ? weeklyDone >= raw.weeklyTarget
      : false;

  const todaySessionCount =
    raw.cadence === 'weekly' ? countToday(raw.completionDates, todayKey) : undefined;

  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    section: raw.section,
    cadence: raw.cadence,
    weeklyTarget: raw.weeklyTarget,
    streak,
    todayDone,
    weeklyCompleted: weeklyDone,
    weekQuotaMet,
    todaySessionCount,
    createdAt: raw.createdAt,
    completionDates: [...raw.completionDates],
  };
}

type PersistSlice = {
  habits: HabitPersisted[];
  defaultsSeeded: boolean;
  /**
   * История hero: сколько «ключевых» привычек закрыто за день.
   * Ключ = YYYY-MM-DD (local). Значение = { done, total }.
   */
  heroHistory: Record<string, { done: number; total: number }>;
};

type State = PersistSlice & {
  listView: (todayKey?: string) => Habit[];
  ensureDefaultHabits: () => void;
  create: (input: {
    name: string;
    icon: string;
    cadence: HabitPersisted['cadence'];
    weeklyTarget?: number;
    section?: HabitPersisted['section'];
  }) => void;
  remove: (id: string) => void;
  checkIn: (id: string, dateKey?: string) => void;
  undoWeekly: (id: string, dateKey?: string) => void;
};

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
  return new Date(y, m - 1, d).getDay(); // 0=Sun ... 6=Sat
}

function isAgencySprintDay(dateKey: string): boolean {
  const wd = weekdayFromKey(dateKey);
  return wd === 1 || wd === 2 || wd === 3 || wd === 4 || wd === 6; // пн-чт и сб
}

function hasCompletionOn(raw: HabitPersisted | undefined, dateKey: string): boolean {
  if (!raw) return false;
  return raw.completionDates.includes(dateKey);
}

/**
 * «Без компов» засчитывается 100% за вычетом одного раза в неделю.
 * Мы считаем: в каждой неделе (пн–вс) можно иметь одну «дыру» и всё равно считать её выполненной.
 * Для истории считаем только дни <= dateKey (то есть «на момент дня»).
 */
function noCompsDoneWithWeeklyAllowance(h: HabitPersisted | undefined, dateKey: string): boolean {
  if (!h) return false;
  if (h.completionDates.includes(dateKey)) return true;
  const ws = startOfWeekMondayKey(dateKey);
  let misses = 0;
  let d = ws;
  // включительно до dateKey
  while (d <= dateKey) {
    if (!h.completionDates.includes(d)) misses++;
    if (misses > 1) return false;
    d = addDays(d, 1);
  }
  return true;
}

function heroScoreForDay(habits: HabitPersisted[], dateKey: string): { done: number; total: number } {
  const byId = new Map(habits.map((h) => [h.id, h]));

  const checks: { id: string; done: () => boolean; enabled?: () => boolean }[] = [
    { id: HERO_HABIT_IDS.steps, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.steps), dateKey) },
    { id: HERO_HABIT_IDS.protein, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.protein), dateKey) },
    { id: HERO_HABIT_IDS.sleep, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.sleep), dateKey) },
    { id: HERO_HABIT_IDS.noAstro, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.noAstro), dateKey) },
    { id: HERO_HABIT_IDS.reels, done: () => hasCompletionOn(byId.get(HERO_HABIT_IDS.reels), dateKey) },
    { id: HERO_HABIT_IDS.noComps, done: () => noCompsDoneWithWeeklyAllowance(byId.get(HERO_HABIT_IDS.noComps), dateKey) },
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
    next[d] = heroScoreForDay(habits, d);
    d = addDays(d, 1);
  }
  return next;
}

export const useHabitsStore = create<State>()(
  persist(
    (set, get) => ({
      /** Сразу в initial state — видно до async rehydrate (web). */
      habits: SEED_ROWS,
      defaultsSeeded: true,
      heroHistory: {},

      ensureDefaultHabits: () => {
        const { habits, defaultsSeeded } = get();
        if (defaultsSeeded) return;
        if (habits.length > 0) {
          set({ defaultsSeeded: true });
          return;
        }
        set({
          habits: SEED_ROWS.map((h) => ({ ...h, createdAt: new Date().toISOString() })),
          defaultsSeeded: true,
        });
      },

      listView: (todayKey = localDateKey()) => {
        const { habits } = get();
        /** Порядок как в persisted-массиве (checkIn только обновляет поля строки, порядок не трогает). Без .sort — иначе возможны скачки при совпадающих датах/сид-данных. */
        return habits.map((h) => toHabitView(h, todayKey));
      },

      create: ({ name, icon, cadence, weeklyTarget, section }) => {
        get().ensureDefaultHabits();
        const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const wt =
          cadence === 'weekly' ? Math.min(7, Math.max(1, weeklyTarget ?? 3)) : undefined;
        const row: HabitPersisted = {
          id,
          name: name.trim(),
          icon,
          cadence,
          weeklyTarget: wt,
          ...(section === 'media' ? { section: 'media' as const } : {}),
          createdAt: new Date().toISOString(),
          completionDates: [],
        };
        set((s) => ({ habits: [...s.habits, row], defaultsSeeded: true }));
      },

      remove: (id) =>
        set((s) => {
          const nextHabits = s.habits.filter((h) => h.id !== id);
          // При удалении пересчитываем только сегодня (достаточно для hero, историю не трогаем полностью).
          const today = localDateKey();
          return {
            habits: nextHabits,
            heroHistory: { ...s.heroHistory, [today]: heroScoreForDay(nextHabits, today) },
          };
        }),

      checkIn: (id, dateKey) => {
        const dk = dateKey ?? localDateKey();
        set((s) => {
          const nextHabits = s.habits.map((h) => {
            if (h.id !== id) return h;
            if (h.cadence === 'daily') {
              return { ...h, completionDates: toggleDailyCompletion(h.completionDates, dk) };
            }
            return { ...h, completionDates: appendWeeklyCompletion(h.completionDates, dk) };
          });

          // «Без компов» влияет на зачёт недели → пересчитываем всю неделю до этого дня.
          const today = localDateKey();
          const end = dk < today ? dk : today;
          const start = id === HERO_HABIT_IDS.noComps ? startOfWeekMondayKey(dk) : dk;

          return {
            habits: nextHabits,
            heroHistory: updateHeroHistoryForRange(s.heroHistory, nextHabits, start, end),
          };
        });
      },

      undoWeekly: (id, dateKey) => {
        const dk = dateKey ?? localDateKey();
        set((s) => {
          const nextHabits = s.habits.map((h) =>
            h.id === id && h.cadence === 'weekly'
              ? { ...h, completionDates: undoLastWeeklyIfToday(h.completionDates, dk) }
              : h
          );

          const today = localDateKey();
          const end = dk < today ? dk : today;
          const start = id === HERO_HABIT_IDS.noComps ? startOfWeekMondayKey(dk) : dk;

          return {
            habits: nextHabits,
            heroHistory: updateHeroHistoryForRange(s.heroHistory, nextHabits, start, end),
          };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ habits: s.habits, defaultsSeeded: s.defaultsSeeded, heroHistory: s.heroHistory }),
    }
  )
);

export function habitRowToView(raw: HabitPersisted, todayKey?: string): Habit {
  return toHabitView(raw, todayKey ?? localDateKey());
}
