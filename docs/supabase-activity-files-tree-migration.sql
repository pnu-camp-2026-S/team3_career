-- Run this in the Supabase SQL editor.
-- 이슈 #167: activity_files를 프로젝트-하위폴더 트리 구조로 확장하는 마이그레이션.
-- 이미 activity_files 테이블이 있는 기존 설치에서 실행한다.
-- 신규 설치는 supabase-activity-files.sql만 실행하면 된다(트리 컬럼 포함).

-- 1) 트리 컬럼 추가
alter table public.activity_files
  add column if not exists project_id text,
  add column if not exists parent_folder_id text,
  add column if not exists folder_path text,
  add column if not exists folder_level smallint;

-- 2) 레거시 folder_id 백필
-- folder_id는 '프로젝트id::sub번호'(세부 폴더) 또는 '프로젝트id'(구버전 프로젝트 단위) 형식이다.
--   예) 'completed-personal::sub0' -> project_id='completed-personal',
--       parent_folder_id='completed-personal', folder_path='completed-personal/sub0', folder_level=1
--   예) 'completed-personal'       -> project_id='completed-personal',
--       parent_folder_id=null, folder_path='completed-personal', folder_level=0
update public.activity_files
set project_id = split_part(folder_id, '::', 1),
    parent_folder_id = case when strpos(folder_id, '::') > 0
      then regexp_replace(folder_id, '::[^:]+$', '') else null end,
    folder_path = replace(folder_id, '::', '/'),
    folder_level = greatest(coalesce(array_length(string_to_array(folder_id, '::'), 1), 1) - 1, 0)
where project_id is null;

-- 3) 제약 확정
alter table public.activity_files
  alter column project_id set not null,
  alter column folder_path set not null,
  alter column folder_level set not null,
  alter column folder_level set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_files_folder_level_check'
      and conrelid = 'public.activity_files'::regclass
  ) then
    alter table public.activity_files
      add constraint activity_files_folder_level_check check (folder_level >= 0);
  end if;
end $$;

-- 4) 트리 조회용 인덱스
create index if not exists activity_files_user_project_idx
  on public.activity_files (user_id, project_id);
create index if not exists activity_files_user_folder_idx
  on public.activity_files (user_id, folder_id);
create index if not exists activity_files_user_folder_path_idx
  on public.activity_files (user_id, folder_path text_pattern_ops);

-- 5) RLS/Storage 정책 검토 결과 (정책 변경 불필요)
-- - activity_files의 select/insert/delete/update 4개 정책은 auth.uid() = user_id 행 단위 검사라서
--   project_id/folder_path 필터가 추가돼도 그대로 동작한다.
-- - storage.objects의 3개 정책은 경로 첫 세그먼트((storage.foldername(name))[1])만 auth.uid()와
--   비교하므로 하위 폴더로 경로 깊이가 늘어나도 그대로 유효하다.
-- - 기존 Storage 객체는 이동하지 않는다. 각 행의 storage_path가 원본 위치의 기준이다.
--   새 업로드부터 uid/프로젝트/하위폴더/파일 형태의 경로 규칙을 사용한다.
