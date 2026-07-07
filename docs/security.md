# 보안 기준

## 파일 보안

- 파일 확장자 검증
- MIME type 검증
- 파일 크기 제한
- 악성 파일 검사
- 비공개 스토리지 저장
- 다운로드 URL 만료 시간 적용

## GitHub 보안

- 프로토타입 단계에서는 GitHub OAuth token을 생성하거나 저장하지 않는다.
- 실제 GitHub 연동을 확장할 때는 OAuth token 암호화 저장을 전제로 한다.
- 실제 GitHub 연동을 확장할 때는 사용자별 GitHub 권한 분리, 레포지토리 접근 권한 확인, 커밋 전 변경 파일 검증을 반드시 적용한다.

## 개인정보와 API 키

- 개인정보와 API 키는 화면, 로그, 테스트 출력, 커밋에 노출하지 않는다.
- `key.env`(OpenAI), `gemini_key.env`(Gemini), `.env`, `.env.*`에는 API 키가 들어가므로 커밋하지 않는다.
- AI 분석 산출물(`data/local-analysis/`, `docs/examples/`)에 API 키나 개인정보가 들어가지 않았는지 커밋 전에 확인한다.
- Supabase를 사용할 때는 RLS(Row Level Security)로 사용자별 데이터 접근 권한이 분리되도록 설계한다.
