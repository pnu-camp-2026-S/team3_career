(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const ACTIVITY_FILES_ENDPOINT = '/api/activity-files';
    const FILE_ANALYSIS_ENDPOINT = '/api/analysis/file';
    const PROJECT_ANALYSIS_ENDPOINT = '/api/analysis/project';
    const AGGREGATE_ANALYSIS_ENDPOINT = '/api/analysis/aggregate';
    const PROJECT_ANALYSIS_ARTIFACTS = [
      { key: 'summary', name: 'summary.md', type: 'MD', contentKey: 'summaryMd' },
      { key: 'index', name: 'index.json', type: 'JSON', contentKey: 'indexJson' },
      { key: 'log', name: 'log.md', type: 'MD', contentKey: 'logMd' },
    ];

    let selectedFolderId = new URLSearchParams(window.location.search).get('folder') || 'completed-personal';
    let selectedSubfolderId = null;
    let nextFileId = 1;
    let toastTimer = null;
    const collapsedFolderTypes = {};
    const projectAnalyses = {};

    let folders = FolderStore.loadFolders();

    // 선택된 프로젝트가 없으면(가입 직후 빈 목록 등) 첫 폴더로 맞춘다.
    function ensureSelectedFolder() {
      if (!folders[selectedFolderId]) {
        selectedFolderId = Object.keys(folders)[0] || null;
      }
      selectedSubfolderId = firstSubfolderId(folders[selectedFolderId]);
    }

    function firstSubfolderId(folder) {
      return folder && folder.subfolders && folder.subfolders[0] ? folder.subfolders[0].id : null;
    }

    function getSelectedFolder() {
      return folders[selectedFolderId];
    }

    function getSelectedSubfolder() {
      const folder = getSelectedFolder();
      if (!folder) return null;
      return (folder.subfolders || []).find((sub) => sub.id === selectedSubfolderId) || folder.subfolders?.[0] || null;
    }

    function ensureSelectedSubfolder() {
      const folder = getSelectedFolder();
      const exists = folder && (folder.subfolders || []).some((sub) => sub.id === selectedSubfolderId);
      if (!exists) selectedSubfolderId = firstSubfolderId(folder);
    }

    function persistFolders() {
      FolderStore.saveFolders(folders);
    }

    function render() {
      ensureSelectedSubfolder();
      renderFolderGroups();
      renderFilePanel();
    }

    function renderFolderGroups() {
      const container = document.getElementById('fileManagerFolderGroups');
      const folderList = Object.values(folders);
      if (folderList.length === 0) {
        container.innerHTML = `
          <div class="manager-onboarding-empty">
            <strong>먼저 프로젝트 폴더를 만들어 주세요.</strong>
            <span>활동 자료는 프로젝트 폴더와 세부 폴더 안에서 정리할 수 있습니다.</span>
            <button class="primary-button compact-button" type="button" data-action="create-folder">프로젝트 폴더 추가</button>
          </div>
        `;
        return;
      }
      container.innerHTML = FolderStore.FOLDER_GROUPS.map((group) => {
        const groupFolders = folderList.filter((folder) => folder.group === group.key);
        return `
          <section class="manager-folder-section">
            <div class="manager-folder-section-head">
              <h3>${escapeHtml(getProjectStatusLabel(group.key))}</h3>
              <span>${groupFolders.length}개 프로젝트</span>
            </div>
            <div class="manager-folder-type-list">
              ${FolderStore.FOLDER_TYPES.map((type) => {
                const typeFolders = groupFolders.filter((folder) => folder.type === type.key);
                const typeKey = folderTypeStateKey(group.key, type.key);
                const isCollapsed = collapsedFolderTypes[typeKey] ?? typeFolders.length === 0;
                return `
                  <div class="manager-folder-type">
                    <button class="manager-folder-type-head" type="button" data-folder-type-toggle="${escapeHtml(typeKey)}" aria-expanded="${String(!isCollapsed)}">
                      <span class="folder-type-chevron" aria-hidden="true">${isCollapsed ? '›' : '⌄'}</span>
                      <span class="folder-type-title">${escapeHtml(getProjectTypeLabel(type))}</span>
                      <span class="folder-type-count">${typeFolders.length}개</span>
                    </button>
                    ${isCollapsed ? '' : `
                      <div class="manager-folder-list">
                        ${typeFolders.length
                          ? typeFolders.map((folder) => `
                            <div class="manager-folder-item ${folder.id === selectedFolderId ? 'active' : ''}">
                              <button class="manager-folder-select" type="button" data-folder-id="${escapeHtml(folder.id)}">
                                <span class="mini-folder" aria-hidden="true"></span>
                                <span class="manager-folder-copy">
                                  <strong>${escapeHtml(folder.label)}</strong>
                                  <small>${FolderStore.getFolderFiles(folder).length}개 자료</small>
                                </span>
                              </button>
                              <button class="folder-delete-button" type="button" data-action="delete-folder" data-folder-delete-id="${escapeHtml(folder.id)}" aria-label="${escapeHtml(folder.label)} 폴더 삭제">
                                <span aria-hidden="true">🗑</span>
                              </button>
                            </div>
                          `).join('')
                          : '<div class="manager-folder-empty">등록된 프로젝트 없음</div>'}
                      </div>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        `;
      }).join('');
    }

    function renderFilePanel() {
      const selectedFolder = getSelectedFolder();
      setFolderDependentActionsVisible(Boolean(selectedFolder));
      if (!selectedFolder) {
        document.getElementById('editablePanelTitle').textContent = '자료를 정리할 프로젝트가 필요해요';
        document.getElementById('editablePanelDesc').textContent = '프로젝트 폴더를 만든 뒤 세부 폴더에 자료를 추가할 수 있습니다.';
        document.getElementById('subfolderList').innerHTML = '';
        document.getElementById('managedFileList').innerHTML = `
          <div class="manager-onboarding-empty manager-onboarding-empty-wide">
            <strong>프로젝트 폴더를 먼저 만들어 주세요.</strong>
            <span>폴더를 만들면 자료 추가, 이름 수정, 프로젝트 이동 기능을 사용할 수 있습니다.</span>
            <button class="primary-button compact-button" type="button" data-action="create-folder">프로젝트 폴더 추가</button>
          </div>
        `;
        return;
      }
      const selectedSubfolder = getSelectedSubfolder();
      const selectedFiles = selectedSubfolder ? selectedSubfolder.files : [];
      document.getElementById('editablePanelTitle').textContent = `${selectedFolder.label} 자료`;
      document.getElementById('editablePanelDesc').textContent = `${getGroupLabel(selectedFolder.group)}의 ${selectedFolder.label} 프로젝트입니다. 세부 폴더를 골라 자료를 관리하세요.`;
      updateMoveButton(selectedFolder);
      renderSubfolders(selectedFolder);

      const isAnalysisFolder = isAnalysisSubfolder(selectedSubfolder);
      document.querySelector('.manager-dropzone').hidden = isAnalysisFolder;
      const subfolderLabel = selectedSubfolder ? selectedSubfolder.label : '세부 폴더';
      const analysisFolderNote = isAnalysisFolder
        ? '<div class="manager-analysis-note">AI 요약 폴더는 프로젝트 분석 결과물 전용 공간이에요. 원본 자료는 다른 세부 폴더에 추가해 주세요.</div>'
        : '';
      const fileListHtml = selectedFiles.length
        ? selectedFiles.map((file, index) => {
          const isProjectArtifact = isProjectAnalysisArtifact(file);
          const hasFileSummary = Boolean(file.analysis?.summaryMd);
          const fileDescription = isProjectArtifact
            ? `${getSelectedFolder().label} · 프로젝트 AI 산출물`
            : `${subfolderLabel} · 우선순위 ${index + 1}`;
          return `
            <article class="manager-file-card">
              <div class="file-type-chip">${file.type || getFileType(file.name)}</div>
              <div>
                <strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong>
                <span>${escapeHtml(fileDescription)}</span>
              </div>
              <div class="manager-file-actions">
                <span class="status-pill ${getStatusClass(file.status)}">${file.status || '분석대기'}</span>
                ${isProjectArtifact
                  ? `
                    <button class="ghost-button compact-button" type="button" data-action="preview-file" data-file-id="${file.id}">열람</button>
                    <button class="ghost-button compact-button" type="button" data-action="edit-project-artifact" data-project-id="${escapeHtml(file.projectId)}" data-artifact="${escapeHtml(file.artifact)}">수정</button>
                    <span class="analysis-file-note">AI 산출물</span>
                  `
                  : `
                    <button class="ghost-button compact-button" type="button" data-action="preview-file" data-file-id="${file.id}">미리보기</button>
                    ${hasFileSummary ? `<button class="ghost-button compact-button" type="button" data-action="view-file-summary" data-file-id="${file.id}">AI 요약 보기</button>` : ''}
                    <button class="ghost-button compact-button danger-button" type="button" data-action="delete-file" data-file-id="${file.id}">삭제</button>
                  `}
              </div>
            </article>
          `;
        }).join('')
        : isAnalysisFolder
          ? '<div class="manager-empty"><strong>아직 분석 결과물이 없습니다.</strong><span>상단의 분석하기를 실행하면 summary.md, index.json, log.md가 이곳에 표시됩니다.</span></div>'
          : '<div class="manager-empty"><strong>이 세부 폴더에는 아직 자료가 없습니다.</strong><span>자료 추가 버튼을 눌러 선택한 세부 폴더에 자료를 넣어보세요.</span></div>';
      document.getElementById('managedFileList').innerHTML = `${analysisFolderNote}${fileListHtml}`;
    }

    function setFolderDependentActionsVisible(isVisible) {
      document.querySelector('[data-action="rename-project"]').hidden = !isVisible;
      document.querySelector('.project-actions').hidden = !isVisible;
      document.querySelector('.subfolder-toolbar').hidden = !isVisible;
      document.querySelector('.manager-dropzone').hidden = !isVisible;
    }

    function isAnalysisSubfolder(subfolder = getSelectedSubfolder()) {
      return Boolean(subfolder && (
        String(subfolder.id || '').endsWith('::ai-summary')
        || subfolder.label === FolderStore.ANALYSIS_SUBFOLDER_LABEL
      ));
    }

    function renderSubfolders(folder) {
      const container = document.getElementById('subfolderList');
      container.innerHTML = (folder.subfolders || []).map((sub) => `
        <button class="subfolder-card ${sub.id === selectedSubfolderId ? 'active' : ''}" type="button" data-subfolder-id="${escapeHtml(sub.id)}">
          <strong>${escapeHtml(sub.label)}</strong>
          <span>${sub.files.length}개 자료</span>
        </button>
      `).join('');
    }

    function updateMoveButton(folder) {
      const button = document.getElementById('moveGroupButton');
      button.textContent = folder.group === 'completed' ? '진행중으로 이동' : '완료로 이동';
    }

    function getFileType(fileName) {
      return (String(fileName).split('.').pop() || 'FILE').toUpperCase();
    }

    function getFileBaseName(fileName) {
      return String(fileName || '자료').replace(/\.[^.]+$/, '');
    }

    function mapAnalysisStatus(status) {
      if (status === 'completed') return '분석완료';
      if (status === 'analyzing' || status === 'pending') return '요약 생성 중';
      if (status === 'failed') return '요약 실패';
      return '분석대기';
    }

    function mapApiFile(file) {
      return {
        id: file.id,
        name: file.name,
        type: getFileType(file.name),
        status: mapAnalysisStatus(file.analysisStatus),
        analysisStatus: file.analysisStatus || null,
        mimeType: file.mimeType || '',
        size: file.size || 0,
        storagePath: file.storagePath || '',
        signedUrl: file.signedUrl || '',
        previewUrl: file.previewUrl || file.publicUrl || file.downloadUrl || file.url || '',
        dataUrl: file.dataUrl || '',
        previewText: file.previewText || file.text || file.content || '',
        createdAt: file.createdAt || new Date().toISOString(),
        analysis: file.analysis || null,
      };
    }

    function isProjectAnalysisArtifact(file) {
      return file?.kind === 'project-analysis-artifact';
    }

    function isGeneratedAnalysisFile(file) {
      return file?.kind === 'analysis-summary' || isProjectAnalysisArtifact(file);
    }

    function projectArtifactContent(analysis, artifact) {
      const definition = PROJECT_ANALYSIS_ARTIFACTS.find((item) => item.key === artifact);
      const value = definition ? analysis?.[definition.contentKey] : '';
      if (artifact === 'index') return value ? JSON.stringify(value, null, 2) : '';
      return String(value || '');
    }

    function buildProjectArtifactFiles(folder, analysis) {
      if (!analysis) return [];
      return PROJECT_ANALYSIS_ARTIFACTS.map((definition) => ({
        id: `project-artifact-${folder.id}-${definition.key}`,
        name: definition.name,
        type: definition.type,
        status: '작성완료',
        kind: 'project-analysis-artifact',
        projectId: folder.id,
        artifact: definition.key,
        content: projectArtifactContent(analysis, definition.key),
        createdAt: analysis.generatedAt || new Date().toISOString(),
      }));
    }

    function populateAnalysisSubfolder(folder) {
      const target = FolderStore.getAnalysisSubfolder(folder);
      if (!target) return;
      target.files = (target.files || []).filter((file) => !isGeneratedAnalysisFile(file));
      const analysis = projectAnalyses[folder.id] || folder.projectAnalysis || null;
      buildProjectArtifactFiles(folder, analysis).forEach((file) => target.files.push(file));
    }

    function populateAllAnalysisSubfolders() {
      Object.values(folders).forEach((folder) => populateAnalysisSubfolder(folder));
    }

    async function loadActivityFilesFromApi() {
      try {
        const response = await fetch(ACTIVITY_FILES_ENDPOINT, {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) return;

        const payload = await response.json();
        if (!Array.isArray(payload.files)) return;

        Object.values(folders).forEach((folder) => {
          (folder.subfolders || []).forEach((sub) => {
            sub.files = [];
          });
        });

        payload.files.forEach((file) => {
          // 파일은 하위 폴더 id를 folderId로 저장한다. 못 찾으면 프로젝트(projectId) 또는
          // 상위 프로젝트 폴더의 첫 하위 폴더로 되돌려 놓는다(구버전/프로젝트 단위 저장 폴백).
          const match = FolderStore.findSubfolder(folders, file.folderId);
          const projectFolder = match?.folder || folders[file.projectId] || folders[file.folderId];
          const target = match?.subfolder
            || folders[file.projectId]?.subfolders?.[0]
            || folders[file.folderId]?.subfolders?.[0];
          if (!target) return;
          const mappedFile = mapApiFile(file);
          target.files.push(mappedFile);
          if (projectFolder) populateAnalysisSubfolder(projectFolder);
        });

        populateAllAnalysisSubfolders();
        persistFolders();
      } catch (error) {
        console.warn('Activity files could not be loaded.', error);
      }
    }

    async function loadProjectAnalysis(folder) {
      if (!folder?.id) return null;
      try {
        const response = await fetch(`${PROJECT_ANALYSIS_ENDPOINT}?projectId=${encodeURIComponent(folder.id)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({}));
        if (payload.project) {
          projectAnalyses[folder.id] = payload.project;
          folder.projectAnalysis = payload.project;
          populateAnalysisSubfolder(folder);
          return payload.project;
        }
      } catch (error) {
        console.warn('Project analysis could not be loaded.', error);
      }
      return null;
    }

    async function loadProjectAnalysesForFolders(targetFolders = Object.values(folders)) {
      for (const folder of targetFolders) {
        await loadProjectAnalysis(folder);
      }
      populateAllAnalysisSubfolders();
      persistFolders();
    }

    async function requestFileSummaries(activityFileIds) {
      if (!activityFileIds.length) return;
      try {
        await fetch(FILE_ANALYSIS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ activityFileIds }),
        });
        await loadActivityFilesFromApi();
        render();
      } catch (error) {
        console.warn('File summary request failed.', error);
      }
    }

    async function addFilesToSelectedFolder(fileList) {
      const folder = getSelectedFolder();
      const subfolder = getSelectedSubfolder();
      const files = Array.from(fileList);
      if (!folder || !subfolder || files.length === 0) return;
      if (isAnalysisSubfolder(subfolder)) {
        showToast('AI 요약 폴더에는 원본 자료를 추가할 수 없습니다.');
        return;
      }

      const formData = new FormData();
      formData.append('folderId', subfolder.id);
      formData.append('projectId', folder.id);
      formData.append('folderGroup', folder.group || '');
      formData.append('folderType', folder.type || '');
      formData.append('folderLabel', `${folder.label} / ${subfolder.label}`);
      files.forEach((file) => formData.append('files', file));

      try {
        const response = await fetch(ACTIVITY_FILES_ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = payload.message || `HTTP ${response.status}`;
          const uploadError = new Error(detail);
          uploadError.status = response.status;
          throw uploadError;
        }

        const savedFiles = payload.files || [];
        savedFiles.forEach((file) => {
          const mapped = mapApiFile(file);
          mapped.status = '요약 생성 중';
          subfolder.files.push(mapped);
        });
        if (savedFiles.length) {
          window.setTimeout(() => {
            requestFileSummaries(savedFiles.map((file) => file.id).filter(Boolean));
          }, 0);
        }
      } catch (error) {
        console.warn('Activity file upload failed.', error);
        const guideMessage = error.status === 401
          ? '로그인 세션이 만료되었거나 서버에서 사용자를 확인하지 못했습니다. 다시 로그인한 뒤 업로드해주세요.'
          : `서버 업로드에 실패했습니다. 원인: ${error.message || '알 수 없는 오류'}`;
        console.warn(guideMessage);
        showToast(error.status === 401
          ? '로그인이 필요합니다. 다시 로그인해주세요.'
          : '서버 업로드에 실패했습니다. 상세 원인을 확인해주세요.');
        return;
      }

      persistFolders();
      render();
      showToast(`'${subfolder.label}' 세부 폴더에 자료가 추가되었습니다.`);
    }

    function getSelectedFile(fileId) {
      const subfolder = getSelectedSubfolder();
      return subfolder ? subfolder.files.find((file) => file.id === fileId) : null;
    }

    function findFileById(fileId) {
      for (const folder of Object.values(folders)) {
        for (const subfolder of folder.subfolders || []) {
          const file = (subfolder.files || []).find((item) => item.id === fileId);
          if (file) return { folder, subfolder, file };
        }
      }
      return null;
    }

    function getPreviewKind(file) {
      const extension = getFileType(file.name).toLowerCase();
      const mimeType = String(file.mimeType || '').toLowerCase();
      if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
      if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
      if (['txt', 'md', 'csv'].includes(extension) || ['text/plain', 'text/markdown', 'text/csv'].includes(mimeType)) return 'text';
      return 'unsupported';
    }

    function getFilePreviewUrl(file, preview = {}) {
      return preview.signedUrl
        || preview.previewUrl
        || preview.url
        || file.signedUrl
        || file.previewUrl
        || file.dataUrl
        || '';
    }

    function getFilePreviewText(file, preview = {}) {
      return preview.text || preview.previewText || file.previewText || file.content || '';
    }

    function buildPreviewUnavailableHtml(file, preview = {}) {
      const url = getFilePreviewUrl(file, preview);
      const message = preview.message || '이 파일은 아직 바로 미리보기를 제공할 수 없습니다. 원본 파일이 저장되어 있다면 새 탭에서 확인해 주세요.';
      return `
        <div class="file-preview-empty">
          <strong>미리보기를 준비할 수 없습니다.</strong>
          <p>${escapeHtml(message)}</p>
          ${url ? `<a class="primary-button compact-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">새 탭에서 원본 열기</a>` : '<span>사용 가능한 미리보기 URL이 없습니다.</span>'}
        </div>
      `;
    }

    function renderFilePreviewContent(file, preview = {}) {
      const kind = preview.kind || getPreviewKind(file);
      const url = getFilePreviewUrl(file, preview);
      const text = getFilePreviewText(file, preview);

      if (preview.isLoading) {
        return '<div class="file-preview-empty"><strong>미리보기를 불러오고 있습니다.</strong><p>원본 파일 접근 권한과 파일 형식을 확인하는 중입니다.</p></div>';
      }

      if (kind === 'image' && url) {
        return `<div class="file-preview-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)} 미리보기" /></div>`;
      }

      if (kind === 'pdf' && url) {
        return `
          <div class="file-preview-pdf">
            <iframe src="${escapeHtml(url)}" title="${escapeHtml(file.name)} PDF 미리보기"></iframe>
            <a class="primary-button compact-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">새 탭에서 PDF 열기</a>
          </div>
        `;
      }

      if (kind === 'text' && text) {
        return `<pre class="file-preview-text">${escapeHtml(text)}</pre>`;
      }

      return buildPreviewUnavailableHtml(file, preview);
    }

    function buildFilePreviewHtml(file, subfolder, preview = {}) {
      return `
        <div class="manager-preview file-preview-shell">
          <div class="file-preview-head">
            <strong>${escapeHtml(file.name)}</strong>
            <span>${escapeHtml(file.type || getFileType(file.name))} · ${escapeHtml(file.status || '분석대기')}</span>
          </div>
          ${renderFilePreviewContent(file, preview)}
          <p class="file-preview-meta">연결 폴더: ${escapeHtml(getSelectedFolder().label)} / ${escapeHtml(subfolder ? subfolder.label : '')}</p>
        </div>
      `;
    }

    async function loadFilePreview(file) {
      const response = await fetch(`${ACTIVITY_FILES_ENDPOINT}?previewId=${encodeURIComponent(file.id)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || '파일 미리보기를 불러오지 못했습니다.');
      return payload.preview || {};
    }

    async function previewFile(fileId) {
      const file = getSelectedFile(fileId);
      if (!file) return;
      const subfolder = getSelectedSubfolder();
      if (isProjectAnalysisArtifact(file)) {
        openProjectArtifactModal(file.projectId, file.artifact);
        return;
      }
      showModal('파일 미리보기', buildFilePreviewHtml(file, subfolder, { isLoading: Boolean(file.storagePath) }));
      if (!file.storagePath) {
        showModal('파일 미리보기', buildFilePreviewHtml(file, subfolder));
        return;
      }
      try {
        const preview = await loadFilePreview(file);
        showModal('파일 미리보기', buildFilePreviewHtml(file, subfolder, preview));
      } catch (error) {
        console.warn('File preview failed.', error);
        showModal('파일 미리보기', buildFilePreviewHtml(file, subfolder, {
          kind: 'unavailable',
          message: error.message || '파일 미리보기를 불러오지 못했습니다.',
        }));
      }
    }

    function openFileSummary(fileId) {
      const match = findFileById(fileId);
      if (!match?.file) return;
      const summary = match.file.analysis?.summaryMd || '';
      showModal('AI 요약 보기', `
        <p class="panel-note">파일별 summary.md입니다. 수정한 내용은 이후 재분석해도 보존됩니다.</p>
        <textarea class="textarea-box" id="fileSummaryInput">${escapeHtml(summary)}</textarea>
        <div class="form-actions">
          <button class="primary-button" type="button" data-action="save-file-summary" data-file-id="${escapeHtml(fileId)}">요약 저장</button>
        </div>
      `);
    }

    async function saveFileSummary(fileId) {
      const summaryMd = document.getElementById('fileSummaryInput')?.value || '';
      try {
        const response = await fetch(FILE_ANALYSIS_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ activityFileId: fileId, summaryMd }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || '요약 저장에 실패했습니다.');
        await loadActivityFilesFromApi();
        hideModal();
        render();
        showToast('파일 요약을 저장했습니다.');
      } catch (error) {
        console.warn('File summary save failed.', error);
        showToast(error.message || '파일 요약을 저장하지 못했습니다.');
      }
    }

    function openProjectArtifactModal(projectId, artifact) {
      const folder = folders[projectId];
      const analysis = projectAnalyses[projectId] || folder?.projectAnalysis;
      const definition = PROJECT_ANALYSIS_ARTIFACTS.find((item) => item.key === artifact);
      if (!folder || !definition) return;
      const content = projectArtifactContent(analysis, artifact);
      showModal(`${definition.name} 열람·수정`, `
        <p class="panel-note">${escapeHtml(folder.label)} 프로젝트의 AI 종합 산출물입니다. 수정본은 재분석해도 보존됩니다.</p>
        <textarea class="textarea-box" id="projectArtifactInput">${escapeHtml(content)}</textarea>
        <div class="form-actions">
          <button class="primary-button" type="button" data-action="save-project-artifact" data-project-id="${escapeHtml(projectId)}" data-artifact="${escapeHtml(artifact)}">${definition.name} 저장</button>
        </div>
      `);
    }

    async function saveProjectArtifact(projectId, artifact) {
      const content = document.getElementById('projectArtifactInput')?.value || '';
      try {
        const response = await fetch(PROJECT_ANALYSIS_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ projectId, artifact, content }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || '산출물 저장에 실패했습니다.');
        if (payload.project && folders[projectId]) {
          projectAnalyses[projectId] = payload.project;
          folders[projectId].projectAnalysis = payload.project;
          populateAnalysisSubfolder(folders[projectId]);
        }
        persistFolders();
        hideModal();
        render();
        showToast('프로젝트 산출물을 저장했습니다.');
      } catch (error) {
        console.warn('Project artifact save failed.', error);
        showToast(error.message || '프로젝트 산출물을 저장하지 못했습니다.');
      }
    }

    async function deleteFile(fileId) {
      const subfolder = getSelectedSubfolder();
      if (!subfolder) return;
      const file = subfolder.files.find((item) => item.id === fileId);
      if (!file) return;
      if (isGeneratedAnalysisFile(file)) {
        showToast('AI 산출물은 분석 결과입니다. 원본 자료 삭제나 재분석 흐름에서 관리됩니다.');
        return;
      }

      if (file.storagePath) {
        try {
          const response = await fetch(ACTIVITY_FILES_ENDPOINT, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ id: file.id, storagePath: file.storagePath }),
          });

          if (!response.ok) throw new Error('Activity file delete failed.');
        } catch (error) {
          console.warn('Activity file delete failed.', error);
          showToast('서버에서 파일을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }
        await loadActivityFilesFromApi();
        render();
        showToast('자료와 연결된 AI 요약 파일이 함께 삭제되었습니다.');
        return;
      }

      subfolder.files = subfolder.files.filter((item) => item.id !== fileId && item.sourceFileId !== fileId);
      persistFolders();
      render();
      showToast('자료가 목록에서 삭제되었습니다.');
    }

    let analysisInFlight = false;

    function getProgressPercent(completed, total) {
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    function setAnalysisLoading(isLoading, state = {}) {
      const overlay = document.getElementById('analysisLoading');
      const button = document.getElementById('analyzeButton');
      const total = Number(state.total || 0);
      const completed = Number(state.completed || 0);
      const failed = Number(state.failed || 0);
      const percent = getProgressPercent(completed, total);
      overlay.classList.toggle('hidden', !isLoading);
      overlay.setAttribute('aria-hidden', String(!isLoading));
      button.disabled = isLoading;
      button.setAttribute('aria-busy', String(isLoading));
      button.innerHTML = isLoading
        ? '<span class="button-spinner" aria-hidden="true"></span> 분석 중'
        : '<span aria-hidden="true">✦</span> 분석하기';
      const title = document.getElementById('analysisLoadingTitle');
      const message = document.getElementById('analysisLoadingMessage');
      const percentNode = document.getElementById('analysisLoadingPercent');
      const progressNode = document.getElementById('analysisLoadingProgress');
      const countNode = document.getElementById('analysisLoadingCount');
      const failedNode = document.getElementById('analysisLoadingFailed');

      if (isLoading) {
        title.textContent = '전체 프로젝트 분석 중';
        message.textContent = state.currentProjectName
          ? `${state.currentProjectName} 프로젝트를 분석하고 있습니다.`
          : '프로젝트 목록을 준비하고 있습니다.';
        percentNode.textContent = `${percent}%`;
        progressNode.style.width = `${percent}%`;
        countNode.textContent = `${completed} / ${total}개 프로젝트 완료`;
        failedNode.hidden = failed === 0;
        failedNode.textContent = `실패 ${failed}건`;
      } else {
        title.textContent = '교육 자료 로딩중';
        message.textContent = '잠시 기다려 주세요.';
        percentNode.textContent = '0%';
        progressNode.style.width = '0%';
        countNode.textContent = '0 / 0개 프로젝트 완료';
        failedNode.hidden = true;
      }
    }

    function getAnalysisTargetFolders() {
      return Object.values(folders).filter((folder) => (
        folder && (folder.group === 'completed' || folder.group === 'inProgress')
      ));
    }

    function markProjectFileResults(folder, payload) {
      const succeededIds = new Set((payload.files || []).filter((file) => file.ok).map((file) => file.activityFileId));
      (folder.subfolders || []).forEach((sub) => {
        sub.files.forEach((file) => {
          if (succeededIds.has(file.id)) file.status = '분석완료';
        });
      });
      if (payload.project) {
        projectAnalyses[folder.id] = payload.project;
        folder.projectAnalysis = payload.project;
        populateAnalysisSubfolder(folder);
      }
    }

    async function analyzeSingleProject(folder) {
      const response = await fetch(PROJECT_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ projectId: folder.id, projectType: folder.type, projectName: folder.label }),
      });

      if (response.status === 401) {
        const authError = new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
        authError.status = 401;
        throw authError;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || '프로젝트 분석 요청이 실패했습니다.');
      return payload;
    }

    async function runAggregateAnalysisForProjects(projectIds) {
      const response = await fetch(AGGREGATE_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ projectIds }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || '전체 종합 요청이 실패했습니다.');
      if (payload.ok === false) throw new Error(payload.reason || '전체 종합을 생성하지 못했습니다.');
      return payload.result;
    }

    // 전체 프로젝트 AI 분석(#166-4). 화면이 프로젝트별 API를 순차 호출해 진행률을 갱신한다.
    async function organizeAllProjects() {
      if (analysisInFlight) return;
      const targetFolders = getAnalysisTargetFolders();
      if (targetFolders.length === 0) {
        showToast('분석할 프로젝트가 없습니다. 먼저 프로젝트를 추가해주세요.');
        return;
      }

      analysisInFlight = true;
      const progressState = {
        total: targetFolders.length,
        completed: 0,
        failed: 0,
        currentProjectName: '',
      };
      const failures = [];
      const successProjectIds = [];
      setAnalysisLoading(true, progressState);
      showToast('전체 프로젝트 분석을 시작했습니다.');

      try {
        await loadActivityFilesFromApi();
        await loadProjectAnalysesForFolders(targetFolders);
        render();

        for (const folder of targetFolders) {
          progressState.currentProjectName = folder.label;
          setAnalysisLoading(true, progressState);

          try {
            const payload = await analyzeSingleProject(folder);
            markProjectFileResults(folder, payload);

            if (payload.project) {
              successProjectIds.push(folder.id);
            } else if (payload.ok === false && payload.reason === 'no_data') {
              // 파일 없는 프로젝트는 진행률에는 포함하되 실패로 보지 않는다.
            } else if (payload.projectReason && payload.projectReason !== 'no_data') {
              failures.push(`${folder.label}: ${payload.projectReason}`);
              progressState.failed += 1;
            }
          } catch (error) {
            failures.push(`${folder.label}: ${error.message || '분석 실패'}`);
            progressState.failed += 1;
            if (error.status === 401) showToast(error.message);
          } finally {
            progressState.completed += 1;
            setAnalysisLoading(true, progressState);
            persistFolders();
            render();
          }
        }

        let aggregateResult = null;
        if (successProjectIds.length > 0) {
          progressState.currentProjectName = '전체 종합';
          setAnalysisLoading(true, progressState);
          try {
            aggregateResult = await runAggregateAnalysisForProjects(successProjectIds);
          } catch (error) {
            failures.push(`전체 종합: ${error.message || '종합 실패'}`);
            progressState.failed += 1;
            setAnalysisLoading(true, progressState);
          }
        }

        await loadActivityFilesFromApi();
        await loadProjectAnalysesForFolders(targetFolders);
        render();

        const failureHtml = failures.length
          ? `<p>실패 ${failures.length}건이 있습니다.</p><ul>${failures.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : '';
        showModal('전체 프로젝트 분석 결과', `
          <div class="manager-preview">
            <strong>${targetFolders.length}개 프로젝트 처리 완료</strong>
            <p>${successProjectIds.length}개 프로젝트의 AI 요약 산출물을 갱신했습니다. 파일이 없는 프로젝트는 건너뛰었습니다.</p>
            ${aggregateResult ? `<p><strong>${escapeHtml(aggregateResult.headline || '')}</strong></p><p>${escapeHtml(aggregateResult.description || '')}</p>` : '<p>성공한 프로젝트가 없어 전체 종합은 실행하지 않았습니다.</p>'}
            ${failureHtml}
          </div>
        `);
        showToast(failures.length ? '일부 프로젝트 분석이 실패했습니다.' : '전체 프로젝트 분석이 완료되었습니다.');
      } catch (error) {
        console.warn('All project analysis failed.', error);
        showToast(error.message || '전체 프로젝트 분석에 실패했습니다.');
      } finally {
        analysisInFlight = false;
        setAnalysisLoading(false);
      }
    }

    // 완료 ↔ 진행중 양방향 이동(#166-1).
    async function toggleProjectGroup() {
      const folder = getSelectedFolder();
      if (!folder) return;
      const previousGroup = folder.group;
      const nextGroup = folder.group === 'completed' ? 'inProgress' : 'completed';
      folder.group = nextGroup;
      try {
        await FolderStore.updateFolderRemote(folder);
      } catch (error) {
        console.warn('Folder group change could not be saved.', error);
        folder.group = previousGroup;
        showToast('폴더 이동을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      persistFolders();
      render();
      const groupLabel = nextGroup === 'completed' ? '완료된 활동' : '진행중인 활동';
      showToast(`'${folder.label}' 프로젝트를 ${groupLabel}으로 이동했습니다.`);
    }

    // 프로젝트 이름 수정(사용자 요청).
    function openRenameModal() {
      const folder = getSelectedFolder();
      showModal('프로젝트 이름 수정', `
        <p class="panel-note">프로젝트 이름을 바꾸면 메인 사이드바에도 즉시 반영됩니다.</p>
        <div class="repo-form">
          <label class="repo-field"><span>프로젝트 이름</span><input id="renameInput" type="text" value="${escapeHtml(folder.label)}" /></label>
          <div class="form-actions">
            <button class="primary-button" type="button" data-action="save-project-name">이름 저장</button>
          </div>
        </div>
      `);
    }

    async function saveProjectName() {
      const folder = getSelectedFolder();
      const name = document.getElementById('renameInput').value.trim();
      if (!name) {
        showToast('프로젝트 이름을 입력하세요.');
        return;
      }
      const previousLabel = folder.label;
      folder.label = name;
      try {
        await FolderStore.updateFolderRemote(folder);
      } catch (error) {
        console.warn('Folder rename could not be saved.', error);
        folder.label = previousLabel;
        showToast('이름 변경을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      persistFolders();
      hideModal();
      render();
      showToast('프로젝트 이름을 변경했습니다.');
    }

    // 폴더 삭제(사용자 요청). 폴더와 그 안의 자료가 함께 사라진다.
    async function deleteProject(folderId = selectedFolderId) {
      const folder = folders[folderId];
      if (!folder) return;
      if (!window.confirm(`'${folder.label}' 폴더를 삭제할까요? 안의 세부 폴더와 자료도 함께 사라집니다.`)) return;

      const removedLabel = folder.label;
      try {
        await FolderStore.deleteFolderRemote(folder.id);
      } catch (error) {
        console.warn('Folder could not be deleted on the server.', error);
        showToast('폴더를 서버에서 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      FolderStore.deleteFolder(folders, folder.id);
      if (selectedFolderId === folder.id) {
        selectedFolderId = Object.keys(folders)[0] || null;
        selectedSubfolderId = firstSubfolderId(folders[selectedFolderId]);
      }
      persistFolders();
      render();
      showToast(`'${removedLabel}' 폴더를 삭제했습니다.`);
    }

    // 프로젝트별 '대화로 내용 추가하기'(#137-5). 현재 선택한 세부 폴더에 md 자료를 추가한다.
    function openConversationModal() {
      const folder = getSelectedFolder();
      showModal(`${folder.label} 대화로 내용 추가하기`, `
        <p class="panel-note">이 프로젝트의 활동 내용을 입력하면 선택한 세부 폴더에 Markdown 자료로 추가됩니다.</p>
        <textarea class="textarea-box" id="conversationInput">팀 프로젝트에서 요구사항 분석과 발표 자료 제작을 담당했습니다.</textarea>
        <div class="form-actions">
          <button class="primary-button" type="button" data-action="add-conversation-save">내용 추가</button>
        </div>
      `);
    }

    function saveConversationContent() {
      const subfolder = getSelectedSubfolder();
      if (!subfolder) return;
      subfolder.files.push({ id: `file-${nextFileId++}`, name: 'ai_activity_summary.md', type: 'MD', status: '작성완료' });
      hideModal();
      persistFolders();
      render();
      showToast('대화 내용을 md 자료로 추가했습니다.');
    }

    function createFolder() {
      const typeOptions = FolderStore.FOLDER_TYPES
        .map((type) => `<option value="${type.key}">${escapeHtml(type.label)}</option>`)
        .join('');
      showModal('폴더 추가', `
        <p class="panel-note">활동 유형을 고르면 유형에 맞는 세부 폴더가 함께 생성됩니다. 메인 사이드바에도 즉시 반영됩니다.</p>
        <div class="repo-form">
          <label class="repo-field"><span>프로젝트 이름</span><input id="newFolderName" type="text" placeholder="예: 캡스톤 프로젝트" /></label>
          <label class="repo-field"><span>활동 유형</span>
            <select id="newFolderType">${typeOptions}</select>
          </label>
          <label class="repo-field"><span>그룹</span>
            <select id="newFolderGroup">
              <option value="completed">완료된 프로젝트</option>
              <option value="inProgress">진행 중인 프로젝트</option>
            </select>
          </label>
          <p class="panel-note" id="subfolderPreview"></p>
          <div class="form-actions">
            <button class="primary-button" type="button" data-action="create-folder-confirm">폴더 만들기</button>
          </div>
        </div>
      `);
      updateSubfolderPreview();
      document.getElementById('newFolderType').addEventListener('change', updateSubfolderPreview);
    }

    function updateSubfolderPreview() {
      const type = document.getElementById('newFolderType').value;
      const labels = FolderStore.subfolderTemplateFor(type);
      document.getElementById('subfolderPreview').textContent = `생성될 세부 폴더: ${labels.join(', ')}`;
    }

    async function confirmCreateFolder() {
      const name = document.getElementById('newFolderName').value.trim();
      const type = document.getElementById('newFolderType').value;
      const group = document.getElementById('newFolderGroup').value;
      if (!name) {
        showToast('폴더 이름을 입력하세요.');
        return;
      }
      const folder = FolderStore.createFolder(group, name, type);
      try {
        await FolderStore.createFolderRemote(folder);
      } catch (error) {
        console.warn('Folder could not be created on the server.', error);
        showToast('폴더를 서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      folders[folder.id] = folder;
      selectedFolderId = folder.id;
      selectedSubfolderId = firstSubfolderId(folder);
      persistFolders();
      hideModal();
      render();
      showToast(`'${name}' 프로젝트를 세부 폴더와 함께 추가했습니다.`);
    }

    function showModal(title, body) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = body;
      document.getElementById('modalBackdrop').classList.remove('hidden');
    }

    function hideModal() {
      document.getElementById('modalBackdrop').classList.add('hidden');
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }

    function getGroupLabel(groupKey) {
      return FolderStore.FOLDER_GROUPS.find((group) => group.key === groupKey)?.label || '활동 폴더';
    }

    function getProjectStatusLabel(groupKey) {
      if (groupKey === 'completed') return '완료된 프로젝트';
      if (groupKey === 'inProgress') return '진행 중인 프로젝트';
      return getGroupLabel(groupKey);
    }

    function getProjectTypeLabel(type) {
      if (type.key === 'personal') return '개인프로젝트';
      if (type.key === 'team') return '팀프로젝트';
      return type.label;
    }

    function folderTypeStateKey(groupKey, typeKey) {
      return `${groupKey}:${typeKey}`;
    }

    function getStatusClass(status) {
      if (status === '분석완료' || status === '작성완료') return 'done';
      if (status === '분석대기') return 'ready';
      return '';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);
    }

    document.addEventListener('click', (event) => {
      const typeToggleButton = event.target.closest('[data-folder-type-toggle]');
      if (typeToggleButton) {
        const typeKey = typeToggleButton.dataset.folderTypeToggle;
        collapsedFolderTypes[typeKey] = !collapsedFolderTypes[typeKey];
        renderFolderGroups();
        return;
      }

      const folderButton = event.target.closest('[data-folder-id]');
      if (folderButton) {
        selectedFolderId = folderButton.dataset.folderId;
        selectedSubfolderId = firstSubfolderId(folders[selectedFolderId]);
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('folder', selectedFolderId);
        window.history.replaceState({}, '', nextUrl);
        render();
        showToast(`${folders[selectedFolderId].label} 프로젝트를 선택했습니다.`);
        return;
      }

      const subfolderButton = event.target.closest('[data-subfolder-id]');
      if (subfolderButton) {
        selectedSubfolderId = subfolderButton.dataset.subfolderId;
        render();
        return;
      }

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      const fileId = actionButton.dataset.fileId;

      if (action === 'add-file' && !isAnalysisSubfolder()) document.getElementById('managedFileInput').click();
      if (action === 'preview-file') previewFile(fileId);
      if (action === 'view-file-summary') openFileSummary(fileId);
      if (action === 'save-file-summary') saveFileSummary(fileId);
      if (action === 'edit-project-artifact') openProjectArtifactModal(actionButton.dataset.projectId, actionButton.dataset.artifact);
      if (action === 'save-project-artifact') saveProjectArtifact(actionButton.dataset.projectId, actionButton.dataset.artifact);
      if (action === 'delete-file') deleteFile(fileId);
      if (action === 'analyze') organizeAllProjects();
      if (action === 'toggle-group') toggleProjectGroup();
      if (action === 'rename-project') openRenameModal();
      if (action === 'save-project-name') saveProjectName();
      if (action === 'delete-folder') deleteProject(actionButton.dataset.folderDeleteId);
      if (action === 'add-conversation') openConversationModal();
      if (action === 'add-conversation-save') saveConversationContent();
      if (action === 'create-folder') createFolder();
      if (action === 'create-folder-confirm') confirmCreateFolder();
      if (action === 'close-modal') hideModal();
    });

    document.getElementById('managedFileInput').addEventListener('change', (event) => {
      const selectedFiles = Array.from(event.target.files);
      event.target.value = '';
      if (selectedFiles.length === 0) return;
      addFilesToSelectedFolder(selectedFiles);
    });

    const dropzone = document.querySelector('.manager-dropzone');
    dropzone.addEventListener('keydown', (event) => {
      if (isAnalysisSubfolder()) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        document.getElementById('managedFileInput').click();
      }
    });
    dropzone.addEventListener('dragover', (event) => {
      if (isAnalysisSubfolder()) return;
      event.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-over');
      if (isAnalysisSubfolder()) return;
      const dropped = Array.from(event.dataTransfer.files);
      if (dropped.length === 0) return;
      addFilesToSelectedFolder(dropped);
    });

    document.getElementById('modalBackdrop').addEventListener('click', (event) => {
      if (event.target.id === 'modalBackdrop') hideModal();
    });

    async function initFileManager() {
      folders = await FolderStore.loadFoldersFromApi();
      ensureSelectedFolder();
      await loadActivityFilesFromApi();
      await loadProjectAnalysesForFolders();
      render();
    }

    initFileManager();
  }

  // 4. 이벤트 리스너 등록 (Event Listeners)
  function initializePageScript() {
    if (pageScriptInitialized) return;
    pageScriptInitialized = true;
    runPageScript();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePageScript, { once: true });
  }

  // 5. 초기화 실행 (Initialization)
  if (document.readyState !== 'loading') {
    initializePageScript();
  }
}());
