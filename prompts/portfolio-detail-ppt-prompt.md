# 1번 상세기술 포트폴리오 PPT 생성용 데이터 구조와 프롬프트

## 1. 목적

이 문서는 `templates/portfolio-detail/design.md` 기준에 맞춰 1번 상세기술 포트폴리오 PPT를 생성하기 위한 입력 데이터 구조와 AI 프롬프트를 정의한다.

1번은 `표지 1장 + 경험별 3장 반복` 구조를 따른다. 경험이 1개면 총 4장, 경험이 2개면 총 7장, 경험이 3개면 총 10장처럼 확장된다.

## 2. 입력 데이터 구조

```json
{
  "format": "상세기술 포트폴리오",
  "applicant": {
    "name": "지원자 이름",
    "targetRole": "희망 직무",
    "headline": "지원자를 설명하는 한 줄 문장",
    "summary": "지원자 소개 요약",
    "contact": {
      "phone": "연락처",
      "email": "이메일",
      "web": "포트폴리오 또는 GitHub 링크"
    },
    "coreSkills": ["핵심 역량 1", "핵심 역량 2", "핵심 역량 3"],
    "profileImage": {
      "path": "프로필 사진 경로",
      "description": "프로필 사진 설명"
    }
  },
  "experiences": [
    {
      "experienceId": "exp-01",
      "projectName": "프로젝트명",
      "headline": "경험을 설명하는 결론 한 줄",
      "period": "진행 기간",
      "teamSize": "팀 규모",
      "role": "본인 역할",
      "techStack": ["사용 기술 1", "사용 기술 2"],
      "overview": {
        "summary": "프로젝트 한 줄 설명",
        "problem": "문제 상황",
        "targetUser": "목표 사용자",
        "goal": "핵심 목표"
      },
      "process": {
        "steps": ["요구 분석", "화면 설계", "기능 구현", "테스트·수정"],
        "myTasks": ["내가 맡은 일 1", "내가 맡은 일 2"],
        "implementation": ["구현 내용 1", "구현 내용 2"],
        "collaboration": ["협업 방식 1", "협업 방식 2"],
        "problemSolving": {
          "difficulty": "어려웠던 점",
          "solution": "해결 방법"
        }
      },
      "result": {
        "outputs": ["구현 결과 1", "구현 결과 2"],
        "userValue": "사용자에게 준 가치",
        "limitations": ["한계점 1", "한계점 2"],
        "improvements": ["개선 방향 1", "개선 방향 2"],
        "learning": "배운 점 한 문장"
      },
      "assets": {
        "representativeImage": {
          "path": "대표 이미지 경로",
          "description": "프로젝트 대표 이미지 설명"
        },
        "processImages": [
          {
            "path": "과정 이미지 경로",
            "description": "화면 흐름, 목업, 구조도 등 설명"
          }
        ],
        "resultImages": [
          {
            "path": "결과 이미지 경로",
            "description": "완성 화면 또는 산출물 설명"
          }
        ]
      }
    }
  ],
  "approvedSourceIds": ["승인된 Wiki 또는 자료 ID"],
  "missingFields": ["부족한 정보"]
}
```

## 3. 출력 데이터 구조

AI는 아래 JSON 구조로만 응답한다.

```json
{
  "format": "상세기술 포트폴리오",
  "deckTitle": "PPT 제목",
  "slideCount": 4,
  "slides": [
    {
      "slideType": "cover",
      "pageNumber": "01",
      "label": "Portfolio",
      "title": "성장하고 확장하는 지원자입니다.",
      "subtitle": "프로젝트 경험을 기술 흐름과 기여 중심으로 정리했습니다.",
      "sections": {
        "profile": {
          "name": "지원자 이름",
          "targetRole": "희망 직무",
          "coreSkills": ["핵심 역량 1", "핵심 역량 2", "핵심 역량 3"],
          "contactLine": "Name | 김예지    Role | 서비스 기획    E-mail | example@mail.com"
        }
      },
      "visuals": [
        {
          "type": "profileImage",
          "source": "이미지 경로 또는 설명",
          "placement": "프로필 영역"
        }
      ]
    },
    {
      "slideType": "experienceOverview",
      "experienceId": "exp-01",
      "pageNumber": "02",
      "label": "Project 01",
      "title": "경험 1: 프로젝트를 설명하는 결론 한 줄",
      "sections": {
        "projectInfo": {
          "projectName": "프로젝트명",
          "period": "기간",
          "role": "역할",
          "techStack": ["기술 1", "기술 2"]
        },
        "cards": [
          {
            "title": "문제 상황",
            "body": "짧은 설명",
            "keyword": "핵심 키워드"
          },
          {
            "title": "목표 사용자",
            "body": "짧은 설명",
            "keyword": "핵심 키워드"
          },
          {
            "title": "핵심 목표",
            "body": "짧은 설명",
            "keyword": "핵심 키워드"
          }
        ]
      },
      "visuals": [
        {
          "type": "representativeImage",
          "source": "대표 이미지 경로 또는 설명",
          "placement": "프로젝트 이미지 영역"
        }
      ]
    },
    {
      "slideType": "experienceProcess",
      "experienceId": "exp-01",
      "pageNumber": "03",
      "label": "Process",
      "title": "개발 과정과 나의 기여도",
      "sections": {
        "flow": ["요구 분석", "화면 설계", "기능 구현", "테스트·수정"],
        "myContribution": ["기여 1", "기여 2", "기여 3"],
        "implementation": ["구현 내용 1", "구현 내용 2"],
        "problemSolving": {
          "difficulty": "어려움",
          "solution": "해결"
        }
      },
      "visuals": [
        {
          "type": "processImage",
          "source": "과정 이미지 경로 또는 설명",
          "placement": "과정 이미지 영역"
        }
      ]
    },
    {
      "slideType": "experienceResult",
      "experienceId": "exp-01",
      "pageNumber": "04",
      "label": "Result",
      "title": "결과: 구현 성과와 회고",
      "sections": {
        "outputs": ["결과 1", "결과 2"],
        "userValue": "사용자 가치",
        "limitations": ["한계점 1", "한계점 2"],
        "improvements": ["개선 방향 1", "개선 방향 2"],
        "learning": "배운 점 한 문장"
      },
      "visuals": [
        {
          "type": "resultImage",
          "source": "결과 이미지 경로 또는 설명",
          "placement": "결과 이미지 영역"
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
당신은 취업 준비생의 프로젝트 경험을 상세기술 포트폴리오 PPT로 구성하는 포트폴리오 콘텐츠 설계자입니다.

[목표]
입력 데이터를 바탕으로 1번 상세기술 포트폴리오를 생성하세요.
반드시 templates/portfolio-detail/design.md 기준을 따릅니다.

[구조]
첫 장은 지원자 소개 표지입니다.
그 뒤에는 경험마다 아래 3장을 반복합니다.
1. 경험 개요
2. 과정 및 기여도
3. 결과 및 회고

경험이 여러 개이면 같은 3장 구조를 뒤에 계속 붙입니다.

[작성 규칙]
- 승인된 Wiki, 업로드 자료, 사용자가 입력한 활동 기록에 있는 정보만 사용하세요.
- 없는 성과, 수치, 역할, 기술, 프로젝트명은 만들지 마세요.
- 본인 기여와 팀 전체 결과를 구분하세요.
- 각 슬라이드는 PPT에 들어갈 수 있도록 짧은 문장과 카드형 문구로 작성하세요.
- 1번과 3번에는 사진 또는 이미지 영역이 필요합니다. 이미지가 없으면 어떤 이미지가 필요한지 visuals.description에 적으세요.
- 정보가 부족하면 추측하지 말고 missingFields에 적으세요.

[출력 형식]
반드시 지정된 JSON 구조로만 응답하세요.
마크다운 코드블록, 설명 문장, 후속 안내 문구를 포함하지 마세요.
```

## 5. 구현 매핑 기준

| JSON 위치 | PPT 반영 위치 |
|---|---|
| `slides[0]` | 표지/지원자 소개 슬라이드 |
| `slides[*].slideType = experienceOverview` | 경험 개요 슬라이드 |
| `slides[*].slideType = experienceProcess` | 과정 및 기여도 슬라이드 |
| `slides[*].slideType = experienceResult` | 결과 및 회고 슬라이드 |
| `visuals` | 사진, 목업, 서비스 화면, 구조도 이미지 영역 |
| `missingFields` | 사용자에게 추가 입력 요청할 정보 |

