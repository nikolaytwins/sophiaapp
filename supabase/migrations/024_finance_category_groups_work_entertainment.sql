-- Группы «Работа», «Развлечения» с подкатегориями; интернет/подписки и т.п. под «Бытовые расходы».

-- 1) Под родителя «Бытовые расходы» (только если ещё без родителя)
update public.finance_expense_categories child
set parent_id = parent.id, updated_at = now()
from public.finance_expense_categories parent
where parent.user_id = child.user_id
  and parent.parent_id is null
  and lower(trim(parent.name)) = 'бытовые расходы'
  and child.id <> parent.id
  and child.parent_id is null
  and lower(trim(child.name)) in (
    'ии-сервисы',
    'интернет',
    'подписки+интернет',
    'подписки и интернет',
    'коммуналка и интернет',
    'мобильная связь и интернет',
    'связь и интернет'
  );

-- 2) Корень «Работа»
insert into public.finance_expense_categories (id, user_id, name, type, expected_monthly, parent_id, created_at, updated_at)
select replace(gen_random_uuid()::text, '-', ''), u.user_id, 'Работа', 'personal', 0, null, now(), now()
from (select distinct user_id from public.finance_expense_categories) u
where not exists (
  select 1
  from public.finance_expense_categories c
  where c.user_id = u.user_id
    and c.parent_id is null
    and lower(trim(c.name)) = 'работа'
);

-- 3) Подкатегории «Работа» (имя уникально на пользователя — только если такой строки ещё нет)
insert into public.finance_expense_categories (id, user_id, name, type, expected_monthly, parent_id, created_at, updated_at)
select replace(gen_random_uuid()::text, '-', ''), w.user_id, x.name, 'personal', 0, w.id, now(), now()
from public.finance_expense_categories w
cross join (values ('Зарплаты'), ('Налоги'), ('Рабочие сервисы')) as x(name)
where w.parent_id is null
  and lower(trim(w.name)) = 'работа'
  and not exists (
    select 1
    from public.finance_expense_categories c
    where c.user_id = w.user_id
      and lower(trim(c.name)) = lower(trim(x.name))
  );

-- 4) Корень «Развлечения»
insert into public.finance_expense_categories (id, user_id, name, type, expected_monthly, parent_id, created_at, updated_at)
select replace(gen_random_uuid()::text, '-', ''), u.user_id, 'Развлечения', 'personal', 0, null, now(), now()
from (select distinct user_id from public.finance_expense_categories) u
where not exists (
  select 1
  from public.finance_expense_categories c
  where c.user_id = u.user_id
    and c.parent_id is null
    and lower(trim(c.name)) = 'развлечения'
);

-- 5) Подкатегории «Развлечения»
insert into public.finance_expense_categories (id, user_id, name, type, expected_monthly, parent_id, created_at, updated_at)
select replace(gen_random_uuid()::text, '-', ''), w.user_id, x.name, 'personal', 0, w.id, now(), now()
from public.finance_expense_categories w
cross join (values ('Совместное время с Лерой'), ('Семейный отдых')) as x(name)
where w.parent_id is null
  and lower(trim(w.name)) = 'развлечения'
  and not exists (
    select 1
    from public.finance_expense_categories c
    where c.user_id = w.user_id
      and lower(trim(c.name)) = lower(trim(x.name))
  );
