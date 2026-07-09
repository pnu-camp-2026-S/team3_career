# 자기소개서형 포트폴리오 PPT 생성 흐름

이 문서는 `자기소개서 연결형` 포트폴리오를 OpenAI API와 PptxGenJS로 실제 `.pptx` 파일로 생성하는 기준을 설명한다.

## 1. 전체 흐름

```text
사용자
→ 포트폴리오 생성 화면에서 자기소개서 연결형 선택
→ 사용할 경험 데이터와 AI 역량 키워드 선택
→ /api/portfolio/generate 호출
→ OpenAI가 자기소개서형 PPT 내용 JSON 생성
→ 화면에서 초안 확인
→ 다운로드 버튼 클릭
→ /api/portfolio/export-pptx 호출
→ PptxGenJS가 coverletter_ppt_template.json 좌표대로 PPTX 생성
→ 브라우저가 .pptx 파일 다운로드
```

## 2. 필요한 파일

자기소개서형 PPT 템플릿 파일은 모두 다음 폴더에 둔다.

```text
portfolio_design/portfolio-coverletter/
├─ coverletter_ppt_design.md
├─ coverletter_ppt_template.md
├─ coverletter_ppt_template.json
└─ coverletter_ppt_prompt.md
```

- `coverletter_ppt_design.md`: 디자인 원칙과 슬라이드 구성 기준
- `coverletter_ppt_template.md`: 사람이 읽는 슬라이드 출력 골격
- `coverletter_ppt_template.json`: PptxGenJS 렌더링 좌표와 binding 기준
- `coverletter_ppt_prompt.md`: OpenAI가 생성해야 하는 JSON 형식

## 3. OpenAI가 하는 일

OpenAI는 PPT 디자인을 직접 만들지 않는다.  
OpenAI는 `coverletter_ppt_template.json`의 binding에 들어갈 텍스트 JSON만 생성한다.

예시:

```json
{
  "templateId": "coverletter_ppt_v1",
  "title": "지원자 | 지원 직무",
  "headline": "경험 기반 핵심 한 줄 소개",
  "motivation": {
    "subtitle": "지원 방향",
    "narrative": "지원 동기 본문",
    "evidence": [
      { "label": "근거 경험", "text": "경험 요약" }
    ]
  }
}
```

확인되지 않은 회사명, 성과 수치, 수상, 자격 취득 여부는 생성하지 않는다. 정보가 부족하면 `missingFields`에 남긴다.

## 4. PptxGenJS가 하는 일

`/api/portfolio/export-pptx`는 다음을 수행한다.

1. 전달받은 포트폴리오가 `자기소개서 연결형`인지 확인한다.
2. `portfolio.raw.templateId`가 `coverletter_ppt_v1`이거나 새 구조 데이터가 있으면 자기소개서형 렌더러를 사용한다.
3. `coverletter_ppt_template.json`을 읽는다.
4. 각 슬라이드의 `elements`를 순회하며 텍스트, 도형, chip, 반복 카드, 타임라인, 표, 리스트 카드를 PPT에 그린다.
5. 완성된 PPTX를 브라우저에 다운로드 응답으로 반환한다.

## 5. 로컬 실행 방법

프로젝트 루트에서 실행한다.

```bash
npm install
npm run dev
```

브라우저에서 접속한다.

```text
http://localhost:3000/portfolio_create.html
```

확인 순서:

1. 로그인한다.
2. 파일 관리에서 경험 데이터를 업로드하고 분석한다.
3. 포트폴리오 생성 화면에서 `자기소개서 연결형`을 선택한다.
4. 경험 데이터와 AI 역량 키워드를 선택한다.
5. 포트폴리오를 생성한다.
6. 다운로드 버튼으로 `.pptx`가 받아지는지 확인한다.

## 6. Vercel 배포 환경 변수

Vercel Project Settings의 Environment Variables에 다음 값을 설정해야 한다.

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`OPENAI_API_KEY`는 서버에서만 사용해야 하므로 `NEXT_PUBLIC_`을 붙이지 않는다.

## 7. 배포 후 확인 방법

배포 링크에서 다음을 확인한다.

1. 구글 로그인 가능 여부
2. 마이페이지 전공 정보 로드 여부
3. 파일 관리에서 경험 데이터 조회 여부
4. 자기소개서 연결형 생성 성공 여부
5. 다운로드 버튼 클릭 시 `.pptx` 파일 생성 여부

## 8. 자주 나는 문제

### OpenAI API 오류

- Vercel에 `OPENAI_API_KEY`가 없거나 잘못된 경우 발생한다.
- 배포 후 환경 변수를 바꿨다면 반드시 redeploy가 필요하다.

### PPTX 다운로드 실패

- `/api/portfolio/export-pptx` 응답 상태를 확인한다.
- `coverletter_ppt_template.json`이 누락되었거나 JSON 문법이 깨지면 서버에서 실패한다.

### 내용은 생성됐는데 PPT 디자인이 다르게 나오는 경우

- OpenAI 프롬프트가 아니라 `coverletter_ppt_template.json`을 확인해야 한다.
- 디자인 좌표, 색상, 카드 위치는 JSON 템플릿이 기준이다.

### 경험 데이터가 반영되지 않는 경우

- 파일 관리에서 해당 경험 데이터의 AI 분석이 완료되었는지 확인한다.
- 포트폴리오 생성 화면에서 경험 데이터 checkbox가 선택되었는지 확인한다.

## 9. 팀원 작업 기준

- 템플릿 구조를 바꾸려면 `coverletter_ppt_template.json`과 `coverletter_ppt_prompt.md`를 함께 수정한다.
- OpenAI 출력 키를 바꾸면 `/api/portfolio/export-pptx`의 binding 렌더링도 함께 확인한다.
- 실제 화면 문구는 한국어로 작성한다.
- API 키나 Supabase 키는 커밋하지 않는다.
