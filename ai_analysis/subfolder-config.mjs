// 프로젝트 유형별 하위 폴더 구조 정의.
// DB가 생기면 이 설정이 folders 테이블의 시드 데이터가 된다.
// 공통 enum은 docs/single-file-ai-analysis-mvp.md §9의 허용 폴더를 그대로 따른다.

export const SUBFOLDER_TYPES = [
  { key: 'planning', label: '기획서' },
  { key: 'code', label: '코드' },
  { key: 'data', label: '데이터' },
  { key: 'report', label: '보고서' },
  { key: 'presentation', label: '발표자료' },
  { key: 'submission', label: '제출 자료' },
  { key: 'visual', label: '이미지/시각자료' },
  { key: 'pending', label: '분류 대기' },
  { key: 'other', label: '기타' },
];

const DEFAULT_ORDER = [
  'planning',
  'code',
  'data',
  'report',
  'presentation',
  'submission',
  'visual',
  'pending',
  'other',
];

// 유형별 하위 폴더 부분집합과 순서(순서 = 중요도).
// 프로젝트 유형 키는 js/folder-store.js의 FOLDER_TYPES와 동일하게 유지한다.
export const PROJECT_SUBFOLDER_MAP = {
  personal: ['planning', 'code', 'data', 'report', 'presentation', 'visual', 'submission', 'pending', 'other'],
  team: ['planning', 'report', 'code', 'data', 'presentation', 'submission', 'visual', 'pending', 'other'],
  contest: ['submission', 'presentation', 'planning', 'visual', 'code', 'data', 'report', 'pending', 'other'],
  certificate: ['submission', 'visual', 'data', 'report', 'pending', 'other'],
  education: ['report', 'submission', 'code', 'data', 'presentation', 'visual', 'pending', 'other'],
  volunteer: ['submission', 'visual', 'report', 'planning', 'pending', 'other'],
  other: DEFAULT_ORDER,
};

export const PROJECT_TYPE_LABELS = {
  personal: '개인 프로젝트',
  team: '팀 프로젝트',
  contest: '공모전',
  certificate: '자격증',
  education: '교육',
  volunteer: '봉사',
  other: '기타',
};

function subfolderLabel(key) {
  return SUBFOLDER_TYPES.find((type) => type.key === key)?.label || key;
}

// 사용자 생성(custom) 폴더 등 알 수 없는 유형은 기본(other) 구성을 따른다.
export function getSubfoldersForProjectType(projectType) {
  const keys = PROJECT_SUBFOLDER_MAP[projectType] || PROJECT_SUBFOLDER_MAP.other;
  return keys.map((key, index) => ({
    folderId: key,
    folderName: subfolderLabel(key),
    order: key === 'pending' ? 99 : index + 1,
  }));
}

export function getAllowedFolderIds(projectType) {
  return (PROJECT_SUBFOLDER_MAP[projectType] || PROJECT_SUBFOLDER_MAP.other).slice();
}
