# 단일 파일 AI 분석 MVP 파일 구성 안내

이 문서는 단일 파일 AI 분석 MVP(PR #143)에서 추가·수정된 파일들의 역할을 설명한다.
전체 설계 배경과 계획은 [단일 파일 AI 분석 MVP 구현 계획](single-file-ai-analysis-mvp.md)을 참고한다.

> **현재 저장소 적용 상태**: 이 저장소에서는 아래 파이프라인(`ai_analysis/`, `prompts/`, `templates/`)을
> 그대로 사용하되, 라우트는 `app/api/analysis/single-file` 대신 **`app/api/analysis/project`(프로젝트 단위,
> 미분석 파일만 분석)와 `app/api/analysis/aggregate`(사용자 전체 종합)** 로 연결했고,
> 저장은 로컬 대신 **`ai_analysis/db-repository.mjs`(Supabase `file_analyses`/`project_analyses`)** 를 사용한다.
> AI 제공자 기본 우선순위도 OpenAI(key.env) 우선으로 조정했다(`ANALYSIS_PROVIDER`로 변경 가능).
> 실제 기준은 [AI 자동 정리 및 분석 기준](ai-analysis.md)을 따른다.

## 전체 흐름

```text
html/analysis.html (테스트 화면)
    ↓ FormData 업로드
app/api/analysis/single-file/route.js (Next API 라우트)
    ↓
ai_analysis/service.mjs (파이프라인 오케스트레이션)
    ├─ ids.mjs            fileId / analysisId 생성
    ├─ repository.mjs     원본·산출물 저장 (LocalAnalysisRepository)
    ├─ extractor.mjs      파일 → 텍스트 추출
    ├─ ai-client.mjs      Gemini/OpenAI/mock 호출 (prompts/ 사용)
    ├─ validator.mjs      AI 응답 검증
    └─ templates.mjs      summary/index/log 렌더링 (templates/ 사용)
    ↓
data/local-analysis/ (로컬 산출물, gitignore 대상)
```

## 1. 파이프라인 모듈 — `ai_analysis/`

ESM(.mjs)으로 작성되어 Next 라우트에서 import되고, `node` 스크립트로도 직접 실행된다.

| 파일 | 역할 |
|---|---|
| `subfolder-config.mjs` | 프로젝트 유형 7종 라벨(`PROJECT_TYPE_LABELS`)과 참고용 하위 폴더 순서 정의. **AI 추천 분류를 제거하면서 허용 폴더(`getAllowedFolderIds`)·`pending`(분류 대기)은 폐지**했다. 실제 세부 폴더는 사용자가 만든다. |
| `ids.mjs` | `file_YYYYMMDD_xxxxxx` / `analysis_YYYYMMDD_xxxxxx` / `event_###` 형식의 id 생성기. |
| `repository.mjs` | `LocalAnalysisRepository`. 원본 파일, metadata.json, analysis-result.json, summary.md, log.md를 `data/local-analysis/` 아래에 저장한다. 프로젝트 종합은 `aggregate/aggregate-result.json`에 저장하고, `saveProjectArtifact`(개별 산출물 수정)·`listProjectAggregates`(메인 개요 입력)도 제공한다. DB 구현(`db-repository.mjs`)과 같은 메서드 시그니처를 따른다. |
| `extractor.mjs` | 파일 유형별 텍스트 추출. txt/md(그대로), csv(컬럼+앞부분), pdf(pdf-parse), docx(mammoth). 그 외 확장자는 경고와 함께 분석 실패 처리(업로드 자체는 실패 아님). 본문은 24,000자로 제한한다. |
| `ai-client.mjs` | AI 제공자 선택과 호출. 우선순위: `ANALYSIS_MOCK=1`/`ANALYSIS_PROVIDER=mock` → mock, 아니면 `OPENAI_API_KEY`(key.env) → OpenAI, 없으면 `GEMINI_API_KEY`(gemini_key.env) → Gemini. 실제 키가 없으면 사용자 화면용 mock 결과를 조용히 만들지 않고 실패시킨다. `runAiAnalysis`(파일별), `runProjectAnalysis`(프로젝트 종합), `runAggregateAnalysis`(메인 개요) 세 진입점이 각각 `prompts/`의 프롬프트를 읽어 JSON-only 응답을 강제한다. GPT-5/o 계열 모델에는 custom `temperature`를 보내지 않는다. |
| `validator.mjs` | AI 응답 검증. `validateAnalysisResult`(파일별: 필수 필드·`requiresUserConfirmation`·id 일치, **classification 검증은 제거**), `validateProjectAnalysisResult`(프로젝트 종합), `validateAggregateResult`(메인 개요). 실패 시 저장하지 않고 `analysisStatus: failed`. |
| `templates.mjs` | 렌더러. 파일 `summary.md`(`buildSummaryMarkdown`), 프로젝트 `index.json`(`buildProjectIndexJson`, 치환 후 `JSON.parse` 검증)·`summary.md`(`buildProjectSummaryMarkdown`)·`log.md`(`buildProjectLogEntry`)를 결정적으로(비 AI) 채운다. |
| `service.mjs` | 파일별 분석(L1) 오케스트레이션. 업로드 → 메타데이터 → 추출 → AI 분석 → 검증 → `summary.md`·로그 저장. (파일 단위 `index.json`은 더 이상 만들지 않는다.) |
| `analyze-activity-files.mjs` | activity_files 행 목록을 받아 파일별 분석(L1)을 실행하는 공용 헬퍼. `/api/analysis/file`과 `/api/analysis/project`가 공유한다. |
| `aggregate.mjs` | 종합 오케스트레이션 2종. `aggregateProjectAnalyses`(한 프로젝트: 파일 요약 → `summary.md`·`index.json`·`log.md` 3종, 사용자가 수정한 산출물은 보존), `aggregateMainOverview`(모든 프로젝트 → 메인 AI 분석 개요(activityOverview) + 포트폴리오 키워드). 자료가 0건이면 `no_data`, 명시적 mock 모드가 아닌데 저장된 mock 결과만 있으면 `mock_data`를 반환한다. |
| `main-activity-overview.md` | 메인 `AI 분석 개요` 전용 프롬프트 조각. 프로젝트 종합 요약을 입력으로 받아 "당신은 개인 프로젝트 3개..."처럼 활동 유형별 개수, 역할, 역량 흐름을 근거 기반으로 쓰도록 안내한다. |

## 2. 산출물 템플릿 — `templates/`

| 파일 | 역할 |
|---|---|
| `summary.md` | 파일 요약 Markdown 템플릿. 기본 정보 / 한 줄·상세 요약 / 핵심 포인트 / 포트폴리오 활용 후보(역할·기술·성과+근거) / 확인 필요 사항. (AI 추천 분류 섹션은 제거됨.) |
| `index.json` | **프로젝트 index 템플릿.** 실제 세부 폴더 목록(`subfolders`)과 파일 목록(`files`: fileName·folderId(=세부 폴더 id)·oneLine·keywords·priority·reviewStatus)을 결정적으로 채운다. AI 추천 폴더(`aiRecommendation`)·`pending`은 없다. |
| `project-summary.md` | 프로젝트 `summary.md` 템플릿(프로젝트 개요 / 세부 폴더별 요약 / 강점 키워드 / 포트폴리오 활용 후보 키워드 / 확인 필요). |
| `log-entry.md` | 파일 이벤트 로그 블록 템플릿. log.md에 시간순으로 append된다(수정·삭제 없음). |

## 3. 프롬프트(작성 스킬) — `prompts/`

| 파일 | 역할 |
|---|---|
| `single-file-analysis.md` | 파일별 분석 프롬프트. 파일 요약(fileSummary)과 포트폴리오 근거(역할·기술·성과)를 만든다. **폴더 분류는 하지 않는다**(사용자 몫). 추측 금지·근거 필수·JSON-only 규칙 포함. |
| `project-analysis.md` | 프로젝트 종합 프롬프트. 파일 요약 목록을 받아 프로젝트 headline/description/세부 폴더 하이라이트/활동·포트폴리오 키워드를 만든다. |
| `aggregate-analysis.md` | 메인 종합 프롬프트. 프로젝트별 종합 요약을 받아 전체 개요와 포트폴리오 키워드를 만든다. |
| `template-writing-guide.md` | 템플릿 필드별 채우는 법과 공통 원칙(추측 금지, 근거 필수, 폴더 분류는 사용자 몫, 키·개인정보 금지). 렌더러 구현의 기준. |

## 4. API 라우트 — `app/api/analysis/`

Next.js App Router 핸들러. Express·multer 없이 동작한다.

| 라우트 | 역할 |
|---|---|
| `file/route.js` | `POST /api/analysis/file`(업로드 후 파일별 요약 생성, 완료·수정본은 건너뜀), `PATCH`(파일 요약 수정 저장). |
| `project/route.js` | `POST`(미완료 파일 요약 보강 + 프로젝트 종합 3종 생성), `GET`(저장된 종합+파일 상태), `PATCH`(산출물 summary/index/log 개별 수정). |
| `aggregate/route.js` | `POST` = 모든 프로젝트 종합을 모아 메인 개요 생성(자료 0건이면 `no_data`), `GET` = 마지막 메인 개요 조회. 프롬프트는 `prompts/aggregate-analysis.md`. |

### 종합 분석과 화면 연동 (메인 "분석 시작" 버튼)

1. 메인(`html/main.html`)에서 **분석 시작** 클릭 → `POST /api/analysis/aggregate`
2. 성공 시 활동 개요(headline/description/activityKeywords)가 갱신되고, 결과가 **`localStorage.myfitfolioAiKeywords`** 에 캐시된다(새로고침 시 복원).
3. 결과의 `portfolioKeywords`는 포트폴리오 생성에서 강조 키워드로 슬롯인용 소스로 재사용한다(포트폴리오 생성 프롬프트 자체는 별도 담당).
4. 분석된 프로젝트 종합이 없으면 안내를 보여주고 기본 문구를 유지한다.

## 5. 테스트 화면 — `html/analysis.html` + `css/analysis.css`

파일 업로드, 프로젝트 유형 선택, 분석 상태 표시, 결과(요약·추천 하위 폴더·신뢰도·근거·경고) 표시, 산출물 4종 다운로드를 제공하는 단독 테스트 페이지.
다른 화면과 같은 레거시 방식(Next catch-all + LegacyScripts 재주입)으로 서빙되며, `[이대로 확정]/[수정하기]`는 UI만 있고 실제 저장은 DB 연결 후 붙인다.

## 6. 실행 스크립트와 예시 — `scripts/`, `docs/examples/`

| 경로 | 역할 |
|---|---|
| `scripts/run-analysis-example.mjs` | 실제 AI 키로 파이프라인을 실행하는 예시 스크립트. `node scripts/run-analysis-example.mjs [파일] [projectType]`. 산출물을 `docs/examples/single-file-analysis/`에 복사한다. |
| `docs/examples/single-file-analysis/` | `docs/file-management.md`를 **실제 Gemini로 분석한 예시 산출물 4종**(analysis-result.json, summary.md, index.json, log.md). 팀이 기대 출력 형태를 확인하는 기준. |

## 7. 테스트 — `tests/`

| 파일 | 역할 |
|---|---|
| `single-file-analysis.test.js` | mock 모드로 L1 파일 요약 → L2 프로젝트 종합(3종·수정본 보존) → L3 메인 개요 흐름과 미지원 확장자 실패 처리를 검증. `npm test`에 포함됨. |
| `static-html-structure.test.js` (수정) | 분석 모듈·템플릿·프롬프트·라우트·테스트 화면의 존재와 핵심 구조 assertion 추가. |

## 8. 환경 변수

| 파일 (커밋 안 됨) | 변수 |
|---|---|
| `key.env` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `gemini_key.env` | `GEMINI_API_KEY`, `GEMINI_MODEL` (기본 `gemini-flash-latest`) |
| (환경 변수) | `ANALYSIS_MOCK=1` — 키 없이 mock으로 파이프라인 테스트. 사용자에게 실제 분석처럼 보여줄 때는 사용하지 않는다. |

두 파일 모두 `.gitignore` 대상이며, 키 값은 로그·산출물에 노출하지 않는다.

## 9. DB(Supabase) 전환 시 해야 할 일

1. `ai_analysis/repository.mjs`와 같은 메서드 시그니처로 `DbAnalysisRepository` 구현
2. 라우트에서 `LocalAnalysisRepository` 대신 주입
3. 필요하면 `data/local-analysis/` 기존 산출물을 DB로 import
4. `subfolder-config.mjs`의 유형별 하위 폴더를 folders 테이블 시드로 이관

서비스, 프롬프트, 템플릿, 화면은 수정하지 않는다.
