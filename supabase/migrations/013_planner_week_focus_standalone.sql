-- Sophia OS: фокус недели без привязки к конкретному дню задачи (неделя = понедельник week_monday).

create table if not exists public.planner_week_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_monday date not null,
  title text not null,
  priority text not null default 'medium'
    constraint planner_week_focus_priority_check check (priority in ('high', 'medium', 'low')),
  is_done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_week_focus_user_week_idx
  on public.planner_week_focus (user_id, week_monday);

alter table public.planner_week_focus enable row level security;

create policy "planner_week_focus_select_own"
  on public.planner_week_focus for select
  using (auth.uid() = user_id);

create policy "planner_week_focus_insert_own"
  on public.planner_week_focus for insert
  with check (auth.uid() = user_id);

create policy "planner_week_focus_update_own"
  on public.planner_week_focus for update
  using (auth.uid() = user_id);

create policy "planner_week_focus_delete_own"
  on public.planner_week_focus for delete
  using (auth.uid() = user_id);
