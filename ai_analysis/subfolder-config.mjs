// 프로젝트 유형 라벨과 참고용 하위 폴더 구조 정의.
// AI 추천 분류를 제거하면서 허용 폴더(getAllowedFolderIds) 개념은 폐지했다.
// 세부 폴더는 사용자가 직접 만들고 파일을 넣으며, 여기 값은 라벨·참고용으로만 쓴다.

export const SUBFOLDER_TYPES = [
  { key: 'planning', label: '기획서' },
  { key: 'code', label: '코드' },
  { key: 'data', label: '데이터' },
  { key: 'report', label: '보고서' },
  { key: 'presentation', label: '발표자료' },
  { key: 'submission', label: '제출 자료' },
  { key: 'visual', label: '이미지/시각자료' },
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
  'other',
];

// 유형별 참고 하위 폴더 순서(순서 = 중요도). 실제 폴더 구조는 사용자가 정한다.
// 프로젝트 유형 키는 js/folder-store.js의 FOLDER_TYPES와 동일하게 유지한다.
export const PROJECT_SUBFOLDER_MAP = {
  personal: ['planning', 'code', 'data', 'report', 'presentation', 'visual', 'submission', 'other'],
  team: ['planning', 'report', 'code', 'data', 'presentation', 'submission', 'visual', 'other'],
  contest: ['submission', 'presentation', 'planning', 'visual', 'code', 'data', 'report', 'other'],
  certificate: ['submission', 'visual', 'data', 'report', 'other'],
  education: ['report', 'submission', 'code', 'data', 'presentation', 'visual', 'other'],
  volunteer: ['submission', 'visual', 'report', 'planning', 'other'],
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
    order: index + 1,
  }));
}
