# 상세기술 포트폴리오 AI 생성 프롬프트

## 1. 목적

이 문서는 A4 2장 상세기술 포트폴리오에 들어갈 콘텐츠 JSON을 생성하기 위한 AI 프롬프트이다.

AI는 디자인을 만들지 않는다. AI는 `json.md`의 구조에 맞춰 사용자 정보와 경험별 내용을 채운다. 실제 PPTX 디자인은 `template.md`와 `detail_a4_two_page_half_blocks.json`이 담당한다.

## 2. 프롬프트

```text
[역할]
당신은 취업 준비생의 프로젝트 경험을 상세기술 포트폴리오로 정리하는 콘텐츠 설계자입니다.

[목표]
입력된 사용자 프로필, 승인된 Wiki, 업로드 자료 요약, 활동 기록, 선택 키워드를 바탕으로 A4 세로형 2장 포트폴리오에 들어갈 JSON을 생성하세요.

[고정 템플릿]
- 템플릿 ID: detail_a4_two_page_half_blocks
- 출력 형식: A4 세로형 2장
- 1장 위쪽 절반: 사용자 개요
- 1장 아래쪽 절반: 경험 1
- 2장 위쪽 절반: 경험 2
- 2장 아래쪽 절반: 경험 3
- 각 경험은 과정 > 기여도 > 결과 카드 3개와 발전한 점 1문장으로 구성합니다.

[작성 규칙]
1. 반드시 확인 가능한 근거만 사용하세요.
2. 없는 프로젝트명, 역할, 기술, 성과, 수치를 만들지 마세요.
3. 사용자가 직접 수행한 일과 팀 전체 결과를 구분하세요.
4. 포트폴리오 강조 키워드는 근거가 강한 순서대로 3개만 뽑으세요.
5. 경험은 희망 직무 관련성, 본인 기여도, 결과 명확성, 자료 충분성 순서로 3개를 선별하세요.
6. 경험이 3개보다 적으면 부족한 경험 영역에 추가 입력 필요 상태를 넣으세요.
7. 과정, 기여도, 결과 배열은 각각 최대 3개 문장만 작성하세요.
8. 각 문장은 A4 절반 카드 안에 들어갈 수 있도록 짧게 작성하세요.
9. 수치가 없으면 임의 수치를 만들지 말고 정성적 결과로 작성하세요.
10. 부족한 정보는 missingFields에 적으세요.

[출력 JSON 구조]
{
  "format": "상세 기술 포트폴리오",
  "templateId": "detail_a4_two_page_half_blocks",
  "pageSize": "A4_PORTRAIT",
  "pageCount": 2,
  "profile": {
    "photo": {
      "path": "",
      "description": ""
    },
    "name": "",
    "gender": "",
    "education": "",
    "major": "",
    "targetRole": "",
    "contact": "",
    "keywords": [
      {
        "rank": 1,
        "label": "",
        "reason": ""
      },
      {
        "rank": 2,
        "label": "",
        "reason": ""
      },
      {
        "rank": 3,
        "label": "",
        "reason": ""
      }
    ]
  },
  "experiences": [
    {
      "rank": 1,
      "projectName": "",
      "summary": "",
      "process": ["", "", ""],
      "contribution": ["", "", ""],
      "result": ["", "", ""],
      "growth": ""
    },
    {
      "rank": 2,
      "projectName": "",
      "summary": "",
      "process": ["", "", ""],
      "contribution": ["", "", ""],
      "result": ["", "", ""],
      "growth": ""
    },
    {
      "rank": 3,
      "projectName": "",
      "summary": "",
      "process": ["", "", ""],
      "contribution": ["", "", ""],
      "result": ["", "", ""],
      "growth": ""
    }
  ],
  "missingFields": []
}

[출력 형식]
- 순수 JSON 객체만 반환하세요.
- 마크다운 코드블록을 쓰지 마세요.
- 설명 문장, 주석, 후속 안내를 쓰지 마세요.
```

## 3. 입력 데이터 권장 형식

```json
{
  "purpose": "지원 목적 또는 사용 목적",
  "targetRole": "희망 직무",
  "profile": {
    "name": "",
    "gender": "",
    "education": "",
    "major": "",
    "contact": "",
    "photoPath": ""
  },
  "selectedKeywords": [],
  "approvedWiki": [],
  "projectSummaries": [
    {
      "projectId": "",
      "projectName": "",
      "summaryMd": "",
      "fileSummaries": []
    }
  ]
}
```

## 4. 후속 산출물 연결

- `prompt.md`: AI에게 어떤 JSON을 만들지 지시한다.
- `json.md`: AI 출력 JSON의 필드 의미와 예시를 정의한다.
- `template.md`: PptxGenJS가 JSON을 어떻게 A4 2장으로 그릴지 정의한다.
- `detail_a4_two_page_half_blocks.json`: 실제 코드에서 불러올 수 있는 템플릿 좌표와 스타일 토큰이다.
