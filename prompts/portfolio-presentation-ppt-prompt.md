# PPT 발표 스펙 생성용 데이터 구조와 프롬프트

## 1. 목적

이 문서는 `portfolio_design/portfolio-presentation/design.md`와 `portfolio_design/portfolio-presentation/pptxgen-template.json` 기준에 맞춰 PPT 발표 스펙을 생성하기 위한 입력 데이터 구조와 AI 프롬프트를 정의한다.

PPT 발표 스펙은 PptxGenJS 기반으로 생성한다. 사용자가 제공한 PPT 레퍼런스를 역산해 `pptxgen-template.json`에 좌표, 슬롯, 반복 규칙을 정리하고, 구현 단계에서는 해당 JSON을 읽어 `slide.addText`, `slide.addImage`, `slide.addShape`, `slide.addChart`로 그린다.

구성은 `표지 → 프로필 → 경험 소개 → 결과/KPI`이며, 경험이 늘어나면 `경험 소개 → 결과/KPI` 슬라이드 쌍을 뒤에 계속 붙인다.

## 2. 입력 데이터 구조

```json
{
  "format": "PPT 발표 스펙",
  "cover": {
    "headline": "성장하고 확장하는 김미리입니다.",
    "description": "포트폴리오 전체를 설명하는 짧은 문장",
    "name": "김미리",
    "mobile": "000-0000-0000",
    "email": "miri@example.com",
    "web": "github.com/example"
  },
  "profile": {
    "photo": "프로필 이미지 경로 또는 빈 문자열",
    "greeting": "안녕하세요\n김미리입니다.",
    "about": ["김미리", "1900.00.00", "miri@example.com", "000-0000-0000"],
    "intro": "나를 소개하는 짧은 문장",
    "education": [
      { "period": "20XX.00", "content": "학력사항" }
    ],
    "experience": [
      { "period": "20XX.00-20XX.00", "content": "경험사항" }
    ],
    "licenses": [
      { "period": "20XX.00", "content": "자격/수상사항" }
    ],
    "skills": [
      { "name": "스킬명", "level": "상/중/하 또는 설명" }
    ]
  },
  "experiences": [
    {
      "projectLabel": "Project 01",
      "introTitle": "경험 1 : 자기소개서의 소제목 역할을 하는 결론 한 줄",
      "cards": {
        "customerNeed": {
          "image": "이미지 경로 또는 빈 문자열",
          "description": "고객 니즈를 1~2줄로 정리",
          "keyword": "강조 키워드"
        },
        "problemOpportunity": {
          "image": "이미지 경로 또는 빈 문자열",
          "description": "문제 또는 기회상황을 1~2줄로 정리",
          "keyword": "강조 키워드"
        },
        "comparisonTarget": {
          "image": "이미지 경로 또는 빈 문자열",
          "description": "비교 대상을 1~2줄로 정리",
          "keyword": "강조 키워드"
        }
      },
      "resultTitle": "결과물 : 이 경험의 결과를 잘 보여주는 KPI",
      "visual": {
        "type": "chart | image | qualitative_card",
        "title": "시각 자료 제목",
        "items": ["근거 있는 수치 또는 정성 결과"]
      },
      "actions": {
        "problemAction": ["문제 해결 액션"],
        "productivityAction": ["생산성 증가 액션"],
        "communicationAction": ["의사소통/협상 액션"]
      }
    }
  ],
  "approvedSourceIds": [],
  "missingFields": []
}
```

## 3. 출력 데이터 구조

AI는 아래 JSON 구조로만 응답한다.

```json
{
  "format": "PPT 발표 스펙",
  "deckTitle": "PPT 발표 스펙",
  "cover": {},
  "profile": {},
  "experiences": [],
  "missingFields": ["추가 입력이 필요한 정보"]
}
```

## 4. AI 프롬프트

```text
[역할]
당신은 취업 준비생의 프로젝트 경험을 PPT 발표 스펙으로 구성하는 발표 자료 콘텐츠 설계자입니다.

[목표]
입력 데이터를 바탕으로 PPT 발표 스펙 내용을 생성하세요.
반드시 portfolio_design/portfolio-presentation/design.md와 pptxgen-template.json의 구조를 따릅니다.

[구조]
PPT는 표지, 프로필, 경험 소개, 결과/KPI 흐름입니다.
경험이 여러 개면 경험 소개와 결과/KPI 슬라이드 쌍을 반복합니다.

[작성 규칙]
- 템플릿 이름은 반드시 PPT 발표 스펙으로 작성하세요.
- 사용자가 제공한 레퍼런스의 표지, 프로필, 3분할 경험 카드, 결과/KPI 구조에서 벗어나지 마세요.
- 발표자가 말로 보충할 수 있도록 문장은 짧고 간단하게 작성하세요.
- 하나의 구획에는 1~2문장만 작성하세요.
- 카드 설명은 최대 2줄 분량으로 작성하고, 키워드는 12자 안팎의 짧은 표현으로 작성하세요.
- 액션 박스의 불릿은 박스당 최대 2개, 불릿당 한 줄 중심으로 작성하세요.
- 문장이 길어질 경우 글자 중간에서 끊지 말고, 의미가 자연스럽게 유지되도록 짧은 문장으로 다시 요약하세요.
- 말줄임표로 문장을 자르지 마세요.
- 승인된 Wiki, 업로드 자료, 사용자가 입력한 활동 기록에 있는 정보만 사용하세요.
- 없는 성과, 수치, 역할, 기술은 만들지 마세요.
- 실제 근거 수치가 없으면 chart를 만들지 말고 visual.type을 qualitative_card로 두세요.
- 정보가 부족하면 추측하지 말고 missingFields에 적으세요.

[출력 형식]
반드시 지정된 JSON 구조로만 응답하세요.
마크다운 코드블록, 설명 문장, 후속 안내 문구를 포함하지 마세요.
```

## 5. 구현 매핑 기준

| JSON 위치 | PPT 반영 위치 |
|---|---|
| `cover` | 표지 슬라이드 |
| `profile` | 프로필 슬라이드 |
| `experiences[n].cards.customerNeed` | 경험 소개 슬라이드 1번 카드 |
| `experiences[n].cards.problemOpportunity` | 경험 소개 슬라이드 2번 카드 |
| `experiences[n].cards.comparisonTarget` | 경험 소개 슬라이드 3번 카드 |
| `experiences[n].visual` | 결과/KPI 슬라이드 왼쪽 시각 자료 |
| `experiences[n].actions.problemAction` | 결과/KPI 슬라이드 오른쪽 1번 액션 |
| `experiences[n].actions.productivityAction` | 결과/KPI 슬라이드 오른쪽 2번 액션 |
| `experiences[n].actions.communicationAction` | 결과/KPI 슬라이드 오른쪽 3번 액션 |

