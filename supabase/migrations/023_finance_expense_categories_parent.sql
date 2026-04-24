-- Подкатегории расходов (parent_id), правки данных: Подписки→ИИ-сервисы, бытовые подкатегории, слияние «Лера»/«на леру».

alter table public.finance_expense_categories
  add column if not exists parent_id text null;

-- FK: при удалении родителя подкатегории удаляются каскадом
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_expense_categories_parent_id_fkey'
  ) then
    alter table public.finance_expense_categories
      add constraint finance_expense_categories_parent_id_fkey
      foreign key (parent_id) references public.finance_expense_categories (id) on delete cascade;
  end if;
end $$;

create index if not exists finance_expense_categories_parent_idx
  on public.finance_expense_categories (user_id, parent_id);

-- 1) Подписки → ИИ-сервисы (категории и транзакции)
update public.finance_transactions
set category = 'ИИ-сервисы', updated_at = now()
where lower(trim(category)) = lower('Подписки');

update public.finance_expense_categories
set name = 'ИИ-сервисы', updated_at = now()
where lower(trim(name)) = lower('Подписки');

-- 2) Слияние «Лера» / «на леру» → одна категория «Лера», история в транзакциях сохраняется
update public.finance_transactions
set category = 'Лера', updated_at = now()
where lower(trim(category)) in ('на леру', 'лера', 'на лёру', 'леру');

delete from public.finance_expense_categories c
using (
  select id,
    row_number() over (partition by user_id order by id) as rn
  from public.finance_expense_categories
  where lower(trim(name)) in ('на леру', 'лера', 'на лёру', 'леру')
) d
where c.id = d.id and d.rn > 1;

update public.finance_expense_categories
set name = 'Лера', updated_at = now()
where lower(trim(name)) in ('на леру', 'лера', 'на лёру', 'леру');

-- 3) Подкатегории «Бытовые расходы»
update public.finance_expense_categories child
set parent_id = parent.id, updated_at = now()
from public.finance_expense_categories parent
where parent.user_id = child.user_id
  and parent.parent_id is null
  and lower(trim(parent.name)) = 'бытовые расходы'
  and lower(trim(child.name)) in (
    'продукты',
    'рестораны по необходимости',
    'транспорт',
    'другие бытовые расходы'
  )
  and child.id <> parent.id;

-- 4) Создать «Другие бытовые расходы», если ещё нет (под «Бытовые расходы»)
insert into public.finance_expense_categories (id, user_id, name, type, expected_monthly, parent_id, created_at, updated_at)
select
  replace(gen_random_uuid()::text, '-', ''),
  p.user_id,
  'Другие бытовые расходы',
  p.type,
  0,
  p.id,
  now(),
  now()
from public.finance_expense_categories p
where p.parent_id is null
  and lower(trim(p.name)) = 'бытовые расходы'
  and not exists (
    select 1
    from public.finance_expense_categories x
    where x.user_id = p.user_id
      and lower(trim(x.name)) = 'другие бытовые расходы'
  );

-- Повторно привязать, если строка только что вставлена
update public.finance_expense_categories child
set parent_id = parent.id, updated_at = now()
from public.finance_expense_categories parent
where parent.user_id = child.user_id
  and parent.parent_id is null
  and lower(trim(parent.name)) = 'бытовые расходы'
  and lower(trim(child.name)) = 'другие бытовые расходы'
  and child.id <> parent.id;
