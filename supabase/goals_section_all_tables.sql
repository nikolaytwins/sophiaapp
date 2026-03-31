-- =============================================================================
-- Sophia OS — раздел «Цели»: все таблицы для Supabase (одним блоком в SQL Editor)
-- Порядок: привычки (опционально) → спринт → годовые цели → глобальное видение
-- Можно выполнять целиком: используется IF NOT EXISTS / DROP POLICY IF EXISTS
-- =============================================================================

-- --- 001: привычки (если ещё не создавали) — раскомментируйте при необходимости
-- create table if not exists public.habit_sync_state (
--   user_id uuid primary key references auth.users (id) on delete cascade,
--   payload jsonb not null default '{}'::jsonb,
--   updated_at timestamptz not null default now()
-- );
-- alter table public.habit_sync_state enable row level security;
-- ... политики habit_sync_* из migrations/001_habit_sync_state.sql

-- --- Спринты (вкладка «Спринт»)
create table if not exists public.sprint_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"sprints":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sprint_sync_state_updated_at on public.sprint_sync_state (updated_at desc);

alter table public.sprint_sync_state enable row level security;

drop policy if exists "sprint_sync_select_own" on public.sprint_sync_state;
create policy "sprint_sync_select_own"
  on public.sprint_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "sprint_sync_insert_own" on public.sprint_sync_state;
create policy "sprint_sync_insert_own"
  on public.sprint_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "sprint_sync_update_own" on public.sprint_sync_state;
create policy "sprint_sync_update_own"
  on public.sprint_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- Годовые цели (вкладка «Годовые цели»: сферы, спринты 1–4, очередь, общие цели)
create table if not exists public.annual_goals_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"doc":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists annual_goals_sync_state_updated_at on public.annual_goals_sync_state (updated_at desc);

alter table public.annual_goals_sync_state enable row level security;

drop policy if exists "annual_goals_select_own" on public.annual_goals_sync_state;
create policy "annual_goals_select_own"
  on public.annual_goals_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "annual_goals_insert_own" on public.annual_goals_sync_state;
create policy "annual_goals_insert_own"
  on public.annual_goals_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "annual_goals_update_own" on public.annual_goals_sync_state;
create policy "annual_goals_update_own"
  on public.annual_goals_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- Глобальное видение (вкладка «Глобальное видение»)
create table if not exists public.global_vision_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"doc":{"blocks":[],"sphereVisions":{"relationships":"","energy":"","work":""},"updatedAt":""}}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists global_vision_sync_state_updated_at on public.global_vision_sync_state (updated_at desc);

alter table public.global_vision_sync_state enable row level security;

drop policy if exists "global_vision_select_own" on public.global_vision_sync_state;
create policy "global_vision_select_own"
  on public.global_vision_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "global_vision_insert_own" on public.global_vision_sync_state;
create policy "global_vision_insert_own"
  on public.global_vision_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "global_vision_update_own" on public.global_vision_sync_state;
create policy "global_vision_update_own"
  on public.global_vision_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- Дневник и здоровье (отдельная вкладка «Дневник»)
create table if not exists public.day_journal_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"doc":{"fields":[],"entries":{},"updatedAt":""}}'::jsonb,
  -- Для уже существующей таблицы app сам нормализует старый payload; новый default нужен только для свежих инсталляций.
  updated_at timestamptz not null default now()
);

create index if not exists day_journal_sync_state_updated_at on public.day_journal_sync_state (updated_at desc);

alter table public.day_journal_sync_state enable row level security;

drop policy if exists "day_journal_select_own" on public.day_journal_sync_state;
create policy "day_journal_select_own"
  on public.day_journal_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "day_journal_insert_own" on public.day_journal_sync_state;
create policy "day_journal_insert_own"
  on public.day_journal_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "day_journal_update_own" on public.day_journal_sync_state;
create policy "day_journal_update_own"
  on public.day_journal_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
