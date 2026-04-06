import type { BacklogPriority } from '@/features/tasks/backlog.types';

export type PlannerTaskRow = {
  id: string;
  day_date: string;
  title: string;
  priority: BacklogPriority;
  is_done: boolean;
  /** Ровно одна на (user, day_date): главная задача дня. */
  is_focus: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlannerUserStatsRow = {
  completed_count: number;
  updated_at: string;
};
