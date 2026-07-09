# 4번 PPT 발표형 생성용 데이터 구조와 프롬프트

## 1. 목적

이 문서는 `templates/portfolio-presentation/design.md` 기준에 맞춰 4번 PPT 발표형을 생성하기 위한 입력 데이터 구조와 AI 프롬프트를 정의한다.

4번은 프로젝트 하나를 `개요 → 과정 → 결과` 흐름으로 설명하는 3장짜리 심플 발표형 PPT이다.

## 2. 입력 데이터 구조

```json
{
  "format": "PPT 발표형",
  "project": {
    "name": "프로젝트명",
    "oneLineSummary": "프로젝트 한 줄 요약",
    "period": "기간",
    "role": "본인 역할",
    "targetUser": "목표 사용자",
    "problem": "문제 상황",
    "goal": "프로젝트 목표"
  },
  "process": {
    "steps": ["요구 분석", "화면 설계", "구현", "수정"],
    "difficulty": "진행 중 어려웠던 점",
    "solution": "해결 방법"
  },
  "result": {
    "outputs": ["구현 결과 1", "구현 결과 2"],
    "meaning": "프로젝트의 의미",
    "improvements": ["개선 방향 1", "개선 방향 2"],
    "learning": "배운 점"
  },
  "approvedSourceIds": ["승인된 Wiki 또는 자료 ID"],
  "missingFields": ["부족한 정보"]
}
```

## 3. 출력 데이터 구조

AI는 아래 JSON 구조로만 응답한다.

```json
{
  "format": "PPT 발표형",
  "deckTitle": "프로젝트 발표 자료",
  "slideCount": 3,
  "slides": [
    {
      "slideType": "overview",
      "pageNumber": "01",
      "title": "프로젝트 개요",
      "subtitle": "Project Overview",
      "guideText": "이곳에 프로젝트의 핵심 내용을 요약해 보세요.",
      "sections": {
        "summaryBanner": "프로젝트의 목적과 해결하려는 문제를 간단히 정리합니다.",
        "problem": "문제",
        "goal": "목표",
        "role": "역할"
      }
    },
    {
      "slideType": "process",
      "pageNumber": "02",
      "title": "진행 과정",
      "subtitle": "Process Page",
      "guideText": "이곳에는 진행 흐름을 간단히 정리해 보세요.",
      "sections": {
        "flow": ["요구 분석", "화면 설계", "구현", "수정"],
        "difficulty": "어려움",
        "solution": "해결"
      }
    },
    {
      "slideType": "result",
      "pageNumber": "03",
      "title": "결과 및 결론",
      "subtitle": "Result Conclusion",
      "sections": {
        "mainConclusion": "프로젝트의 결과와 배운 점을 간단히 정리합니다.",
        "result": "결과",
        "meaning": "의미",
        "improvement": "개선"
      }
    }
  ],
  "missingFields": ["추가 입력이 필요한 정보"]
}
```

## 4. AI 프롬프트

```text
[역할]
당신은 프로젝트 하나를 짧은 발표용 PPT로 정리하는 발표 자료 콘텐츠 설계자입니다.

[목표]
입력 데이터를 바탕으로 4번 PPT 발표형 내용을 생성하세요.
반드시 templates/portfolio-presentation/design.md 기준을 따릅니다.

[구조]
PPT는 정확히 3장입니다.
1. 프로젝트 개요
2. 진행 과정
3. 결과 및 결론

[작성 규칙]
- 발표자가 말로 보충할 수 있도록 문장은 짧고 간단하게 작성하세요.
- 불필요한 아이콘, 사진, 차트가 필요한 문구를 만들지 마세요.
- 프로젝트 하나만 다루세요.
- 승인된 Wiki, 업로드 자료, 사용자가 입력한 활동 기록에 있는 정보만 사용하세요.
- 없는 성과, 수치, 역할, 기술은 만들지 마세요.
- 정보가 부족하면 추측하지 말고 missingFields에 적으세요.

[출력 형식]
반드시 지정된 JSON 구조로만 응답하세요.
마크다운 코드블록, 설명 문장, 후속 안내 문구를 포함하지 마세요.
```

## 5. 구현 매핑 기준

| JSON 위치 | PPT 반영 위치 |
|---|---|
| `slides[0]` | 프로젝트 개요 슬라이드 |
| `slides[0].sections.problem` | 개요 하단 문제 영역 |
| `slides[0].sections.goal` | 개요 하단 목표 영역 |
| `slides[0].sections.role` | 개요 하단 역할 영역 |
| `slides[1]` | 진행 과정 슬라이드 |
| `slides[1].sections.flow` | 중앙 진행 흐름 영역 |
| `slides[1].sections.difficulty` | 하단 어려움 영역 |
| `slides[1].sections.solution` | 하단 해결 영역 |
| `slides[2]` | 결과 및 결론 슬라이드 |
| `slides[2].sections.mainConclusion` | 큰 결론 문장 |
| `slides[2].sections.result` | 결과 문단 |
| `slides[2].sections.meaning` | 의미 문단 |
| `slides[2].sections.improvement` | 개선 문단 |

