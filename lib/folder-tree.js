// 세부 폴더 id('프로젝트id::sub번호')를 activity_files 트리 컬럼(#167)으로 파싱한다.
// 구버전 프로젝트 단위 id('프로젝트id')는 level 0, parent 없음으로 처리한다.
export function deriveFolderTree(folderId, projectIdHint) {
  const segments = String(folderId).split('::').filter(Boolean);
  return {
    projectId: projectIdHint || segments[0] || String(folderId),
    parentFolderId: segments.length > 1 ? segments.slice(0, -1).join('::') : null,
    folderPath: segments.join('/') || String(folderId),
    folderLevel: Math.max(segments.length - 1, 0),
  };
}
