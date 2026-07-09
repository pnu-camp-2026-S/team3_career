# 템플릿 작성 스킬 (파일 요약 / 프로젝트 산출물)

이 문서는 `templates/` 폴더의 템플릿을 채우는 규칙이다.
현재는 `ai_analysis/templates.mjs` 렌더러가 이 규칙대로 결정적으로(비 AI) 채우고,
이후 출력 품질이 안정되면 이 문서를 그대로 Skill로 승격한다.

## 공통 원칙

1. **추측 금지** — AI 분석 결과 JSON(analysis-result.json)에 있는 값만 사용한다. 없는 역할·기술·성과·수치를 만들어 넣지 않는다.
2. **근거 필수** — 역할/기술/성과 후보를 적을 때는 반드시 근거(위치 + 요약)를 함께 적는다. 근거가 없는 항목은 warnings로 보낸다.
3. **폴더 분류는 사용자 몫** — AI는 파일이 어느 세부 폴더에 속하는지 판단하지 않는다. 세부 폴더는 사용자가 직접 정한다.
4. **requiresUserConfirmation은 항상 true** — 사용자 검토 전 산출물임을 명시한다.
5. **빈 값 처리** — 값이 없으면 섹션을 지어내지 말고 `- 없음` 한 줄로 적는다.
6. **한국어 작성** — 모든 설명 텍스트는 한국어로 쓴다.
7. **키·개인정보 금지** — API 키, 토큰, 연락처 등 민감 정보를 산출물에 절대 넣지 않는다.

## 파일 단위 산출물 — templates/summary.md 채우기

파일 1건을 업로드하면 자동으로 생성되며, 사용자가 직접 수정할 수 있다.

| 플레이스홀더 | 값 출처 | 규칙 |
|---|---|---|
| `{{originalFileName}}` `{{extension}}` | metadata.json | 그대로 |
| `{{projectTypeLabel}}` | subfolder-config의 PROJECT_TYPE_LABELS | 한국어 라벨 |
| `{{analysisStatus}}` `{{reviewStatus}}` | 분석 결과 | 상태값 enum 그대로 |
| `{{oneLine}}` `{{detailed}}` | fileSummary | 문장 그대로, 재요약 금지 |
| `{{keyPointsList}}` | fileSummary.keyPoints | `- 항목` 목록. 비면 `- 없음` |
| `{{rolesList}}` `{{skillsList}}` | portfolioSignals | `- 이름: 근거 요약 (위치)` 형식 |
| `{{impactList}}` | portfolioSignals.impact | `- 주장: 근거 요약 (위치)` 형식 |
| `{{warningsList}}` | warnings | `- 경고` 목록. 비면 `- 없음` |

## 프로젝트 단위 산출물 (분석하기 시 생성)

프로젝트 폴더의 세부 폴더 파일 요약들을 종합해 `summary.md` / `index.json` / `log.md`를
**각각 따로** 만들어 `AI 요약` 세부 폴더에 저장한다. 세 산출물은 각각 개별로 수정할 수 있고,
사용자가 수정한 산출물은 재분석해도 덮어쓰지 않는다.

### templates/index.json 채우기 (프로젝트 구조 · 결정적)

- `project`: 프로젝트 id/이름/유형.
- `{{subfoldersJson}}`: 실제 세부 폴더 목록(`[{ id, label, fileCount }]`)을 JSON으로 직렬화해 넣는다.
- `{{filesJson}}`: 파일 목록(`[{ fileId, fileName, folderId(=세부 폴더 id), oneLine, keywords, priority, reviewStatus }]`)을 JSON으로 직렬화해 넣는다.
- AI 추천 폴더(`aiRecommendation`, `folderId:"pending"`)는 사용하지 않는다. `folderId`는 사용자가 실제로 넣은 세부 폴더 id다.
- 치환 결과는 반드시 `JSON.parse`가 성공해야 한다. 실패하면 저장하지 않고 오류 처리한다.

### templates/project-summary.md 채우기 (AI 서술 + 결정적 목록)

- `{{headline}}` `{{description}}` `{{subfolderHighlightsList}}`: 프로젝트 종합 프롬프트(project-analysis.md) 출력에서 채운다.
- `{{activityKeywordsList}}` `{{portfolioKeywordsList}}`: 종합 프롬프트의 키워드 목록. `- 키워드` 형식.
- `{{warningsList}}`: 비면 `- 없음`.

### 프로젝트 log.md 채우기 (append 방식)

- log.md는 상단에 `# 프로젝트 분석 로그` 헤더를 한 번만 쓰고, 분석 실행마다 블록을 append한다.
- 각 블록: 타임스탬프, `action: project_analysis`, 분석 자료 수, provider, headline.
- 기존 항목을 수정·삭제하지 않고 시간 순서대로 append한다. 사용자가 로그를 직접 수정한 경우에도 새 실행 기록은 뒤에 append한다.
