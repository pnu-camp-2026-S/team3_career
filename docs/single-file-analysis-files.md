# 단일 파일 AI 분석 MVP 파일 구성 안내

이 문서는 단일 파일 AI 분석 MVP(PR #143)에서 추가·수정된 파일들의 역할을 설명한다.
전체 설계 배경과 계획은 [단일 파일 AI 분석 MVP 구현 계획](single-file-ai-analysis-mvp.md)을 참고한다.

## 전체 흐름

```text
html/analysis.html (테스트 화면)
    ↓ FormData 업로드
app/api/analysis/single-file/route.js (Next API 라우트)
    ↓
lib/analysis/service.mjs (파이프라인 오케스트레이션)
    ├─ ids.mjs            fileId / analysisId 생성
    ├─ repository.mjs     원본·산출물 저장 (LocalAnalysisRepository)
    ├─ extractor.mjs      파일 → 텍스트 추출
    ├─ ai-client.mjs      Gemini/OpenAI/mock 호출 (prompts/ 사용)
    ├─ validator.mjs      AI 응답 검증
    └─ templates.mjs      summary/index/log 렌더링 (templates/ 사용)
    ↓
data/local-analysis/ (로컬 산출물, gitignore 대상)
```

## 1. 파이프라인 모듈 — `lib/analysis/`

ESM(.mjs)으로 작성되어 Next 라우트에서 import되고, `node` 스크립트로도 직접 실행된다.

| 파일 | 역할 |
|---|---|
| `subfolder-config.mjs` | **프로젝트 유형 7종별 하위 폴더 구성과 우선순위** 정의. 공통 enum(presentation, report, data, code, planning, submission, visual, pending, other)에서 유형별 부분집합·순서만 다르게 지정한다. DB 전환 시 folders 테이블의 시드 데이터가 된다. |
| `ids.mjs` | `file_YYYYMMDD_xxxxxx` / `analysis_YYYYMMDD_xxxxxx` / `event_###` 형식의 id 생성기. |
| `repository.mjs` | `LocalAnalysisRepository`. 원본 파일, metadata.json, analysis-result.json, summary.md, index.json, log.md를 `data/local-analysis/` 아래에 저장한다. **DB가 생기면 같은 메서드 시그니처의 `DbAnalysisRepository`로 이 파일만 교체**하면 되고, 서비스 코드는 수정하지 않는다. |
| `extractor.mjs` | 파일 유형별 텍스트 추출. txt/md(그대로), csv(컬럼+앞부분), pdf(pdf-parse), docx(mammoth). 그 외 확장자는 경고와 함께 분석 실패 처리(업로드 자체는 실패 아님). 본문은 24,000자로 제한한다. |
| `ai-client.mjs` | AI 제공자 선택과 호출. 우선순위: `GEMINI_API_KEY`(gemini_key.env) → Gemini, 없으면 `OPENAI_API_KEY`(key.env) → OpenAI, 둘 다 없거나 `ANALYSIS_MOCK=1`이면 mock 고정 응답. `prompts/single-file-analysis.md`를 읽어 `{{플레이스홀더}}`를 치환한 뒤 JSON-only 응답을 강제한다(Gemini `responseMimeType`, OpenAI `response_format`). |
| `validator.mjs` | AI 응답 검증. 필수 필드, 추천 하위 폴더가 허용 enum에 있는지, confidence 0~1 범위, `requiresUserConfirmation === true`, fileId/analysisId 일치를 확인한다. 실패 시 저장하지 않고 `analysisStatus: failed`. |
| `templates.mjs` | `templates/`의 세 템플릿을 읽어 결정적으로(비 AI) 채우는 렌더러. index.json은 치환 후 `JSON.parse`로 유효성을 반드시 확인한다. |
| `service.mjs` | 전체 오케스트레이션. 업로드 → 메타데이터 → 추출 → AI 분석 → 검증 → 산출물 생성 → 로그 기록. 계획 문서 §3의 [1]~[15] 흐름과 대응한다. |
| `aggregate.mjs` | **종합 분석 오케스트레이션.** 저장된 모든 분석 번들을 모아 AI로 종합해 메인 키워드 개요(headline/description/activityKeywords)와 포트폴리오 강조 키워드(portfolioKeywords)를 생성·저장한다. 자료가 0건이면 `no_data`를 반환한다. |

## 2. 산출물 템플릿 — `templates/`

| 파일 | 역할 |
|---|---|
| `summary.md` | 자료 요약 Markdown 템플릿. 기본 정보 / 한 줄·상세 요약 / 핵심 포인트 / AI 추천 분류 / 포트폴리오 활용 후보(역할·기술·성과+근거) / 확인 필요 사항. |
| `index.json` | 프로젝트 index 초안 템플릿. `folders`는 프로젝트 유형별 하위 폴더 목록으로 채워지고, **`files[].folderId`는 사용자 확정 전까지 항상 `"pending"`**, AI 추천값은 `aiRecommendation`에만 들어간다. |
| `log-entry.md` | 이벤트 블록 단위 로그 템플릿. log.md에 시간순으로 append된다(수정·삭제 없음). |

## 3. 프롬프트(작성 스킬) — `prompts/`

| 파일 | 역할 |
|---|---|
| `single-file-analysis.md` | AI 분석 프롬프트. **프로젝트 유형과 그 유형의 허용 하위 폴더 목록을 동적으로 주입**받아, 그 안에서만 추천하게 한다. 추측 금지·근거 필수·JSON-only·추천은 확정 아님 규칙 포함. |
| `template-writing-guide.md` | "템플릿에 적는 스킬". 세 템플릿의 필드별 채우는 법과 공통 원칙(추측 금지, 근거 필수, enum 준수, pending 유지, 키·개인정보 금지)을 정의한다. 렌더러 구현의 기준이자, 출력이 안정되면 Skill로 승격할 때의 원본 문서. |

## 4. API 라우트 — `app/api/analysis/`

Next.js App Router 핸들러. Express·multer 없이 동작한다.

| 라우트 | 역할 |
|---|---|
| `single-file/route.js` | `POST /api/analysis/single-file`. `request.formData()`로 파일+projectType을 받아 파이프라인 실행. 성공 시 분석 결과·summary/index/log를 함께 반환, 실패 시 단계(stage)와 오류 목록 반환(422). |
| `subfolders/route.js` | `GET /api/analysis/subfolders?projectType=`. 유형별 하위 폴더 구성을 프론트에서 조회. 파라미터 없으면 전체 유형 반환. |
| `[analysisId]/route.js` | `GET /api/analysis/{analysisId}`. 저장된 분석 번들(메타데이터+결과+산출물) 조회. |
| `aggregate/route.js` | `POST` = 저장된 모든 분석의 종합 실행(자료 0건이면 `no_data`), `GET` = 마지막 종합 결과 조회. 프롬프트는 `prompts/aggregate-analysis.md`. |

### 종합 분석과 화면 연동 (메인 "분석 시작" 버튼)

1. 메인(`html/main.html`)에서 **분석 시작** 클릭 → `POST /api/analysis/aggregate`
2. 성공 시 키워드 개요(`keywordHeadline`/`keywordDescription`/`keywordChipList`)가 AI 결과로 갱신되고, 결과가 **`localStorage.myfitfolioAiKeywords`** 에 저장된다 (새로고침 시 복원).
3. 포트폴리오 생성(`html/portfolio_create.html`)의 "강조할 AI 역량 키워드" 풀은 이 키의 `portfolioKeywords`를 읽어 **AI 배지(`ai-tag`)가 붙은 키워드로 앞쪽에 병합**한다. 선택된 키워드는 기존 흐름대로 포트폴리오 초안에 반영된다.
4. 분석된 자료가 없으면 버튼 아래 안내(`analysisNotice`)를 보여주고 기본 문구를 유지한다.

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
| `single-file-analysis.test.js` | mock 모드로 파이프라인 전체를 실행해 산출물 5종 생성, folderId=pending 유지, validator 통과, 미지원 확장자 실패 처리를 검증. `npm test`에 포함됨. |
| `static-html-structure.test.js` (수정) | 분석 모듈·템플릿·프롬프트·라우트·테스트 화면의 존재와 핵심 구조 assertion 추가. |

## 8. 환경 변수

| 파일 (커밋 안 됨) | 변수 |
|---|---|
| `key.env` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `gemini_key.env` | `GEMINI_API_KEY`, `GEMINI_MODEL` (기본 `gemini-flash-latest`) |
| (환경 변수) | `ANALYSIS_MOCK=1` — 키 없이 mock으로 파이프라인 테스트 |

두 파일 모두 `.gitignore` 대상이며, 키 값은 로그·산출물에 노출하지 않는다.

## 9. DB 전환 시 해야 할 일

1. `lib/analysis/repository.mjs`와 같은 메서드 시그니처로 `DbAnalysisRepository` 구현
2. 라우트에서 `LocalAnalysisRepository` 대신 주입
3. 필요하면 `data/local-analysis/` 기존 산출물을 DB로 import
4. `subfolder-config.mjs`의 유형별 하위 폴더를 folders 테이블 시드로 이관

서비스, 프롬프트, 템플릿, 화면은 수정하지 않는다.
