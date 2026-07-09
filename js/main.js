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
    const TUTORIAL_SEEN_KEY = 'myfitfolioMainTutorialSeen';

    const mainLayout = document.getElementById('mainLayout');
    const tutorialPanel = document.getElementById('mainTutorialPanel');
    const tutorialToggle = document.getElementById('mainTutorialToggle');
    const tutorialBody = document.getElementById('mainTutorialBody');
    const profileNeededPanel = document.getElementById('profileNeededPanel');
    const analysisDashboard = document.getElementById('analysisDashboard');
    const analysisOverview = document.getElementById('analysisOverview');
    const analysisOverviewText = document.getElementById('analysisOverviewText');

    // 분석 시작 전에는 키워드 개요·활동 분류를 "분석이 필요합니다" 상태로 두고,
    // 분석 시작을 누르면 서버 종합 분석(/api/analysis/aggregate) 결과로 채운다.
    // 결과는 localStorage에도 저장해 포트폴리오 생성 화면이 재사용한다.
    const AI_KEYWORDS_STORAGE_KEY = 'myfitfolioAiKeywords';
    const AGGREGATE_ENDPOINT = '/api/analysis/aggregate';
    let aggregateResult = null;
    let hasAnalyzed = false;
    let analysisInFlight = false;

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

    function setTutorialOpen(isOpen) {
      if (!tutorialPanel || !tutorialToggle || !tutorialBody) return;
      tutorialPanel.classList.toggle('tutorial-collapsed', !isOpen);
      tutorialToggle.setAttribute('aria-expanded', String(isOpen));
      tutorialBody.hidden = !isOpen;
    }

    function initializeTutorialPanel() {
      if (!tutorialPanel || !tutorialToggle || !tutorialBody) return;
      const shouldOpen = localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
      setTutorialOpen(shouldOpen);
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');

      tutorialToggle.addEventListener('click', () => {
        const nextOpen = tutorialToggle.getAttribute('aria-expanded') !== 'true';
        setTutorialOpen(nextOpen);
      });
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
        folder.group === groupKey ? sum + getUserActivityFiles(folder).length : sum
      ), 0);
    }

    function getCompletedFileCount(folder) {
      return getUserActivityFiles(folder).length;
    }

    function getUserActivityFiles(folder) {
      return FolderStore.getFolderFiles(folder).filter((file) => file.kind !== 'analysis-summary');
    }

    function isAnalyzedActivityFile(file) {
      return file.status === '분석완료'
        || file.analysisStatus === 'completed'
        || file.analysis?.status === 'completed';
    }

    function hasAnalyzedActivityFiles() {
      return Object.values(folders).some((folder) => getUserActivityFiles(folder).some(isAnalyzedActivityFile));
    }

    function mapApiFile(file) {
      return {
        id: file.id,
        name: file.name,
        status: file.analysisStatus === 'completed' ? '분석완료' : '분석대기',
        analysisStatus: file.analysisStatus || null,
        analysis: file.analysis || null,
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
          const target = match?.subfolder
            || folders[file.projectId]?.subfolders?.[0]
            || folders[file.folderId]?.subfolders?.[0];
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
      const keywords = aggregateResult?.activityKeywords || [];
      document.getElementById('keywordChipList').innerHTML = keywords
        .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
        .join('');
    }

    // 분석 전/후 화면 전환. 키워드 개요는 하나의 섹션이며 상태에 따라 내용이 바뀐다(#166-3).
    // 분석 전에는 각 카드가 "분석이 필요합니다" 상태를 보여준다.
    function applyAnalysisState() {
      const hasAnalyzedFiles = hasAnalyzedActivityFiles();
      const shouldShowAnalysisCards = hasAnalyzed || hasAnalyzedFiles;
      const overview = document.getElementById('keywordOverview');
      overview.classList.toggle('keyword-overview-empty', !hasAnalyzed);
      document.getElementById('keywordChipList').hidden = !hasAnalyzed;
      document.getElementById('keywordOverviewHeading').textContent = hasAnalyzed && aggregateResult
        ? aggregateResult.headline || '활동 키워드 분석이 완료되었습니다'
        : '분석이 필요합니다';
      document.getElementById('keywordOverviewText').textContent = hasAnalyzed && aggregateResult
        ? aggregateResult.description || '분석된 자료를 기준으로 강점 키워드를 정리했습니다.'
        : '분석 시작을 누르면 완료된 활동 자료를 바탕으로 강점 키워드와 활동 개요를 정리해 드려요.';
      document.getElementById('analyzedMaterialEmpty').hidden = shouldShowAnalysisCards;
      document.getElementById('analyzedMaterialResult').hidden = !shouldShowAnalysisCards;
      document.getElementById('classificationEmpty').hidden = shouldShowAnalysisCards;
      document.getElementById('classificationResult').hidden = !shouldShowAnalysisCards;
      document.getElementById('classificationBadge').textContent = shouldShowAnalysisCards ? '분석 완료' : '분석 전';
      analysisOverview.hidden = false;
    }

    function applyAggregateResult(result) {
      aggregateResult = result;
      hasAnalyzed = true;
      localStorage.setItem(AI_KEYWORDS_STORAGE_KEY, JSON.stringify(result));
      renderKeywordChips();
      updateAnalysisSummary();
      applyAnalysisState();
    }

    // 종합 분석 실행. 분석 완료된 자료 전체를 모아 키워드 개요와
    // 포트폴리오 강조 키워드를 생성한다.
    async function runAnalysis() {
      if (analysisInFlight) return;
      analysisInFlight = true;
      const overviewText = document.getElementById('keywordOverviewText');
      overviewText.textContent = '완료된 활동 자료를 모아 AI가 분석하고 있습니다. 잠시만 기다려주세요.';

      try {
        const response = await fetch(AGGREGATE_ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (response.status === 401) {
          overviewText.textContent = '로그인이 필요합니다. 로그인 후 분석을 시작해주세요.';
          return;
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || '종합 분석 요청이 실패했습니다.');
        }

        if (payload.ok === false) {
          overviewText.textContent = payload.reason === 'no_data'
            ? '분석할 완료된 자료가 없습니다. 파일 관리에서 자료를 업로드하고 분석하기를 먼저 실행해주세요.'
            : '분석에 실패했습니다. 잠시 후 다시 시도해주세요.';
          return;
        }

        applyAggregateResult(payload.result);
      } catch (error) {
        console.warn('Aggregate analysis failed.', error);
        overviewText.textContent = '분석에 실패했습니다. 잠시 후 다시 시도해주세요.';
      } finally {
        analysisInFlight = false;
      }
    }

    // 저장된 종합 결과가 있으면 새로고침 후에도 분석 상태를 복원한다.
    async function restoreAggregateResult() {
      try {
        const response = await fetch(AGGREGATE_ENDPOINT, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.result) applyAggregateResult(payload.result);
      } catch (error) {
        console.warn('Saved aggregate result could not be restored.', error);
      }
    }

    async function renderDashboardState() {
      const isProfileSaved = await hasSavedDatabaseProfile();
      profileNeededPanel.hidden = isProfileSaved;
      analysisDashboard.hidden = !isProfileSaved;
      updateAnalysisSummary();
      applyAnalysisState();
    }

    function renderFolders() {
      FolderStore.saveFolders(folders);
      renderDashboardState();
    }


    async function initMainDashboard() {
      initializeTutorialPanel();
      folders = await FolderStore.loadFoldersFromApi();
      await loadActivityFilesFromApi();
      renderFolders();
      restoreAggregateResult();
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
