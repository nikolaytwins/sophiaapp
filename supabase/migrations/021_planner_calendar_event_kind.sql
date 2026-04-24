-- Тип события календаря: none | work | day_off | personal
alter table public.planner_calendar_events
  add column if not exists event_kind text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'planner_calendar_events_event_kind_chk'
  ) then
    alter table public.planner_calendar_events
      add constraint planner_calendar_events_event_kind_chk
      check (event_kind in ('none', 'work', 'day_off', 'personal'));
  end if;
end $$;
