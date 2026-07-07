# 단일 파일 AI 분석 MVP 구현 계획

> **구현 완료 (2026-07-08)** — 아래 계획은 Next.js 구조 기준으로 구현되었다. 확정 사항:
>
> - **코드 위치**: 파이프라인 `lib/analysis/`(subfolder-config, ids, repository, extractor, ai-client, validator, templates, service), API `app/api/analysis/`(single-file, subfolders, [analysisId]), 테스트 화면 `html/analysis.html`
> - **템플릿**: `templates/summary.md`, `templates/index.json`, `templates/log-entry.md` — 작성 규칙은 `prompts/template-writing-guide.md`
> - **프롬프트**: `prompts/single-file-analysis.md` (프로젝트 유형 + 허용 하위 폴더를 동적 주입)
> - **AI 제공자**: `GEMINI_API_KEY`(gemini_key.env) → Gemini, 없으면 `OPENAI_API_KEY` → OpenAI, 없으면 mock (`ANALYSIS_MOCK=1`)
> - **프로젝트 유형별 하위 폴더** (`lib/analysis/subfolder-config.mjs`, 순서 = 중요도):
>
> | 프로젝트 유형 | 하위 폴더 순서 |
> |---|---|
> | 개인 프로젝트 | planning → code → data → report → presentation → visual → submission → pending → other |
> | 팀 프로젝트 | planning → report → code → data → presentation → submission → visual → pending → other |
> | 공모전 | submission → presentation → planning → visual → code → data → report → pending → other |
> | 자격증 | submission → visual → data → report → pending → other |
> | 교육 | report → submission → code → data → presentation → visual → pending → other |
> | 봉사 | submission → visual → report → planning → pending → other |
> | 기타/커스텀 | 기본 전체 순서 |
>
> - **실제 분석 예시**: `docs/examples/single-file-analysis/` — `docs/file-management.md`를 실제 Gemini로 분석한 산출물 4종. 재현: `node scripts/run-analysis-example.mjs [파일] [projectType]`

## 0. 목적

현재는 데이터베이스가 아직 구축되지 않았으므로, 먼저 **자료 하나를 업로드하거나 입력받아 AI가 내용을 분석하고 정리하는 기능**만 구현한다.

다만 이후 DB가 만들어졌을 때 바로 연결할 수 있도록, 처음부터 다음 원칙을 적용한다.

```text
AI 분석 기능은 DB에 직접 의존하지 않는다.
저장 방식은 Repository 인터페이스 뒤에 숨긴다.
현재는 Local JSON/File Repository를 사용한다.
나중에는 Db Repository로 교체한다.
AI 출력은 반드시 구조화 JSON으로 받는다.
summary.md, index.json, log.md는 DB 전환 전에도 생성 가능한 형태로 유지한다.
```

---

## 1. 이번 단계에서 구현할 범위

이번 단계의 목표는 **단일 파일 분석 파이프라인**이다.

### 구현한다

```text
1. 파일 1개 업로드
2. 기본 메타데이터 생성
3. 파일 내용 추출
4. AI 분석 실행
5. AI 분석 결과를 구조화 JSON으로 반환
6. 분석 결과를 화면에 표시
7. summary.md 형태의 요약문 생성
8. index.json 초안 생성
9. log.md 초안 생성
10. 로컬 파일 또는 임시 저장소에 결과 저장
```

### 아직 구현하지 않는다

```text
1. 실제 DB 저장
2. 사용자별 프로젝트 목록 관리
3. 여러 파일을 한 프로젝트에 누적 관리
4. 폴더 드래그 앤 드롭
5. 휴지통, 복구, 영구 삭제
6. GitHub 동기화
7. 다중 파일 기반 프로젝트 전체 분석
8. 포트폴리오 최종 생성 기능
```

---

## 2. 추천 구현 방식

현재는 DB가 없으므로 다음 구조가 가장 적합하다.

```text
Frontend
  ↓
POST /api/analysis/single-file
  ↓
SingleFileAnalysisService
  ↓
FileExtractor
  ↓
AIAnalysisClient
  ↓
ResultValidator
  ↓
LocalAnalysisRepository
  ↓
summary.md / index.json / log.md / analysis-result.json 생성
```

핵심은 `LocalAnalysisRepository`를 만든다는 점이다.

DB가 생기면 이 부분만 `DbAnalysisRepository`로 교체한다.

```text
현재:
AnalysisRepository = LocalAnalysisRepository

DB 구축 후:
AnalysisRepository = DbAnalysisRepository
```

서비스 로직은 그대로 유지한다.

---

## 3. 전체 처리 흐름

```text
[1] 사용자가 파일 1개 업로드
[2] 서버가 fileId, analysisId 생성
[3] 서버가 원본 파일을 임시 저장
[4] 서버가 기본 메타데이터 생성
[5] 분석 상태를 pending으로 기록
[6] 파일 내용 추출
[7] 분석 상태를 analyzing으로 변경
[8] AI 분석 프롬프트 실행
[9] AI 응답 JSON 검증
[10] 분석 상태를 completed 또는 failed로 변경
[11] analysis-result.json 저장
[12] summary.md 생성
[13] index.json 초안 생성
[14] log.md 이벤트 기록
[15] UI에 분석 결과 표시
```

MVP에서는 사용자가 파일을 올리면 바로 분석을 실행해도 된다.  
다만 내부 구조는 나중에 큐 기반 비동기 처리로 바꿀 수 있게 상태값을 분리한다.

---

## 4. 임시 저장 구조

DB가 없을 때는 프로젝트 하나를 임시 프로젝트로 간주한다.

```text
/data/local-analysis/
  single-file-session/
    files/
      {fileId}/
        original.{ext}
        extracted-text.txt
    results/
      {analysisId}/
        metadata.json
        analysis-result.json
        summary.md
        index.json
        log.md
```

예시:

```text
/data/local-analysis/
  single-file-session/
    files/
      file_20260707_001/
        original.pdf
        extracted-text.txt
    results/
      analysis_20260707_001/
        metadata.json
        analysis-result.json
        summary.md
        index.json
        log.md
```

이 구조를 쓰면 DB가 없어도 분석 결과를 확인할 수 있고, DB가 생긴 뒤에는 같은 데이터를 그대로 마이그레이션할 수 있다.

---

## 5. 상태값 설계

DB가 없어도 상태값은 처음부터 분리한다.

### 업로드 상태

```text
uploaded: 업로드 완료
failed: 업로드 실패
```

### 분석 상태

```text
pending: 분석 시작 전
analyzing: 분석 중
completed: 분석 완료
failed: 분석 실패
```

### 사용자 검토 상태

```text
pending_review: AI 추천 결과 확인 필요
accepted: 사용자가 AI 추천 결과를 그대로 확정
edited: 사용자가 AI 추천 결과를 수정 후 확정
rejected: 사용자가 AI 추천 결과를 사용하지 않음
```

MVP에서는 `pending_review`까지만 구현해도 충분하다.  
나중에 DB와 사용자 확정 UI가 붙으면 `accepted`, `edited`, `rejected`를 사용한다.

---

## 6. 파일 메타데이터 형식

파일이 들어오면 AI 분석보다 먼저 메타데이터를 생성한다.

```json
{
  "schemaVersion": "1.0.0",
  "fileId": "file_20260707_001",
  "analysisId": "analysis_20260707_001",
  "projectId": "single-file-session",
  "originalFileName": "example.pdf",
  "safeFileName": "file_20260707_001.pdf",
  "extension": "pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "checksumSha256": "sha256-hash",
  "storagePath": "/data/local-analysis/single-file-session/files/file_20260707_001/original.pdf",
  "uploadedAt": "2026-07-07T20:00:00+09:00",
  "uploadStatus": "uploaded",
  "analysisStatus": "pending",
  "reviewStatus": "pending_review"
}
```

나중에 DB가 생기면 이 객체는 `files` 테이블 또는 `file_metadata` 테이블로 들어간다.

---

## 7. 파일 내용 추출

MVP에서는 지원 파일을 너무 넓히지 않는다.

### 1차 지원 권장

```text
.md
.txt
.pdf
.docx
.pptx
.csv
```

### 2차 지원

```text
.xlsx
.png
.jpg
.jpeg
```

이미지 파일은 OCR이나 이미지 이해 모델이 필요하므로 2차로 미룬다.

### 추출 결과 형식

```json
{
  "fileId": "file_20260707_001",
  "analysisId": "analysis_20260707_001",
  "extractionStatus": "completed",
  "contentText": "추출된 텍스트 본문",
  "contentPreview": "앞부분 미리보기",
  "contentStats": {
    "characterCount": 12345,
    "wordCount": 2048,
    "pageCount": 12,
    "slideCount": null,
    "rowCount": null
  },
  "warnings": []
}
```

추출에 실패해도 파일 업로드 자체는 실패로 처리하지 않는다.  
이 경우 `analysisStatus`만 `failed`로 바꾸고, UI에 재시도 버튼을 보여 준다.

---

## 8. AI 분석 결과 JSON 형식

AI는 Markdown 본문만 반환하지 말고, 반드시 구조화 JSON을 반환해야 한다.

```json
{
  "schemaVersion": "1.0.0",
  "fileId": "file_20260707_001",
  "analysisId": "analysis_20260707_001",
  "analysisStatus": "completed",
  "reviewStatus": "pending_review",
  "fileSummary": {
    "title": "자료 제목 후보",
    "oneLine": "자료를 한 문장으로 요약",
    "detailed": "자료의 핵심 내용을 3~5문장으로 정리",
    "keyPoints": [
      "핵심 내용 1",
      "핵심 내용 2",
      "핵심 내용 3"
    ],
    "keywords": [
      "키워드1",
      "키워드2",
      "키워드3"
    ]
  },
  "classification": {
    "recommendedFolderId": "report",
    "recommendedFolderName": "보고서",
    "confidence": 0.87,
    "reason": "문제 정의, 진행 과정, 결과가 보고서 형식으로 정리되어 있기 때문",
    "alternatives": [
      {
        "folderId": "submission",
        "folderName": "제출 자료",
        "confidence": 0.42,
        "reason": "최종 제출용 문서로도 활용될 수 있음"
      }
    ]
  },
  "portfolioSignals": {
    "roles": [
      {
        "name": "기획",
        "confidence": 0.78,
        "evidence": [
          {
            "location": "본문 2장",
            "summary": "문제 정의와 사용자 요구사항이 정리되어 있음"
          }
        ]
      }
    ],
    "skills": [
      {
        "name": "자료 구조화",
        "confidence": 0.82,
        "evidence": [
          {
            "location": "전체 구성",
            "summary": "목표, 과정, 결과가 단계적으로 정리되어 있음"
          }
        ]
      }
    ],
    "impact": [
      {
        "claim": "프로젝트 결과를 포트폴리오 소재로 활용할 수 있음",
        "confidence": 0.7,
        "evidence": [
          {
            "location": "결론 부분",
            "summary": "성과와 결과가 정리되어 있음"
          }
        ]
      }
    ]
  },
  "recommendedPriority": {
    "value": 1,
    "reason": "프로젝트 핵심 내용을 대표하는 자료이기 때문"
  },
  "warnings": [
    "성과 수치가 명확하지 않아 정량 성과는 확인 필요"
  ],
  "requiresUserConfirmation": true
}
```

---

## 9. AI 분석 프롬프트

초기에는 별도 Skill을 만들기보다, 아래 프롬프트를 `prompts/single-file-analysis.md`로 관리한다.  
분석 결과가 안정되면 이 내용을 Skill로 승격한다.

```text
너는 포트폴리오 자료 정리용 AI 분석기다.

목표:
사용자가 업로드한 단일 파일을 분석하여 포트폴리오 작성에 활용할 수 있는 구조화된 분석 결과를 만든다.

중요 규칙:
1. 제공된 파일 메타데이터와 추출된 본문만 사용한다.
2. 본문에 없는 역할, 기술, 성과, 수치를 추측하지 않는다.
3. 불확실한 내용은 warnings에 넣는다.
4. 파일을 하나의 자료 유형으로 분류하고, 적절한 폴더를 추천한다.
5. 폴더는 확정하지 않고 추천만 한다.
6. 모든 역할, 기술, 성과 후보에는 가능한 한 근거를 함께 적는다.
7. 사용자가 확인해야 하므로 requiresUserConfirmation은 항상 true로 둔다.
8. 출력은 반드시 JSON만 반환한다.
9. Markdown 설명, 코드블록, 주석, 사족을 출력하지 않는다.

허용 폴더:
- presentation: 발표자료
- report: 보고서
- data: 데이터
- code: 코드
- planning: 기획서
- submission: 제출 자료
- visual: 이미지/시각자료
- pending: 분류 대기
- other: 기타

입력:
FILE_METADATA:
{{fileMetadata}}

EXTRACTED_CONTENT:
{{extractedContent}}

출력 JSON:
{
  "schemaVersion": "1.0.0",
  "fileId": "{{fileId}}",
  "analysisId": "{{analysisId}}",
  "analysisStatus": "completed",
  "reviewStatus": "pending_review",
  "fileSummary": {
    "title": "string",
    "oneLine": "string",
    "detailed": "string",
    "keyPoints": ["string"],
    "keywords": ["string"]
  },
  "classification": {
    "recommendedFolderId": "presentation | report | data | code | planning | submission | visual | pending | other",
    "recommendedFolderName": "string",
    "confidence": 0.0,
    "reason": "string",
    "alternatives": []
  },
  "portfolioSignals": {
    "roles": [],
    "skills": [],
    "impact": []
  },
  "recommendedPriority": {
    "value": 1,
    "reason": "string"
  },
  "warnings": [],
  "requiresUserConfirmation": true
}
```

---

## 10. summary.md 생성 방식

`summary.md`는 AI 분석 결과 JSON에서 생성한다.

MVP에서는 별도 AI 호출 없이 템플릿으로 생성해도 충분하다.

```md
# 자료 요약

## 1. 기본 정보

- 파일명: example.pdf
- 파일 유형: pdf
- 분석 상태: completed
- 검토 상태: pending_review

## 2. 한 줄 요약

자료를 한 문장으로 요약한 내용

## 3. 상세 요약

자료의 핵심 내용을 3~5문장으로 정리한 내용

## 4. 핵심 포인트

- 핵심 내용 1
- 핵심 내용 2
- 핵심 내용 3

## 5. AI 추천 분류

- 추천 폴더: 보고서
- 신뢰도: 0.87
- 추천 이유: 문서 구조상 보고서에 해당함

## 6. 포트폴리오 활용 후보

### 역할 후보

- 기획: 문제 정의와 사용자 요구사항 정리 근거 있음

### 기술 및 역량 후보

- 자료 구조화: 목표, 과정, 결과를 단계적으로 정리한 근거 있음

### 성과 및 임팩트 후보

- 프로젝트 결과를 포트폴리오 소재로 활용 가능

## 7. 확인 필요 사항

- 성과 수치가 명확하지 않아 정량 성과는 확인 필요
```

나중에 DB가 생겨도 `summary.md`는 DB의 분석 결과를 읽어 렌더링하면 된다.

---

## 11. index.json 초안 생성 방식

현재는 실제 프로젝트/폴더 DB가 없으므로 `index.json`은 단일 파일 기준 초안으로 생성한다.

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "projectId": "single-file-session",
    "projectName": "임시 단일 파일 분석"
  },
  "folders": [
    {
      "folderId": "presentation",
      "folderName": "발표자료",
      "order": 1
    },
    {
      "folderId": "report",
      "folderName": "보고서",
      "order": 2
    },
    {
      "folderId": "data",
      "folderName": "데이터",
      "order": 3
    },
    {
      "folderId": "code",
      "folderName": "코드",
      "order": 4
    },
    {
      "folderId": "planning",
      "folderName": "기획서",
      "order": 5
    },
    {
      "folderId": "submission",
      "folderName": "제출 자료",
      "order": 6
    },
    {
      "folderId": "visual",
      "folderName": "이미지/시각자료",
      "order": 7
    },
    {
      "folderId": "pending",
      "folderName": "분류 대기",
      "order": 99
    }
  ],
  "files": [
    {
      "fileId": "file_20260707_001",
      "analysisId": "analysis_20260707_001",
      "folderId": "pending",
      "fileName": "example.pdf",
      "fileType": "pdf",
      "order": 1,
      "priority": null,
      "uploadStatus": "uploaded",
      "analysisStatus": "completed",
      "reviewStatus": "pending_review",
      "summary": null,
      "tags": [],
      "aiRecommendation": {
        "recommendedFolderId": "report",
        "recommendedFolderName": "보고서",
        "confidence": 0.87,
        "recommendedPriority": 1,
        "recommendedSummary": "자료의 핵심 내용을 요약한 문장",
        "requiresUserConfirmation": true
      }
    }
  ]
}
```

사용자 확정 UI가 붙기 전까지는 `folderId`를 추천 폴더로 바로 바꾸지 않는다.  
기본값은 `pending`으로 둔다.

---

## 12. log.md 생성 방식

`log.md`는 AI가 자유롭게 쓰지 말고 시스템 템플릿으로 append한다.

```md
# 단일 파일 분석 로그

## 2026-07-07T20:00:00+09:00

- eventId: event_001
- action: file_uploaded
- fileId: file_20260707_001
- analysisId: analysis_20260707_001
- fileName: example.pdf
- uploadStatus: uploaded
- analysisStatus: pending

## 2026-07-07T20:00:02+09:00

- eventId: event_002
- action: extraction_completed
- fileId: file_20260707_001
- analysisId: analysis_20260707_001

## 2026-07-07T20:00:05+09:00

- eventId: event_003
- action: ai_analysis_completed
- fileId: file_20260707_001
- analysisId: analysis_20260707_001
- recommendedFolderId: report
- reviewStatus: pending_review
```

DB가 생기면 이 이벤트들은 `file_events` 또는 `analysis_events` 테이블로 옮긴다.

---

## 13. API 설계

### 13.1 단일 파일 분석 요청

```http
POST /api/analysis/single-file
Content-Type: multipart/form-data
```

요청 필드:

```text
file: 업로드 파일
projectId: optional, 없으면 single-file-session
```

응답:

```json
{
  "ok": true,
  "fileId": "file_20260707_001",
  "analysisId": "analysis_20260707_001",
  "metadata": {},
  "analysisResult": {},
  "summaryMarkdown": "# 자료 요약\n...",
  "indexDraft": {},
  "logMarkdown": "# 단일 파일 분석 로그\n..."
}
```

### 13.2 분석 결과 조회

MVP에서는 선택 사항이다.

```http
GET /api/analysis/{analysisId}
```

응답:

```json
{
  "ok": true,
  "analysisId": "analysis_20260707_001",
  "metadata": {},
  "analysisResult": {},
  "summaryMarkdown": "",
  "indexDraft": {},
  "logMarkdown": ""
}
```

---

## 14. Repository 인터페이스

처음부터 저장소 인터페이스를 만든다.

```ts
export interface AnalysisRepository {
  saveOriginalFile(input: SaveOriginalFileInput): Promise<StoredFile>;
  saveMetadata(metadata: FileMetadata): Promise<void>;
  saveExtractedText(fileId: string, text: string): Promise<void>;
  saveAnalysisResult(result: AnalysisResult): Promise<void>;
  saveSummaryMarkdown(analysisId: string, markdown: string): Promise<void>;
  saveIndexDraft(analysisId: string, indexDraft: IndexDraft): Promise<void>;
  appendLog(event: AnalysisEvent): Promise<void>;
  getAnalysisBundle(analysisId: string): Promise<AnalysisBundle | null>;
}
```

현재 구현체:

```ts
export class LocalAnalysisRepository implements AnalysisRepository {
  // /data/local-analysis 하위에 파일과 JSON을 저장한다.
}
```

나중에 DB 구현체:

```ts
export class DbAnalysisRepository implements AnalysisRepository {
  // files, file_analysis_results, file_events 테이블에 저장한다.
}
```

중요한 점은 `SingleFileAnalysisService`가 `LocalAnalysisRepository`인지 `DbAnalysisRepository`인지 몰라야 한다는 것이다.

---

## 15. 서비스 계층 설계

```ts
export class SingleFileAnalysisService {
  constructor(
    private readonly repository: AnalysisRepository,
    private readonly extractor: FileExtractor,
    private readonly aiClient: AIAnalysisClient,
    private readonly validator: AnalysisResultValidator
  ) {}

  async analyzeSingleFile(input: AnalyzeSingleFileInput): Promise<AnalyzeSingleFileOutput> {
    // 1. fileId, analysisId 생성
    // 2. 원본 파일 저장
    // 3. 메타데이터 저장
    // 4. 텍스트 추출
    // 5. AI 분석 실행
    // 6. AI 응답 검증
    // 7. summary.md 생성
    // 8. index.json 초안 생성
    // 9. log.md 기록
    // 10. 결과 반환
  }
}
```

이 구조를 따르면 DB 연결 시 서비스 코드를 거의 수정하지 않는다.

---

## 16. 프론트엔드 화면 구성

MVP 화면은 하나면 충분하다.

```text
[파일 업로드 영역]

지원 파일:
md, txt, pdf, docx, pptx, csv

[분석하기 버튼]

상태:
- 업로드 완료
- 텍스트 추출 중
- AI 분석 중
- 분석 완료
- 분석 실패

[분석 결과]

1. 한 줄 요약
2. 상세 요약
3. 핵심 포인트
4. AI 추천 폴더
5. 추천 우선순위
6. 포트폴리오 활용 후보
7. 근거
8. 확인 필요 사항

[내보내기]
- summary.md 다운로드
- analysis-result.json 다운로드
- index.json 다운로드
- log.md 다운로드
```

사용자 확정 기능은 이번 단계에서 선택 사항이다.

```text
[이대로 확정] [수정하기]
```

이 버튼은 UI만 만들어 두고, 실제 DB 저장은 나중에 연결해도 된다.  
현재는 누르면 로컬 `index.json`의 `reviewStatus`만 변경하는 정도로 처리할 수 있다.

---

## 17. 구현 순서

### 1단계. 타입과 스키마 정의

먼저 다음 타입을 만든다.

```text
FileMetadata
ExtractedContent
AnalysisResult
IndexDraft
AnalysisEvent
AnalysisBundle
```

그리고 AI 응답 검증용 JSON Schema 또는 Zod Schema를 만든다.

완료 기준:

```text
AI 응답이 잘못된 JSON이면 저장하지 않고 오류 처리한다.
필수 필드가 없으면 analysisStatus를 failed로 처리한다.
```

---

### 2단계. 로컬 저장소 구현

`LocalAnalysisRepository`를 만든다.

완료 기준:

```text
원본 파일 저장 가능
metadata.json 저장 가능
analysis-result.json 저장 가능
summary.md 저장 가능
index.json 저장 가능
log.md 저장 가능
```

---

### 3단계. 파일 업로드 API 구현

`POST /api/analysis/single-file`을 만든다.

완료 기준:

```text
파일 1개를 업로드할 수 있다.
fileId와 analysisId가 생성된다.
metadata.json이 생성된다.
업로드 실패 시 명확한 오류를 반환한다.
```

---

### 4단계. 텍스트 추출기 구현

파일 유형별 추출기를 만든다.

```text
txt/md: 그대로 읽기
csv: 앞부분과 컬럼 구조 중심으로 읽기
pdf: 텍스트 추출
docx: 문단 텍스트 추출
pptx: 슬라이드 텍스트 추출
```

완료 기준:

```text
extracted-text.txt가 생성된다.
추출된 본문이 AI 프롬프트 입력으로 들어간다.
추출 실패 시 analysisStatus가 failed가 된다.
```

---

### 5단계. AI 분석 클라이언트 구현

`AIAnalysisClient`를 만든다.

완료 기준:

```text
fileMetadata와 extractedContent를 프롬프트에 넣는다.
AI가 JSON 형식으로 응답한다.
응답을 AnalysisResult로 파싱한다.
```

---

### 6단계. 분석 결과 검증

`AnalysisResultValidator`를 만든다.

완료 기준:

```text
required field 검증
folderId enum 검증
confidence 0~1 범위 검증
requiresUserConfirmation true 여부 검증
fileId, analysisId 일치 여부 검증
```

---

### 7단계. summary.md 생성

분석 결과를 바탕으로 Markdown을 생성한다.

완료 기준:

```text
summary.md가 생성된다.
화면에서도 같은 Markdown을 표시할 수 있다.
```

---

### 8단계. index.json 초안 생성

분석 결과를 바탕으로 `index.json` 초안을 생성한다.

완료 기준:

```text
folderId는 pending으로 유지된다.
aiRecommendation에 추천 폴더와 요약이 들어간다.
reviewStatus는 pending_review로 저장된다.
```

---

### 9단계. log.md 생성

분석 이벤트를 순서대로 기록한다.

완료 기준:

```text
file_uploaded 기록
extraction_started 또는 extraction_completed 기록
ai_analysis_started 기록
ai_analysis_completed 또는 ai_analysis_failed 기록
```

---

### 10단계. 프론트엔드 결과 화면 구현

분석 결과를 사람이 확인할 수 있게 보여 준다.

완료 기준:

```text
한 줄 요약 표시
상세 요약 표시
핵심 포인트 표시
추천 폴더 표시
포트폴리오 활용 후보 표시
근거 표시
확인 필요 사항 표시
summary.md, index.json, log.md 다운로드 가능
```

---

## 18. DB 연결 시 마이그레이션 계획

DB가 생기면 아래처럼 매핑한다.

### files 테이블

```text
fileId
projectId
originalFileName
safeFileName
extension
mimeType
sizeBytes
checksumSha256
storagePath
uploadStatus
createdAt
updatedAt
deletedAt
```

### file_analysis_results 테이블

```text
analysisId
fileId
analysisStatus
reviewStatus
summaryTitle
oneLineSummary
detailedSummary
recommendedFolderId
recommendedPriority
confidence
rawResultJson
createdAt
updatedAt
```

### file_analysis_evidence 테이블

```text
evidenceId
analysisId
fileId
signalType
signalName
location
summary
confidence
```

### file_events 테이블

```text
eventId
fileId
analysisId
action
payloadJson
createdAt
```

DB 전환 시 해야 할 작업은 다음뿐이다.

```text
1. DbAnalysisRepository 구현
2. 의존성 주입에서 LocalAnalysisRepository를 DbAnalysisRepository로 교체
3. 기존 local-analysis 결과 파일을 필요하면 DB로 import
4. GET API가 DB에서 결과를 읽도록 변경
```

서비스, 프롬프트, AI 응답 스키마, 프론트엔드 표시 구조는 유지한다.

---

## 19. Skill 적용 여부

현재 단계에서는 별도 Skill을 바로 만들기보다 다음 순서를 추천한다.

```text
1. prompts/single-file-analysis.md로 시작
2. AI 응답 JSON Schema를 안정화
3. 실제 파일 10~20개로 테스트
4. 출력 품질이 안정되면 Skill로 승격
```

이유는 현재는 DB도 없고 분석 범위도 단일 파일이기 때문이다.  
처음부터 Skill로 강제하면 수정 속도가 느려질 수 있다.

다만 프롬프트 안에는 Skill처럼 강한 규칙을 넣는다.

```text
- 추측 금지
- JSON만 출력
- 추천은 확정이 아님
- 근거 포함
- 사용자 확인 필요
- 허용 폴더 enum 준수
```

---

## 20. 최종 결정안

이번 단계는 다음과 같이 구현한다.

```text
단일 파일 분석 MVP를 먼저 만든다.
DB 없이 LocalAnalysisRepository를 사용한다.
AI는 파일을 분석해 구조화 JSON을 반환한다.
summary.md, index.json, log.md는 로컬 산출물로 생성한다.
index.json의 folderId는 pending으로 두고 aiRecommendation에 추천값을 저장한다.
사용자 확정은 나중에 DB 연결 후 본격 구현한다.
DB 연결 시 Repository 구현체만 교체할 수 있게 만든다.
```

이렇게 만들면 지금 당장 AI 분석 기능을 테스트할 수 있고, 나중에 DB가 생겼을 때 전체 구조를 갈아엎지 않아도 된다.
