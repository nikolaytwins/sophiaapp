-- Одноразовый сид: отдельные фокусы недель (planner_week_focus) для основного аккаунта.
-- ISO-неделя (пн–вс): week_monday = понедельник недели, в которую попадает первый день диапазона
-- (для «22–31 июля» это пн 2026-07-20).

with target as (
  select id as user_id
  from auth.users
  where lower(trim(email)) in ('nikolaytwins@gmail.com', 'nikollaytwins@gmail.com')
  limit 1
),
weeks as (
  select unnest(
    array[
      date '2026-05-11',
      date '2026-05-18',
      date '2026-06-01',
      date '2026-06-08',
      date '2026-06-22',
      date '2026-06-29',
      date '2026-07-06',
      date '2026-07-13',
      date '2026-07-20'
    ]::date[]
  ) as week_monday
)
delete from public.planner_week_focus w
using target, weeks
where w.user_id = target.user_id
  and w.week_monday = weeks.week_monday;

insert into public.planner_week_focus (user_id, week_monday, title, priority, sort_order, updated_at)
select
  u.id,
  v.week_monday,
  v.title,
  v.priority,
  v.sort_order,
  now()
from auth.users u
cross join (
  values
    (date '2026-05-11', 'Рыбалка или выезд на природу', 'medium', 100),
    (date '2026-05-18', 'Тусовка или клуб с людьми', 'medium', 99),
    (date '2026-06-01', 'Или гардероб обновить, или фотосессию сделать', 'medium', 98),
    (date '2026-06-08', 'В бассейн сходить + тренировки 3 шт обязательно', 'high', 97),
    (date '2026-06-22', 'Никаких ярких событий', 'medium', 96),
    (date '2026-06-29', 'Ужин в красивом месте', 'medium', 95),
    (date '2026-07-06', 'Спорт каждый день, велик, теннис, плавание', 'high', 94),
    (date '2026-07-13', 'Тусовка, клуб', 'medium', 93),
    (date '2026-07-20', 'Сидеть дома', 'medium', 92)
) as v(week_monday, title, priority, sort_order)
where lower(trim(u.email)) in ('nikolaytwins@gmail.com', 'nikollaytwins@gmail.com');
