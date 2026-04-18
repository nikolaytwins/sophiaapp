import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { StrategySideGoalSeedDef } from '@/features/strategy/strategy.config';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

export type SideGoalPersisted = {
  id: string;
  title: string;
  current: number;
  target: number;
};

type State = {
  goals: SideGoalPersisted[];
  seedFromSeedsIfEmpty: (seeds: StrategySideGoalSeedDef[]) => void;
  updateSideGoal: (id: string, patch: Partial<Pick<SideGoalPersisted, 'title' | 'current' | 'target'>>) => void;
};

const STORAGE_KEY = 'sophia-side-goals-v1';

export const useSideGoalsStore = create<State>()(
  persist(
    (set) => ({
      goals: [],
      seedFromSeedsIfEmpty: (seeds) =>
        set((s) => {
          if (s.goals.length > 0) return s;
          return {
            goals: seeds.map((x) => ({
              id: x.id,
              title: x.title,
              current: Math.max(0, Math.round(x.defaultCurrent ?? 0)),
              target: Math.max(1, Math.round(x.defaultTarget)),
            })),
          };
        }),
      updateSideGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const nextTarget = patch.target != null ? Math.max(1, Math.round(patch.target)) : g.target;
            const nextTitle = patch.title != null ? patch.title.trim() || g.title : g.title;
            let nextCurrent = patch.current != null ? Math.max(0, Math.round(patch.current)) : g.current;
            nextCurrent = Math.min(nextCurrent, nextTarget);
            return { ...g, title: nextTitle, target: nextTarget, current: nextCurrent };
          }),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ goals: s.goals }),
    }
  )
);

export function ensureSideGoalsHydrated(): Promise<void> {
  if (useSideGoalsStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useSideGoalsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
