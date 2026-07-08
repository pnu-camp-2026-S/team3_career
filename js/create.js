(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const ACTIVITY_FILES_ENDPOINT = '/api/activity-files';

    let selectedFolderId = new URLSearchParams(window.location.search).get('folder') || 'completed-personal';
    let selectedSubfolderId = null;
    let nextFileId = 1;
    let toastTimer = null;

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
      updateDashboard();
    }

    function renderFolderGroups() {
      const container = document.getElementById('fileManagerFolderGroups');
      container.innerHTML = FolderStore.FOLDER_GROUPS.map((group) => {
        const groupFolders = Object.values(folders).filter((folder) => folder.group === group.key);
        return `
          <section class="manager-folder-section">
            <h3>${group.label}</h3>
            <div class="manager-folder-list">
              ${groupFolders.map((folder) => `
                <button class="manager-folder-item ${folder.id === selectedFolderId ? 'active' : ''}" type="button" data-folder-id="${escapeHtml(folder.id)}">
                  <span class="mini-folder" aria-hidden="true"></span>
                  <span>${escapeHtml(folder.label)}</span>
                  <strong>${FolderStore.getFolderFiles(folder).length}</strong>
                </button>
              `).join('')}
            </div>
          </section>
        `;
      }).join('');
    }

    function renderFilePanel() {
      const selectedFolder = getSelectedFolder();
      if (!selectedFolder) {
        document.getElementById('editablePanelTitle').textContent = '프로젝트 없음';
        document.getElementById('editablePanelDesc').textContent = '왼쪽에서 프로젝트를 만들어 자료를 관리하세요.';
        document.getElementById('subfolderList').innerHTML = '';
        document.getElementById('managedFileList').innerHTML = '<div class="manager-empty"><strong>표시할 프로젝트가 없습니다.</strong><span>폴더 추가로 새 프로젝트를 만들어 보세요.</span></div>';
        return;
      }
      const selectedSubfolder = getSelectedSubfolder();
      const selectedFiles = selectedSubfolder ? selectedSubfolder.files : [];
      document.getElementById('analysisPanelTitle').textContent = `${selectedFolder.label} AI 정리 상태`;
      document.getElementById('editablePanelTitle').textContent = `${selectedFolder.label} 자료`;
      document.getElementById('editablePanelDesc').textContent = `${getGroupLabel(selectedFolder.group)}의 ${selectedFolder.label} 프로젝트입니다. 세부 폴더를 골라 자료를 관리하세요.`;
      updateRepoButton(selectedFolder);
      updateMoveButton(selectedFolder);
      renderSubfolders(selectedFolder);

      const subfolderLabel = selectedSubfolder ? selectedSubfolder.label : '세부 폴더';
      document.getElementById('managedFileList').innerHTML = selectedFiles.length
        ? selectedFiles.map((file, index) => {
          const isAnalysisSummary = file.kind === 'analysis-summary';
          const fileDescription = isAnalysisSummary
            ? `${subfolderLabel} · ${file.sourceFileName || '원본 자료'} 분석 결과`
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
                <button class="ghost-button compact-button" type="button" data-action="preview-file" data-file-id="${file.id}">미리보기</button>
                ${isAnalysisSummary
                  ? '<span class="analysis-file-note">AI 산출물</span>'
                  : `<button class="ghost-button compact-button danger-button" type="button" data-action="delete-file" data-file-id="${file.id}">삭제</button>`}
              </div>
            </article>
          `;
        }).join('')
        : '<div class="manager-empty"><strong>이 세부 폴더에는 아직 자료가 없습니다.</strong><span>자료 추가 버튼을 눌러 선택한 세부 폴더에 자료를 넣어보세요.</span></div>';
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

    function updateDashboard() {
      const allFiles = Object.values(folders).flatMap((folder) => FolderStore.getFolderFiles(folder));
      const completedFiles = allFiles.filter((file) => file.status === '분석완료' || file.status === '작성완료');
      document.getElementById('summaryState').textContent = completedFiles.length ? '요약 초안 생성됨' : '생성 대기';
      document.getElementById('indexState').textContent = allFiles.length ? '폴더 목록과 파일 순서 반영됨' : '폴더 순서 반영 대기';
      document.getElementById('logState').textContent = allFiles.length ? '최근 변경 기록 있음' : '변경 이력 없음';
    }

    function updateRepoButton(folder) {
      const button = document.getElementById('repoConnectButton');
      const connected = Boolean(folder.github && folder.github.connected);
      button.textContent = connected ? '연결됨' : '레포 연결';
      button.classList.toggle('is-connected', connected);
    }

    function getFileType(fileName) {
      return (String(fileName).split('.').pop() || 'FILE').toUpperCase();
    }

    function getFileBaseName(fileName) {
      return String(fileName || '자료').replace(/\.[^.]+$/, '');
    }

    function hasAnalysisArtifact(analysis) {
      return Boolean(analysis?.summaryMd || analysis?.indexDraft || analysis?.logMd);
    }

    function mapApiFile(file) {
      return {
        id: file.id,
        name: file.name,
        type: getFileType(file.name),
        status: file.analysisStatus === 'completed' ? '분석완료' : '분석대기',
        mimeType: file.mimeType || '',
        size: file.size || 0,
        storagePath: file.storagePath || '',
        createdAt: file.createdAt || new Date().toISOString(),
        analysis: file.analysis || null,
      };
    }

    function mapAnalysisSummaryFile(file) {
      if (!hasAnalysisArtifact(file.analysis)) return null;
      return {
        id: `analysis-summary-${file.id}`,
        name: `${getFileBaseName(file.name)} AI 요약.md`,
        type: 'MD',
        status: '작성완료',
        kind: 'analysis-summary',
        sourceFileId: file.id,
        sourceFileName: file.name,
        summaryMarkdown: file.analysis.summaryMd || '',
        indexDraft: file.analysis.indexDraft || null,
        logMarkdown: file.analysis.logMd || '',
        createdAt: file.createdAt || new Date().toISOString(),
      };
    }

    function formatIndexDraft(indexDraft) {
      if (!indexDraft) return '저장된 index.json 내용이 없습니다.';
      return JSON.stringify(indexDraft, null, 2);
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
          const summaryFile = mapAnalysisSummaryFile(mappedFile);
          target.files.push(mappedFile);
          const analysisTarget = FolderStore.getAnalysisSubfolder(projectFolder);
          if (summaryFile && analysisTarget) analysisTarget.files.push(summaryFile);
        });

        persistFolders();
      } catch (error) {
        console.warn('Activity files could not be loaded.', error);
      }
    }

    async function addFilesToSelectedFolder(fileList) {
      const folder = getSelectedFolder();
      const subfolder = getSelectedSubfolder();
      const files = Array.from(fileList);
      if (!folder || !subfolder || files.length === 0) return;

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

        if (!response.ok) throw new Error('Activity file upload failed.');

        const payload = await response.json();
        (payload.files || []).forEach((file) => {
          subfolder.files.push(mapApiFile(file));
        });
      } catch (error) {
        console.warn('Activity file upload fell back to local state.', error);
        files.forEach((file) => {
          subfolder.files.push({ id: `file-${nextFileId++}`, name: file.name, type: getFileType(file.name), status: '분석대기' });
        });
      }

      persistFolders();
      render();
      showToast(`'${subfolder.label}' 세부 폴더에 자료가 추가되었습니다.`);
    }

    function getSelectedFile(fileId) {
      const subfolder = getSelectedSubfolder();
      return subfolder ? subfolder.files.find((file) => file.id === fileId) : null;
    }

    function previewFile(fileId) {
      const file = getSelectedFile(fileId);
      if (!file) return;
      const subfolder = getSelectedSubfolder();
      if (file.kind === 'analysis-summary') {
        showModal('AI 요약 파일', `
          <div class="manager-preview analysis-artifact-preview">
            <strong>${escapeHtml(file.name)}</strong>
            <p>원본 자료: ${escapeHtml(file.sourceFileName || '')}</p>
            <section>
              <h3>summary.md</h3>
              <pre>${escapeHtml(file.summaryMarkdown || '저장된 summary.md 내용이 없습니다.')}</pre>
            </section>
            <section>
              <h3>index.json</h3>
              <pre>${escapeHtml(formatIndexDraft(file.indexDraft))}</pre>
            </section>
            <section>
              <h3>log.md</h3>
              <pre>${escapeHtml(file.logMarkdown || '저장된 log.md 내용이 없습니다.')}</pre>
            </section>
          </div>
        `);
        return;
      }
      showModal('파일 미리보기', `
        <div class="manager-preview">
          <strong>${escapeHtml(file.name)}</strong>
          <p>실제 파일을 읽지 않고, 미리보기 클릭이 가능한지 확인하는 화면입니다.</p>
          <p>파일 유형: ${file.type}<br>현재 상태: ${file.status}<br>연결 폴더: ${escapeHtml(getSelectedFolder().label)} / ${escapeHtml(subfolder ? subfolder.label : '')}</p>
        </div>
      `);
    }

    async function deleteFile(fileId) {
      const subfolder = getSelectedSubfolder();
      if (!subfolder) return;
      const file = subfolder.files.find((item) => item.id === fileId);
      if (!file) return;
      if (file.kind === 'analysis-summary') {
        showToast('AI 요약 파일은 원본 자료 분석 결과입니다. 원본 자료 삭제 시 함께 사라집니다.');
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

    // 저장된 프로젝트 종합 결과가 있으면 AI 정리 상태 패널을 복원한다.
    async function restoreAnalysisPanelState() {
      const folder = getSelectedFolder();
      if (!folder) return;
      try {
        const response = await fetch(`/api/analysis/project?projectId=${encodeURIComponent(folder.id)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.aggregate && getSelectedFolder()?.id === folder.id && !analysisInFlight) {
          setAnalysisPanel('분석완료', 'done', `이전 분석 결과: ${payload.aggregate.headline || '프로젝트 종합 요약이 저장되어 있습니다.'}`, '100%');
        }
      } catch (error) {
        console.warn('Analysis state could not be restored.', error);
      }
    }

    function setAnalysisPanel(statusText, statusClass, message, progress) {
      document.getElementById('analysisStatus').textContent = statusText;
      document.getElementById('analysisStatus').className = `status-pill ${statusClass}`;
      document.getElementById('analysisMessage').textContent = message;
      document.getElementById('analysisProgress').style.width = progress;
    }

    // 프로젝트 단위 AI 분석(#166-4). 서버(/api/analysis/project)가 이 프로젝트의
    // 미분석 자료만 새로 분석하고, 기존 결과와 합쳐 프로젝트 종합 요약을 생성한다.
    async function organizeProject() {
      const folder = getSelectedFolder();
      if (!folder || analysisInFlight) return;

      const serverFiles = FolderStore.getFolderFiles(folder).filter((file) => file.storagePath);
      if (!serverFiles.length) {
        showToast('서버에 업로드된 자료가 없습니다. 자료를 먼저 추가해주세요.');
        return;
      }

      analysisInFlight = true;
      setAnalysisPanel('분석중', 'ready', `${folder.label} 프로젝트의 자료를 AI로 분석하고 있습니다. 잠시만 기다려주세요.`, '35%');

      try {
        const response = await fetch('/api/analysis/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ projectId: folder.id, projectType: folder.type, projectName: folder.label }),
        });

        if (response.status === 401) {
          setAnalysisPanel('분석실패', 'fail', '로그인이 필요합니다. 로그인 후 다시 시도해주세요.', '0%');
          return;
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || '프로젝트 분석 요청이 실패했습니다.');
        }

        if (payload.ok === false && payload.reason === 'no_data') {
          setAnalysisPanel('분석대기', 'ready', '분석할 자료가 없습니다. 자료를 먼저 추가해주세요.', '0%');
          return;
        }

        await applyProjectAnalysisResult(folder, payload);
      } catch (error) {
        console.warn('Project analysis failed.', error);
        setAnalysisPanel('분석실패', 'fail', '프로젝트 분석에 실패했습니다. 잠시 후 다시 시도해주세요.', '0%');
      } finally {
        analysisInFlight = false;
      }
    }

    async function applyProjectAnalysisResult(folder, payload) {
      const succeededIds = new Set((payload.files || []).filter((file) => file.ok).map((file) => file.activityFileId));
      (folder.subfolders || []).forEach((sub) => {
        sub.files.forEach((file) => {
          if (succeededIds.has(file.id)) file.status = '분석완료';
        });
      });
      persistFolders();
      await loadActivityFilesFromApi();
      render();

      const doneCount = (payload.analyzedCount || 0) + (payload.skippedCount || 0);
      const failedNote = payload.failedCount ? ` (실패 ${payload.failedCount}건)` : '';
      setAnalysisPanel(
        payload.failedCount && !payload.analyzedCount && !payload.skippedCount ? '분석실패' : '분석완료',
        payload.failedCount && !payload.analyzedCount && !payload.skippedCount ? 'fail' : 'done',
        `새로 분석 ${payload.analyzedCount || 0}건, 기존 결과 ${payload.skippedCount || 0}건을 묶어 종합했습니다.${failedNote}`,
        '100%'
      );

      const aggregate = payload.aggregate;
      const fileListHtml = (payload.files || []).map((file) => `
        <li>${escapeHtml(file.name)} — ${file.ok ? '분석 성공' : `분석 실패${file.errors?.length ? ` (${escapeHtml(file.errors.join(' / '))})` : ''}`}</li>
      `).join('');

      showModal('프로젝트 분석 결과', `
        <div class="manager-preview">
          <strong>${escapeHtml(folder.label)} 프로젝트 분석</strong>
          ${aggregate
            ? `<p><strong>${escapeHtml(aggregate.headline || '')}</strong></p><p>${escapeHtml(aggregate.description || '')}</p>`
            : '<p>종합 요약을 생성하지 못했습니다. 파일별 결과를 확인해주세요.</p>'}
          <p>완료된 분석 ${doneCount}건을 기준으로 종합했습니다. 분석 결과는 사용자가 확인하기 전까지 초안으로 취급됩니다.</p>
          ${fileListHtml ? `<ul>${fileListHtml}</ul>` : ''}
        </div>
      `);
    }

    function syncGithub() {
      showToast('GitHub 동기화 버튼 클릭을 확인했습니다.');
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

    // 프로젝트 삭제(사용자 요청). 폴더와 그 안의 자료가 함께 사라진다.
    async function deleteProject() {
      const folder = getSelectedFolder();
      if (!folder) return;
      if (!window.confirm(`'${folder.label}' 프로젝트를 삭제할까요? 안의 세부 폴더와 자료도 함께 사라집니다.`)) return;

      const removedLabel = folder.label;
      try {
        await FolderStore.deleteFolderRemote(folder.id);
      } catch (error) {
        console.warn('Folder could not be deleted on the server.', error);
        showToast('폴더를 서버에서 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      FolderStore.deleteFolder(folders, folder.id);
      selectedFolderId = Object.keys(folders)[0] || null;
      selectedSubfolderId = firstSubfolderId(folders[selectedFolderId]);
      persistFolders();
      render();
      showToast(`'${removedLabel}' 프로젝트를 삭제했습니다.`);
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
              <option value="completed">완료된 활동 폴더</option>
              <option value="inProgress">진행중인 활동 폴더</option>
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

    function openRepoModal() {
      const folder = folders[selectedFolderId];
      const gh = folder.github || {};
      showModal(`${folder.label} 레포 연결`, `
        <p class="panel-note">현재 프로토타입에서는 실제 GitHub 연동 없이 프로젝트별 임시 연결 정보만 저장합니다.</p>
        <div class="repo-form">
          <label class="repo-field"><span>GitHub 아이디</span><input id="repoUser" type="text" value="${escapeHtml(gh.username || '')}" placeholder="예: bjun02" /></label>
          <label class="repo-field"><span>저장소 소유자</span><input id="repoOwner" type="text" value="${escapeHtml(gh.owner || '')}" placeholder="예: pnu-camp-2026-S" /></label>
          <label class="repo-field"><span>저장소 이름</span><input id="repoName" type="text" value="${escapeHtml(gh.repo || '')}" placeholder="예: team3_career" /></label>
          <label class="repo-field"><span>브랜치</span><input id="repoBranch" type="text" value="${escapeHtml(gh.branch || 'main')}" placeholder="예: main" /></label>
          <label class="repo-field"><span>기준 경로</span><input id="repoBasePath" type="text" value="${escapeHtml(gh.basePath || '')}" placeholder="예: docs/" /></label>
          <label class="repo-check"><input id="repoSyncEnabled" type="checkbox" ${gh.syncEnabled ? 'checked' : ''} /><span>동기화 사용</span></label>
          <div class="form-actions">
            <button class="primary-button" type="button" data-action="connect-repo-save">연결 저장</button>
          </div>
        </div>
      `);
    }

    async function saveRepo() {
      const folder = folders[selectedFolderId];
      const previousGithub = folder.github;
      folder.github = {
        connected: true,
        username: document.getElementById('repoUser').value.trim(),
        owner: document.getElementById('repoOwner').value.trim(),
        repo: document.getElementById('repoName').value.trim(),
        branch: document.getElementById('repoBranch').value.trim() || 'main',
        basePath: document.getElementById('repoBasePath').value.trim(),
        syncEnabled: document.getElementById('repoSyncEnabled').checked,
        lastSyncedAt: null,
      };
      try {
        await FolderStore.updateFolderRemote(folder);
      } catch (error) {
        console.warn('Repo connection could not be saved.', error);
        folder.github = previousGithub;
        showToast('레포 연결 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      persistFolders();
      hideModal();
      render();
      showToast(`${folder.label} 프로젝트에 GitHub 레포 임시 연결 정보를 저장했습니다.`);
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

      if (action === 'add-file') document.getElementById('managedFileInput').click();
      if (action === 'preview-file') previewFile(fileId);
      if (action === 'delete-file') deleteFile(fileId);
      if (action === 'analyze') organizeProject();
      if (action === 'sync-github') syncGithub();
      if (action === 'toggle-group') toggleProjectGroup();
      if (action === 'rename-project') openRenameModal();
      if (action === 'save-project-name') saveProjectName();
      if (action === 'delete-project') deleteProject();
      if (action === 'add-conversation') openConversationModal();
      if (action === 'add-conversation-save') saveConversationContent();
      if (action === 'create-folder') createFolder();
      if (action === 'create-folder-confirm') confirmCreateFolder();
      if (action === 'connect-repo') openRepoModal();
      if (action === 'connect-repo-save') saveRepo();
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
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        document.getElementById('managedFileInput').click();
      }
    });
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-over');
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
      render();
      restoreAnalysisPanelState();
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
