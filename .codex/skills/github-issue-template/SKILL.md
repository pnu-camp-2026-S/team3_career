---
name: github-issue-template
description: Draft and register FitFolio GitHub issues using the team's Korean feature and bug templates, required issue labels, service page labels, and self-assignment rule. Use when Codex is asked to create, register, open, write, or label a feature issue, bug issue, enhancement issue, defect report, or any GitHub issue for this project.
---

# GitHub Issue Template

## Workflow

Use this skill whenever preparing or registering a FitFolio GitHub issue.

1. Decide whether the issue is `feature` or `bug`.
2. Fill the matching Korean template.
3. Choose work-type labels:
   - exactly one of `fe` / `be`
   - exactly one of `design` / `function`
   - exactly one of `detail` / `wild`
   - optional `ai` only when the issue is directly AI-related
4. Choose exactly one service page label:
   - `part_main`
   - `part_create`
   - `part_portfolio_create`
   - `part_portfolio_manage`
   - `part_contest`
   - `part_mypage`
   - `part_login`
   - `part_signup`
5. Always assign the issue to yourself when registering it.
   - With GitHub CLI in PowerShell, pass `--assignee '@me'`.
   - Verify with `gh issue view <ISSUE_NUMBER_OR_URL> --json assignees`.
   - If assignment fails, report that explicitly to the user instead of silently continuing.
6. If a field is unknown, write `확인 필요`, `없음`, or leave the placeholder only when the user needs to fill it later.

## Feature Template

```markdown
## 한 줄 요약
.........

## 기능 설명

무엇을 만들거나 수정할지 설명합니다.

## 필요한 이유

왜 필요한지, 어떤 문제를 해결하는지 설명합니다.

## 기대 동작

1.
2.
3.

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

## Bug Template

```markdown
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

## Label Rules

Work-type labels:

- `fe`: Frontend UI, client routing, client state, components, styling, responsive behavior, browser interaction.
- `be`: Backend API, server logic, database, auth, persistence, infra, deployment, validation handled server-side.
- `design`: Visual layout, spacing, typography, colors, UX polish, component appearance, responsive UI details.
- `function`: User-visible behavior, data flow, business logic, interaction logic, API behavior, validation, state changes.
- `detail`: Small scoped fixes, polish, edge cases, minor UI adjustments, refinement of an existing feature.
- `wild`: Large scoped work, new feature area, structural change, broad refactor, cross-page or cross-layer implementation.
- `ai`: AI-specific feature, AI integration, AI recommendation, prompt/model behavior, generated content, AI-related data handling.

Service page labels:

- `part_main`: Main/home page, landing page, global entry page, `main.html`, `index.html`, or main navigation surface.
- `part_create`: General creation flow or create page that is not specifically portfolio creation, including `create.html`.
- `part_portfolio_create`: Portfolio creation page, portfolio input flow, portfolio creation form, `portfolio_create.html`.
- `part_portfolio_manage`: Portfolio management, portfolio list, saved portfolio actions, viewer entry points, `portfolio_manage.html`, or `portfolio_viewer.html`.
- `part_contest`: Contest, competition, activity recommendation, external program listing, or `contest.html`.
- `part_mypage`: My page, profile, account management, withdrawal, user settings, `mypage.html`, or `withdraw.html`.
- `part_login`: Login page, login form, auth session entry, `login.html`.
- `part_signup`: Signup page, account creation form, registration validation, `signup.html`.

Decision rules:

- If an issue touches both frontend and backend, choose the side with the main implementation risk. If truly balanced, prefer `fe` for user-facing issue work and mention backend impact in the issue body.
- If an issue includes both design and behavior changes, choose the primary purpose. Use `design` for appearance/UX polish; use `function` for behavior, data, or logic.
- Use `detail` when the issue improves an existing feature without changing the broader structure.
- Use `wild` when the issue creates a new user flow, new module, or broad implementation path.
- Choose the `part_*` label for the primary page affected by the issue. If a shared component affects many pages, choose the page from the user scenario.
- Do not add both labels from the same work-type group.
- Do not add more than one `part_*` label unless the user explicitly asks for multi-page labeling.

## Registration Format

When registering and assigning an issue with GitHub CLI in PowerShell, use:

```powershell
gh issue create --title "<title>" --body-file <body.md> --assignee '@me' --label fe --label design --label detail --label part_mypage
gh issue view <ISSUE_NUMBER_OR_URL> --json assignees
```

When AI applies, include `--label ai`.
