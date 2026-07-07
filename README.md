# CareerFit

학적/포트폴리오 기반 커리어 추천 및 포트폴리오 작성 지원 서비스입니다.

## 기술 스택

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI API: OpenAI API
- Auth/Password Utility: bcryptjs
- Environment Variables: dotenv
- Deployment: GitHub Pages

## 개발 환경

- Node.js: 22.12.0
- npm: Node.js에 포함된 npm 사용

Node 버전 관리를 사용하는 경우 아래 파일을 참고하세요.

```bash
.nvmrc
.node-version
```

## 프로젝트 구조

```text
.
├─ html/
│  ├─ index.html              # 첫 진입 페이지, 로그인 화면
│  ├─ login.html              # 로그인 화면
│  ├─ main.html               # 로그인 후 랜딩 페이지
│  ├─ signup.html
│  ├─ portfolio_create.html
│  ├─ portfolio_manage.html
│  ├─ contest.html
│  ├─ create.html
│  └─ mypage.html
├─ css/
│  ├─ common.css               # 공통 변수, 버튼, 상단 내비게이션
│  ├─ index.css
│  ├─ login.css
│  ├─ signup.css
│  ├─ main.css
│  ├─ mypage.css
│  ├─ create.css
│  ├─ portfolio_create.css
│  ├─ portfolio_manage.css
│  ├─ contest.css
│  └─ fitfolio_prototype.css
├─ js/
│  ├─ shared-nav.js            # 공통 내비게이션
│  └─ contest.js               # 활동 추천 페이지 스크립트
├─ server.js                  # 로컬/백엔드 서버
├─ package.json
├─ package-lock.json
├─ key.env                    # 로컬 API 키 파일, Git에 올리지 않음
└─ tests/
```

## 설치 방법

저장소를 받은 뒤 프로젝트 루트에서 실행합니다.

```bash
npm install
```

## 환경 변수 설정

프로젝트 루트에 `key.env` 파일을 만들고 아래 값을 설정합니다.

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

주의: `key.env`, `.env`, `.env.*` 파일은 API 키가 들어가므로 GitHub에 올리지 않습니다.

## 로컬 실행

```bash
npm start
```

브라우저에서 접속합니다.

```text
http://localhost:3000/
```

서버는 `html/` 폴더를 화면 정적 파일 루트로 사용하고, `/css`, `/js` 경로로 공통 스타일과 스크립트를 제공합니다. 따라서 첫 화면은 `html/index.html`이고, 로그인 후 `html/main.html`로 이동합니다.

## 테스트

```bash
npm test
```

현재 테스트는 활성 HTML 파일이 `html/` 폴더에 있는지, CSS와 JS가 각각 `css/`, `js/` 폴더에서 관리되는지, 서버가 정적 자산 경로를 제공하는지 확인합니다.

## GitHub Pages 배포

GitHub Pages 설정:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

이 설정이면 배포 주소의 루트(`/`)에서 루트 `index.html`이 먼저 열리고, `html/index.html`로 이동합니다.

서비스 흐름:

```text
배포 주소 접속
→ index.html 로그인 화면
→ 로그인 / 구글로 로그인 / 네이버로 로그인 클릭
→ main.html 이동
```

## 팀원 작업 순서

```bash
git clone https://github.com/pnu-camp-2026-S/team3_career.git
cd team3_career
npm install
```

AI API를 로컬에서 테스트할 팀원은 `key.env`를 직접 생성해야 합니다.

```bash
npm start
```
