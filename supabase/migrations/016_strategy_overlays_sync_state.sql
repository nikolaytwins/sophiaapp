-- Месячные планы стратегии (overlay к статическому контенту) + галочки чекпоинтов — только в облаке после входа.

create table if not exists public.strategy_monthly_plans_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"cardPatches":{},"deletedCardIds":[],"extraCardsByPlanId":{},"updatedAt":""}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists strategy_monthly_plans_sync_state_updated_at
  on public.strategy_monthly_plans_sync_state (updated_at desc);

alter table public.strategy_monthly_plans_sync_state enable row level security;

drop policy if exists "strategy_monthly_plans_sync_select_own" on public.strategy_monthly_plans_sync_state;
create policy "strategy_monthly_plans_sync_select_own"
  on public.strategy_monthly_plans_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "strategy_monthly_plans_sync_insert_own" on public.strategy_monthly_plans_sync_state;
create policy "strategy_monthly_plans_sync_insert_own"
  on public.strategy_monthly_plans_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "strategy_monthly_plans_sync_update_own" on public.strategy_monthly_plans_sync_state;
create policy "strategy_monthly_plans_sync_update_own"
  on public.strategy_monthly_plans_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------

create table if not exists public.strategy_checkpoints_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"checked":{},"updatedAt":""}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists strategy_checkpoints_sync_state_updated_at
  on public.strategy_checkpoints_sync_state (updated_at desc);

alter table public.strategy_checkpoints_sync_state enable row level security;

drop policy if exists "strategy_checkpoints_sync_select_own" on public.strategy_checkpoints_sync_state;
create policy "strategy_checkpoints_sync_select_own"
  on public.strategy_checkpoints_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "strategy_checkpoints_sync_insert_own" on public.strategy_checkpoints_sync_state;
create policy "strategy_checkpoints_sync_insert_own"
  on public.strategy_checkpoints_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "strategy_checkpoints_sync_update_own" on public.strategy_checkpoints_sync_state;
create policy "strategy_checkpoints_sync_update_own"
  on public.strategy_checkpoints_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
