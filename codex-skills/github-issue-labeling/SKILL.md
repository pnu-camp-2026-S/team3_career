---
name: github-issue-labeling
description: Select FitFolio GitHub issue labels using the team's required label groups. Use when Codex creates, registers, opens, or drafts a GitHub issue; when choosing labels for feature, bug, enhancement, design, frontend, backend, detail, large-scope, or AI-related work; or when the user asks to label an issue.
---

# GitHub Issue Labeling

## Rule

When registering a FitFolio GitHub issue, attach 3 required labels and 1 optional label.

Required labels:

- Choose exactly one from `fe` / `be`.
- Choose exactly one from `design` / `function`.
- Choose exactly one from `detail` / `wild`.

Optional label:

- Add `ai` only when the issue is directly related to AI features, AI integration, AI-generated output, prompt behavior, model usage, recommendations powered by AI, or AI-specific data flow.

The final label count should usually be 3. Use 4 only when `ai` applies.

## Selection Guide

- `fe`: Frontend UI, client routing, client state, components, styling, responsive behavior, browser interaction.
- `be`: Backend API, server logic, database, auth, persistence, infra, deployment, validation handled server-side.
- `design`: Visual layout, spacing, typography, colors, UX polish, component appearance, responsive UI details.
- `function`: User-visible behavior, data flow, business logic, interaction logic, API behavior, validation, state changes.
- `detail`: Small scoped fixes, polish, edge cases, minor UI adjustments, refinement of an existing feature.
- `wild`: Large scoped work, new feature area, structural change, broad refactor, cross-page or cross-layer implementation.
- `ai`: AI-specific feature, AI integration, AI recommendation, prompt/model behavior, generated content, AI-related data handling.

## Output Format

When drafting or registering an issue, include labels in a short line:

```markdown
Labels: fe, function, detail
```

If `ai` applies:

```markdown
Labels: fe, function, wild, ai
```

## Decision Rules

- If an issue touches both frontend and backend, choose the side with the main implementation risk. If truly balanced, prefer `fe` for user-facing issue work and mention backend impact in the issue body.
- If an issue includes both design and behavior changes, choose the primary purpose. Use `design` for appearance/UX polish; use `function` for behavior, data, or logic.
- Use `detail` when the issue improves an existing feature without changing the broader structure.
- Use `wild` when the issue creates a new user flow, new module, or broad implementation path.
- Do not add both labels from the same group.
- Do not add labels outside these four groups unless the user explicitly asks for additional repository labels.
