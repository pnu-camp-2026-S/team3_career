---
name: github-feature-issue-template
description: Draft FitFolio GitHub feature request issues using the team's Korean feature template. Use when Codex is asked to create, register, open, or write an enhancement issue; when the user says "feature 이슈", "기능 요청 이슈", "새 기능 이슈 등록"; or when planning a new feature or improvement.
---

# GitHub Feature Issue Template

## Workflow

Use this skill when preparing a GitHub issue for a new feature or improvement.

1. State the feature in user-facing terms, not only implementation terms.
2. Explain the problem or workflow gap the feature solves.
3. Describe expected behavior as a clear numbered flow.
4. Include UI, data, mobile, and test considerations when relevant.
5. Keep the one-line summary short enough to be used as an issue title or quick scan line.
6. Use `$github-issue-labeling` when registering the issue and attach 3-4 labels.
7. If a field is unknown, write `확인 필요` or leave the placeholder for the user to fill.

## Template

```markdown
## 한 줄 요약
.........

## 기능 설명

무엇을 만들거나 수정할지 설명합니다.

## 필요한 이유

왜 필요한지, 어떤 문제를 해결하는지 설명합니다.



## 기대 동작

1. 사용자가 캘린더의 다음 월 버튼을 누른다.
2. 캘린더가 다음 월로 이동한다.
3. 해당 월의 저장 일정과 선택 날짜가 표시된다.

## 화면 또는 참고 자료

- 관련 페이지:
- 관련 PR:
- 참고 이미지:

## 구현 시 고려사항

- UI에서 고려할 점:
- 데이터 저장 또는 연동에서 고려할 점:
- 모바일 화면에서 고려할 점:
- 테스트가 필요한 부분:
```

## Filling Rules

- `한 줄 요약`: Write a concise summary of the feature or improvement. Replace `.........` with meaningful text.
- `기능 설명`: Explain what will be built or changed.
- `필요한 이유`: Tie the feature to a concrete user need, workflow gap, or project goal.
- `기대 동작`: Use numbered steps. Replace the calendar example with the actual expected flow unless the issue is about the calendar.
- `화면 또는 참고 자료`: Fill related page, PR, and image when known. Use `없음` or `확인 필요` when unavailable.
- `구현 시 고려사항`: Keep the four standard bullets and write relevant implementation notes under each one.
