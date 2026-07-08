-- Run this in the Supabase SQL editor.
-- AI 분석 결과 저장 테이블. supabase-activity-files.sql 실행 후에 실행한다.
-- file_analyses: 파일 1건당 단일 파일 분석 결과 1행 (재분석은 upsert로 덮어씀)
-- project_analyses: 종합 분석 결과 (scope='project'=프로젝트 단위, scope='user'=메인 키워드 개요)

create table if not exists public.file_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_file_id uuid not null references public.activity_files(id) on delete cascade,
  project_id text not null,
  analysis_id text not null,
  file_ref text,
  status text not null default 'pending',
  stage text,
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  analysis_result jsonb,
  summary_md text,
  index_draft jsonb,
  log_md text,
  extracted_text text,
  errors jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_file_id)
);

create index if not exists file_analyses_user_project_status_idx
  on public.file_analyses (user_id, project_id, status);

alter table public.file_analyses enable row level security;

drop policy if exists "Users can read own file analyses" on public.file_analyses;
create policy "Users can read own file analyses"
  on public.file_analyses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own file analyses" on public.file_analyses;
create policy "Users can insert own file analyses"
  on public.file_analyses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own file analyses" on public.file_analyses;
create policy "Users can update own file analyses"
  on public.file_analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own file analyses" on public.file_analyses;
create policy "Users can delete own file analyses"
  on public.file_analyses
  for delete
  using (auth.uid() = user_id);

create table if not exists public.project_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'project' check (scope in ('project', 'user')),
  project_id text not null default '',
  result jsonb not null,
  provider text,
  based_on_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope, project_id)
);

-- activity_files는 activity_folders를 foreign key로 참조하고,
-- file_analyses는 activity_files를 참조하므로 폴더 삭제 시 함께 정리된다.
-- project_analyses는 scope='user' 행 때문에 단순 foreign key를 걸 수 없어
-- 프로젝트 폴더 삭제 트리거로 scope='project' 결과만 정리한다.
create or replace function public.delete_project_analysis_for_activity_folder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.project_analyses
  where user_id = old.user_id
    and scope = 'project'
    and project_id = old.id;

  return old;
end;
$$;

drop trigger if exists activity_folders_delete_project_analyses on public.activity_folders;
create trigger activity_folders_delete_project_analyses
  after delete on public.activity_folders
  for each row
  execute function public.delete_project_analysis_for_activity_folder();

-- 이미 삭제된 프로젝트 폴더를 가리키는 프로젝트 단위 분석 결과가 있으면 정리한다.
delete from public.project_analyses as pa
where pa.scope = 'project'
  and not exists (
    select 1
    from public.activity_folders as folder
    where folder.user_id = pa.user_id
      and folder.id = pa.project_id
  );

alter table public.project_analyses enable row level security;

drop policy if exists "Users can read own project analyses" on public.project_analyses;
create policy "Users can read own project analyses"
  on public.project_analyses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project analyses" on public.project_analyses;
create policy "Users can insert own project analyses"
  on public.project_analyses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own project analyses" on public.project_analyses;
create policy "Users can update own project analyses"
  on public.project_analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project analyses" on public.project_analyses;
create policy "Users can delete own project analyses"
  on public.project_analyses
  for delete
  using (auth.uid() = user_id);
