-- Sophia OS: «желёзная» защита дневника в облаке.
-- 1) История: перед каждым UPDATE/DELETE основной строки сохраняется предыдущий payload (append-only).
-- 2) RPC: список ревизий (без тела payload) и восстановление выбранной ревизии в day_journal_sync_state.
--
-- Клиент по-прежнему шлёт merge; при ошибке клиента можно восстановить снимок из day_journal_sync_revision.
-- Ретенцию старых ревизий при необходимости делай cron/job (здесь не ограничиваем).

create table if not exists public.day_journal_sync_revision (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  source_updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists day_journal_sync_revision_user_created
  on public.day_journal_sync_revision (user_id, created_at desc);

alter table public.day_journal_sync_revision enable row level security;

drop policy if exists "day_journal_revision_select_own" on public.day_journal_sync_revision;
create policy "day_journal_revision_select_own"
  on public.day_journal_sync_revision
  for select
  using (auth.uid() = user_id);

-- Вставки только из SECURITY DEFINER-триггера (пользователь напрямую не пишет в историю).
grant select on public.day_journal_sync_revision to authenticated;
revoke insert, update, delete on public.day_journal_sync_revision from authenticated;
revoke insert, update, delete on public.day_journal_sync_revision from anon;

create or replace function public.day_journal_sync_archive_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.payload is distinct from new.payload then
      insert into public.day_journal_sync_revision (user_id, payload, source_updated_at)
      values (old.user_id, old.payload, old.updated_at);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.day_journal_sync_revision (user_id, payload, source_updated_at)
    values (old.user_id, old.payload, old.updated_at);
    return old;
  end if;
  raise exception 'day_journal_sync_archive_revision: unexpected tg_op %', tg_op;
end;
$$;

comment on function public.day_journal_sync_archive_revision() is
  'Сохраняет предыдущий payload дневника перед изменением/удалением строки day_journal_sync_state.';

drop trigger if exists tr_day_journal_archive_update on public.day_journal_sync_state;
create trigger tr_day_journal_archive_update
  before update on public.day_journal_sync_state
  for each row
  execute function public.day_journal_sync_archive_revision();

drop trigger if exists tr_day_journal_archive_delete on public.day_journal_sync_state;
create trigger tr_day_journal_archive_delete
  before delete on public.day_journal_sync_state
  for each row
  execute function public.day_journal_sync_archive_revision();

-- Список ревизий (лёгкий ответ для UI / SQL Editor).
create or replace function public.day_journal_list_revision_meta(p_limit int default 50)
returns table (
  revision_id bigint,
  created_at timestamptz,
  source_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.created_at, r.source_updated_at
  from public.day_journal_sync_revision r
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.day_journal_list_revision_meta(int) from public;
grant execute on function public.day_journal_list_revision_meta(int) to authenticated;

-- Одна ревизия с payload (для предпросмотра / ручного копирования).
create or replace function public.day_journal_get_revision(p_revision_id bigint)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  p jsonb;
begin
  select r.payload into p
  from public.day_journal_sync_revision r
  where r.id = p_revision_id and r.user_id = auth.uid();

  if p is null then
    raise exception 'revision not found or access denied';
  end if;
  return p;
end;
$$;

revoke all on function public.day_journal_get_revision(bigint) from public;
grant execute on function public.day_journal_get_revision(bigint) to authenticated;

-- Восстановить снимок: перезаписывает текущую строку синка (сработает archive триггер — текущее уйдёт в историю).
create or replace function public.day_journal_restore_revision(p_revision_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payload jsonb;
begin
  select r.user_id, r.payload
  into v_user_id, v_payload
  from public.day_journal_sync_revision r
  where r.id = p_revision_id and r.user_id = auth.uid();

  if v_user_id is null then
    raise exception 'revision not found or access denied';
  end if;

  insert into public.day_journal_sync_state (user_id, payload, updated_at)
  values (v_user_id, v_payload, now())
  on conflict (user_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.day_journal_restore_revision(bigint) from public;
grant execute on function public.day_journal_restore_revision(bigint) to authenticated;

comment on table public.day_journal_sync_revision is
  'История payload дневника до каждого изменения day_journal_sync_state; не удаляется при обычном upsert.';
