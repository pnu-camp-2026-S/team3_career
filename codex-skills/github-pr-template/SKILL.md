---
name: github-pr-template
description: Draft FitFolio GitHub pull request descriptions using the team's Korean PR template. Use when Codex is asked to open, prepare, write, or summarize a PR; when the user says "PR 올려줘", "PR 설명 작성", "이번 PR 요약"; or when publishing changes to GitHub for this project.
---

# GitHub PR Template

## Workflow

Use this skill whenever preparing a Pull Request description for FitFolio.

1. Inspect the actual diff, branch, issue context, tests run, and UI impact before writing.
2. Fill every section in Korean.
3. Keep unchecked any verification item that was not actually performed.
4. If information is unavailable, write `없음` or `확인하지 못함` instead of inventing details.
5. For UI changes, include screenshots when available; otherwise state that screenshots were not captured.
6. Keep Markdown heading markers separated from heading text with a space, such as `## 작업 이전 내용`.
7. Keep the final PR body concise enough for reviewers to scan quickly.

## Template

````markdown
## 스크린샷

UI 변경이 있다면 변경 전/후 화면을 첨부해주세요.


## 리뷰어가 중점적으로 볼 부분

리뷰어가 특히 확인해야 할 부분을 적어주세요.


## 작업 이전 내용

이번에 작업한 PR에서 변경하기 전에는 어떤 기능이었는지 작성하세요.

- 
- 
- 

## 작업 내용

이번 PR에서 변경한 내용을 요약해주세요.

- 
- 
- 



## 테스트 결과

실행한 테스트 명령어와 결과를 적어주세요.

```bash

```



- 

## 관련 이슈

- Closes # 
````

## Filling Rules

- `작업 이전 내용`: Summarize the previous state, existing problem, or baseline behavior before this PR.
- `작업 내용`: Summarize concrete code or UI changes from the diff, usually 2-4 bullets.
- `테스트 결과`: Include exact commands and outcomes. If tests were not run, write `실행하지 않음`.
- `스크린샷`: Attach or reference screenshots for UI changes when available. If unavailable, explain briefly.
- `리뷰어가 중점적으로 볼 부분`: Point reviewers to behavior, files, edge cases, or tradeoffs needing attention.
- `관련 이슈`: Use `Closes #번호` only when the issue number is known. Otherwise leave blank or write `없음`.
