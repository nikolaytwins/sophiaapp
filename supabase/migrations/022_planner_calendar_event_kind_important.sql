-- Тип события: добавляем important (важное)
alter table public.planner_calendar_events drop constraint if exists planner_calendar_events_event_kind_chk;

alter table public.planner_calendar_events
  add constraint planner_calendar_events_event_kind_chk
  check (event_kind in ('none', 'work', 'day_off', 'personal', 'important'));
