# 2번 자기소개서형 Word 생성용 데이터 구조와 프롬프트

## 1. 목적

이 문서는 `templates/portfolio-coverletter/design.md` 기준에 맞춰 2번 자기소개서형 Word 문서를 생성하기 위한 입력 데이터 구조와 AI 프롬프트를 정의한다.

2번은 A4 세로 Word 문서이며, `연한 하늘색 제목 바 + 넓은 작성 칸`이 세로로 반복되는 자기소개서 표 양식을 따른다.

## 2. 입력 데이터 구조

```json
{
  "format": "자기소개서형",
  "target": {
    "company": "지원 회사명 또는 빈 값",
    "role": "지원 직무",
    "purpose": "지원 목적"
  },
  "applicant": {
    "name": "지원자 이름",
    "major": "전공",
    "targetRole": "희망 직무",
    "strengths": ["강점 1", "강점 2"],
    "weaknesses": ["보완점 1"]
  },
  "approvedExperiences": [
    {
      "title": "경험명",
      "period": "기간",
      "role": "역할",
      "problem": "문제 상황",
      "action": "내가 한 행동",
      "result": "결과 또는 배운 점",
      "relatedCompetencies": ["역량 1", "역량 2"],
      "sourceId": "근거 자료 ID"
    }
  ],
  "writingOptions": {
    "tone": "공손하고 자연스러운 자기소개서 문체",
    "lengthPerSection": "500~800자",
    "useCompanyName": false
  },
  "missingFields": ["부족한 정보"]
}
```

## 3. 출력 데이터 구조

AI는 아래 JSON 구조로만 응답한다.

```json
{
  "format": "자기소개서형",
  "documentType": "docx",
  "title": "자 기 소 개 서",
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "layout": "vertical-table"
  },
  "sections": [
    {
      "key": "growth",
      "number": 1,
      "title": "성장과정",
      "answer": "자기소개서 본문"
    },
    {
      "key": "personality",
      "number": 2,
      "title": "성격 및 장단점",
      "answer": "자기소개서 본문"
    },
    {
      "key": "motivation",
      "number": 3,
      "title": "지원동기",
      "answer": "자기소개서 본문"
    },
    {
      "key": "aspiration",
      "number": 4,
      "title": "입사 후 포부",
      "answer": "자기소개서 본문"
    },
    {
      "key": "competency",
      "number": 5,
      "title": "핵심 역량 기술",
      "answer": "자기소개서 본문"
    }
  ],
  "missingFields": ["추가 입력이 필요한 정보"]
}
```

## 4. AI 프롬프트

```text
[역할]
당신은 취업 준비생의 승인된 경험을 기업 제출용 자기소개서 문항 답변으로 정리하는 자기소개서 작성 도우미입니다.

[목표]
입력 데이터를 바탕으로 2번 자기소개서형 Word 문서에 들어갈 문항별 답변을 생성하세요.
반드시 templates/portfolio-coverletter/design.md 기준을 따릅니다.

[문항]
1. 성장과정
2. 성격 및 장단점
3. 지원동기
4. 입사 후 포부
5. 핵심 역량 기술

[작성 규칙]
- 사용자가 승인한 경험과 근거 자료에 있는 내용만 사용하세요.
- 없는 회사명, 성과 수치, 역할, 자격, 기술은 만들지 마세요.
- 회사명이 없으면 특정 회사명을 임의로 넣지 말고 지원 직무 기준으로 작성하세요.
- 각 문항은 500~800자 내외의 자연스러운 문단으로 작성하세요.
- 같은 경험을 반복하더라도 문항 목적에 맞게 강조점을 다르게 작성하세요.
- 문체는 공손하고 담백한 자기소개서 문체를 사용하세요.
- 정보가 부족하면 억지로 채우지 말고 missingFields에 적으세요.

[출력 형식]
반드시 지정된 JSON 구조로만 응답하세요.
마크다운 코드블록, 설명 문장, 후속 안내 문구를 포함하지 마세요.
```

## 5. 구현 매핑 기준

| JSON 위치 | Word 반영 위치 |
|---|---|
| `title` | 문서 상단 중앙 제목 |
| `sections[0]` | 1. 성장과정 제목 바와 본문 칸 |
| `sections[1]` | 2. 성격 및 장단점 제목 바와 본문 칸 |
| `sections[2]` | 3. 지원동기 제목 바와 본문 칸 |
| `sections[3]` | 4. 입사 후 포부 제목 바와 본문 칸 |
| `sections[4]` | 5. 핵심 역량 기술 제목 바와 본문 칸 |
| `missingFields` | 사용자에게 추가 입력 요청할 정보 |

