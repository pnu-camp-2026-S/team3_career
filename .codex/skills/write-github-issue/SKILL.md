---
name: write-github-issue
description: Write and publish GitHub issues or PR text using this repository's current collaboration templates. Use when the user asks Codex to create GitHub issues, organize issue content, assign labels/assignees, write PR bodies, or recommend commit messages according to the team's GitHub style.
---

# Write GitHub Issue

Use this skill to create GitHub issues, PR descriptions, or commit messages that match the repository's current collaboration style.

## Core Rule

Always read the current repository templates before writing:

- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/pull_request_template.md`

Treat those files as the source of truth. If this skill and the template disagree, follow the template.

## Issue Workflow

1. Identify whether the request is a feature, bug, or task.
2. Use the matching GitHub issue template.
3. Keep the title short and searchable:
   - Feature: `[Feature] 영역 기능명`
   - Bug: `[Bug] 문제 요약`
4. Fill every template section with concrete content.
5. Use numbered steps for expected behavior.
6. Use labels that describe the work, not only generic labels.
7. Assign the issue when the user asks for ownership.
8. Create the issue with `gh issue create`.
9. Verify the created issue with `gh issue view`.

## Preferred Issue Labels

Use a focused combination:

- `feature`: 기능 구현
- `frontend`: 화면과 사용자 상호작용
- `backend`: 서버, API, 저장소
- `ai`: AI 요약, 분석, 자동 분류
- `activity`: 활동 추천
- `calendar`: 캘린더와 일정
- `bookmark`: 북마크와 저장 상태
- `filter-search`: 필터와 검색
- `detail`: 상세 정보와 추천 문구
- `design`: 외관, 레이아웃, 애니메이션
- `data-model`: 데이터 구조와 상태
- `external-link`: 외부 링크
- `navigation`: 상단바와 페이지 이동

If a useful label does not exist, create it only when it is clearly reusable.

## PR Body Workflow

Use `.github/pull_request_template.md` and fill:

- 작업 내용
- 변경 이유
- 확인한 내용
- 테스트 결과
- 스크린샷
- 리뷰어가 중점적으로 볼 부분
- 관련 이슈

Mark checkboxes honestly. Do not check mobile or visual verification unless it was actually done.

## Commit Message Style

Prefer:

```text
[codex] 영역: 작업 요약 (#이슈번호)
```

Examples:

```text
[codex] 활동 추천: D-day 자동 계산 적용 (#65)
[codex] 활동 추천: 상단바 스타일 통일 (#80)
```

If there is no issue number, omit the suffix.

## Safety

- Do not overwrite existing issue or PR templates unless the user asks.
- Do not close or relabel unrelated issues.
- Before bulk issue creation, check for existing similar issues with `gh issue list`.
- After bulk creation or edits, summarize issue numbers, labels, assignees, and any skipped items.
