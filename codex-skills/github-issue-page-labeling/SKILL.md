---
name: github-issue-page-labeling
description: "Select FitFolio GitHub issue page labels that identify which service page or product area an issue belongs to. Use when Codex creates, registers, opens, drafts, or labels a GitHub issue and needs one of: part_main, part_create, part_portfolio_create, part_portfolio_manage, part_contest, part_mypage, part_login, or part_signup."
---

# GitHub Issue Page Labeling

## Rule

When registering a FitFolio GitHub issue, attach exactly one service page label so reviewers can see the affected page at a glance.

Allowed labels:

- `part_main`
- `part_create`
- `part_portfolio_create`
- `part_portfolio_manage`
- `part_contest`
- `part_mypage`
- `part_login`
- `part_signup`

Use this page label in addition to the work-type labels selected by `$github-issue-labeling`.

## Selection Guide

- `part_main`: Main/home page, landing page, global entry page, `main.html`, `index.html`, or main navigation surface.
- `part_create`: General creation flow or create page that is not specifically portfolio creation, including `create.html`.
- `part_portfolio_create`: Portfolio creation page, portfolio input flow, portfolio creation form, `portfolio_create.html`.
- `part_portfolio_manage`: Portfolio management, portfolio list, saved portfolio actions, viewer entry points, `portfolio_manage.html`, or `portfolio_viewer.html`.
- `part_contest`: Contest, competition, activity recommendation, external program listing, or `contest.html`.
- `part_mypage`: My page, profile, account management, withdrawal, user settings, `mypage.html`, or `withdraw.html`.
- `part_login`: Login page, login form, auth session entry, `login.html`.
- `part_signup`: Signup page, account creation form, registration validation, `signup.html`.

## Decision Rules

- Choose the label for the primary page affected by the issue.
- If a change touches multiple pages, choose the page where the user-visible problem or feature starts.
- If a shared component affects many pages, choose the page from the issue's user scenario. If no page is clear, choose the page with the highest implementation or review risk.
- Do not attach more than one `part_*` label unless the user explicitly asks for multi-page labeling.

## Output Format

When drafting or registering an issue, include the selected page label with the other labels:

```markdown
Labels: fe, function, detail, part_mypage
```

If AI also applies:

```markdown
Labels: fe, function, wild, ai, part_main
```
