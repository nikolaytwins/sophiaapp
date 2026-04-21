import type { BacklogPriority } from '@/features/tasks/backlog.types';

export type PlannerTaskRow = {
  id: string;
  day_date: string;
  title: string;
  priority: BacklogPriority;
  is_done: boolean;
  /** Ровно одна на (user, day_date): главная задача дня. */
  is_focus: boolean;
  /** Видна на «День» и «Задачи» весь календарный пн–вс; может быть несколько. */
  is_week_focus: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlannerUserStatsRow = {
  completed_count: number;
  updated_at: string;
};

/** Фокус недели без задачи на конкретный день (привязка к понедельнику недели). */
export type PlannerWeekFocusStandaloneRow = {
  id: string;
  week_monday: string;
  title: string;
  priority: BacklogPriority;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlannerWeekFocusListItem =
  | { kind: 'standalone'; row: PlannerWeekFocusStandaloneRow }
  | { kind: 'task'; task: PlannerTaskRow };
