import { create } from 'zustand';

export type DayFilter = 'all' | 'work' | 'personal';

interface DayFilterState {
  filter: DayFilter;
  setFilter: (f: DayFilter) => void;
}

export const useDayFilterStore = create<DayFilterState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));
