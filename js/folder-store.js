(function () {
  const STORAGE_KEY = 'myfitfolioFolders';

  const FOLDER_TYPES = [
    { key: 'personal', label: '개인 프로젝트', color: '#5965e8' },
    { key: 'team', label: '팀 프로젝트', color: '#2f80ed' },
    { key: 'contest', label: '공모전', color: '#f2994a' },
    { key: 'certificate', label: '자격증', color: '#9b51e0' },
    { key: 'education', label: '교육', color: '#27ae60' },
    { key: 'volunteer', label: '봉사', color: '#eb5757' },
    { key: 'other', label: '기타', color: '#60758f' },
  ];

  const FOLDER_GROUPS = [
    { key: 'completed', label: '완료된 활동 폴더' },
    { key: 'inProgress', label: '진행중인 활동 폴더' },
  ];

  // 활동 유형별 기본 하위 폴더 템플릿 (#137-2). 별도 자료구조 템플릿이 확정되기 전까지
  // 적용하는 기본값이며, 프로젝트 폴더를 만들 때 이 목록대로 하위 폴더가 함께 생성된다.
  const SUBFOLDER_TEMPLATES = {
    personal: ['기획서', '코드', '결과보고서'],
    team: ['회의록', '기획서', '발표자료', '결과보고서'],
    contest: ['제출자료', '발표자료', '수상·결과'],
    certificate: ['자격증', '성적·증빙'],
    education: ['수료증', '과제·자료'],
    volunteer: ['활동일지', '확인서'],
    other: ['자료'],
  };
  const DEFAULT_SUBFOLDER_TEMPLATE = ['기획·문서', '발표자료', '결과·제출'];

  function subfolderTemplateFor(typeKey) {
    return SUBFOLDER_TEMPLATES[typeKey] || DEFAULT_SUBFOLDER_TEMPLATE;
  }

  // 하위 폴더 id는 폴더 id + 순번으로 결정적으로 만들어, 재로딩과 API 파일 매핑에서
  // 같은 하위 폴더를 안정적으로 찾을 수 있게 한다.
  function buildSubfolders(folderId, templateLabels) {
    return templateLabels.map((label, index) => ({
      id: `${folderId}::sub${index}`,
      label,
      files: [],
    }));
  }

  function createDefaultFolders() {
    const folders = {};
    FOLDER_GROUPS.forEach((group) => {
      FOLDER_TYPES.forEach((type) => {
        const folderId = `${group.key}-${type.key}`;
        folders[folderId] = {
          id: folderId,
          group: group.key,
          type: type.key,
          label: type.label,
          open: false,
          github: null,
          subfolders: buildSubfolders(folderId, subfolderTemplateFor(type.key)),
        };
      });
    });

    return folders;
  }

  // 사용자가 파일관리 탭에서 추가한 프로젝트 폴더. 선택한 활동 유형(typeKey)에 맞춰
  // 하위 폴더가 함께 생성되며(#137-2), 메인/파일관리가 같은 폴더 데이터를 공유한다.
  function createFolder(groupKey, label, typeKey) {
    const validGroup = FOLDER_GROUPS.some((group) => group.key === groupKey) ? groupKey : 'inProgress';
    const validType = FOLDER_TYPES.some((type) => type.key === typeKey) ? typeKey : 'other';
    const id = `custom-${groupKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return {
      id,
      group: validGroup,
      type: validType,
      label: String(label || '새 폴더').trim() || '새 폴더',
      open: false,
      github: null,
      subfolders: buildSubfolders(id, subfolderTemplateFor(validType)),
    };
  }

  function normalizeFolderLabel(folder, defaultFolder) {
    if (folder.type === 'other' && folder.label === '기타 폴더') return '기타';
    return folder.label || defaultFolder?.label || '';
  }

  // 구버전 데이터(평면 files, nestedFolders)에서 파일 목록만 뽑아낸다.
  function normalizeFolderFiles(folder) {
    if (Array.isArray(folder.files)) return folder.files;
    if (!Array.isArray(folder.nestedFolders)) return [];

    return folder.nestedFolders.flatMap((nested) => (
      Array.isArray(nested.files) ? nested.files : []
    ));
  }

  // 폴더의 하위 폴더 목록을 정규화한다. 저장된 subfolders가 있으면 그대로 쓰고,
  // 없으면(구버전) 유형 템플릿으로 하위 폴더를 만들고 기존 파일을 첫 하위 폴더에 넣는다.
  function normalizeFolderSubfolders(folder, defaultFolder) {
    if (Array.isArray(folder.subfolders) && folder.subfolders.length) {
      return folder.subfolders.map((sub) => ({
        id: sub.id,
        label: sub.label,
        files: Array.isArray(sub.files) ? sub.files : [],
      }));
    }

    const templateSource = defaultFolder?.subfolders?.length
      ? defaultFolder.subfolders.map((sub) => ({ id: sub.id, label: sub.label, files: [] }))
      : buildSubfolders(folder.id, subfolderTemplateFor(folder.type));

    const legacyFiles = normalizeFolderFiles(folder);
    if (legacyFiles.length && templateSource.length) {
      templateSource[0] = { ...templateSource[0], files: legacyFiles };
    }
    return templateSource;
  }

  function normalizeFolderGithub(folder) {
    return folder && typeof folder.github === 'object' ? folder.github : null;
  }

  // 프로젝트 폴더에 속한 모든 파일(하위 폴더 파일 평탄화). 개수 계산·분석에서 사용한다.
  function getFolderFiles(folder) {
    if (!folder) return [];
    if (Array.isArray(folder.subfolders)) {
      return folder.subfolders.flatMap((sub) => (Array.isArray(sub.files) ? sub.files : []));
    }
    return normalizeFolderFiles(folder);
  }

  // 모든 폴더에서 하위 폴더 id로 하위 폴더를 찾는다. API 파일을 원래 하위 폴더에
  // 되돌려 놓을 때 사용한다.
  function findSubfolder(folders, subfolderId) {
    for (const folder of Object.values(folders)) {
      const subfolder = (folder.subfolders || []).find((sub) => sub.id === subfolderId);
      if (subfolder) return { folder, subfolder };
    }
    return null;
  }

  // 폴더/파일 상태의 유일한 저장소 접근 지점. 추후 Firebase로 교체할 때는
  // 이 파일의 loadFolders/saveFolders 구현만 바꾸면 되고, 호출부는 그대로 둘 수 있다.
  function loadFolders() {
    const defaults = createDefaultFolders();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;

    try {
      const parsed = JSON.parse(saved);
      Object.values(parsed).forEach((folder) => {
        if (!folder || !folder.id) return;
        defaults[folder.id] = {
          ...defaults[folder.id],
          ...folder,
          label: normalizeFolderLabel(folder, defaults[folder.id]),
          subfolders: normalizeFolderSubfolders(folder, defaults[folder.id]),
          github: normalizeFolderGithub(folder),
        };
        delete defaults[folder.id].files;
        delete defaults[folder.id].nestedFolders;
      });
    } catch (error) {
      console.warn('Folder state could not be loaded.', error);
    }

    return defaults;
  }

  function saveFolders(folders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }

  window.FolderStore = {
    STORAGE_KEY,
    FOLDER_TYPES,
    FOLDER_GROUPS,
    SUBFOLDER_TEMPLATES,
    subfolderTemplateFor,
    createDefaultFolders,
    createFolder,
    normalizeFolderLabel,
    normalizeFolderFiles,
    normalizeFolderSubfolders,
    getFolderFiles,
    findSubfolder,
    loadFolders,
    saveFolders,
  };
})();
