# AI 자동 정리 및 분석 기준

AI는 자료를 단순 저장하지 않고 포트폴리오 작성에 활용하기 쉬운 구조로 정리해야 한다.
정리는 3계층으로 나뉜다.

## 3계층 워크플로우

1. **파일별 요약(업로드 시 자동)** — 세부 폴더에 파일을 올리면 자동으로 그 파일의 `summary.md`를 생성해 `file_analyses`에 저장한다. 각 파일은 미리보기 옆 `AI 요약 보기`로 요약을 열람·**수정**할 수 있고, 수정본은 이후 재분석해도 보존된다.
2. **프로젝트 종합(`분석하기`)** — `분석하기` 버튼을 누르면 완료·진행중 전체 프로젝트를 순서대로 처리한다. 프로젝트마다 세부 폴더 파일들의 `summary.md`를 모아, 그 프로젝트에 대한 `index.json`·`summary.md`·`log.md`를 **각각 따로** 만들어 `AI 요약` 세부 폴더에 저장·표시한다. 세 산출물은 각각 개별로 수정할 수 있다. 마지막 프로젝트 종합 이후 새로 생성·수정된 파일별 요약이 없는 프로젝트는 AI 재분석을 건너뛰고 기존 산출물을 유지한다(#268).
3. **메인 종합** — 전체 프로젝트 분석이 끝나면 성공한 프로젝트의 종합 요약을 모아 메인 대시보드의 활동 개요와 포트폴리오 강조 키워드를 만든다.

## 제품 원칙

1. AI는 근거 없는 역할·기술·성과·수치를 만들지 않는다. 추출 본문·요약에 있는 내용만 사용한다.
2. **폴더 분류는 사용자 몫이다.** AI가 파일을 어느 세부 폴더에 넣을지 추천하지 않는다(과거의 AI 추천 분류는 제거됨). 사용자가 세부 폴더에 직접 넣는다.
3. 파일 요약과 프로젝트 산출물은 모두 사용자가 수정할 수 있고, 사용자가 수정한 내용은 재분석해도 덮어쓰지 않는다.
4. 분석 결과는 사용자가 확인하기 전까지 초안(`requiresUserConfirmation: true`, `reviewStatus: pending_review`)으로 취급한다.
5. `AI 요약` 세부 폴더에는 원본 자료를 올릴 수 없다. 요약 산출물만 존재한다.

## 실제 구현 상태

분석 파이프라인은 `ai_analysis/`에 있고(모듈 설명은 [단일 파일 분석 파일 구성](single-file-analysis-files.md) 참고), 다음 API로 화면과 연결되어 있다.

### AI 제공자

- 우선순위: `ANALYSIS_MOCK=1` 또는 `ANALYSIS_PROVIDER=mock` → mock, 아니면 `key.env`의 `OPENAI_API_KEY`(모델 `OPENAI_MODEL` 또는 `gpt-4o-mini`) → `gemini_key.env`의 `GEMINI_API_KEY`. 키가 없으면 사용자 화면에 mock 결과를 보여주지 않고 분석 실패로 처리한다.
- `ANALYSIS_PROVIDER=openai|gemini|mock`으로 명시할 수 있다.
- 키 값은 로그·산출물·DB에 남기지 않는다(제공자 이름 문자열만 저장).

### API

- `POST /api/analysis/file` — body `{ activityFileIds[] }`. 업로드 직후 비동기로 호출한다. 각 파일에 대해 **완료·수정되지 않은 건만** Storage에서 내려받아 파일별 요약(`summary.md`)을 생성한다.
- `PATCH /api/analysis/file` — body `{ activityFileId, summaryMd }`. 사용자가 수정한 파일 요약을 저장하고 수정본 표시를 남긴다.
- `POST /api/analysis/project` — body `{ projectId, projectType, projectName }`. 프로젝트의 미완료 파일만 요약을 보강한 뒤, 파일 요약들을 종합해 `summary.md`·`index.json`·`log.md` 3종을 만들어 `project_analyses`(scope=`project`)에 저장한다. 응답에 `analyzedCount / skippedCount / failedCount`, 파일별 성공 여부, 종합 결과(`project`)가 담긴다. **변경 감지(#268)**: 새로 요약할 파일이 없고 `file_analyses.updated_at`이 모두 `project_analyses.updated_at` 이전이면(즉, 마지막 종합 이후 생성·수정된 파일 요약이 없으면) AI를 호출하지 않고 기존 종합 결과를 `unchanged: true`와 함께 반환한다. 사용자가 파일 요약(L1)을 수정하면 `updated_at`이 갱신되므로 해당 프로젝트는 다음 `분석하기`에서 재분석되고, 수정된 요약이 새 L2 입력으로 사용된다. 프로젝트 산출물(L2) 자체를 수정한 경우에는 재분석 대상이 되지 않으며 기존 수정본 보존 정책을 따른다.
- `GET /api/analysis/project?projectId=` — 저장된 프로젝트 종합(3종 + 수정 플래그)과 파일별 분석 상태(화면 복원용).
- `PATCH /api/analysis/project` — body `{ projectId, artifact: 'summary'|'index'|'log', content }`. 프로젝트 산출물 한 개만 수정하고 수정 플래그를 세운다. `index`는 유효한 JSON일 때만 저장한다.
- `POST /api/analysis/aggregate` — 저장된 모든 프로젝트 종합을 모아 메인 개요와 포트폴리오 강조 키워드를 생성한다(`project_analyses`, scope=`user`). 자료가 없으면 `{ ok: false, reason: 'no_data' }`.
- `GET /api/analysis/aggregate` — 마지막 메인 개요 조회(메인 새로고침 복원용).

### 저장(Supabase)

- `file_analyses` — 파일 1건당 분석 1행(`activity_file_id` unique). `summary_md`(수정 가능)·`log_md`·추출 텍스트는 text, metadata/analysis_result는 jsonb. 상태는 `pending/analyzing/completed/failed`, 실패 시 `stage`와 `errors`를 남긴다. (파일 단위 `index_draft`는 더 이상 생성하지 않는다.)
- `project_analyses` — 종합 결과. `(user_id, scope, project_id)` unique로 upsert. `result` jsonb에 프로젝트 종합은 `{ summaryMd, indexJson, logMd, edited, headline, description, activityKeywords, portfolioKeywords, ... }`를, 메인 개요는 `{ headline, description, projects[], activityKeywords, portfolioKeywords, ... }`를 담는다. 산출물 3종을 각각 필드로 나눠 저장하므로 개별 수정이 가능하고 스키마 변경이 필요 없다.
- 스키마 원본: `docs/supabase-analysis.sql`. 저장 구현은 `ai_analysis/db-repository.mjs`(`DbAnalysisRepository`)이며, 로컬 구현(`repository.mjs`)과 같은 인터페이스를 따른다.

### 화면 연동

- 파일 관리(`html/create.html`)에서 세부 폴더에 파일을 업로드하면 파일별 요약(L1)을 생성할 수 있고, 새로고침 후에도 `/api/activity-files`의 `analysisStatus`로 상태 pill이 복원된다.
- 상단 `분석하기` 버튼 → 화면이 완료·진행중 전체 프로젝트를 순회하며 `POST /api/analysis/project`를 프로젝트별로 호출하고 진행률 모달을 표시한다. 서버가 `unchanged: true`로 응답한 프로젝트는 기존 산출물을 유지한 것으로 안내하고, 전체 종합 입력에는 포함한다. 모든 프로젝트 처리가 끝나면 성공한 프로젝트 종합만 사용해 `POST /api/analysis/aggregate`로 전체 종합을 갱신한다.
- 프로젝트별 `summary.md`·`index.json`·`log.md`는 각 프로젝트의 `AI 요약` 세부 폴더에 3개 가상 파일로 표시되며, 파일 카드에서는 `수정` 버튼만 제공한다. 수정 모달 안에서 미리보기와 편집을 함께 처리한다.
- 메인(`html/main.html`)은 `POST /api/analysis/aggregate` 결과의 키워드 개요(headline/description/activityKeywords), AI 분석 개요(activityOverview), 포트폴리오 강조 키워드(portfolioKeywords)를 사용한다. 결과 전체는 `localStorage.myfitfolioAiKeywords`에 저장되어 포트폴리오 생성 화면이 재사용할 수 있다.
- 메인 AI 분석 개요의 작성 방식은 `prompts/main-activity-overview.md`에 분리한다. 이 파일은 활동 유형별 개수, 맡은 역할, 반복 역량을 근거 기반 2~3문장으로 작성하도록 안내한다.
- 분석 결과는 사용자가 확인하기 전까지 초안(`requiresUserConfirmation: true`, `reviewStatus: pending_review`)으로 취급한다.
