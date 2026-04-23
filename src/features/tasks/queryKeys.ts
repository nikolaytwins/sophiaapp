export const BACKLOG_TYPES_QUERY_KEY = ['backlog-task-types'] as const;
export const BACKLOG_TASKS_QUERY_KEY = ['backlog-tasks'] as const;

export const PLANNER_TASKS_QUERY_KEY = ['planner-tasks'] as const;
/** Диапазон дат для календаря: [startKey, endKey] YYYY-MM-DD. */
export const PLANNER_TASKS_RANGE_QUERY_KEY = ['planner-tasks-range'] as const;
export const PLANNER_STATS_QUERY_KEY = ['planner-stats'] as const;
/** Второй элемент ключа — понедельник недели YYYY-MM-DD. */
export const PLANNER_WEEK_FOCUS_QUERY_KEY = ['planner-week-focus'] as const;
export const PLANNER_CALENDAR_EVENTS_QUERY_KEY = ['planner-calendar-events'] as const;
export const PLANNER_WEEK_NOTES_QUERY_KEY = ['planner-week-notes'] as const;
/** Плашки заметок недели; второй элемент — week_monday YYYY-MM-DD. */
export const PLANNER_WEEK_NOTE_ITEMS_QUERY_KEY = ['planner-week-note-items'] as const;
