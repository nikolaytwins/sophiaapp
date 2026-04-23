-- Sophia OS: события календаря (с датой или только на неделю) и заметки недели.

create table if not exists public.planner_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  /** Понедельник недели (YYYY-MM-DD), к которой относится событие; для событий с датой должен совпадать с неделей event_date. */
  week_monday date not null,
  /** null — событие привязано к неделе без конкретного дня. */
  event_date date null,
  title text not null,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_calendar_events_user_week_idx
  on public.planner_calendar_events (user_id, week_monday);

create index if not exists planner_calendar_events_user_date_idx
  on public.planner_calendar_events (user_id, event_date)
  where (event_date is not null);

alter table public.planner_calendar_events enable row level security;

create policy "planner_calendar_events_select_own"
  on public.planner_calendar_events for select
  using (auth.uid() = user_id);

create policy "planner_calendar_events_insert_own"
  on public.planner_calendar_events for insert
  with check (auth.uid() = user_id);

create policy "planner_calendar_events_update_own"
  on public.planner_calendar_events for update
  using (auth.uid() = user_id);

create policy "planner_calendar_events_delete_own"
  on public.planner_calendar_events for delete
  using (auth.uid() = user_id);

create table if not exists public.planner_week_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_monday date not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_monday)
);

create index if not exists planner_week_notes_user_week_idx
  on public.planner_week_notes (user_id, week_monday);

alter table public.planner_week_notes enable row level security;

create policy "planner_week_notes_select_own"
  on public.planner_week_notes for select
  using (auth.uid() = user_id);

create policy "planner_week_notes_insert_own"
  on public.planner_week_notes for insert
  with check (auth.uid() = user_id);

create policy "planner_week_notes_update_own"
  on public.planner_week_notes for update
  using (auth.uid() = user_id);

create policy "planner_week_notes_delete_own"
  on public.planner_week_notes for delete
  using (auth.uid() = user_id);
