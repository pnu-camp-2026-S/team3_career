-- Run this in the Supabase SQL editor.
-- 프로젝트 폴더 메타데이터. 가입 직후에는 폴더가 없고(빈 목록), 사용자가 '폴더 추가'로
-- 만들 때만 이 테이블에 등록된다. 실제 파일은 activity_files, 분석 결과는 file_analyses에 있다.
-- id는 클라이언트(js/folder-store.js)가 생성한 폴더 id('custom-...')를 그대로 저장한다.
-- subfolders에는 세부 폴더 구조([{ id, label }])만 저장하고, 파일 목록은 담지 않는다.
-- activity_files는 (user_id, project_id)로 이 테이블을 참조하므로 폴더 삭제 시 파일 행이 함께 삭제된다.
-- project_analyses(scope='project')는 supabase-analysis.sql의 삭제 트리거로 함께 정리된다.

create table if not exists public.activity_folders (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_key text not null,
  type_key text not null,
  label text not null,
  subfolders jsonb not null default '[]'::jsonb,
  github jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists activity_folders_user_group_idx
  on public.activity_folders (user_id, group_key);

alter table public.activity_folders enable row level security;

drop policy if exists "Users can read own activity folders" on public.activity_folders;
create policy "Users can read own activity folders"
  on public.activity_folders
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity folders" on public.activity_folders;
create policy "Users can insert own activity folders"
  on public.activity_folders
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own activity folders" on public.activity_folders;
create policy "Users can update own activity folders"
  on public.activity_folders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activity folders" on public.activity_folders;
create policy "Users can delete own activity folders"
  on public.activity_folders
  for delete
  using (auth.uid() = user_id);
