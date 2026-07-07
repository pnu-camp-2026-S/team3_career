# 로그인 및 모의 계정 기준

프로토타입 단계에서는 실제 OAuth 인증을 구현하지 않고, 소셜 로그인 흐름을 체험할 수 있는 모의 로그인만 유지한다.

## 필수 구현 범위

- Google로 시작하기
- Naver로 시작하기
- 로그인/회원가입 화면 전환
- 소셜 로그인 버튼 클릭 시 모의 로그인 상태 저장
- 모의 로그인 성공 시 메인 화면으로 이동
- 로그아웃 시 모의 로그인 상태 삭제 후 로그인 화면으로 이동

## 모의 로그인 처리 기준

- 로그인 상태는 `sessionStorage`의 `myfitfolioLoggedIn` 키에 `'true'`로 저장한다.
- 로그아웃과 탈퇴 시 `localStorage`와 `sessionStorage`를 함께 정리한다.
- 실제 OAuth token, access token, refresh token은 생성하거나 저장하지 않는다.
- 실제 Google, Naver 인증 서버와 연결하지 않는다.
- 계정 연동이 필요한 기능은 이후 Supabase Auth 도입 시 별도 이슈와 PR로 구현한다.

## 회원가입 API 기준

별도 이메일/비밀번호 회원가입 UI는 아직 제품 방향으로 확정하지 않는다.

Next.js 전환 후 `app/api/signup/route.js`에 `bcryptjs` 기반 `/api/signup` 스캐폴드가 존재하지만, 현재 `signup.html`은 소셜 모의 로그인 버튼만 사용하고 이 엔드포인트를 호출하지 않는다.
