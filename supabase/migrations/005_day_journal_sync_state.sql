-- Sophia OS: дневник дня (JSON entries по датам), синхронизация после входа.
-- Выполни в Supabase → SQL Editor после 004_global_vision_sync_state.sql

create table if not exists public.day_journal_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"entries":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists day_journal_sync_state_updated_at on public.day_journal_sync_state (updated_at desc);

alter table public.day_journal_sync_state enable row level security;

drop policy if exists "day_journal_select_own" on public.day_journal_sync_state;
create policy "day_journal_select_own"
  on public.day_journal_sync_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "day_journal_insert_own" on public.day_journal_sync_state;
create policy "day_journal_insert_own"
  on public.day_journal_sync_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "day_journal_update_own" on public.day_journal_sync_state;
create policy "day_journal_update_own"
  on public.day_journal_sync_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
