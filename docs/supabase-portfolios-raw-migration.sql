-- Run this in the Supabase SQL editor.
-- portfolios에 프로젝트 선택 근거(experience_projects)·AI 생성 원본(raw)·
-- 1페이지 요약본 PPT 템플릿 값(template_values) 컬럼을 추가하는 마이그레이션.
-- 이미 portfolios 테이블이 있는 기존 설치에서 실행한다.
-- 신규 설치는 supabase-portfolios.sql만 실행하면 된다(세 컬럼 포함).

alter table public.portfolios
  add column if not exists experience_projects jsonb not null default '[]'::jsonb,
  add column if not exists raw jsonb,
  add column if not exists template_values jsonb;
