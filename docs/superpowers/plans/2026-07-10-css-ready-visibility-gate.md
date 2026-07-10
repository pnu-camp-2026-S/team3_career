# CSS 준비 전 HTML 노출 방지 구현 계획

## 목표

승인된 설계에 따라 최초 진입과 소프트 페이지 이동에서 스타일 없는 HTML을 노출하지 않고, CSS 준비 후 별도 로딩 문구 없이 화면을 공개한다.

## 작업 1. LegacyStyleGate 구현

대상 파일:

- `app/LegacyStyleGate.jsx`

구현 내용:

1. 첫 서버·클라이언트 렌더링의 자식 내용을 `visibility: hidden`으로 숨긴다.
2. `useLayoutEffect`에서 현재 페이지에 등록된 스타일 링크를 찾는다.
3. `link.sheet`로 이미 준비된 스타일을 확인한다.
4. 준비되지 않은 링크의 `load`와 `error`를 모두 완료 상태로 처리한다.
5. 링크가 늦게 삽입되는 경우 `MutationObserver`로 다시 확인한다.
6. 모든 스타일이 정리되거나 3초가 지나면 내용을 공개한다.
7. 페이지 변경·해제 시 이벤트, DOM 감시자, 타이머를 정리한다.

## 작업 2. 레거시 페이지 연결

대상 파일:

- `app/[[...slug]]/page.js`

구현 내용:

1. 스타일 링크에 현재 페이지 식별자를 추가한다.
2. 레거시 HTML과 스크립트를 페이지별 `key`를 가진 `LegacyStyleGate`로 감싼다.
3. JavaScript 비활성화 시 숨김을 해제하는 `<noscript>` CSS를 추가한다.
4. 기존 CSS 순서와 스크립트 실행 순서는 유지한다.

## 작업 3. 회귀 테스트

대상 파일:

- `tests/static-html-structure.test.js`

검증 내용:

1. 스타일 게이트 파일과 페이지 연결이 존재하는지 확인한다.
2. 첫 렌더링이 숨김 상태인지 확인한다.
3. `sheet`, `load`, `error`, `MutationObserver` 처리를 확인한다.
4. 3초 실패 복구와 정리 동작을 확인한다.
5. `<noscript>` 공개 처리를 확인한다.

## 작업 4. 프로덕션 검증

```bash
npm test
npm run build
```

생성된 프로덕션 HTML에서 다음을 확인한다.

- CSS preload와 stylesheet 링크 유지
- 레거시 페이지 내용의 상위 게이트가 `visibility:hidden`으로 시작
- JavaScript 비활성화 공개 CSS 포함
- 모든 기존 페이지가 계속 정적 생성됨

## 완료 조건

- 승인된 설계 문서의 완료 기준 6개를 충족한다.
- 테스트와 프로덕션 빌드가 통과한다.
- 생성된 HTML에 스타일 없는 콘텐츠 노출을 막는 초기 숨김 상태가 확인된다.
