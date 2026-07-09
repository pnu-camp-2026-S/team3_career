# AI 자동 정리 및 분석 기준

AI는 자료를 단순 저장하지 않고 포트폴리오 작성에 활용하기 쉬운 구조로 정리해야 한다.

## AI 처리 목표

1. 파일 내용 확인
2. 핵심 내용 요약
3. 프로젝트 전체 요약 수정
4. 적절한 폴더 위치 추천
5. 파일별 요약 생성
6. `index.json` 갱신
7. `log.md` 작성
8. 분석 기능에서 사용할 구조화 데이터 생성

AI가 만든 내용에는 가능한 한 근거 파일, 추출 근거, 사용자 입력 출처를 함께 표시한다.

## 분석하기 기능 기준

분석하기 버튼 활성화 조건:

1. 최소 1개 이상의 파일이 존재한다.
2. `index.json` 생성이 완료되어 있다.
3. `summary.md` 생성이 완료되어 있다.
4. 분석 대상 파일 상태가 `uploaded` 또는 `completed`이다.
5. 삭제 예정 파일이 포함되지 않는다.

## 분석 결과 예시

- 활동 요약
- 프로젝트 역할 분석
- 사용 기술 분석
- 성과 및 임팩트 정리
- 포트폴리오 문장 추천
- 자기소개서 소재 추천
- 면접 답변 소재 추천

## 실제 구현 상태

분석 파이프라인은 `ai_analysis/`에 있고(모듈 설명은 [단일 파일 분석 파일 구성](single-file-analysis-files.md) 참고), 다음 API로 화면과 연결되어 있다.

### AI 제공자

- 우선순위: `ANALYSIS_MOCK=1` 또는 `ANALYSIS_PROVIDER=mock` → mock, 아니면 `key.env`의 `OPENAI_API_KEY`(모델 `OPENAI_MODEL` 또는 `gpt-4o-mini`) → `gemini_key.env`의 `GEMINI_API_KEY`. 키가 없으면 사용자 화면에 mock 결과를 보여주지 않고 분석 실패로 처리한다.
- `ANALYSIS_PROVIDER=openai|gemini|mock`으로 명시할 수 있다.
- 키 값은 로그·산출물·DB에 남기지 않는다(제공자 이름 문자열만 저장).

### API

- `POST /api/analysis/project` — body `{ projectId, projectType, projectName }`. 해당 프로젝트에서 **신규 파일 또는 마지막 분석 후 수정된 파일만** Storage에서 내려받아 단일 파일 분석을 실행하고, 기존 완료 결과와 합쳐 프로젝트 종합(`project_analyses`, scope=`project`)을 갱신한다. 응답에 `analyzedCount / skippedCount / failedCount`, 파일별 성공 여부, 종합 결과(`aggregate`)가 담긴다.
- `GET /api/analysis/project?projectId=` — 저장된 프로젝트 종합 결과와 파일별 분석 상태(화면 복원용).
- `POST /api/analysis/aggregate` — 사용자 전체의 완료 분석을 모아 메인 키워드 개요와 포트폴리오 강조 키워드를 생성한다(`project_analyses`, scope=`user`). 자료가 없으면 `{ ok: false, reason: 'no_data' }`.
- `GET /api/analysis/aggregate` — 마지막 종합 결과 조회(메인 새로고침 복원용).

### 저장(Supabase)

- `file_analyses` — 파일 1건당 분석 1행(`activity_file_id` unique). metadata/analysis_result/index_draft는 jsonb, summary/log/추출 텍스트는 text. 상태는 `pending/analyzing/completed/failed`, 실패 시 `stage`와 `errors`를 남긴다.
- `project_analyses` — 종합 결과. `(user_id, scope, project_id)` unique로 upsert.
- 스키마 원본: `docs/supabase-analysis.sql`. 저장 구현은 `ai_analysis/db-repository.mjs`(`DbAnalysisRepository`)이며, 로컬 구현(`repository.mjs`)과 같은 인터페이스를 따른다.

### 화면 연동

- 파일 관리(`html/create.html`)의 상단 `분석하기` 버튼 → `POST /api/analysis/project`. 성공한 파일은 상태 pill이 `분석완료`로 바뀌고, 새로고침 후에도 `/api/activity-files`의 `analysisStatus`로 복원된다.
- `/api/activity-files`는 `file_analyses.summary_md`, `index_draft`, `log_md`도 함께 내려준다. 화면은 이 값을 프로젝트 맨 오른쪽의 `AI 요약` 세부 폴더에 `원본명 AI 요약.md` 가상 파일로 보여준다.
- 메인(`html/main.html`)은 분석 완료 파일 수가 저장된 종합 결과보다 많거나 저장된 결과가 mock이면 `POST /api/analysis/aggregate`를 실행한다. 키워드 개요(headline/description/activityKeywords)와 AI 분석 개요(activityOverview)가 AI 결과로 채워지고, 결과 전체가 `localStorage.myfitfolioAiKeywords`에 저장되어 포트폴리오 생성 화면이 재사용할 수 있다.
- 메인 AI 분석 개요의 작성 방식은 `prompts/main-activity-overview.md`에 분리한다. 이 파일은 활동 유형별 개수, 맡은 역할, 반복 역량을 근거 기반 2~3문장으로 작성하도록 안내한다.
- 분석 결과는 사용자가 확인하기 전까지 초안(`requiresUserConfirmation: true`, `reviewStatus: pending_review`)으로 취급한다.
