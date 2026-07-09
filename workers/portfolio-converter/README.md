# Myfitfolio 포트폴리오 PDF 변환 워커

Vercel 앱에서 생성한 PPTX를 받아 LibreOffice headless로 PDF로 변환하는 별도 워커다.

## API

```http
GET /health
```

상태 확인용 엔드포인트다.

```http
POST /convert/pptx-to-pdf
Authorization: Bearer <CONVERTER_TOKEN>
Content-Type: multipart/form-data

file=<generated.pptx>
source=myfitfolio
title=<portfolio title>
format=<portfolio format>
```

성공하면 `application/pdf` 바이너리를 반환한다.

## 환경 변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `PORT` | 아니오 | 서버 포트. 기본값은 `3000` |
| `CONVERTER_TOKEN` | 권장 | Vercel API에서 보내는 Bearer 토큰 |
| `MAX_UPLOAD_BYTES` | 아니오 | 업로드 가능한 PPTX 최대 크기. 기본값은 25MB |
| `CONVERT_TIMEOUT_MS` | 아니오 | LibreOffice 변환 제한 시간. 기본값은 40000 |
| `SOFFICE_BIN` | 아니오 | LibreOffice 실행 파일 경로. 기본값은 `soffice` |

## Render 등록 방법

1. 이 저장소를 GitHub에 push한다.
2. Render Dashboard에서 `New` -> `Web Service`를 선택한다.
3. GitHub 저장소를 연결한다.
4. `Root Directory`에 `workers/portfolio-converter`를 입력한다.
5. `Environment`는 `Docker`를 선택한다.
6. 환경 변수에 `CONVERTER_TOKEN`을 추가한다.
7. 배포 후 `https://<service-name>.onrender.com/health`가 `{ "ok": true }`를 반환하는지 확인한다.
8. Vercel 프로젝트 환경 변수에 아래 값을 추가한다.

```env
PORTFOLIO_CONVERTER_URL=https://<service-name>.onrender.com/convert/pptx-to-pdf
PORTFOLIO_CONVERTER_TOKEN=<CONVERTER_TOKEN과 같은 값>
PORTFOLIO_CONVERTER_TIMEOUT_MS=45000
```

## 로컬 실행

Docker가 설치된 환경에서 실행한다.

```bash
docker build -t myfitfolio-portfolio-converter .
docker run --rm -p 3001:3000 -e CONVERTER_TOKEN=local-secret myfitfolio-portfolio-converter
```

로컬 Vercel 앱의 `key.env`에는 다음 값을 추가한다.

```env
PORTFOLIO_CONVERTER_URL=http://localhost:3001/convert/pptx-to-pdf
PORTFOLIO_CONVERTER_TOKEN=local-secret
PORTFOLIO_CONVERTER_TIMEOUT_MS=45000
```
