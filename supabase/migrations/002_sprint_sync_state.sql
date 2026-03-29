-- Sophia OS: облачное состояние спринтов (JSON payload на пользователя).
-- Выполни в Supabase → SQL Editor после 001_habit_sync_state.sql

create table if not exists public.sprint_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"sprints":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sprint_sync_state_updated_at on public.sprint_sync_state (updated_at desc);

alter table public.sprint_sync_state enable row level security;

create policy "sprint_sync_select_own"
  on public.sprint_sync_state
  for select
  using (auth.uid() = user_id);

create policy "sprint_sync_insert_own"
  on public.sprint_sync_state
  for insert
  with check (auth.uid() = user_id);

create policy "sprint_sync_update_own"
  on public.sprint_sync_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
