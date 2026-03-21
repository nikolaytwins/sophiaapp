import { create } from 'zustand';

export type PlanSegment = 'schedule' | 'tasks';

interface PlanViewState {
  segment: PlanSegment;
  setSegment: (s: PlanSegment) => void;
}

export const usePlanViewStore = create<PlanViewState>((set) => ({
  segment: 'schedule',
  setSegment: (segment) => set({ segment }),
}));
