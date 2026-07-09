# 포트폴리오 실제 PDF 미리보기 기준

Vercel 배포 환경에서는 앱과 API 라우트만 Vercel에 두고, PPTX를 PDF로 변환하는 무거운 작업은 외부 변환 워커에서 처리한다.

## 흐름

```text
브라우저
-> POST /api/portfolio/render-pdf
-> Vercel API가 기존 PPTX export 로직으로 PPTX 생성
-> 외부 변환 워커에 multipart/form-data로 PPTX 전달
-> 워커가 PDF 파일 또는 PDF URL 반환
-> 브라우저가 실제 변환 PDF를 iframe으로 미리보기
```

`PORTFOLIO_CONVERTER_URL`이 설정되지 않았거나 워커 요청에 실패하면 화면은 기존 PPTX 매칭 캔버스 미리보기로 자동 전환한다.

## Vercel 환경 변수

```env
PORTFOLIO_CONVERTER_URL=https://<service-name>.onrender.com/convert/pptx-to-pdf
PORTFOLIO_CONVERTER_TOKEN=optional_shared_secret
PORTFOLIO_CONVERTER_TIMEOUT_MS=45000
```

`PORTFOLIO_CONVERTER_TOKEN`은 선택값이다. 설정하면 Vercel API가 워커 요청에 `Authorization: Bearer <token>` 헤더를 붙인다.
`your-worker.example.com` 같은 예시 도메인은 실제 워커 주소가 아니므로 넣지 않는다. 실제 워커를 배포하기 전에는 환경 변수를 비워두면 기존 캔버스 미리보기로 자동 전환된다.

## 변환 워커 계약

워커는 다음 요청을 받아야 한다.

```http
POST /convert/pptx-to-pdf
Content-Type: multipart/form-data
Authorization: Bearer <optional token>

file: generated.pptx
source: myfitfolio
title: <portfolio title>
format: <portfolio format>
```

응답은 둘 중 하나를 지원한다.

```http
Content-Type: application/pdf

<pdf binary>
```

또는

```json
{
  "pdfUrl": "https://storage.example.com/generated.pdf",
  "expiresAt": "2026-07-10T12:00:00.000Z"
}
```

운영에서는 LibreOffice headless 기반 Docker 워커를 권장한다. 워커는 PPTX를 임시 디렉터리에 저장하고 `soffice --headless --convert-to pdf --outdir <dir> <file>` 방식으로 변환한 뒤 PDF를 반환하거나 Storage에 업로드한 URL을 반환한다.

이 저장소에는 바로 배포할 수 있는 Docker 워커 예시가 `workers/portfolio-converter`에 있다. Render에 등록할 때는 Web Service의 `Root Directory`를 `workers/portfolio-converter`로 지정하고, 환경 변수 `CONVERTER_TOKEN`을 설정한다.
