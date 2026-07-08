-- Run this in the Supabase SQL editor.
-- Files are stored in Supabase Storage; this table stores per-user metadata.

insert into storage.buckets (id, name, public)
values ('activity-files', 'activity-files', false)
on conflict (id) do nothing;

create table if not exists public.activity_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id text not null,
  folder_group text,
  folder_type text,
  folder_label text,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  storage_bucket text not null default 'activity-files',
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_files enable row level security;

drop policy if exists "Users can read own activity files" on public.activity_files;
create policy "Users can read own activity files"
  on public.activity_files
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity files" on public.activity_files;
create policy "Users can insert own activity files"
  on public.activity_files
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activity files" on public.activity_files;
create policy "Users can delete own activity files"
  on public.activity_files
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own activity files" on public.activity_files;
create policy "Users can update own activity files"
  on public.activity_files
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can upload own activity file objects" on storage.objects;
create policy "Users can upload own activity file objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'activity-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can read own activity file objects" on storage.objects;
create policy "Users can read own activity file objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'activity-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete own activity file objects" on storage.objects;
create policy "Users can delete own activity file objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'activity-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
