import type { QueryClient } from '@tanstack/react-query';

import { addDays, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import {
  PLANNER_CALENDAR_EVENTS_QUERY_KEY,
  PLANNER_TASKS_QUERY_KEY,
  PLANNER_TASKS_RANGE_QUERY_KEY,
  PLANNER_WEEK_FOCUS_QUERY_KEY,
  PLANNER_WEEK_NOTES_QUERY_KEY,
} from '@/features/tasks/queryKeys';

/** Сброс кэша списка дня и «фокуса недели» для календарной недели, в которой лежит `anchorDateKey`. */
export function invalidatePlannerWeekQueries(qc: QueryClient, anchorDateKey: string): void {
  const mon = startOfWeekMondayKey(anchorDateKey);
  void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_FOCUS_QUERY_KEY, mon] });
  for (let i = 0; i < 7; i += 1) {
    void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_QUERY_KEY, addDays(mon, i)] });
  }
  void qc.invalidateQueries({ queryKey: [...PLANNER_TASKS_RANGE_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTES_QUERY_KEY, mon] });
}

/** Только события календаря и заметки недели (без задач). */
export function invalidatePlannerCalendarQueries(qc: QueryClient, anchorDateKey: string): void {
  const mon = startOfWeekMondayKey(anchorDateKey);
  void qc.invalidateQueries({ queryKey: [...PLANNER_CALENDAR_EVENTS_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: [...PLANNER_WEEK_NOTES_QUERY_KEY, mon] });
}
