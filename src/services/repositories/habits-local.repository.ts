import type { Habit } from '@/entities/models';
import { localDateKey } from '@/features/habits/habitLogic';
import {
  applySprintAfterHabitCheckIn,
  applySprintAfterHabitUndoWeekly,
} from '@/features/sprint/sprintHabitBridge';
import { getHabitsPersistSlice, useHabitsStore } from '@/stores/habits.store';

import type { HabitsAnalyticsExport, HabitsRepository, UpdateHabitInput } from './types';

function delay<T>(value: T, ms = 24): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Rehydrate из AsyncStorage должен завершиться до чтения/записи — иначе сид и create затираются. */
export function ensureHabitsStoreHydrated(): Promise<void> {
  if (useHabitsStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useHabitsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export const localHabitsRepository: HabitsRepository = {
  async list() {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().ensureDefaultHabits();
    return delay(useHabitsStore.getState().listView());
  },

  async create(input) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().create(input);
    return delay(useHabitsStore.getState().listView());
  },

  async update(id: string, patch: UpdateHabitInput) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().update(id, patch);
    return delay(useHabitsStore.getState().listView());
  },

  async checkIn(id: string, dateKey?: string) {
    await ensureHabitsStoreHydrated();
    const dk = dateKey ?? localDateKey();
    const prev = useHabitsStore.getState().habits.find((h) => h.id === id);
    useHabitsStore.getState().checkIn(id, dateKey);
    const next = useHabitsStore.getState().habits.find((h) => h.id === id);
    if (prev && next) {
      applySprintAfterHabitCheckIn(id, prev, next, dk);
    }
    return useHabitsStore.getState().listView();
  },

  async adjustCounter(id: string, dateKey: string, delta: 1 | -1) {
    await ensureHabitsStoreHydrated();
    const prev = useHabitsStore.getState().habits.find((h) => h.id === id);
    useHabitsStore.getState().adjustCounter(id, dateKey, delta);
    const next = useHabitsStore.getState().habits.find((h) => h.id === id);
    if (prev && next) {
      applySprintAfterHabitCheckIn(id, prev, next, dateKey);
    }
    return useHabitsStore.getState().listView();
  },

  async setHarmfulDayChoice(id, dateKey, choice) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().setHarmfulDayChoice(id, dateKey, choice);
    return delay(useHabitsStore.getState().listView());
  },

  async undoWeekly(id: string, dateKey?: string) {
    await ensureHabitsStoreHydrated();
    const prev = useHabitsStore.getState().habits.find((h) => h.id === id);
    useHabitsStore.getState().undoWeekly(id, dateKey);
    const next = useHabitsStore.getState().habits.find((h) => h.id === id);
    if (prev && next) {
      applySprintAfterHabitUndoWeekly(id, prev, next);
    }
    return useHabitsStore.getState().listView();
  },

  async remove(id: string) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().remove(id);
    return delay(useHabitsStore.getState().listView());
  },

  async setRequired(id: string, required: boolean) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().setRequired(id, required);
    return delay(useHabitsStore.getState().listView());
  },

  async exportAnalytics(): Promise<HabitsAnalyticsExport> {
    await ensureHabitsStoreHydrated();
    const slice = getHabitsPersistSlice();
    return {
      exportedAt: new Date().toISOString(),
      habits: slice.habits.map((h) => ({
        ...h,
        completionDates: [...h.completionDates],
        ...(h.countsByDate ? { countsByDate: { ...h.countsByDate } } : {}),
        ...(h.explicitCleanDates?.length ? { explicitCleanDates: [...h.explicitCleanDates] } : {}),
      })),
      heroHistory: { ...slice.heroHistory },
    };
  },
};

export type { Habit };
