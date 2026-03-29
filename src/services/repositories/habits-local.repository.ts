import type { Habit } from '@/entities/models';
import { getHabitsPersistSlice, useHabitsStore } from '@/stores/habits.store';

import type { HabitsAnalyticsExport, HabitsRepository } from './types';

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

  async checkIn(id: string, dateKey?: string) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().checkIn(id, dateKey);
    return delay(useHabitsStore.getState().listView());
  },

  async undoWeekly(id: string, dateKey?: string) {
    await ensureHabitsStoreHydrated();
    useHabitsStore.getState().undoWeekly(id, dateKey);
    return delay(useHabitsStore.getState().listView());
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
      habits: slice.habits.map((h) => ({ ...h, completionDates: [...h.completionDates] })),
      heroHistory: { ...slice.heroHistory },
    };
  },
};

export type { Habit };
