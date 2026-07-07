# Myfitfolio

Myfitfolio는 취업을 준비하는 대학생이 흩어진 활동 자료를 정리하고, 직무 맞춤형 포트폴리오와 활동 추천을 받을 수 있도록 돕는 서비스입니다.

## 기술 스택

- Frontend/App: Next.js, React, HTML, CSS, JavaScript
- API Route: Next.js Route Handler
- AI API: OpenAI API
- Auth/Password Utility: bcryptjs
- Environment Variables: dotenv, `key.env`
- Temporary Storage: localStorage/sessionStorage
- Future DB/Deploy: Supabase, Vercel
- Test: Node.js 기본 `assert` 기반 정적 구조 테스트

현재 전환 단계에서는 기존 HTML/CSS/JS 화면과 localStorage 기반 동작을 유지합니다. Supabase DB 연동은 Next.js 전환 이후 페이지별 이슈와 PR로 진행합니다.

## 개발 환경

- Node.js: 프로젝트의 `.nvmrc`, `.node-version` 기준
- npm: Node.js에 포함된 npm 사용

## 프로젝트 구조

```text
.
├─ app/                       # Next.js App Router
│  ├─ [[...slug]]/page.js      # 기존 html 화면을 렌더링하는 catch-all route
│  ├─ api/signup/route.js      # 회원가입 API 스캐폴드
│  ├─ api/chat/route.js        # OpenAI 채팅 API 스캐폴드
│  ├─ css/[...file]/route.js   # 기존 css 자산 제공
│  └─ js/[...file]/route.js    # 기존 js 자산 제공
├─ lib/legacy-page.js          # 기존 HTML을 Next 화면으로 변환하는 유틸
├─ html/                       # 현재 서비스 화면의 원본 HTML
├─ css/                        # 공통 및 화면별 스타일
├─ js/                         # 공통 및 화면별 브라우저 스크립트
├─ docs/                       # 기능별 기준 문서
├─ tests/                      # 정적 구조 테스트
├─ package.json
├─ package-lock.json
└─ AGENTS.md
```

## 설치

```bash
npm install
```

## 환경 변수

프로젝트 루트에 `key.env` 파일을 만들고 필요한 값을 설정합니다.

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

주의: `key.env`, `.env`, `.env.*` 파일에는 API 키가 들어갈 수 있으므로 커밋하지 않습니다.

## 로컬 실행

개발 서버:

```bash
npm run dev
```

접속 주소:

```text
http://localhost:3000/
```

프로덕션 빌드 확인:

```bash
npm run build
npm start
```

## 테스트

```bash
npm test
```

현재 테스트는 기존 HTML/CSS/JS 화면 구조와 Next.js 라우트/API 전환 구조가 함께 유지되는지 확인합니다.

## 배포 방향

Next.js 전환 이후 배포 기준은 Vercel입니다. Supabase DB와 Auth 연동은 별도 이슈와 PR로 진행합니다.
