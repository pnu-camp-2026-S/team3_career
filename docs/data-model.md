# 데이터 구조 및 API 기준

이 문서는 Myfitfolio/CareerFit의 자료 구조를 한곳에 정리한다.  
클라이언트(브라우저) 임시 상태와 서버(Supabase) 영속 데이터, 그리고 둘을 잇는 Next.js API를 함께 다룬다.

세부 화면 기준은 각 기능 문서를, 실제 스키마 원본은 `docs/supabase-*.sql`을 우선한다.

## 1. 저장소 계층 개요

데이터는 두 계층으로 나뉜다.

| 계층 | 저장 위치 | 용도 | 접근 지점 |
| --- | --- | --- | --- |
| 클라이언트 임시 상태 | 브라우저 `localStorage` / `sessionStorage` | 화면 상태, 폴더/파일 UI, 오프라인·미로그인 폴백 | `js/folder-store.js` 등 화면 스크립트 |
| 서버 영속 데이터 | Supabase Postgres + Supabase Storage | 로그인 사용자별 프로필·파일·포트폴리오 | `app/api/*` (Next.js Route Handler) |

원칙:

- 서버 요청이 실패하거나 미로그인 상태이면 클라이언트는 `localStorage` 상태로 폴백해 화면이 계속 동작하게 한다.
- 로그인 사용자의 최종 데이터 기준은 Supabase다. (과거 문서의 "Firebase 기준" 표현은 Supabase로 대체되었다.)
- 모든 Supabase 테이블은 RLS(Row Level Security)로 `auth.uid()` 기준 본인 데이터만 접근 가능하다.

## 2. 클라이언트 임시 상태

### 2.1 브라우저 키 목록

| 키 | 저장소 | 설명 |
| --- | --- | --- |
| `myfitfolioLoggedIn` | `sessionStorage` | 로그인 상태 플래그(`'true'`). 로그아웃·탈퇴 시 삭제 |
| `myfitfolioProfile` | `localStorage` | 마이페이지 프로필 캐시(서버 응답을 미러링) |
| `myfitfolioFolders` | `localStorage` | 폴더/파일 UI 상태 전체(`FolderStore`가 관리) |
| `myfitfolioSidebarWidth` | `localStorage` | 메인 사이드바 너비 |

### 2.2 FolderStore 데이터 (`js/folder-store.js`)

폴더/파일 상태의 유일한 접근 지점이다. 메인 화면과 파일 관리 화면이 모두 이 모듈을 통해서만 읽고 쓰므로 두 화면이 항상 같은 데이터를 본다.

고정 분류 값:

- `FOLDER_GROUPS` (2): `completed`(파일관리 화면 표시: 완료된 프로젝트), `inProgress`(파일관리 화면 표시: 진행 중인 프로젝트)
- `FOLDER_TYPES` (7): `personal`(개인 프로젝트), `team`(팀 프로젝트), `contest`(공모전), `certificate`(자격증), `education`(교육), `volunteer`(봉사), `other`(기타). 각 타입은 도넛 차트용 `color`를 가진다.

폴더 객체 구조(프로젝트 폴더 → 하위 폴더 → 파일):

```js
{
  id: 'completed-personal',   // 기본 폴더는 `${group}-${type}`,
                              // 사용자 추가 폴더는 `custom-${group}-${timestamp}-${rand}`
  group: 'completed',         // FOLDER_GROUPS의 key
  type: 'personal',           // FOLDER_TYPES의 key
  label: '개인 프로젝트',      // 화면 표시 이름
  open: false,                // 사이드바 펼침 상태
  github: null,               // 프로젝트별 GitHub 연결 정보(아래 구조)
  subfolders: [               // 활동 유형별 세부 폴더(#137-2)
    { id: 'completed-personal::sub0', label: '기획서', files: [] },
    { id: 'completed-personal::sub1', label: '코드', files: [] },
    { id: 'completed-personal::ai-summary', label: 'AI 요약', files: [] },
    // ...
  ],
}
```

- 파일은 폴더가 아니라 **세부 폴더(subfolder)**에 소속된다. 세부 폴더 id는 `${folderId}::sub{index}`로 결정적이라 재로딩·API 매핑에서 안정적으로 찾을 수 있다.
- 기본 폴더는 만들지 않는다. 사용자가 폴더를 추가하면 각 폴더는 유형별 템플릿(`SUBFOLDER_TEMPLATES`)의 세부 폴더와 맨 오른쪽 `AI 요약` 세부 폴더를 갖는다.
- 사용자가 파일 관리 탭에서 만든 폴더는 `createFolder(group, label, typeKey)`로 선택한 활동 유형의 템플릿 세부 폴더와 함께 생성된다.
- `loadFolders()`는 기본 폴더 위에 저장값을 병합하고, 구버전 데이터를 정규화한다(구 `files`/`nestedFolders`는 세부 폴더로 이관, `기타 폴더` → `기타` 라벨 마이그레이션).
- 헬퍼: `getFolderFiles(folder)`(세부 폴더 파일 평탄화, 개수·분석 계산용), `findSubfolder(folders, subfolderId)`(전 폴더에서 세부 폴더 검색), `subfolderTemplateFor(typeKey)`(유형별 템플릿).

파일 객체 구조(서버 응답을 매핑한 형태):

```js
{
  id: 'uuid 또는 file-<n>',   // 서버 저장 시 activity_files.id, 폴백 시 로컬 임시 id
  name: '서비스_기획서.pdf',
  type: 'PDF',                // 확장자로 유도한 표시용 타입
  status: '분석대기',          // 화면 표시용 상태(분석대기/분석완료/작성완료 등)
  mimeType: 'application/pdf',
  size: 12345,
  storagePath: '<uid>/<folderId>/<...>',  // 있으면 서버 저장 파일 → 삭제 시 API DELETE
  createdAt: '2026-07-08T...',
  analysis: {
    status: 'completed',
    summaryMd: '...',
    indexDraft: {},
    logMd: '...',
  },
}
```

`storagePath` 유무가 서버 저장 파일과 로컬 폴백 파일을 가르는 기준이다. 삭제 시 `storagePath`가 있으면 `/api/activity-files` DELETE를 호출한 뒤 로컬에서 제거한다.
분석이 완료된 원본 파일은 프로젝트의 `AI 요약` 세부 폴더에 `원본명 AI 요약.md` 가상 파일로 표시된다. 이 가상 파일은 실제 Storage 업로드 대상이 아니며, `file_analyses.summary_md`, `index_draft`, `log_md`를 미리보기로 보여주는 UI용 산출물이다.

### 2.3 폴더별 GitHub 연결 정보 (`folder.github`)

프로젝트(폴더) 단위로 저장하는 임시 연결 정보다. 실제 GitHub API는 호출하지 않는다([GitHub 임시 연동 기준](github.md) 참고).

```js
github = {
  connected: true,
  username: 'bjun02',
  owner: 'pnu-camp-2026-S',
  repo: 'team3_career',
  branch: 'main',
  basePath: 'docs/',
  syncEnabled: false,
  lastSyncedAt: null,
}
```

## 3. 서버 영속 데이터 (Supabase)

스키마 원본은 각 SQL 파일에 있고, 아래는 요약이다. 모든 테이블은 `enable row level security` 상태이며 정책은 본인(`auth.uid()`) 행만 허용한다.

### 3.1 `public.profiles` — 계정 신원 (`supabase-profiles.sql`)

Supabase Auth 사용자와 앱 프로필을 잇는다. `auth.users`에 사용자가 생기면 `handle_new_user()` 트리거가 이 테이블을 자동 채운다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK → `auth.users(id)` | 사용자 식별자 |
| `email` | text | 이메일 |
| `name` | text | 표시 이름(소셜 메타데이터에서 유도) |
| `avatar_url` | text | 프로필 이미지 |
| `provider` | text | 로그인 제공자(google 등) |
| `created_at` / `updated_at` | timestamptz | 생성/수정 시각 |

### 3.2 `public.user_profiles` — 마이페이지 프로필 (`supabase-user-profiles.sql`)

사용자가 마이페이지에서 직접 편집하는 프로필이다. `profiles`와 별개이며 `user_id`가 PK다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `user_id` | uuid PK → `auth.users(id)` | 사용자 식별자 |
| `name` / `gender` / `birth_date` | text / text / date | 기본 정보 |
| `email` / `phone` / `address` | text | 연락처 정보 |
| `educations` | jsonb `[]` | 학력 배열 |
| `preferences` | jsonb `{}` | 희망근무조건 |
| `chips` | jsonb `{}` | 관심분야/직무 chip 선택값 |
| `created_at` / `updated_at` | timestamptz | 생성/수정 시각 |

### 3.3 `public.activity_files` — 업로드 파일 메타데이터 (`supabase-activity-files.sql`)

파일 원본은 Supabase Storage 버킷 `activity-files`(비공개)에 저장하고, 이 테이블은 메타데이터만 보관한다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 파일 식별자 |
| `user_id` | uuid → `auth.users(id)` | 소유자 |
| `folder_id` / `folder_group` / `folder_type` / `folder_label` | text | FolderStore 폴더 정보(동기화 기준) |
| `project_id` | text | 프로젝트 폴더 id(#167). `folder_id`의 `::` 앞부분 |
| `parent_folder_id` | text | 파일이 속한 폴더의 부모 폴더 id. 프로젝트 루트 직속이면 null |
| `folder_path` | text | `folder_id`의 `::`를 `/`로 바꾼 구체화 경로(예: `completed-personal/sub0`) |
| `folder_level` | smallint | 0=프로젝트 루트, 1=세부 폴더 |
| `file_name` | text | 원본 파일명 |
| `mime_type` | text | MIME 타입 |
| `size_bytes` | bigint | 파일 크기 |
| `storage_bucket` | text | 기본 `activity-files` |
| `storage_path` | text | Storage 내 경로 `<uid>/<projectId>/<sub>/<time>-<uuid>-<name>` (folder_path 미러링) |
| `created_at` / `updated_at` | timestamptz | 생성/수정 시각 |

- Storage 정책도 경로 첫 세그먼트가 본인 `auth.uid()`인 객체만 업로드/조회/삭제하게 제한한다(경로 깊이와 무관).
- `folder_id`가 클라이언트 FolderStore와 서버를 잇는 키다. 세부 폴더 모델(#137-2)에서는 `folder_id`에 **세부 폴더 id**를 저장하고, 파일을 불러올 때 `FolderStore.findSubfolder(folders, folder_id)`로 원래 세부 폴더에 매핑한다. 세부 폴더를 못 찾으면 `project_id`(또는 상위 프로젝트 폴더 id)의 첫 세부 폴더로 되돌린다.
- 트리 컬럼은 업로드 시 서버(`lib/folder-tree.js`의 `deriveFolderTree`)가 파생해 채우고, 기존 행은 `supabase-activity-files-tree-migration.sql`로 백필한다.
- `activity_files(user_id, project_id)`는 `activity_folders(user_id, id)`를 참조한다. 프로젝트 폴더가 삭제되면 파일 메타데이터 행도 함께 삭제되고, `file_analyses`는 `activity_files(id)` 참조로 연쇄 삭제된다.

### 3.5 `public.file_analyses` / `public.project_analyses` — AI 분석 결과 (`supabase-analysis.sql`)

- `file_analyses`: 파일 1건당 분석 1행(`activity_file_id` unique, 재분석은 upsert). `status`(`pending/analyzing/completed/failed`), `provider`, `metadata`/`analysis_result`/`index_draft`(jsonb), `summary_md`/`log_md`/`extracted_text`(text), 실패 시 `stage`/`errors`.
- `project_analyses`: 종합 결과. `scope='project'`(프로젝트 단위)와 `scope='user'`(메인 키워드 개요)를 `(user_id, scope, project_id)` unique로 upsert. `result`(jsonb)에 headline/description/activityKeywords/portfolioKeywords/basedOnCount 저장.
- `project_analyses`의 `scope='user'` 행은 특정 폴더에 묶이지 않으므로 단순 foreign key를 걸지 않는다. 대신 `activity_folders` 삭제 트리거가 `scope='project'`인 해당 프로젝트 분석 결과만 정리한다.
- 저장 계층은 `ai_analysis/db-repository.mjs`(`DbAnalysisRepository`)가 담당하며, 상세 기준은 [AI 자동 정리 및 분석 기준](ai-analysis.md)을 따른다.

### 3.4 `public.portfolios` — 포트폴리오 (`supabase-portfolios.sql`)

생성·관리하는 포트폴리오 레코드다. `deleted_at`으로 soft delete 한다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | text PK | 포트폴리오 식별자(`portfolio-<uuid>`) |
| `user_id` | uuid → `auth.users(id)` | 소유자 |
| `title` / `purpose` / `summary` / `content` / `format` | text | 본문 및 메타 |
| `status` | text `'done'` | 상태 |
| `liked` | boolean | 즐겨찾기 |
| `experiences` / `keywords` / `blocks` / `slides` / `cover_lines` | jsonb `[]` | 구조화 콘텐츠 |
| `created_at` / `updated_at` | timestamptz | 생성/수정 시각 |
| `deleted_at` | timestamptz | soft delete 시각(있으면 목록에서 제외) |

## 4. API 엔드포인트

Next.js App Router의 Route Handler(`app/api/*/route.js`)로 제공한다. 인증이 필요한 엔드포인트는 세션이 없으면 `401`을 반환하고, 클라이언트는 이때 로컬 폴백으로 처리한다.

| 엔드포인트 | 메서드 | 대상 | 설명 |
| --- | --- | --- | --- |
| `/api/auth/social` | GET | Supabase Auth | `provider`로 소셜 OAuth 시작(리다이렉트) |
| `/api/auth/callback` | GET | Supabase Auth | OAuth 콜백 처리 |
| `/api/auth/me` | GET | `profiles` | 현재 로그인 사용자와 프로필 반환 |
| `/api/auth/logout` | — | Supabase Auth | 세션 종료 |
| `/api/auth/withdraw` | POST | Supabase Auth + 앱 데이터 | 현재 로그인 사용자의 Storage 객체, 앱 테이블 데이터, Auth 사용자를 삭제 |
| `/api/profile` | GET / PUT | `user_profiles` | 마이페이지 프로필 조회/저장(upsert) |
| `/api/activity-files` | GET / POST / DELETE | `activity_files` + Storage | 파일 목록(`?projectId=` 필터, `analysisStatus`와 AI 요약 산출물 포함)/업로드/삭제 |
| `/api/analysis/project` | GET / POST | `file_analyses`, `project_analyses` | 프로젝트 단위 AI 분석(미분석 파일만) 실행/결과 조회 |
| `/api/analysis/aggregate` | GET / POST | `project_analyses` | 사용자 전체 종합 분석(메인 키워드 개요) 실행/조회 |
| `/api/portfolios` | GET / POST / PATCH / DELETE | `portfolios` | 목록·단건 조회 / 저장(upsert) / 부분 수정 / soft delete |
| `/api/chat` | POST | OpenAI | 채팅 프록시(`OPENAI_MODEL` 또는 `gpt-4o-mini`) |
| `/api/signup` | POST | (스캐폴드) | `bcryptjs` 해시. 메모리 `usersDB`만 사용, 현재 UI 미연결 |

공용 유틸은 `lib/supabase-server.js`에 있다. `createSupabaseServerClient()`(쿠키 기반 세션), `createSupabaseAdminClient()`(service role, Storage 작업용), `upsertUserProfile()`.

### 4.1 클라이언트 ↔ DB 필드 매핑

API는 DB의 snake_case를 클라이언트 camelCase로 바꿔 주고받는다. 주요 매핑:

- 프로필: `birth_date` ↔ `birthDate`, 나머지는 이름 동일. `gender`/`birthDate`는 서버에서 정규화(`female`→`여성`, `2026.07.08`→`2026-07-08`). 저장된 값이 비면 소셜 로그인 메타데이터로 기본값을 채운다.
- 파일: `file_name` ↔ `name`, `mime_type` ↔ `mimeType`, `size_bytes` ↔ `size`, `storage_path` ↔ `storagePath`, `folder_*` ↔ `folder*`.
- 포트폴리오: `cover_lines` ↔ `coverLines`, `created_at`/`updated_at` ↔ `createdAt`/`updatedAt`.

## 5. 데이터 흐름 요약

- **파일 업로드**: 파일 관리 탭에서 선택한 세부 폴더 → `/api/activity-files` POST(`folderId` = 세부 폴더 id) → Storage 업로드 + `activity_files` insert → 응답을 해당 세부 폴더 `files`에 매핑·저장. 실패 시 로컬 임시 파일로 폴백.
- **파일 삭제**: `storagePath` 있으면 `/api/activity-files` DELETE(Storage 객체 + 행 삭제) 후 세부 폴더에서 제거. 없으면 로컬만 제거.
- **프로젝트 이동/분석**: 프로젝트는 `완료로 이동`/`진행중으로 이동`으로 `group`을 완료↔진행중 전환하고(#166-1), AI 분석은 상단 `분석하기` 버튼에서 프로젝트 단위(`POST /api/analysis/project`)로 실행해 신규 파일 또는 마지막 분석 이후 수정된 파일만 새로 분석하고 종합한다. 분석이 완료되면 `AI 요약` 세부 폴더에 `AI 요약.md` 가상 파일이 표시된다. 프로젝트 이름 수정과 삭제(`FolderStore.deleteFolder`, 기본 폴더는 tombstone으로 삭제 유지)도 지원하며, 서버 삭제 API는 Storage 파일·`activity_files`·`file_analyses`·`project_analyses(scope='project')`를 함께 정리한다.
- **메인 화면**: FolderStore를 읽어 폴더 요약 카드를 그리고, 파일은 `/api/activity-files` GET으로 읽어 세부 폴더에 매핑한다. 분석 개요/분류는 `분석 시작` 전에는 "분석이 필요합니다" 상태이고, 클릭 시 `POST /api/analysis/aggregate` 결과(키워드 개요)로 채워진다. 결과는 `localStorage.myfitfolioAiKeywords`에도 저장되어 포트폴리오 생성 화면이 재사용한다.
- **마이페이지**: `/api/profile` GET/PUT로 `user_profiles`를 읽고 저장하며, 화면 캐시로 `localStorage.myfitfolioProfile`을 함께 갱신한다.
- **회원 탈퇴**: `/api/auth/withdraw` POST가 현재 세션 사용자를 확인하고, `activity_files` Storage 객체와 `activity_files`/`portfolios`/`user_profiles`/`profiles` 행을 삭제한 뒤 Supabase Auth 사용자를 삭제한다. 클라이언트는 성공 후 로컬 상태를 비우고 로그인 화면으로 이동한다.

## 6. 확장 예정

- `/api/signup`을 실제 사용자 테이블/Supabase Auth와 연결(현재 스캐폴드).
- 파일 순서(`order`)와 우선순위(`priority`), soft delete·휴지통을 서버 스키마에 반영([자료 입력 및 파일관리 기준](file-management.md) 참고).
- GitHub 연결 정보를 폴더 로컬 상태에서 서버 스키마로 승격([GitHub 임시 연동 기준](github.md) 참고).
