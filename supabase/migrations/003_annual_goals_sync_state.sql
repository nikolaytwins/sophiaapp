-- Sophia OS: годовые цели (JSON payload на пользователя), синхронизация с приложением после входа.
-- Выполни в Supabase → SQL Editor после 002_sprint_sync_state.sql

create table if not exists public.annual_goals_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"doc":{"year":2026,"spheres":{"relationships":{"sphere":"relationships","visionText":"","cards":[]},"energy":{"sphere":"energy","visionText":"","cards":[]},"work":{"sphere":"work","visionText":"","cards":[]}},"updatedAt":""}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists annual_goals_sync_state_updated_at on public.annual_goals_sync_state (updated_at desc);

alter table public.annual_goals_sync_state enable row level security;

create policy "annual_goals_select_own"
  on public.annual_goals_sync_state
  for select
  using (auth.uid() = user_id);

create policy "annual_goals_insert_own"
  on public.annual_goals_sync_state
  for insert
  with check (auth.uid() = user_id);

create policy "annual_goals_update_own"
  on public.annual_goals_sync_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
