import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Habit, HabitPersisted } from '@/entities/models';
import {
  countCompletionsInWeekRange,
  dailyStreak,
  hasDailyCompletionOn,
  localDateKey,
  startOfWeekMondayKey,
  weeklyStreak,
} from '@/features/habits/habitLogic';
import {
  checkInSlice,
  createHabitSlice,
  ensureDefaultHabitsSlice,
  HABITS_SEED_ROWS,
  normalizeHabitsSlice,
  removeHabitSlice,
  setRequiredSlice,
  type HabitsPersistSlice,
  undoWeeklySlice,
} from '@/features/habits/habitsPersistReducer';

function countToday(completionDates: string[], todayKey: string): number {
  return completionDates.filter((d) => d === todayKey).length;
}

/** Новый ключ — сбрасывает старый state в localStorage (обновление списка сидов). */
const STORAGE_KEY = 'sophia-os-habits-v4';

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
    required: raw.required !== false,
  };
}

type State = HabitsPersistSlice & {
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
  setRequired: (id: string, required: boolean) => void;
};

export const useHabitsStore = create<State>()(
  persist(
    (set, get) => ({
      habits: HABITS_SEED_ROWS,
      defaultsSeeded: true,
      heroHistory: {},

      ensureDefaultHabits: () => set((s) => ensureDefaultHabitsSlice(s)),

      listView: (todayKey = localDateKey()) => {
        const { habits } = get();
        /** Порядок как в persisted-массиве (checkIn только обновляет поля строки, порядок не трогает). Без .sort — иначе возможны скачки при совпадающих датах/сид-данных. */
        return habits.map((h) => toHabitView(h, todayKey));
      },

      create: (input) => set((s) => createHabitSlice(s, input)),

      remove: (id) => set((s) => removeHabitSlice(s, id)),

      checkIn: (id, dateKey) => set((s) => checkInSlice(s, id, dateKey)),

      undoWeekly: (id, dateKey) => set((s) => undoWeeklySlice(s, id, dateKey)),

      setRequired: (id, required) => set((s) => setRequiredSlice(s, id, required)),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => normalizeHabitsSlice({ habits: s.habits, defaultsSeeded: s.defaultsSeeded, heroHistory: s.heroHistory }),
      migrate: (persisted) => {
        const p = persisted as HabitsPersistSlice | undefined;
        if (!p) {
          return { habits: HABITS_SEED_ROWS, defaultsSeeded: true, heroHistory: {} };
        }
        return normalizeHabitsSlice({
          habits: Array.isArray(p.habits) ? p.habits : [],
          defaultsSeeded: Boolean(p.defaultsSeeded),
          heroHistory: p.heroHistory ?? {},
        });
      },
    }
  )
);

export function habitRowToView(raw: HabitPersisted, todayKey?: string): Habit {
  return toHabitView(raw, todayKey ?? localDateKey());
}

/** Срез для синка / экспорта (после гидратации). */
export function getHabitsPersistSlice(): HabitsPersistSlice {
  const { habits, defaultsSeeded, heroHistory } = useHabitsStore.getState();
  return normalizeHabitsSlice({ habits, defaultsSeeded, heroHistory });
}
