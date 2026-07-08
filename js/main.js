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

    // 분석 시작 전에는 키워드 개요·활동 분류를 "분석이 필요합니다" 상태로 두고,
    // 분석 시작을 누르면 채운다. 실구현에서는 프로젝트별 summary.md를 읽어 최종 요약으로
    // 채우지만, FE 단계에서는 아래 mock 키워드와 계산된 분류로 채워 전/후를 비교한다.
    const ANALYSIS_KEYWORDS = ['문제 해결', '협업', '기획', '데이터 활용', '실행력', '발표'];
    let hasAnalyzed = false;

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
        folder.group === groupKey ? sum + FolderStore.getFolderFiles(folder).length : sum
      ), 0);
    }

    function getCompletedFileCount(folder) {
      return FolderStore.getFolderFiles(folder).length;
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
          (folder.subfolders || []).forEach((sub) => {
            sub.files = [];
          });
        });

        payload.files.forEach((file) => {
          const match = FolderStore.findSubfolder(folders, file.folderId);
          const target = match?.subfolder || folders[file.folderId]?.subfolders?.[0];
          if (!target) return;
          target.files.push(mapApiFile(file));
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

    function renderKeywordChips() {
      document.getElementById('keywordChipList').innerHTML = ANALYSIS_KEYWORDS
        .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
        .join('');
    }

    // 분석 전/후 화면 전환. 키워드 개요는 하나의 섹션이며 상태에 따라 내용이 바뀐다(#166-3).
    // 분석 전에는 각 카드가 "분석이 필요합니다" 상태를 보여준다.
    function applyAnalysisState() {
      const overview = document.getElementById('keywordOverview');
      overview.classList.toggle('keyword-overview-empty', !hasAnalyzed);
      document.getElementById('keywordChipList').hidden = !hasAnalyzed;
      document.getElementById('keywordOverviewHeading').textContent = hasAnalyzed
        ? '꾸준한 실행력과 협업 경험이 드러나요'
        : '분석이 필요합니다';
      document.getElementById('keywordOverviewText').textContent = hasAnalyzed
        ? '완료된 프로젝트 자료를 기준으로 기획, 개발, 문제 해결, 발표 경험을 묶어 분석합니다. 자료가 추가될수록 강점 키워드와 활동 분류가 더 선명해집니다.'
        : '분석 시작을 누르면 완료된 활동 자료를 바탕으로 강점 키워드와 활동 개요를 정리해 드려요.';
      document.getElementById('analyzedMaterialEmpty').hidden = hasAnalyzed;
      document.getElementById('analyzedMaterialResult').hidden = !hasAnalyzed;
      document.getElementById('classificationEmpty').hidden = hasAnalyzed;
      document.getElementById('classificationResult').hidden = !hasAnalyzed;
      document.getElementById('classificationBadge').textContent = hasAnalyzed ? '분석 완료' : '분석 전';
      analysisOverview.hidden = !hasAnalyzed;
    }

    function runAnalysis() {
      hasAnalyzed = true;
      renderKeywordChips();
      updateAnalysisSummary();
      applyAnalysisState();
    }

    async function renderDashboardState() {
      const isProfileSaved = await hasSavedDatabaseProfile();
      profileNeededPanel.hidden = isProfileSaved;
      analysisDashboard.hidden = !isProfileSaved;
      applyAnalysisState();
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
        <article class="folder-item" data-folder-id="${escapeHtml(folder.id)}">
          <a class="folder-row" href="create.html?folder=${escapeHtml(folder.id)}" aria-label="${escapeHtml(folder.label)} 폴더를 파일 관리에서 열기">
            <span class="mini-folder ${folder.group}" aria-hidden="true"></span>
            <span class="folder-label">${escapeHtml(folder.label)}</span>
          </a>
        </article>
      `;
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

    document.addEventListener('click', (event) => {
      const infoButton = event.target.closest('.analysis-info-button');
      if (infoButton) {
        const infoBox = document.getElementById(infoButton.dataset.infoTarget);
        if (infoBox) infoBox.hidden = !infoBox.hidden;
      }
    });

    document.querySelector('[data-analysis-start]').addEventListener('click', () => {
      runAnalysis();
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
