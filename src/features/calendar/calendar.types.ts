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
};

export type PlannerWeekNotesRow = {
  week_monday: string;
  body: string;
  updated_at: string;
};
