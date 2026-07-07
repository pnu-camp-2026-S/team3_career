(function () {
  const STORAGE_KEY = 'myfitfolioFolders';

  const FOLDER_TYPES = [
    { key: 'personal', label: '개인 프로젝트' },
    { key: 'team', label: '팀 프로젝트' },
    { key: 'contest', label: '공모전' },
    { key: 'certificate', label: '자격증' },
    { key: 'education', label: '교육' },
    { key: 'volunteer', label: '봉사' },
    { key: 'other', label: '기타' },
  ];

  const FOLDER_GROUPS = [
    { key: 'completed', label: '완료된 활동 폴더' },
    { key: 'inProgress', label: '진행중인 활동 폴더' },
  ];

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
          files: [],
        };
      });
    });

    return folders;
  }

  function normalizeFolderLabel(folder, defaultFolder) {
    if (folder.type === 'other' && folder.label === '기타 폴더') return '기타';
    return folder.label || defaultFolder?.label || '';
  }

  function normalizeFolderFiles(folder) {
    if (Array.isArray(folder.files)) return folder.files;
    if (!Array.isArray(folder.nestedFolders)) return [];

    return folder.nestedFolders.flatMap((nested) => (
      Array.isArray(nested.files) ? nested.files : []
    ));
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
          files: normalizeFolderFiles(folder),
        };
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
    createDefaultFolders,
    normalizeFolderLabel,
    normalizeFolderFiles,
    loadFolders,
    saveFolders,
  };
})();
