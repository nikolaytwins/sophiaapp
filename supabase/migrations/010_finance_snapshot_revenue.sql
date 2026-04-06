-- Доп. поля месячного снимка (Twinworks: выручка, прибыль проектов), опционально для импорта.

alter table public.finance_month_snapshots
  add column if not exists total_revenue numeric;

alter table public.finance_month_snapshots
  add column if not exists project_profit numeric;
