# 템플릿 작성 스킬 (summary.md / index.json / log.md)

이 문서는 `templates/` 폴더의 세 템플릿을 채우는 규칙이다.
현재는 `ai_analysis/templates.mjs` 렌더러가 이 규칙대로 결정적으로(비 AI) 채우고,
이후 출력 품질이 안정되면 이 문서를 그대로 Skill로 승격한다.

## 공통 원칙

1. **추측 금지** — AI 분석 결과 JSON(analysis-result.json)에 있는 값만 사용한다. 없는 역할·기술·성과·수치를 만들어 넣지 않는다.
2. **근거 필수** — 역할/기술/성과 후보를 적을 때는 반드시 근거(위치 + 요약)를 함께 적는다. 근거가 없는 항목은 "근거 없음"으로 표기하지 말고 warnings로 보낸다.
3. **enum 준수** — 하위 폴더는 `ai_analysis/subfolder-config.mjs`의 enum(presentation, report, data, code, planning, submission, visual, pending, other)만 사용한다.
4. **추천은 확정이 아님** — `index.json`의 `files[].folderId`는 사용자 확정 전까지 항상 `"pending"`으로 둔다. AI 추천값은 `aiRecommendation`에만 적는다.
5. **requiresUserConfirmation은 항상 true** — 사용자 검토 전 산출물임을 명시한다.
6. **빈 값 처리** — 값이 없으면 섹션을 지어내지 말고 `- 없음` 한 줄로 적는다.
7. **한국어 작성** — 모든 설명 텍스트는 한국어로 쓴다.
8. **키·개인정보 금지** — API 키, 토큰, 연락처 등 민감 정보를 산출물에 절대 넣지 않는다.

## templates/summary.md 채우기

| 플레이스홀더 | 값 출처 | 규칙 |
|---|---|---|
| `{{originalFileName}}` `{{extension}}` | metadata.json | 그대로 |
| `{{projectTypeLabel}}` | subfolder-config의 PROJECT_TYPE_LABELS | 한국어 라벨 |
| `{{analysisStatus}}` `{{reviewStatus}}` | 분석 결과 | 상태값 enum 그대로 |
| `{{oneLine}}` `{{detailed}}` | fileSummary | 문장 그대로, 재요약 금지 |
| `{{keyPointsList}}` | fileSummary.keyPoints | `- 항목` 목록. 비면 `- 없음` |
| `{{recommendedFolderName}}` `{{confidence}}` `{{classificationReason}}` | classification | confidence는 소수 그대로 |
| `{{rolesList}}` `{{skillsList}}` | portfolioSignals | `- 이름: 근거 요약 (위치)` 형식 |
| `{{impactList}}` | portfolioSignals.impact | `- 주장: 근거 요약 (위치)` 형식 |
| `{{warningsList}}` | warnings | `- 경고` 목록. 비면 `- 없음` |

## templates/index.json 채우기

- `{{foldersJson}}`: 해당 프로젝트 유형의 하위 폴더 배열(subfolder-config의 `getSubfoldersForProjectType`)을 JSON으로 직렬화해 넣는다.
- `files[].folderId`는 리터럴 `"pending"` 유지 (공통 원칙 4).
- `{{confidence}}` `{{recommendedPriority}}`는 숫자 리터럴로 치환한다 (따옴표 없이).
- 치환 결과는 반드시 `JSON.parse`가 성공해야 한다. 실패하면 저장하지 않고 오류 처리한다.

## templates/log-entry.md 채우기 (append 방식)

- log.md는 파일 상단에 `# 단일 파일 분석 로그` 헤더를 한 번만 쓰고, 이후 이벤트마다 log-entry.md 블록을 append한다.
- `{{timestamp}}`: ISO 8601 + 오프셋 (예: 2026-07-08T10:00:00+09:00)
- `{{action}}` 허용값: `file_uploaded`, `extraction_started`, `extraction_completed`, `extraction_failed`, `ai_analysis_started`, `ai_analysis_completed`, `ai_analysis_failed`
- `{{extraLines}}`: 이벤트별 추가 정보(`- key: value` 형식). 예: `ai_analysis_completed`에는 `recommendedFolderId`, `reviewStatus`를 적는다.
- 이벤트는 시간 순서대로만 append하고, 기존 항목을 수정·삭제하지 않는다.

## Skill 승격 기준 (docs/single-file-ai-analysis-mvp.md §19)

1. 실제 파일 10~20개로 테스트해 출력이 안정될 것
2. validator(필수 필드·enum·confidence 범위) 통과율이 안정될 것
3. 위 공통 원칙이 프롬프트만으로 지켜질 것
