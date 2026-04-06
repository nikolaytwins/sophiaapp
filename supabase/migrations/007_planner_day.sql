-- Sophia OS: дневной план (фокус + задачи на день), статистика закрытий, RLS.

create table if not exists public.planner_day_focus (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_date date not null,
  focus_text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day_date)
);

create index if not exists planner_day_focus_user_idx on public.planner_day_focus (user_id);

create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_date date not null,
  title text not null,
  priority text not null default 'medium'
    constraint planner_tasks_priority_check check (priority in ('high', 'medium', 'low')),
  is_done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_tasks_user_day_idx on public.planner_tasks (user_id, day_date);
create index if not exists planner_tasks_user_day_done_idx on public.planner_tasks (user_id, day_date, is_done);

create table if not exists public.planner_user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completed_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.planner_day_focus enable row level security;
alter table public.planner_tasks enable row level security;
alter table public.planner_user_stats enable row level security;

create policy "planner_day_focus_select_own"
  on public.planner_day_focus for select
  using (auth.uid() = user_id);

create policy "planner_day_focus_insert_own"
  on public.planner_day_focus for insert
  with check (auth.uid() = user_id);

create policy "planner_day_focus_update_own"
  on public.planner_day_focus for update
  using (auth.uid() = user_id);

create policy "planner_day_focus_delete_own"
  on public.planner_day_focus for delete
  using (auth.uid() = user_id);

create policy "planner_tasks_select_own"
  on public.planner_tasks for select
  using (auth.uid() = user_id);

create policy "planner_tasks_insert_own"
  on public.planner_tasks for insert
  with check (auth.uid() = user_id);

create policy "planner_tasks_update_own"
  on public.planner_tasks for update
  using (auth.uid() = user_id);

create policy "planner_tasks_delete_own"
  on public.planner_tasks for delete
  using (auth.uid() = user_id);

create policy "planner_user_stats_select_own"
  on public.planner_user_stats for select
  using (auth.uid() = user_id);

create policy "planner_user_stats_insert_own"
  on public.planner_user_stats for insert
  with check (auth.uid() = user_id);

create policy "planner_user_stats_update_own"
  on public.planner_user_stats for update
  using (auth.uid() = user_id);
