import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { StrategySideGoalSeedDef } from '@/features/strategy/strategy.config';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

export type SideGoalDateMode = 'none' | 'single' | 'range';

/** `numeric` — шкала и числа (при target ≤ 1 показывается одна галочка). `checkbox` — только галочка, без полосы прогресса. */
export type SideGoalProgressKind = 'numeric' | 'checkbox';

export type SideGoalPersisted = {
  id: string;
  title: string;
  /** Текст под заголовком на карточке и в просмотре. */
  description: string;
  current: number;
  target: number;
  progressKind: SideGoalProgressKind;
  /** URL (https из Supabase) или устаревшие локальные uri — по возможности загрузить заново. */
  photoUris: string[];
  /** Галочка «на горизонте» — блок «Горизонт». */
  isHorizon: boolean;
  /** Явно закрепить как ближайшую (крупная карточка во вкладке «Ближайшие»). */
  isNearestPinned: boolean;
  dateMode: SideGoalDateMode;
  /** YYYY-MM-DD при dateMode === 'single' */
  dateSingle: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export type SideGoalsSyncPayload = {
  goals: SideGoalPersisted[];
  updatedAt: string;
};

function normalizeGoal(raw: unknown): SideGoalPersisted | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  const description =
    typeof o.description === 'string' ? o.description.trim() : '';
  const pkRaw = o.progressKind;
  const progressKind: SideGoalProgressKind = pkRaw === 'checkbox' ? 'checkbox' : 'numeric';
  const target = typeof o.target === 'number' && Number.isFinite(o.target) ? Math.max(1, Math.round(o.target)) : 1;
  let current = typeof o.current === 'number' && Number.isFinite(o.current) ? Math.max(0, Math.round(o.current)) : 0;
  current = Math.min(current, target);
  const photoUris = Array.isArray(o.photoUris)
    ? o.photoUris.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  const isHorizon = Boolean(o.isHorizon);
  const isNearestPinned = Boolean(o.isNearestPinned);
  const dm = o.dateMode;
  const dateMode: SideGoalDateMode =
    dm === 'single' || dm === 'range' || dm === 'none' ? dm : 'none';
  const dateSingle = typeof o.dateSingle === 'string' && o.dateSingle.trim() ? o.dateSingle.trim() : null;
  const dateFrom = typeof o.dateFrom === 'string' && o.dateFrom.trim() ? o.dateFrom.trim() : null;
  const dateTo = typeof o.dateTo === 'string' && o.dateTo.trim() ? o.dateTo.trim() : null;
  const title = o.title.trim() || 'Цель';
  let out: SideGoalPersisted = {
    id: o.id,
    title,
    description,
    target,
    current,
    progressKind,
    photoUris,
    isHorizon,
    isNearestPinned,
    dateMode,
    dateSingle,
    dateFrom,
    dateTo,
  };
  if (out.progressKind === 'checkbox') {
    out = { ...out, target: 1, current: out.current >= 1 ? 1 : 0 };
  }
  return out;
}

export function normalizeSideGoalsPayload(raw: unknown): SideGoalsSyncPayload {
  if (!raw || typeof raw !== 'object') return { goals: [], updatedAt: '' };
  const o = raw as Record<string, unknown>;
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : '';
  const goalsRaw = o.goals;
  const goals = Array.isArray(goalsRaw)
    ? goalsRaw.map(normalizeGoal).filter((g): g is SideGoalPersisted => g != null)
    : [];
  return { goals, updatedAt };
}

type State = {
  goals: SideGoalPersisted[];
  /** ISO время последнего локального изменения (для merge с облаком). */
  payloadUpdatedAt: string;
  seedFromSeedsIfEmpty: (seeds: StrategySideGoalSeedDef[]) => void;
  /** Новая цель на доске (id генерируется внутри). */
  addSideGoal: (
    defaults?: Partial<
      Pick<
        SideGoalPersisted,
        | 'isHorizon'
        | 'isNearestPinned'
        | 'dateMode'
        | 'dateSingle'
        | 'dateFrom'
        | 'dateTo'
        | 'description'
        | 'progressKind'
      >
    >
  ) => string;
  updateSideGoal: (
    id: string,
    patch: Partial<
      Pick<
        SideGoalPersisted,
        | 'title'
        | 'description'
        | 'current'
        | 'target'
        | 'progressKind'
        | 'isHorizon'
        | 'isNearestPinned'
        | 'photoUris'
        | 'dateMode'
        | 'dateSingle'
        | 'dateFrom'
        | 'dateTo'
      >
    >
  ) => void;
  removeSideGoal: (id: string) => void;
  appendSideGoalPhotos: (id: string, uris: string[]) => void;
  removeSideGoalPhotoAt: (id: string, index: number) => void;
  replaceFromCloud: (payload: SideGoalsSyncPayload) => void;
  exportPayload: () => SideGoalsSyncPayload;
};

const STORAGE_KEY = 'sophia-side-goals-v1';

function touchNow(): string {
  return new Date().toISOString();
}

export const useSideGoalsStore = create<State>()(
  persist(
    (set, get) => ({
      goals: [],
      payloadUpdatedAt: '',

      exportPayload: () => ({
        goals: get().goals,
        updatedAt: get().payloadUpdatedAt || '',
      }),

      replaceFromCloud: (payload) =>
        set(() => {
          const n = normalizeSideGoalsPayload(payload);
          return {
            goals: n.goals,
            payloadUpdatedAt: n.updatedAt || touchNow(),
          };
        }),

      seedFromSeedsIfEmpty: (seeds) =>
        set((s) => {
          if (s.goals.length > 0) return s;
          return {
            goals: seeds.map((x) => ({
              id: x.id,
              title: x.title,
              description: '',
              current: Math.max(0, Math.round(x.defaultCurrent ?? 0)),
              target: Math.max(1, Math.round(x.defaultTarget)),
              progressKind: 'numeric' as const,
              photoUris: [],
              isHorizon: false,
              isNearestPinned: false,
              dateMode: 'none' as const,
              dateSingle: null,
              dateFrom: null,
              dateTo: null,
            })),
            payloadUpdatedAt: touchNow(),
          };
        }),

      addSideGoal: (defaults) => {
        const id = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const pk = defaults?.progressKind === 'checkbox' ? 'checkbox' : 'numeric';
        const goal: SideGoalPersisted = {
          id,
          title: 'Новая цель',
          description: (defaults?.description ?? '').trim(),
          current: 0,
          target: pk === 'checkbox' ? 1 : 1000,
          progressKind: pk,
          photoUris: [],
          isHorizon: defaults?.isHorizon ?? false,
          isNearestPinned: defaults?.isNearestPinned ?? false,
          dateMode: defaults?.dateMode ?? 'none',
          dateSingle: defaults?.dateSingle ?? null,
          dateFrom: defaults?.dateFrom ?? null,
          dateTo: defaults?.dateTo ?? null,
        };
        set((s) => ({ goals: [...s.goals, goal], payloadUpdatedAt: touchNow() }));
        return id;
      },

      updateSideGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            let nextProgressKind = patch.progressKind != null ? patch.progressKind : g.progressKind;
            const nextTitle = patch.title != null ? patch.title.trim() || g.title : g.title;
            const nextDescription = patch.description != null ? patch.description.trim() : g.description;
            let nextTarget = patch.target != null ? Math.max(1, Math.round(patch.target)) : g.target;
            let nextCurrent = patch.current != null ? Math.max(0, Math.round(patch.current)) : g.current;
            if (nextProgressKind === 'checkbox') {
              nextTarget = 1;
              nextCurrent = nextCurrent >= 1 ? 1 : 0;
            } else {
              nextCurrent = Math.min(nextCurrent, nextTarget);
            }
            const nextHorizon = patch.isHorizon != null ? patch.isHorizon : g.isHorizon;
            const nextNearest = patch.isNearestPinned != null ? patch.isNearestPinned : g.isNearestPinned;
            const nextPhotos =
              patch.photoUris != null
                ? patch.photoUris.filter((u) => typeof u === 'string' && u.trim().length > 0)
                : g.photoUris;
            const nextDateMode = patch.dateMode != null ? patch.dateMode : g.dateMode;
            const nextDateSingle = patch.dateSingle !== undefined ? patch.dateSingle : g.dateSingle;
            const nextDateFrom = patch.dateFrom !== undefined ? patch.dateFrom : g.dateFrom;
            const nextDateTo = patch.dateTo !== undefined ? patch.dateTo : g.dateTo;
            return {
              ...g,
              title: nextTitle,
              description: nextDescription,
              progressKind: nextProgressKind,
              target: nextTarget,
              current: nextCurrent,
              isHorizon: nextHorizon,
              isNearestPinned: nextNearest,
              photoUris: nextPhotos,
              dateMode: nextDateMode,
              dateSingle: nextDateSingle,
              dateFrom: nextDateFrom,
              dateTo: nextDateTo,
            };
          }),
          payloadUpdatedAt: touchNow(),
        })),

      removeSideGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          payloadUpdatedAt: touchNow(),
        })),

      appendSideGoalPhotos: (id, uris) =>
        set((s) => {
          const clean = uris.filter((u) => typeof u === 'string' && u.trim().length > 0);
          if (clean.length === 0) return s;
          return {
            goals: s.goals.map((g) => (g.id !== id ? g : { ...g, photoUris: [...g.photoUris, ...clean] })),
            payloadUpdatedAt: touchNow(),
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
          payloadUpdatedAt: touchNow(),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ goals: s.goals, payloadUpdatedAt: s.payloadUpdatedAt }),
      migrate: (persisted, fromVersion) => {
        const p = persisted as { goals?: unknown[]; payloadUpdatedAt?: unknown } | undefined;
        const raw = p?.goals;
        if (!Array.isArray(raw)) {
          return {
            goals: [],
            payloadUpdatedAt: typeof p?.payloadUpdatedAt === 'string' ? p.payloadUpdatedAt : '',
          };
        }
        let goals = raw.map(normalizeGoal).filter((g): g is SideGoalPersisted => g != null);
        if (fromVersion < 3) {
          goals = goals.map((g) =>
            g.isHorizon && g.isNearestPinned ? { ...g, isNearestPinned: false } : g
          );
        }
        const payloadUpdatedAt = typeof p?.payloadUpdatedAt === 'string' ? p.payloadUpdatedAt : '';
        return { goals, payloadUpdatedAt };
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
