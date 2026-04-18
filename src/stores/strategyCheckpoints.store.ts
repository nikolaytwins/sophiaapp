import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

type State = {
  /** id чекпоинта → отмечен */
  checked: Record<string, boolean>;
  toggle: (id: string) => void;
};

const STORAGE_KEY = 'sophia-strategy-checkpoints-v1';

export const useStrategyCheckpointsStore = create<State>()(
  persist(
    (set) => ({
      checked: {},
      toggle: (id) =>
        set((s) => ({
          checked: { ...s.checked, [id]: !s.checked[id] },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ checked: s.checked }),
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
