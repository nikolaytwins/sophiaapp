import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { StrategySideGoalSeedDef } from '@/features/strategy/strategy.config';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

export type SideGoalPersisted = {
  id: string;
  title: string;
  current: number;
  target: number;
  /** Снимки с устройства (file:// …); для доски желаний, без лимита. */
  photoUris: string[];
  /** Галочка «на горизонте» — цель дальнего горизонта, не ближайший фокус. */
  isHorizon: boolean;
};

function normalizeGoal(raw: unknown): SideGoalPersisted | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  const target = typeof o.target === 'number' && Number.isFinite(o.target) ? Math.max(1, Math.round(o.target)) : 1;
  let current = typeof o.current === 'number' && Number.isFinite(o.current) ? Math.max(0, Math.round(o.current)) : 0;
  current = Math.min(current, target);
  const photoUris = Array.isArray(o.photoUris)
    ? o.photoUris.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  const isHorizon = Boolean(o.isHorizon);
  const title = o.title.trim() || 'Цель';
  return { id: o.id, title, target, current, photoUris, isHorizon };
}

type State = {
  goals: SideGoalPersisted[];
  seedFromSeedsIfEmpty: (seeds: StrategySideGoalSeedDef[]) => void;
  updateSideGoal: (
    id: string,
    patch: Partial<Pick<SideGoalPersisted, 'title' | 'current' | 'target' | 'isHorizon' | 'photoUris'>>
  ) => void;
  appendSideGoalPhotos: (id: string, uris: string[]) => void;
  removeSideGoalPhotoAt: (id: string, index: number) => void;
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
              photoUris: [],
              isHorizon: false,
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
            const nextHorizon = patch.isHorizon != null ? patch.isHorizon : g.isHorizon;
            const nextPhotos =
              patch.photoUris != null
                ? patch.photoUris.filter((u) => typeof u === 'string' && u.trim().length > 0)
                : g.photoUris;
            return {
              ...g,
              title: nextTitle,
              target: nextTarget,
              current: nextCurrent,
              isHorizon: nextHorizon,
              photoUris: nextPhotos,
            };
          }),
        })),
      appendSideGoalPhotos: (id, uris) =>
        set((s) => {
          const clean = uris.filter((u) => typeof u === 'string' && u.trim().length > 0);
          if (clean.length === 0) return s;
          return {
            goals: s.goals.map((g) => (g.id !== id ? g : { ...g, photoUris: [...g.photoUris, ...clean] })),
          };
        }),
      removeSideGoalPhotoAt: (id, index) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const next = [...g.photoUris];
            if (index < 0 || index >= next.length) return g;
            next.splice(index, 1);
            return { ...g, photoUris: next };
          }),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ goals: s.goals }),
      migrate: (persisted) => {
        const p = persisted as { goals?: unknown[] } | undefined;
        const raw = p?.goals;
        if (!Array.isArray(raw)) return { goals: [] };
        const goals = raw.map(normalizeGoal).filter((g): g is SideGoalPersisted => g != null);
        return { goals };
      },
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
