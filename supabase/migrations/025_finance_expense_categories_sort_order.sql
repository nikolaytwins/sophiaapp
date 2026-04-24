-- Порядок отображения категорий (корни и подкатегории внутри родителя).

alter table public.finance_expense_categories
  add column if not exists sort_order int not null default 0;

create index if not exists finance_expense_categories_user_parent_sort_idx
  on public.finance_expense_categories (user_id, parent_id, sort_order);

-- Заполнить существующие строки стабильным порядком: по дате создания, затем по имени.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, parent_id
      order by created_at asc nulls last, name asc
    ) - 1 as ord
  from public.finance_expense_categories
)
update public.finance_expense_categories c
set sort_order = r.ord, updated_at = now()
from ranked r
where c.id = r.id;
