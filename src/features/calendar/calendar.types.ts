export type PlannerCalendarEventRow = {
  id: string;
  week_monday: string;
  /** null — только неделя, без дня в сетке. */
  event_date: string | null;
  title: string;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Интервал события (локальное время при создании через ISO). null = весь день. */
  starts_at: string | null;
  ends_at: string | null;
};

export type PlannerWeekNotesRow = {
  week_monday: string;
  body: string;
  updated_at: string;
};

/** Одна плашка заметки на неделю (несколько на week_monday). */
export type PlannerWeekNoteItemRow = {
  id: string;
  week_monday: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
