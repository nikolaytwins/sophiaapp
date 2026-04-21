import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

function touchNow(): string {
  return new Date().toISOString();
}

export type StrategyCheckpointsCloudPayload = {
  checked: Record<string, boolean>;
  updatedAt: string;
};

type State = {
  /** id чекпоинта → отмечен */
  checked: Record<string, boolean>;
  payloadUpdatedAt: string;
  toggle: (id: string) => void;
  replaceFromCloud: (payload: StrategyCheckpointsCloudPayload) => void;
  exportPayload: () => StrategyCheckpointsCloudPayload;
};

const STORAGE_KEY = 'sophia-strategy-checkpoints-v1';

export const useStrategyCheckpointsStore = create<State>()(
  persist(
    (set, get) => ({
      checked: {},
      payloadUpdatedAt: '',

      exportPayload: () => ({
        checked: { ...get().checked },
        updatedAt: get().payloadUpdatedAt || '',
      }),

      replaceFromCloud: (payload) =>
        set({
          checked:
            payload.checked && typeof payload.checked === 'object' && !Array.isArray(payload.checked)
              ? { ...payload.checked }
              : {},
          payloadUpdatedAt:
            typeof payload.updatedAt === 'string' && payload.updatedAt ? payload.updatedAt : touchNow(),
        }),

      toggle: (id) =>
        set((s) => ({
          checked: { ...s.checked, [id]: !s.checked[id] },
          payloadUpdatedAt: touchNow(),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ checked: s.checked, payloadUpdatedAt: s.payloadUpdatedAt }),
      migrate: (persisted, fromVersion) => {
        const p = persisted as { checked?: unknown; payloadUpdatedAt?: unknown } | undefined;
        const raw = p?.checked;
        const checked: Record<string, boolean> = {};
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === 'boolean') checked[k] = v;
          }
        }
        const payloadUpdatedAt =
          typeof p?.payloadUpdatedAt === 'string' ? p.payloadUpdatedAt : fromVersion < 2 ? '' : '';
        return { checked, payloadUpdatedAt };
      },
    }
  )
);

export function ensureStrategyCheckpointsHydrated(): Promise<void> {
  if (useStrategyCheckpointsStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useStrategyCheckpointsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
