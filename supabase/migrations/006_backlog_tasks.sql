-- Sophia OS: бэклог задач (типы + задачи), по одному пользователю через RLS.

create table if not exists public.backlog_task_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint backlog_task_types_user_name_unique unique (user_id, name)
);

create index if not exists backlog_task_types_user_id_idx on public.backlog_task_types (user_id);

create table if not exists public.backlog_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  type_id uuid references public.backlog_task_types (id) on delete set null,
  priority text not null default 'medium'
    constraint backlog_tasks_priority_check check (priority in ('high', 'medium', 'low')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backlog_tasks_user_id_idx on public.backlog_tasks (user_id);
create index if not exists backlog_tasks_user_sort_idx on public.backlog_tasks (user_id, sort_order, created_at desc);

alter table public.backlog_task_types enable row level security;
alter table public.backlog_tasks enable row level security;

create policy "backlog_task_types_select_own"
  on public.backlog_task_types for select
  using (auth.uid() = user_id);

create policy "backlog_task_types_insert_own"
  on public.backlog_task_types for insert
  with check (auth.uid() = user_id);

create policy "backlog_task_types_update_own"
  on public.backlog_task_types for update
  using (auth.uid() = user_id);

create policy "backlog_task_types_delete_own"
  on public.backlog_task_types for delete
  using (auth.uid() = user_id);

create policy "backlog_tasks_select_own"
  on public.backlog_tasks for select
  using (auth.uid() = user_id);

create policy "backlog_tasks_insert_own"
  on public.backlog_tasks for insert
  with check (auth.uid() = user_id);

create policy "backlog_tasks_update_own"
  on public.backlog_tasks for update
  using (auth.uid() = user_id);

create policy "backlog_tasks_delete_own"
  on public.backlog_tasks for delete
  using (auth.uid() = user_id);

-- updated_at обновляется из приложения при правках.
