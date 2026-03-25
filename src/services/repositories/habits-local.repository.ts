import type { Habit } from '@/entities/models';
import { useHabitsStore } from '@/stores/habits.store';

import type { HabitsRepository } from './types';

function delay<T>(value: T, ms = 24): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Rehydrate из AsyncStorage должен завершиться до чтения/записи — иначе сид и create затираются. */
function ensureStoreHydrated(): Promise<void> {
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
    await ensureStoreHydrated();
    useHabitsStore.getState().ensureDefaultHabits();
    return delay(useHabitsStore.getState().listView());
  },

  async create(input) {
    await ensureStoreHydrated();
    useHabitsStore.getState().create(input);
    return delay(useHabitsStore.getState().listView());
  },

  async checkIn(id: string, dateKey?: string) {
    await ensureStoreHydrated();
    useHabitsStore.getState().checkIn(id, dateKey);
    return delay(useHabitsStore.getState().listView());
  },

  async undoWeekly(id: string, dateKey?: string) {
    await ensureStoreHydrated();
    useHabitsStore.getState().undoWeekly(id, dateKey);
    return delay(useHabitsStore.getState().listView());
  },

  async remove(id: string) {
    await ensureStoreHydrated();
    useHabitsStore.getState().remove(id);
    return delay(useHabitsStore.getState().listView());
  },
};

export type { Habit };
