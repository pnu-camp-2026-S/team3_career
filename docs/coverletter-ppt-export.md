# 자기소개서형 포트폴리오 PPT 생성 흐름

이 문서는 `자기소개서 연결형` 포트폴리오를 OpenAI API와 PptxGenJS로 실제 `.pptx` 파일로 생성하는 기준을 설명한다.

## 1. 전체 흐름

```text
사용자가 포트폴리오 생성 화면에서 자기소개서 연결형 선택
→ 사용할 경험 데이터와 AI 역량 키워드 선택
→ /api/portfolio/generate 호출
→ OpenAI가 자기소개서형 PPT 내용 JSON 생성
→ 화면에서 초안 확인
→ 다운로드 버튼 클릭
→ /api/portfolio/export-pptx 호출
→ PptxGenJS 전용 렌더러가 PPTX 생성
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
- `coverletter_ppt_template.json`: 템플릿 ID, 16:9 레이아웃, 폰트, binding 기준
- `coverletter_ppt_prompt.md`: OpenAI가 생성해야 하는 JSON 형식

## 3. OpenAI가 하는 일

OpenAI는 PPT 디자인을 직접 만들지 않는다.  
OpenAI는 `coverletter_ppt_template.json`의 binding에 들어갈 텍스트 JSON만 생성한다.

예시:

```json
{
  "templateId": "coverletter_ppt_v1",
  "title": "지원자 | 지원 직무",
  "headline": "경험 기반 핵심 소개",
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
3. `coverletter_ppt_template.json`은 템플릿 ID, 16:9 레이아웃, 폰트 기준을 확인하는 기준 파일로 읽는다.
4. 실제 PPTX는 전용 렌더러가 표지, 지원 동기, 직무 역량, 대표 경험, 협업 방식, 기여 계획, 문항 연결 슬라이드를 고정 레이아웃으로 그린다.
5. 텍스트는 줄 수와 길이를 제한한 뒤 카드 안에 배치해 PDF 변환 시 깨짐을 줄인다.
6. 완성된 PPTX를 브라우저의 다운로드 응답으로 반환한다.

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

## 6. 배포 시 필요한 환경 변수

Vercel에는 다음 환경 변수가 필요하다.

```text
OPENAI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`OPENAI_API_KEY`가 없으면 `/api/portfolio/generate`에서 실제 AI 생성이 실패한다.
Supabase 키가 없으면 로그인 사용자 데이터와 파일 분석 데이터 연결이 실패한다.
Vercel에서 환경 변수를 변경한 뒤에는 다시 배포해야 최신 값이 적용된다.

## 7. 검증 명령

```bash
npm test
npm run build
```

PPTX API만 빠르게 확인할 때는 `/api/portfolio/export-pptx` 응답 상태와 다운로드 파일 확장자를 확인한다.

## 8. 수정 기준

- OpenAI 출력 키를 바꾸면 `coverletter_ppt_prompt.md`, `lib/openai-portfolio.js`, `/api/portfolio/export-pptx`를 함께 확인한다.
- 슬라이드 순서나 디자인 원칙을 바꾸면 `coverletter_ppt_design.md`, `coverletter_ppt_template.md`, `coverletter_ppt_template.json`을 함께 갱신한다.
- 실제 렌더링 품질은 `/api/portfolio/export-pptx`의 전용 렌더러가 결정하므로, 텍스트가 넘치거나 PDF 변환이 깨지면 렌더러의 카드 크기와 줄 수 제한을 우선 조정한다.
