# 로그인 및 계정 기준

소셜 로그인은 Supabase Auth의 OAuth를 사용해 실제 인증한다. 저장되는 계정·세션 데이터 구조는 [데이터 구조 및 API 기준](data-model.md)의 `profiles` 항목을 함께 참고한다.

## 필수 구현 범위

- Google로 시작하기
- 로그인 화면 제공
- 소셜 로그인 버튼 클릭 시 Supabase OAuth 시작
- 로그인 성공 시 메인 화면으로 이동
- 로그아웃 시 세션 정리 후 로그인 화면으로 이동
- 회원 탈퇴 시 Supabase Auth 사용자와 연결된 앱 데이터를 삭제한 뒤 로그인 화면으로 이동

## 소셜 로그인 처리 기준

- 소셜 로그인은 `/api/auth/social`(GET, `provider` 파라미터)이 Supabase `signInWithOAuth`로 시작하고, `/api/auth/callback`이 콜백을 처리한다.
- 세션은 Supabase가 발급한 쿠키로 유지하며, 서버는 `lib/supabase-server.js`의 `createSupabaseServerClient()`로 세션을 읽는다.
- 현재 로그인 사용자와 프로필은 `/api/auth/me`(GET)로 조회하고, 로그아웃은 `/api/auth/logout`이 처리한다.
- 회원 탈퇴는 `/api/auth/withdraw`(POST)가 현재 세션 사용자를 확인한 뒤 서버의 service role 권한으로 Storage 객체, 앱 테이블 데이터, Supabase Auth 사용자를 삭제한다. 배포 환경에 아직 없는 선택 기능 테이블(`activity_schedules` 등)은 스키마 캐시 오류를 건너뛰되, 생성된 포트폴리오(`portfolios`)는 `user_id` 기준으로 하드 삭제한다.
- `auth.users`에 사용자가 생기면 `handle_new_user()` 트리거가 `public.profiles`(이메일, 이름, 아바타, provider)를 자동 채운다.
- 화면 편의를 위한 로그인 플래그 `sessionStorage.myfitfolioLoggedIn`을 함께 쓸 수 있으나, 인증의 실제 근거는 Supabase 세션이다. 로그아웃·탈퇴 시 `localStorage`와 `sessionStorage`를 함께 정리한다.

## 회원가입 API 기준

별도 이메일/비밀번호 회원가입 UI와 회원가입 창은 현재 제공하지 않는다.

`app/api/signup/route.js`에 `bcryptjs` 기반 `/api/signup` 스캐폴드가 존재하지만, 메모리 배열(`usersDB`)만 사용하는 미완성 상태이며 현재 UI에서 이 엔드포인트를 호출하지 않는다. 실제 이메일 가입은 이후 Supabase Auth와 연결해 구현한다.
