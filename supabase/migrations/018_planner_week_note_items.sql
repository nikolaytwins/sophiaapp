-- Sophia OS: заметки недели отдельными плашками (1 строка = 1 заметка).

create table if not exists public.planner_week_note_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_monday date not null,
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_week_note_items_user_week_idx
  on public.planner_week_note_items (user_id, week_monday);

alter table public.planner_week_note_items enable row level security;

create policy "planner_week_note_items_select_own"
  on public.planner_week_note_items for select
  using (auth.uid() = user_id);

create policy "planner_week_note_items_insert_own"
  on public.planner_week_note_items for insert
  with check (auth.uid() = user_id);

create policy "planner_week_note_items_update_own"
  on public.planner_week_note_items for update
  using (auth.uid() = user_id);

create policy "planner_week_note_items_delete_own"
  on public.planner_week_note_items for delete
  using (auth.uid() = user_id);

-- Перенос старого поля «один текст на неделю» в одну плашку (если было непусто).
insert into public.planner_week_note_items (user_id, week_monday, body, sort_order, updated_at)
select w.user_id, w.week_monday, trim(w.body), 0, w.updated_at
from public.planner_week_notes w
where trim(w.body) <> ''
  and not exists (
    select 1 from public.planner_week_note_items i
    where i.user_id = w.user_id and i.week_monday = w.week_monday
  );
