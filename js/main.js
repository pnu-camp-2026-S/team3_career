(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const PROFILE_KEY = 'myfitfolioProfile';
    const PROFILE_ENDPOINT = '/api/profile';
    const ACTIVITY_FILES_ENDPOINT = '/api/activity-files';
    const SIDEBAR_WIDTH_KEY = 'myfitfolioSidebarWidth';

    const folderGroupContainers = {
      completed: 'completedFolderList',
      inProgress: 'inProgressFolderList',
    };

    const sidebarResizeHandle = document.getElementById('sidebarResizeHandle');

    const mainLayout = document.getElementById('mainLayout');
    const profileNeededPanel = document.getElementById('profileNeededPanel');
    const analysisDashboard = document.getElementById('analysisDashboard');
    const analysisOverview = document.getElementById('analysisOverview');
    const analysisOverviewText = document.getElementById('analysisOverviewText');

    let folders = FolderStore.loadFolders();

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);
    }

    function hasMeaningfulProfile(profile) {
      if (!profile) return false;

      const hasBasic = Boolean(profile.name || profile.email || profile.phone || profile.address);
      const hasEducation = Array.isArray(profile.educations) && profile.educations.some((item) => (
        item.school || item.major || item.gpa
      ));
      const hasPreferences = profile.preferences && Object.values(profile.preferences).some(Boolean);
      const hasChips = profile.chips && Object.values(profile.chips).some((values) => Array.isArray(values) && values.length > 0);
      return hasBasic || hasEducation || hasPreferences || hasChips;
    }

    function hasSavedProfile() {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      if (!savedProfile) return false;

      try {
        return hasMeaningfulProfile(JSON.parse(savedProfile));
      } catch (error) {
        return false;
      }
    }

    async function hasSavedDatabaseProfile() {
      try {
        const response = await fetch(PROFILE_ENDPOINT, {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) return hasSavedProfile();

        const payload = await response.json();
        if (payload.profile) {
          localStorage.setItem(PROFILE_KEY, JSON.stringify(payload.profile));
        }
        return hasMeaningfulProfile(payload.profile);
      } catch (error) {
        return hasSavedProfile();
      }
    }

    function getFolderFileTotal(groupKey) {
      return Object.values(folders).reduce((sum, folder) => (
        folder.group === groupKey ? sum + folder.files.length : sum
      ), 0);
    }

    function getCompletedFileCount(folder) {
      return folder.files.length;
    }

    function createId(prefix) {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function getFileTypeIcon(fileName) {
      const extension = String(fileName).split('.').pop().toLowerCase();
      if (extension === 'pdf') return 'PDF';
      if (['doc', 'docx', 'hwp', 'txt', 'md'].includes(extension)) return 'DOC';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return 'IMG';
      if (['ppt', 'pptx', 'key'].includes(extension)) return 'PPT';
      if (['xls', 'xlsx', 'csv'].includes(extension)) return 'XLS';
      return 'FILE';
    }

    function mapApiFile(file) {
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType || '',
        size: file.size || 0,
        storagePath: file.storagePath || '',
        createdAt: file.createdAt || new Date().toISOString(),
      };
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
          folder.files = [];
        });

        payload.files.forEach((file) => {
          const folder = folders[file.folderId];
          if (!folder) return;
          folder.files.push(mapApiFile(file));
        });

        FolderStore.saveFolders(folders);
      } catch (error) {
        console.warn('Activity files could not be loaded.', error);
      }
    }

    function buildDonutGradient(items, total) {
      if (!total) return 'conic-gradient(#e8edf5 0 100%)';

      let start = 0;
      const segments = items
        .filter((item) => item.count > 0)
        .map((item, index, activeItems) => {
          const end = index === activeItems.length - 1
            ? 100
            : start + (item.count / total) * 100;
          const segment = `${item.color} ${start}% ${end}%`;
          start = end;
          return segment;
        });

      return `conic-gradient(${segments.join(', ')})`;
    }

    function renderAnalysisOverview(completedFileTotal, inProgressFileTotal, breakdown) {
      const topCategory = breakdown
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)[0];

      if (!completedFileTotal && !inProgressFileTotal) {
        analysisOverviewText.textContent = '아직 분석할 자료가 없습니다. 완료된 활동 폴더에 파일을 추가한 뒤 다시 분석을 시작해보세요.';
      } else if (!completedFileTotal) {
        analysisOverviewText.textContent = `진행중인 활동 자료 ${inProgressFileTotal}개가 준비되어 있어요. 완료된 활동 폴더로 옮기면 AI 분석 결과에 반영됩니다.`;
      } else {
        const categoryText = topCategory ? `${topCategory.label} 자료가 가장 많고, ` : '';
        analysisOverviewText.textContent = `완료된 자료 ${completedFileTotal}개와 진행중인 자료 ${inProgressFileTotal}개를 확인했어요. ${categoryText}완료된 자료를 중심으로 강점과 활동 흐름을 정리할 수 있습니다.`;
      }

      analysisOverview.hidden = false;
    }

    function updateAnalysisSummary() {
      const completedFileTotal = getFolderFileTotal('completed');
      const inProgressFileTotal = getFolderFileTotal('inProgress');
      const allFileTotal = completedFileTotal + inProgressFileTotal;
      const completedShare = allFileTotal ? Math.round((completedFileTotal / allFileTotal) * 100) : 0;

      document.getElementById('analyzedProjectTotal').textContent = completedFileTotal;
      document.getElementById('completedActivityTotal').textContent = completedFileTotal;
      document.getElementById('inProgressActivityTotal').textContent = inProgressFileTotal;
      document.getElementById('analysisSummaryBar').style.width = `${completedShare}%`;
      document.getElementById('analysisCompletionPercent').textContent = `${completedShare}%`;

      const breakdown = FolderStore.FOLDER_TYPES.map((type) => {
        const folder = folders[`completed-${type.key}`];
        return {
          label: type.label,
          color: type.color,
          count: folder ? getCompletedFileCount(folder) : 0,
        };
      });
      const inProgressBreakdownItem = {
        label: '진행중인 활동',
        color: '#98a2b3',
        count: inProgressFileTotal,
      };
      const chartBreakdown = [...breakdown, inProgressBreakdownItem];
      document.getElementById('classificationDonut').style.background = buildDonutGradient(chartBreakdown, allFileTotal);

      document.getElementById('categoryBreakdown').innerHTML = chartBreakdown.length
        ? chartBreakdown.map((item) => {
            const itemShare = allFileTotal ? Math.round((item.count / allFileTotal) * 100) : 0;
            return `
            <div class="category-row ${item.count ? '' : 'empty'}" style="--category-color: ${item.color}">
              <span class="category-label">${escapeHtml(item.label)}</span>
              <span class="category-bar" aria-hidden="true"><i style="width: ${itemShare}%"></i></span>
              <strong>${item.count}개</strong>
            </div>
          `;
          }).join('')
        : '<p class="empty-folder">완료된 활동 폴더에 파일을 추가하면 분류가 표시됩니다.</p>';
      renderAnalysisOverview(completedFileTotal, inProgressFileTotal, breakdown);
    }

    async function renderDashboardState() {
      const isProfileSaved = await hasSavedDatabaseProfile();
      profileNeededPanel.hidden = isProfileSaved;
      analysisDashboard.hidden = !isProfileSaved;
    }

    function renderFolders() {
      FolderStore.FOLDER_GROUPS.forEach((group) => {
        const container = document.getElementById(folderGroupContainers[group.key]);
        const groupFolders = Object.values(folders).filter((folder) => folder.group === group.key);
        container.innerHTML = groupFolders.map(renderFolder).join('');
      });

      FolderStore.saveFolders(folders);
      renderDashboardState();
    }

    function renderFolder(folder) {
      return `
        <article class="folder-item drop-folder ${folder.open ? 'open' : ''}" data-folder-id="${escapeHtml(folder.id)}">
          <button class="folder-row" type="button" data-toggle-folder="${escapeHtml(folder.id)}" aria-expanded="${folder.open}">
            <span class="mini-folder ${folder.group}" aria-hidden="true"></span>
            <span class="folder-label">${escapeHtml(folder.label)}</span>
          </button>
          <div class="folder-tools">
            <button class="icon-tool-button" type="button" data-rename-folder="${escapeHtml(folder.id)}" aria-label="${escapeHtml(folder.label)} 폴더명 변경">폴더명 수정</button>
          </div>
          <div class="uploaded-file-list">
            ${folder.files.length ? folder.files.map((file) => renderFile(folder.id, file)).join('') : '<div class="empty-folder">파일을 이 폴더로 끌어오세요</div>'}
          </div>
        </article>
      `;
    }

    function renderFile(folderId, file) {
      return `
        <div class="uploaded-file" draggable="true" data-file-id="${escapeHtml(file.id)}">
          <span class="file-type-icon" aria-hidden="true">${getFileTypeIcon(file.name)}</span>
          <span class="uploaded-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <button class="file-delete-btn" type="button" data-delete-file="${escapeHtml(folderId)}:${escapeHtml(file.id)}" aria-label="${escapeHtml(file.name)} 삭제">
            <span class="trash-icon" aria-hidden="true"></span>
          </button>
        </div>
      `;
    }

    async function addFilesToFolder(folderId, fileList) {
      const folder = folders[folderId];
      if (!folder) return;

      const files = Array.from(fileList);
      const formData = new FormData();
      formData.append('folderId', folder.id);
      formData.append('folderGroup', folder.group || '');
      formData.append('folderType', folder.type || '');
      formData.append('folderLabel', folder.label || '');
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
          folder.files.push(mapApiFile(file));
        });
      } catch (error) {
        console.warn('Activity file upload fell back to local state.', error);
        files.forEach((file) => {
          folder.files.push({
            id: createId('file'),
            name: file.name,
          });
        });
      }

      folder.open = true;
      FolderStore.saveFolders(folders);
      renderFolders();
    }

    async function deleteFile(folderId, fileId) {
      const folder = folders[folderId];
      if (!folder) return;

      const file = folder.files.find((item) => item.id === fileId);
      if (!file) return;
      if (!window.confirm(`'${file.name}' 파일을 삭제하시겠습니까?`)) return;

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
          return;
        }
      }

      folder.files = folder.files.filter((item) => item.id !== fileId);
      FolderStore.saveFolders(folders);
      renderFolders();
    }

    function renameFolder(folderId) {
      const folder = folders[folderId];
      if (!folder) return;

      const nextName = window.prompt('변경할 폴더명을 입력하세요', folder.label);
      if (!nextName || !nextName.trim()) return;

      folder.label = nextName.trim();
      FolderStore.saveFolders(folders);
      renderFolders();
    }

    function clampSidebarWidth(width) {
      const maxWidth = Math.min(460, Math.max(320, window.innerWidth - 520));
      return Math.min(Math.max(width, 240), maxWidth);
    }

    function applySidebarWidth(width) {
      const nextWidth = clampSidebarWidth(width);
      mainLayout.style.setProperty('--sidebar-width', `${nextWidth}px`);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(nextWidth));
    }

    const savedSidebarWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(savedSidebarWidth) && savedSidebarWidth > 0) {
      applySidebarWidth(savedSidebarWidth);
    }

    document.querySelectorAll('.folder-title').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.closest('.folder-section');
        const isOpen = section?.classList.toggle('open') ?? false;
        button.setAttribute('aria-expanded', String(isOpen));
      });
    });

    let sidebarResizeStart = null;

    sidebarResizeHandle.addEventListener('pointerdown', (event) => {
      sidebarResizeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        width: document.getElementById('activitySidebar').getBoundingClientRect().width,
      };
      sidebarResizeHandle.setPointerCapture(event.pointerId);
      document.body.classList.add('sidebar-resizing');
    });

    sidebarResizeHandle.addEventListener('pointermove', (event) => {
      if (!sidebarResizeStart) return;
      applySidebarWidth(sidebarResizeStart.width + event.clientX - sidebarResizeStart.x);
    });

    function finishSidebarResize(event) {
      if (!sidebarResizeStart || event.pointerId !== sidebarResizeStart.pointerId) return;
      sidebarResizeStart = null;
      document.body.classList.remove('sidebar-resizing');
    }

    sidebarResizeHandle.addEventListener('pointerup', finishSidebarResize);
    sidebarResizeHandle.addEventListener('pointercancel', finishSidebarResize);

    document.addEventListener('click', async (event) => {
      const folderToggle = event.target.closest('[data-toggle-folder]');
      if (folderToggle) {
        const folder = folders[folderToggle.dataset.toggleFolder];
        if (folder) {
          folder.open = !folder.open;
          FolderStore.saveFolders(folders);
          renderFolders();
        }
        return;
      }

      const renameButton = event.target.closest('[data-rename-folder]');
      if (renameButton) {
        renameFolder(renameButton.dataset.renameFolder);
        return;
      }

      const deleteButton = event.target.closest('[data-delete-file]');
      if (deleteButton) {
        const [folderId, fileId] = deleteButton.dataset.deleteFile.split(':');
        await deleteFile(folderId, fileId);
        return;
      }

      const infoButton = event.target.closest('.analysis-info-button');
      if (infoButton) {
        const infoBox = document.getElementById(infoButton.dataset.infoTarget);
        if (infoBox) infoBox.hidden = !infoBox.hidden;
      }
    });

    function clearDropOverFolders(exceptFolder = null) {
      document.querySelectorAll('.drop-folder.drop-over').forEach((folder) => {
        if (folder !== exceptFolder) folder.classList.remove('drop-over');
      });
    }

    document.addEventListener('dragover', (event) => {
      const target = event.target.closest('.drop-folder');
      if (!target || !Array.from(event.dataTransfer.types).includes('Files')) {
        clearDropOverFolders();
        return;
      }
      event.preventDefault();
      clearDropOverFolders(target);
      target.classList.add('drop-over');
    });

    document.addEventListener('dragleave', (event) => {
      const target = event.target.closest('.drop-folder');
      if (target && !target.contains(event.relatedTarget)) {
        target.classList.remove('drop-over');
      }
    });

    document.addEventListener('drop', async (event) => {
      const target = event.target.closest('.drop-folder');
      if (!target || !event.dataTransfer.files.length) return;
      event.preventDefault();
      clearDropOverFolders();
      await addFilesToFolder(target.dataset.folderId, event.dataTransfer.files);
    });

    document.addEventListener('dragend', () => {
      clearDropOverFolders();
    });

    document.querySelector('[data-analysis-start]').addEventListener('click', () => {
      renderDashboardState();
      updateAnalysisSummary();
      analysisDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    async function initMainDashboard() {
      await loadActivityFilesFromApi();
      renderFolders();
    }

    initMainDashboard();
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
