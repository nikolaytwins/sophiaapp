-- Sophia OS: время начала/конца события (для недельной сетки и будущего Apple Calendar).

alter table public.planner_calendar_events
  add column if not exists starts_at timestamptz null;

alter table public.planner_calendar_events
  add column if not exists ends_at timestamptz null;
