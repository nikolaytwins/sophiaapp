-- Sophia OS: фокус недели — несколько задач в календарной неделе (пн–вс), видно на «День» и «Задачи».

alter table public.planner_tasks
  add column if not exists is_week_focus boolean not null default false;

create index if not exists planner_tasks_week_focus_user_week_idx
  on public.planner_tasks (user_id, day_date)
  where (is_week_focus = true);
