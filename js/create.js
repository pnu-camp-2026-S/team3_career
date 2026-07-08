(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    let selectedFolderId = new URLSearchParams(window.location.search).get('folder') || 'completed-personal';
    let nextFileId = 1;
    let toastTimer = null;

    let folders = FolderStore.loadFolders();

    if (!folders[selectedFolderId]) selectedFolderId = 'completed-personal';

    function addSeedFile(folderId, name, type, status) {
      folders[folderId].files.push({ id: `file-${nextFileId++}`, name, type, status });
    }

    function seedFilesIfEmpty() {
      const hasAnyFiles = Object.values(folders).some((folder) => folder.files.length > 0);
      if (hasAnyFiles) return;
      addSeedFile('completed-personal', '서비스_기획서.pdf', 'PDF', '분석완료');
      addSeedFile('completed-team', '팀프로젝트_회의록.md', 'MD', '작성완료');
      addSeedFile('inProgress-contest', '공모전_발표자료.pptx', 'PPT', '분석대기');
      addSeedFile('inProgress-education', '교육과정_수료증.png', 'IMG', '분석대기');
    }

    seedFilesIfEmpty();

    function persistFolders() {
      FolderStore.saveFolders(folders);
    }

    function render() {
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
                  <strong>${folder.files.length}</strong>
                </button>
              `).join('')}
            </div>
          </section>
        `;
      }).join('');
    }

    function renderFilePanel() {
      const selectedFolder = folders[selectedFolderId];
      const selectedFiles = selectedFolder.files;
      document.getElementById('analysisPanelTitle').textContent = `${selectedFolder.label} AI 정리 상태`;
      document.getElementById('editablePanelTitle').textContent = `${selectedFolder.label} 자료`;
      document.getElementById('editablePanelDesc').textContent = `${getGroupLabel(selectedFolder.group)}의 ${selectedFolder.label} 폴더를 수정하는 클릭 확인용 패널입니다.`;
      updateRepoButton(selectedFolder);
      document.getElementById('managedFileList').innerHTML = selectedFiles.length
        ? selectedFiles.map((file, index) => `
            <article class="manager-file-card">
              <div class="file-type-chip">${file.type}</div>
              <div>
                <strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong>
                <span>${selectedFolder.label} · 우선순위 ${index + 1}</span>
              </div>
              <div class="manager-file-actions">
                <span class="status-pill ${getStatusClass(file.status)}">${file.status}</span>
                <button class="ghost-button compact-button" type="button" data-action="preview-file" data-file-id="${file.id}">미리보기</button>
                <button class="ghost-button compact-button" type="button" data-action="summarize-file" data-file-id="${file.id}">AI 요약</button>
                <button class="ghost-button compact-button danger-button" type="button" data-action="delete-file" data-file-id="${file.id}">삭제</button>
              </div>
            </article>
          `).join('')
        : '<div class="manager-empty"><strong>이 폴더에는 아직 자료가 없습니다.</strong><span>자료 추가 버튼을 눌러 파일 관리 흐름을 확인하세요.</span></div>';
    }

    function updateDashboard() {
      const allFiles = Object.values(folders).flatMap((folder) => folder.files);
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

    function addFileFromName(fileName) {
      const type = (fileName.split('.').pop() || 'FILE').toUpperCase();
      folders[selectedFolderId].files.push({ id: `file-${nextFileId++}`, name: fileName, type, status: '분석대기' });
      persistFolders();
      render();
      showToast('선택한 폴더에 자료가 추가되었습니다.');
    }

    function getSelectedFile(fileId) {
      return folders[selectedFolderId].files.find((file) => file.id === fileId);
    }

    function previewFile(fileId) {
      const file = getSelectedFile(fileId);
      if (!file) return;
      showModal('파일 미리보기', `
        <div class="manager-preview">
          <strong>${escapeHtml(file.name)}</strong>
          <p>실제 파일을 읽지 않고, 미리보기 클릭이 가능한지 확인하는 화면입니다.</p>
          <p>파일 유형: ${file.type}<br>현재 상태: ${file.status}<br>연결 폴더: ${folders[selectedFolderId].label}</p>
        </div>
      `);
    }

    function summarizeFile(fileId) {
      const file = getSelectedFile(fileId);
      if (!file) return;
      file.status = '분석완료';
      document.getElementById('analysisStatus').textContent = '요약완료';
      document.getElementById('analysisStatus').className = 'status-pill done';
      document.getElementById('analysisMessage').textContent = `${file.name} 파일의 AI 요약이 완료된 것처럼 표시했습니다.`;
      document.getElementById('analysisProgress').style.width = '72%';
      persistFolders();
      render();
      showToast('AI 요약 상태로 변경했습니다.');
    }

    function deleteFile(fileId) {
      const folder = folders[selectedFolderId];
      folder.files = folder.files.filter((file) => file.id !== fileId);
      persistFolders();
      render();
      showToast('자료가 목록에서 삭제되었습니다.');
    }

    function runAnalysis() {
      document.getElementById('analysisStatus').textContent = '분석완료';
      document.getElementById('analysisStatus').className = 'status-pill done';
      document.getElementById('analysisMessage').textContent = '선택한 폴더의 자료를 기반으로 분석 결과가 생성된 것처럼 표시했습니다.';
      document.getElementById('analysisProgress').style.width = '100%';
      showModal('분석 결과', `
        <div class="manager-preview">
          <strong>${folders[selectedFolderId].label} 분석 결과</strong>
          <p>파일 순서, 폴더 구조, AI 요약 상태를 참조해 분석하기 버튼의 클릭 흐름을 확인했습니다.</p>
        </div>
      `);
    }

    function syncGithub() {
      showToast('GitHub 동기화 버튼 클릭을 확인했습니다.');
    }

    function openMdModal() {
      showModal('AI 대화로 md 만들기', `
        <p class="panel-note">파일이 없을 때 활동 내용을 입력하고 Markdown 자료를 생성하는 흐름입니다.</p>
        <textarea class="textarea-box" id="mdInput">팀 프로젝트에서 요구사항 분석과 발표 자료 제작을 담당했습니다.</textarea>
        <div class="form-actions">
          <button class="primary-button" type="button" data-action="create-md-file">md 파일 생성</button>
        </div>
      `);
    }

    function createMdFile() {
      folders[selectedFolderId].files.push({ id: `file-${nextFileId++}`, name: 'ai_activity_summary.md', type: 'MD', status: '작성완료' });
      hideModal();
      persistFolders();
      render();
      showToast('AI 생성 md 파일이 추가되었습니다.');
    }

    function createFolder() {
      showModal('폴더 추가', `
        <p class="panel-note">새 프로젝트 폴더를 만들면 메인 사이드바에도 같은 이름으로 즉시 반영됩니다.</p>
        <div class="repo-form">
          <label class="repo-field"><span>폴더 이름</span><input id="newFolderName" type="text" placeholder="예: 캡스톤 프로젝트" /></label>
          <label class="repo-field"><span>그룹</span>
            <select id="newFolderGroup">
              <option value="completed">완료된 활동 폴더</option>
              <option value="inProgress">진행중인 활동 폴더</option>
            </select>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="button" data-action="create-folder-confirm">폴더 만들기</button>
          </div>
        </div>
      `);
    }

    function confirmCreateFolder() {
      const name = document.getElementById('newFolderName').value.trim();
      const group = document.getElementById('newFolderGroup').value;
      if (!name) {
        showToast('폴더 이름을 입력하세요.');
        return;
      }
      const folder = FolderStore.createFolder(group, name);
      folders[folder.id] = folder;
      selectedFolderId = folder.id;
      persistFolders();
      hideModal();
      render();
      showToast(`'${name}' 폴더를 추가했습니다. 메인 사이드바에도 반영됩니다.`);
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

    function saveRepo() {
      const folder = folders[selectedFolderId];
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
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('folder', selectedFolderId);
        window.history.replaceState({}, '', nextUrl);
        render();
        showToast(`${folders[selectedFolderId].label} 폴더를 선택했습니다.`);
        return;
      }

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      const fileId = actionButton.dataset.fileId;

      if (action === 'add-file') document.getElementById('managedFileInput').click();
      if (action === 'preview-file') previewFile(fileId);
      if (action === 'summarize-file') summarizeFile(fileId);
      if (action === 'delete-file') deleteFile(fileId);
      if (action === 'analyze') runAnalysis();
      if (action === 'sync-github') syncGithub();
      if (action === 'make-md') openMdModal();
      if (action === 'create-md-file') createMdFile();
      if (action === 'create-folder') createFolder();
      if (action === 'create-folder-confirm') confirmCreateFolder();
      if (action === 'connect-repo') openRepoModal();
      if (action === 'connect-repo-save') saveRepo();
      if (action === 'close-modal') hideModal();
    });

    document.getElementById('managedFileInput').addEventListener('change', (event) => {
      const selectedFiles = Array.from(event.target.files);
      if (selectedFiles.length === 0) return;
      selectedFiles.forEach((file) => addFileFromName(file.name));
      event.target.value = '';
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
      dropped.forEach((file) => addFileFromName(file.name));
    });

    document.getElementById('modalBackdrop').addEventListener('click', (event) => {
      if (event.target.id === 'modalBackdrop') hideModal();
    });

    render();
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
