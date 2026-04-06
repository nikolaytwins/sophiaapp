-- Sophia OS: личные финансы (импорт из Twinworks SQLite, id cuid сохраняются).
-- RLS: только владелец user_id.

create table if not exists public.finance_accounts (
  id text not null primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null default 'RUB',
  balance numeric not null default 0,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_accounts_user_idx on public.finance_accounts (user_id);
create index if not exists finance_accounts_user_sort_idx on public.finance_accounts (user_id, sort_order, name);

create table if not exists public.finance_transactions (
  id text not null primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date timestamptz not null,
  type text not null,
  amount numeric not null,
  currency text not null default 'RUB',
  category text,
  description text,
  from_account_id text,
  to_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_from_fk
    foreign key (from_account_id) references public.finance_accounts (id) on delete set null,
  constraint finance_transactions_to_fk
    foreign key (to_account_id) references public.finance_accounts (id) on delete set null
);

create index if not exists finance_transactions_user_date_idx on public.finance_transactions (user_id, date desc);
create index if not exists finance_transactions_user_type_idx on public.finance_transactions (user_id, type);

create table if not exists public.finance_expense_categories (
  id text not null primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  expected_monthly numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_expense_categories_user_name unique (user_id, name)
);

create index if not exists finance_expense_categories_user_idx on public.finance_expense_categories (user_id);

create table if not exists public.finance_expense_settings (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  daily_expense_limit numeric not null default 3500,
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_one_time_expenses (
  id text not null primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric not null,
  month int not null,
  year int not null,
  paid boolean not null default false,
  type text not null default 'personal',
  created_at timestamptz not null default now()
);

create index if not exists finance_one_time_user_ym_idx on public.finance_one_time_expenses (user_id, year desc, month desc);

-- Снимки месяцев (импорт monthly_history / ручное закрытие).
create table if not exists public.finance_month_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  month int not null,
  total_balance numeric not null default 0,
  personal_expenses numeric not null default 0,
  business_expenses numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint finance_month_snapshots_user_ym unique (user_id, year, month)
);

create index if not exists finance_month_snapshots_user_idx on public.finance_month_snapshots (user_id, year desc, month desc);

alter table public.finance_accounts enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_expense_categories enable row level security;
alter table public.finance_expense_settings enable row level security;
alter table public.finance_one_time_expenses enable row level security;
alter table public.finance_month_snapshots enable row level security;

-- finance_accounts
create policy "finance_accounts_select_own" on public.finance_accounts for select using (auth.uid() = user_id);
create policy "finance_accounts_insert_own" on public.finance_accounts for insert with check (auth.uid() = user_id);
create policy "finance_accounts_update_own" on public.finance_accounts for update using (auth.uid() = user_id);
create policy "finance_accounts_delete_own" on public.finance_accounts for delete using (auth.uid() = user_id);

-- finance_transactions
create policy "finance_transactions_select_own" on public.finance_transactions for select using (auth.uid() = user_id);
create policy "finance_transactions_insert_own" on public.finance_transactions for insert with check (auth.uid() = user_id);
create policy "finance_transactions_update_own" on public.finance_transactions for update using (auth.uid() = user_id);
create policy "finance_transactions_delete_own" on public.finance_transactions for delete using (auth.uid() = user_id);

-- finance_expense_categories
create policy "finance_expense_categories_select_own" on public.finance_expense_categories for select using (auth.uid() = user_id);
create policy "finance_expense_categories_insert_own" on public.finance_expense_categories for insert with check (auth.uid() = user_id);
create policy "finance_expense_categories_update_own" on public.finance_expense_categories for update using (auth.uid() = user_id);
create policy "finance_expense_categories_delete_own" on public.finance_expense_categories for delete using (auth.uid() = user_id);

-- finance_expense_settings
create policy "finance_expense_settings_select_own" on public.finance_expense_settings for select using (auth.uid() = user_id);
create policy "finance_expense_settings_insert_own" on public.finance_expense_settings for insert with check (auth.uid() = user_id);
create policy "finance_expense_settings_update_own" on public.finance_expense_settings for update using (auth.uid() = user_id);

-- finance_one_time_expenses
create policy "finance_one_time_select_own" on public.finance_one_time_expenses for select using (auth.uid() = user_id);
create policy "finance_one_time_insert_own" on public.finance_one_time_expenses for insert with check (auth.uid() = user_id);
create policy "finance_one_time_update_own" on public.finance_one_time_expenses for update using (auth.uid() = user_id);
create policy "finance_one_time_delete_own" on public.finance_one_time_expenses for delete using (auth.uid() = user_id);

-- finance_month_snapshots
create policy "finance_month_snapshots_select_own" on public.finance_month_snapshots for select using (auth.uid() = user_id);
create policy "finance_month_snapshots_insert_own" on public.finance_month_snapshots for insert with check (auth.uid() = user_id);
create policy "finance_month_snapshots_update_own" on public.finance_month_snapshots for update using (auth.uid() = user_id);
create policy "finance_month_snapshots_delete_own" on public.finance_month_snapshots for delete using (auth.uid() = user_id);
