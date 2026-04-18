import type { BacklogPriority } from '@/features/tasks/backlog.types';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { priorityRank } from '@/features/tasks/taskPriorityUi';

/** Порядок отображения: фокус → открытые → приоритет → sort_order. */
export function sortPlannerTasksForDisplay(list: PlannerTaskRow[]): PlannerTaskRow[] {
  return [...list].sort((a, b) => {
    const af = Boolean(a.is_focus);
    const bf = Boolean(b.is_focus);
    if (af !== bf) return af ? -1 : 1;
    const aw = Boolean(a.is_week_focus);
    const bw = Boolean(b.is_week_focus);
    if (aw !== bw) return aw ? -1 : 1;
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    const pr = priorityRank(a.priority as BacklogPriority) - priorityRank(b.priority as BacklogPriority);
    if (pr !== 0) return pr;
    return b.sort_order - a.sort_order;
  });
}
