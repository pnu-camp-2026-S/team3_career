# 상세기술 포트폴리오 PptxGenJS 템플릿 명세

## 1. 목적

이 문서는 `detail_a4_two_page_half_blocks.json`을 PptxGenJS로 렌더링할 때 따라야 할 템플릿 구조를 설명한다.

AI가 생성한 콘텐츠 JSON은 `json.md` 구조를 따른다. PptxGenJS 코드는 콘텐츠 JSON과 템플릿 JSON을 결합해 A4 세로형 2장 PPTX를 만든다.

## 2. 렌더링 기본값

| 항목 | 값 |
|---|---|
| 엔진 | PptxGenJS |
| 레이아웃 | A4 세로형 |
| 페이지 수 | 2장 고정 |
| 폰트 | Malgun Gothic |
| 배경 | 흰색 |
| 카드 배경 | 연한 블루 |
| 카드 테두리 | 블루 그레이 |
| 강조 색상 | 블루 |

PptxGenJS에서 A4 세로형은 사용자 정의 레이아웃으로 설정한다.

```js
pptx.defineLayout({
  name: 'A4_PORTRAIT',
  width: 8.27,
  height: 11.69,
});
pptx.layout = 'A4_PORTRAIT';
```

## 3. 페이지 구성

```text
Page 1
┌────────────────────────┐
│ 사용자 개요             │
│ profileBlock            │
├────────────────────────┤
│ 경험 1                  │
│ experienceBlock         │
└────────────────────────┘

Page 2
┌────────────────────────┐
│ 경험 2                  │
│ experienceBlock         │
├────────────────────────┤
│ 경험 3                  │
│ experienceBlock         │
└────────────────────────┘
```

## 4. 컴포넌트 구조

### 4.1 profileBlock

`profileBlock`은 1장 위쪽 절반에만 사용한다.

| 요소 | 데이터 경로 | 렌더링 방식 |
|---|---|---|
| 프로필 사진 | `profile.photo.path` | 이미지가 있으면 사진, 없으면 placeholder |
| 이름 | `profile.name` | 가장 큰 제목 |
| 기본 정보 | `profile.gender`, `education`, `major`, `targetRole`, `contact` | 라벨-값 목록 |
| 강조 키워드 | `profile.keywords` | rank 순서의 카드 3개 |

키워드 카드는 항상 3개를 그린다. 값이 없으면 `키워드 보완 필요`를 표시한다.

### 4.2 experienceBlock

`experienceBlock`은 경험 1, 경험 2, 경험 3에 모두 재사용한다.

| 요소 | 데이터 경로 | 렌더링 방식 |
|---|---|---|
| 경험 라벨 | `experiences[].rank` | `경험 1` 형식 |
| 프로젝트명 | `experiences[].projectName` | 경험 영역 제목 |
| 한 줄 설명 | `experiences[].summary` | 프로젝트 요약 |
| 과정 카드 | `experiences[].process` | 불릿 최대 3개 |
| 기여도 카드 | `experiences[].contribution` | 불릿 최대 3개 |
| 결과 카드 | `experiences[].result` | 불릿 최대 3개 |
| 화살표 | 고정 텍스트 `>` | 카드 사이 중앙 배치 |
| 발전한 점 | `experiences[].growth` | 하단 중앙 정렬 |

카드 순서는 절대 바꾸지 않는다.

```text
[과정 카드] > [기여도 카드] > [결과 카드]
```

## 5. PptxGenJS 함수 분리 기준

권장 구현 함수는 아래와 같다.

```js
function createDetailA4Deck(content) {}
function addProfileBlock(slide, profile, region, template) {}
function addExperienceBlock(slide, experience, region, template) {}
function addInfoRow(slide, label, value, x, y, w, h) {}
function addKeywordCard(slide, keyword, x, y, w, h) {}
function addExperienceCard(slide, card, x, y, w, h) {}
function addArrow(slide, x, y) {}
function normalizeExperience(experience, rank) {}
```

## 6. 렌더링 규칙

- 모든 텍스트는 `fit: "shrink"`를 사용한다.
- 카드 안 불릿은 3개까지만 렌더링한다.
- 배열이 비어 있으면 `내용 보완 필요`를 표시한다.
- 이미지 경로가 없거나 로드에 실패하면 이미지 영역에 placeholder를 표시한다.
- 프로필 정보가 없으면 빈 값을 만들지 말고 `정보 없음`을 표시한다.
- 강조 키워드는 `rank` 오름차순으로 정렬한다.
- 경험은 `rank` 오름차순으로 정렬한 뒤 3개까지만 렌더링한다.
- 3개보다 적으면 빈 경험 객체를 보완해 영역을 유지한다.

## 7. 템플릿 JSON 파일

실제 좌표와 색상 토큰은 아래 파일을 기준으로 한다.

```text
portfolio_design/portfolio-detail/detail_a4_two_page_half_blocks.json
```

이 파일은 다음 정보를 가진다.

- A4 세로 페이지 크기
- 색상과 폰트 토큰
- 프로필 영역 좌표
- 경험 영역 공통 좌표
- 카드 3개와 화살표 위치 규칙
- 페이지별 dataPath 매핑
- AI 출력 dataShape

## 8. 구현 순서

1. `json.md` 기준으로 AI 출력 JSON을 만든다.
2. `detail_a4_two_page_half_blocks.json`을 불러온다.
3. PptxGenJS에서 A4 세로 레이아웃을 정의한다.
4. Page 1을 만들고 `profileBlock`, 경험 1을 렌더링한다.
5. Page 2를 만들고 경험 2, 경험 3을 렌더링한다.
6. 텍스트 넘침, 빈 값, 이미지 placeholder를 처리한다.
7. `.pptx`로 저장한다.
