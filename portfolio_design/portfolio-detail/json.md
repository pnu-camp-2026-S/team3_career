# 상세기술 포트폴리오 JSON 명세

## 1. 목적

이 문서는 `design.md`의 A4 2장 상세기술 포트폴리오를 생성하기 위한 AI 출력 JSON 구조를 정의한다.

AI는 이 JSON에 사용자별 내용만 채운다. 디자인, 페이지 수, 카드 순서, 배치 방식은 `template.md`와 `detail_a4_two_page_half_blocks.json`에서 고정한다.

## 2. 출력 JSON 규칙

- JSON 객체 하나만 반환한다.
- 마크다운 코드블록, 설명 문장, 주석을 포함하지 않는다.
- `templateId`는 항상 `detail_a4_two_page_half_blocks`로 고정한다.
- `pageSize`는 항상 `A4_PORTRAIT`로 고정한다.
- `pageCount`는 항상 `2`로 고정한다.
- `experiences`는 항상 3개를 가진다.
- 경험이 부족하면 해당 경험 객체에 `projectName: "추가 경험 입력 필요"`를 넣고 부족한 항목을 `missingFields`에 적는다.
- 카드별 배열은 최대 3개 문장만 사용한다.
- 없는 성과, 수치, 역할, 기술, 프로젝트명은 만들지 않는다.

## 3. JSON 구조

```json
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
```

## 4. 필드 작성 기준

| 필드 | 작성 기준 |
|---|---|
| `profile.photo.path` | 실제 프로필 이미지 경로가 있으면 입력한다. 없으면 빈 문자열로 둔다. |
| `profile.photo.description` | 이미지가 없으면 필요한 이미지 설명을 적는다. |
| `profile.name` | 사용자가 제공한 이름만 입력한다. |
| `profile.gender` | 사용자가 제공한 성별만 입력한다. |
| `profile.education` | 학교, 학년, 재학/졸업 상태 등 확인된 학력만 입력한다. |
| `profile.major` | 사용자가 제공한 전공만 입력한다. |
| `profile.targetRole` | 희망 직무 또는 선택 목적에서 확인된 직무를 입력한다. |
| `profile.contact` | 이메일 또는 연락처가 확인된 경우만 입력한다. |
| `profile.keywords` | 포트폴리오 강조 키워드 3개를 우선순위순으로 입력한다. |
| `experiences[].rank` | 1, 2, 3 순서로 고정한다. |
| `experiences[].projectName` | 실제 프로젝트명 또는 활동명을 입력한다. |
| `experiences[].summary` | 프로젝트를 설명하는 한 줄 요약을 입력한다. |
| `experiences[].process` | 진행 흐름을 2~3개 짧은 문장으로 입력한다. |
| `experiences[].contribution` | 사용자가 직접 맡은 일만 2~3개 입력한다. |
| `experiences[].result` | 확인된 산출물, 변화, 배운 점을 2~3개 입력한다. |
| `experiences[].growth` | 프로젝트를 통해 발전한 점을 한 문장으로 입력한다. |
| `missingFields` | 추측하지 못한 정보와 사용자에게 추가로 받아야 할 정보를 적는다. |

## 5. 예시

```json
{
  "format": "상세 기술 포트폴리오",
  "templateId": "detail_a4_two_page_half_blocks",
  "pageSize": "A4_PORTRAIT",
  "pageCount": 2,
  "profile": {
    "photo": {
      "path": "",
      "description": "프로필 사진 없음"
    },
    "name": "홍길동",
    "gender": "정보 없음",
    "education": "부산대학교 재학",
    "major": "컴퓨터공학",
    "targetRole": "프론트엔드 개발자",
    "contact": "hello@example.com",
    "keywords": [
      {
        "rank": 1,
        "label": "문제 해결",
        "reason": "프로젝트 자료에서 오류 원인 분석과 개선 흐름이 반복 확인됨"
      },
      {
        "rank": 2,
        "label": "UI 구현",
        "reason": "화면 설계와 구현 관련 자료가 확인됨"
      },
      {
        "rank": 3,
        "label": "문서화",
        "reason": "결과 정리와 회고 자료가 확인됨"
      }
    ]
  },
  "experiences": [
    {
      "rank": 1,
      "projectName": "캡스톤 서비스 개선 프로젝트",
      "summary": "사용자 흐름을 분석해 주요 화면 구조를 개선한 프로젝트",
      "process": ["요구사항과 기존 화면 흐름을 정리", "핵심 사용 시나리오를 기준으로 화면을 재구성", "피드백을 반영해 구조를 보완"],
      "contribution": ["화면 흐름 분석 담당", "주요 컴포넌트 구현", "수정 사항 문서화"],
      "result": ["핵심 화면 흐름 정리", "개선 방향 도출", "추가 검증 필요 항목 확인"],
      "growth": "문제를 화면 구조와 구현 단위로 나누어 정리하는 역량을 키웠습니다."
    },
    {
      "rank": 2,
      "projectName": "추가 경험 입력 필요",
      "summary": "두 번째 경험 정보가 부족합니다.",
      "process": ["경험 자료 추가 필요"],
      "contribution": ["본인 역할 확인 필요"],
      "result": ["결과 또는 산출물 확인 필요"],
      "growth": "추가 자료 입력 후 작성할 수 있습니다."
    },
    {
      "rank": 3,
      "projectName": "추가 경험 입력 필요",
      "summary": "세 번째 경험 정보가 부족합니다.",
      "process": ["경험 자료 추가 필요"],
      "contribution": ["본인 역할 확인 필요"],
      "result": ["결과 또는 산출물 확인 필요"],
      "growth": "추가 자료 입력 후 작성할 수 있습니다."
    }
  ],
  "missingFields": ["경험 2 프로젝트명", "경험 3 프로젝트명", "정량 성과"]
}
```
