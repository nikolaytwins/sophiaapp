-- Sophia OS: глобальное видение (JSON payload на пользователя), вкладка «Цели → Глобальное видение».
-- Выполни в Supabase → SQL Editor после 003_annual_goals_sync_state.sql

create table if not exists public.global_vision_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"doc":{"blocks":[],"sphereVisions":{"relationships":"","energy":"","work":""},"updatedAt":""}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists global_vision_sync_state_updated_at on public.global_vision_sync_state (updated_at desc);

alter table public.global_vision_sync_state enable row level security;

drop policy if exists "global_vision_select_own" on public.global_vision_sync_state;
create policy "global_vision_select_own"
  on public.global_vision_sync_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "global_vision_insert_own" on public.global_vision_sync_state;
create policy "global_vision_insert_own"
  on public.global_vision_sync_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "global_vision_update_own" on public.global_vision_sync_state;
create policy "global_vision_update_own"
  on public.global_vision_sync_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
