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
  -- 트리 구조 컬럼 (#167): folder_id('프로젝트id::sub번호')를 파싱한 값을 저장한다.
  project_id text not null,
  parent_folder_id text,
  folder_path text not null,
  folder_level smallint not null default 0 check (folder_level >= 0),
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  storage_bucket text not null default 'activity-files',
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_files_project_folder_fk
    foreign key (user_id, project_id)
    references public.activity_folders (user_id, id)
    on delete cascade
);

create index if not exists activity_files_user_project_idx
  on public.activity_files (user_id, project_id);
create index if not exists activity_files_user_folder_idx
  on public.activity_files (user_id, folder_id);
create index if not exists activity_files_user_folder_path_idx
  on public.activity_files (user_id, folder_path text_pattern_ops);

-- 이미 삭제된 프로젝트 폴더를 가리키는 파일 메타데이터가 있으면 정리한다.
-- 원본 Storage 객체는 DB foreign key로 삭제할 수 없으므로 앱의 폴더 삭제 API 사용을 우선한다.
delete from public.activity_files as af
where not exists (
  select 1
  from public.activity_folders as folder
  where folder.user_id = af.user_id
    and folder.id = af.project_id
);

-- 기존 테이블에 제약이 없던 환경을 위한 보강이다.
-- not valid는 기존 고아 행 검증으로 배포가 막히지 않게 하고, 이후 새 행부터 관계를 강제한다.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activity_files_project_folder_fk'
  ) then
    alter table public.activity_files
      add constraint activity_files_project_folder_fk
      foreign key (user_id, project_id)
      references public.activity_folders (user_id, id)
      on delete cascade
      not valid;
  end if;
end $$;

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
