-- Sophia OS: облачное состояние привычек (одна строка на пользователя).
-- Выполни в Supabase → SQL Editor → New query → Run.

create table if not exists public.habit_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"habits":[],"defaultsSeeded":false,"heroHistory":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists habit_sync_state_updated_at on public.habit_sync_state (updated_at desc);

alter table public.habit_sync_state enable row level security;

create policy "habit_sync_select_own"
  on public.habit_sync_state
  for select
  using (auth.uid() = user_id);

create policy "habit_sync_insert_own"
  on public.habit_sync_state
  for insert
  with check (auth.uid() = user_id);

create policy "habit_sync_update_own"
  on public.habit_sync_state
  for update
  using (auth.uid() = user_id);
