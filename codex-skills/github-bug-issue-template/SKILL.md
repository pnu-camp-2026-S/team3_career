---
name: github-bug-issue-template
description: Draft FitFolio GitHub bug report issues using the team's Korean bug template. Use when Codex is asked to create, register, open, or write a bug issue; when the user says "버그 이슈", "버그 리포트", "오류 이슈 등록"; or when documenting a defect, regression, or unexpected behavior.
---

# GitHub Bug Issue Template

## Workflow

Use this skill when preparing a GitHub issue for a bug, regression, or unexpected behavior.

1. Separate expected behavior from actual behavior.
2. Prefer reproducible steps over broad descriptions.
3. Include environment details when known; write `확인 필요` for missing environment fields.
4. Include screenshots, logs, routes, files, or console output when available.
5. Use `$github-issue-labeling` when registering the issue and attach 3-4 labels.
6. Avoid proposing a fix unless the issue specifically needs implementation notes.

## Template

```markdown
---
name: 버그 리포트
about: 오류나 예상과 다른 동작을 제보할 때 사용합니다.
title: "[Bug] "
labels: bug
assignees: ""
---

## 버그 설명

어떤 문제가 발생했는지 간단하고 명확하게 적어주세요.

## 재현 방법

문제를 다시 확인할 수 있는 순서를 적어주세요.

1. 
2. 
3. 

## 기대한 동작

원래 어떻게 동작해야 한다고 생각했는지 적어주세요.

## 실제 동작

실제로 어떤 동작이 발생했는지 적어주세요.

## 화면 캡처

가능하다면 문제 화면을 첨부해주세요.

## 실행 환경

- 운영체제:
- 브라우저:
- 기기:
- 관련 페이지 또는 파일:

## 추가 내용

문제 해결에 도움이 될 만한 추가 설명, 로그, 링크가 있다면 적어주세요.
```

## Filling Rules

- `title`: Keep the `[Bug] ` prefix and add a short symptom name.
- `버그 설명`: Summarize the defect in one short paragraph.
- `재현 방법`: Write exact steps. If not reproducible yet, state what is known.
- `기대한 동작`: Describe the intended behavior without implementation speculation.
- `실제 동작`: Describe the observed failure, including error text when available.
- `화면 캡처`: Attach screenshots or write `없음`.
- `실행 환경`: Fill known values and use `확인 필요` for unknown fields.
- `추가 내용`: Add logs, links, suspected files, or `없음`.
