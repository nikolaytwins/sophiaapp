-- Side goals (вкладка «Цели»): JSON-синх + публичное хранилище фото (стабильные URL).

create table if not exists public.side_goals_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"goals":[],"updatedAt":""}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists side_goals_sync_state_updated_at on public.side_goals_sync_state (updated_at desc);

alter table public.side_goals_sync_state enable row level security;

drop policy if exists "side_goals_sync_select_own" on public.side_goals_sync_state;
create policy "side_goals_sync_select_own"
  on public.side_goals_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "side_goals_sync_insert_own" on public.side_goals_sync_state;
create policy "side_goals_sync_insert_own"
  on public.side_goals_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "side_goals_sync_update_own" on public.side_goals_sync_state;
create policy "side_goals_sync_update_own"
  on public.side_goals_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bucket для фото целей (публичные URL для expo-image на вебе / нативе).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'side_goal_assets',
  'side_goal_assets',
  true,
  8388608,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "side_goal_assets_public_read" on storage.objects;
create policy "side_goal_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'side_goal_assets');

drop policy if exists "side_goal_assets_insert_own" on storage.objects;
create policy "side_goal_assets_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'side_goal_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "side_goal_assets_update_own" on storage.objects;
create policy "side_goal_assets_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'side_goal_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'side_goal_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "side_goal_assets_delete_own" on storage.objects;
create policy "side_goal_assets_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'side_goal_assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
