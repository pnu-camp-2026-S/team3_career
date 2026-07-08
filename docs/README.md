# 프로젝트 기준 문서 색인

이 폴더는 Myfitfolio/CareerFit의 기능별 상세 기준을 관리한다.  
루트의 `AGENTS.md`는 최상위 원칙과 문서 링크만 유지하고, 기능별 세부 구현 기준은 아래 문서를 따른다.

## 기능별 문서

- [데이터 구조 및 API 기준](data-model.md)
- [로그인 및 계정 기준](auth.md)
- [마이페이지 및 프로필 데이터 기준](mypage.md)
- [자료 입력 및 파일관리 기준](file-management.md)
- [AI 자동 정리 및 분석 기준](ai-analysis.md)
- [활동 추천 기준](recommendation.md)
- [포트폴리오 생성 및 관리 기준](portfolio.md)
- [GitHub 임시 연동 기준](github.md)
- [보안 기준](security.md)
- [개발 우선순위와 코드 작업 규칙](development.md)

## Supabase 스키마 원본

기능 문서의 데이터 기준을 실제로 적용하는 SQL은 아래 파일에 있고, 요약은 [데이터 구조 및 API 기준](data-model.md)에 정리한다.

- `supabase-profiles.sql` — 계정 신원(`public.profiles`)과 신규 사용자 트리거
- `supabase-user-profiles.sql` — 마이페이지 프로필(`public.user_profiles`)
- `supabase-activity-files.sql` — 업로드 파일 메타데이터(`public.activity_files`)와 Storage 정책 (트리 컬럼 포함, 신규 설치용)
- `supabase-activity-files-tree-migration.sql` — 기존 설치에 트리 컬럼(#167)을 추가하고 레거시 `folder_id`를 백필하는 마이그레이션
- `supabase-analysis.sql` — AI 분석 결과(`public.file_analyses`, `public.project_analyses`)
- `supabase-portfolios.sql` — 포트폴리오(`public.portfolios`)

## 문서 관리 원칙

- 새 기능의 상세 기준은 가능한 한 해당 기능 문서에 추가한다.
- 여러 기능에 공통으로 적용되는 핵심 원칙만 `AGENTS.md`에 남긴다.
- 화면 문구, 문서, 주석, 테스트 설명은 특별한 사유가 없는 한 한국어로 작성한다.
- 기능 기준이 서로 충돌하면 `AGENTS.md`의 제품 원칙을 우선한다.
