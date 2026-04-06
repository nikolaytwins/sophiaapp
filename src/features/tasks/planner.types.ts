import type { BacklogPriority } from '@/features/tasks/backlog.types';

export type PlannerTaskRow = {
  id: string;
  day_date: string;
  title: string;
  priority: BacklogPriority;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlannerDayFocusRow = {
  day_date: string;
  focus_text: string;
  updated_at: string;
};

export type PlannerUserStatsRow = {
  completed_count: number;
  updated_at: string;
};
