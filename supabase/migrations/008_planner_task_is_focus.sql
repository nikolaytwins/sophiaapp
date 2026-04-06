-- Sophia OS: фокус дня = одна задача на день (is_focus).

alter table public.planner_tasks
  add column if not exists is_focus boolean not null default false;

create unique index if not exists planner_tasks_one_focus_per_user_day
  on public.planner_tasks (user_id, day_date)
  where (is_focus = true);
