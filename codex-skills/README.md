# Codex Skills

FitFolio 팀에서 함께 사용하는 Codex 개인 스킬 모음입니다.

## 포함된 스킬

- `github-pr-template`: PR 본문 템플릿
- `github-feature-issue-template`: 기능 이슈 템플릿
- `github-bug-issue-template`: 버그 이슈 템플릿
- `github-issue-labeling`: 이슈 라벨 선택 규칙

## 설치 방법

이 저장소를 pull 받은 뒤, 프로젝트 루트에서 아래 명령어를 실행합니다.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force .\codex-skills\github-* "$env:USERPROFILE\.codex\skills\"
```

macOS/Linux:

```bash
mkdir -p ~/.codex/skills
cp -R ./codex-skills/github-* ~/.codex/skills/
```

설치 후 Codex를 새로 열면 스킬을 사용할 수 있습니다.
