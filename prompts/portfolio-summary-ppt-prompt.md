# 3번 1페이지 요약형 PPT 생성용 데이터 구조와 프롬프트

## 1. 목적

이 문서는 `templates/portfolio-summary/design.md` 기준에 맞춰 3번 1페이지 요약형 PPT를 생성하기 위한 입력 데이터 구조와 AI 프롬프트를 정의한다.

3번은 PPT 1장으로, 지원자의 핵심 경험과 역량을 빠르게 읽을 수 있게 압축한다. 사진 또는 아바타 영역을 반드시 포함한다.

## 2. 입력 데이터 구조

```json
{
  "format": "1페이지 요약형",
  "applicant": {
    "name": "지원자 이름",
    "targetRole": "희망 직무",
    "birthOrAffiliation": "생년월일 또는 소속",
    "phone": "연락처",
    "email": "이메일",
    "web": "웹사이트 또는 GitHub",
    "profileImage": {
      "path": "프로필 사진 경로",
      "description": "프로필 사진 설명"
    }
  },
  "summary": {
    "headline": "지원자를 설명하는 한 줄 소개",
    "description": "짧은 소개 문장"
  },
  "coreExperiences": [
    {
      "title": "핵심 경험명",
      "period": "기간",
      "role": "역할",
      "oneLineResult": "한 줄 성과 또는 의미",
      "sourceId": "근거 자료 ID"
    }
  ],
  "competencies": ["역량 1", "역량 2", "역량 3"],
  "tools": ["도구 또는 기술 1", "도구 또는 기술 2"],
  "educationOrCertificates": ["교육 또는 자격 1", "교육 또는 자격 2"],
  "missingFields": ["부족한 정보"]
}
```

## 3. 출력 데이터 구조

AI는 아래 JSON 구조로만 응답한다.

```json
{
  "format": "1페이지 요약형",
  "deckTitle": "1페이지 요약본",
  "slides": [
    {
      "slideType": "summaryOnePage",
      "pageNumber": "03",
      "label": "KIM YEJI PORTFOLIO",
      "title": "1페이지 요약본",
      "sections": {
        "profile": {
          "name": "지원자 이름",
          "targetRole": "희망 직무",
          "contact": ["010-0000-0000", "email@example.com", "github.com/example"]
        },
        "coreExperiences": [
          {
            "title": "핵심 경험명",
            "role": "역할",
            "oneLineResult": "한 줄 성과 또는 의미"
          }
        ],
        "competencies": ["문제 정의", "UI 설계", "협업"],
        "tools": ["Figma", "GitHub", "JavaScript"],
        "closingLine": "사용자 문제를 구조화하고, 경험을 결과물로 연결하는 인재입니다."
      },
      "visuals": [
        {
          "type": "profileImage",
          "source": "프로필 사진 경로 또는 설명",
          "placement": "좌측 상단 프로필 영역"
        }
      ]
    }
  ],
  "missingFields": ["추가 입력이 필요한 정보"]
}
```

## 4. AI 프롬프트

```text
[역할]
당신은 취업 준비생의 경험과 역량을 한 장짜리 PPT 요약본으로 압축하는 포트폴리오 콘텐츠 설계자입니다.

[목표]
입력 데이터를 바탕으로 3번 1페이지 요약형 PPT 내용을 생성하세요.
반드시 templates/portfolio-summary/design.md 기준을 따릅니다.

[작성 규칙]
- PPT는 정확히 1장입니다.
- 사진 또는 아바타 영역을 반드시 포함하세요.
- 긴 문단 대신 짧은 항목, 키워드, 한 줄 성과를 사용하세요.
- 핵심 경험은 2~3개만 선별하세요.
- 역량은 3~6개 키워드로 압축하세요.
- 없는 연락처, 자격, 경력, 기술, 성과 수치는 만들지 마세요.
- 정보가 부족하면 추측하지 말고 missingFields에 적으세요.

[출력 형식]
반드시 지정된 JSON 구조로만 응답하세요.
마크다운 코드블록, 설명 문장, 후속 안내 문구를 포함하지 마세요.
```

## 5. 구현 매핑 기준

| JSON 위치 | PPT 반영 위치 |
|---|---|
| `slides[0].sections.profile` | 좌측 상단 프로필 영역 |
| `slides[0].visuals` | 프로필 사진 또는 아바타 영역 |
| `slides[0].sections.coreExperiences` | 우측 상단 핵심 경험 영역 |
| `slides[0].sections.competencies` | 좌측 하단 보유 역량 영역 |
| `slides[0].sections.tools` | 우측 하단 기술·도구 영역 |
| `slides[0].sections.closingLine` | 하단 한 줄 소개 영역 |

