import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

type State = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

/**
 * Новый ключ: старый `sophia-theme-mode` часто содержал `light` + version 2,
 * тогда migrate больше не вызывался — тема «залипала» светлой. С новым ключом
 * все получают дефолт dark; переключение светлой темы снова сохранится сюда.
 */
const PERSIST_KEY = 'sophia-os-theme-pref';

export const useThemeStore = create<State>()(
  persist(
    (set, get) => ({
      mode: 'dark' satisfies ThemeMode,
      setMode: (m) => set({ mode: m }),
      toggle: () => set({ mode: get().mode === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);
