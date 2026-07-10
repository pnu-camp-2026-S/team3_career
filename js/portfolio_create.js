(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const PORTFOLIO_STORAGE_KEY = 'careerfit_portfolios';
    const PORTFOLIO_ENDPOINT = '/api/portfolios';
    const PORTFOLIO_PDF_PREVIEW_ENDPOINT = '/api/portfolio/render-pdf';
    const PDFJS_MODULE_URL = '/vendor/pdfjs/pdf.mjs';
    const PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.mjs';
    const PROFILE_ENDPOINT = '/api/profile';
    const PORTFOLIO_SOURCE_ENDPOINT = '/api/portfolio/source-data';
    const majorKeywordMap = {
      industrial: {
        label: '산업공학과',
        keywords: ['공정 최적화', 'SCM', '물류 효율화', '데이터 분석', '품질 관리', '운영 관리']
      },
      chemical: {
        label: '화학공학과',
        keywords: ['공정 설계', '스케일업', '반응 공학', '실험 설계', '품질 안전', '바이오 공정']
      },
      electrical: {
        label: '전기공학과',
        keywords: ['회로 설계', '전력 시스템', '임베디드', '제어 알고리즘', '센서 활용', '에너지 변환']
      },
      computer: {
        label: '컴퓨터공학과',
        keywords: ['소프트웨어 개발', '알고리즘', 'AI 모델링', '데이터 처리', 'API 설계', '서비스 구현']
      }
    };
    const majorAliasMap = {
      산업공학과: 'industrial',
      화공생명공학과: 'chemical',
      화학공학과: 'chemical',
      전기공학과: 'electrical',
      정보컴퓨터공학과: 'computer',
      컴퓨터공학과: 'computer'
    };
    let currentPortfolio = null;
    let chatHistory = [];
    let currentSlideIndex = 0;
    let currentDraftPageIndex = 0;
    let profileMajor = '';
    let profileData = {};
    let portfolioSourceFolders = [];
    let isPortfolioRevising = false;
    let pdfPreviewController = null;
    let pdfPreviewRequestId = 0;
    let pdfPreviewUnavailable = false;
    let pdfJsModulePromise = null;

    const formatSelect = document.getElementById('pfFormatSelect');
    const purposeSelect = document.getElementById('pfPurposeSelect');
    const majorDisplay = document.getElementById('pfMajorDisplay');
    const experienceDataList = document.getElementById('experienceDataList');
    const keywordPool = document.getElementById('keywordPool');
    const assistantInput = document.getElementById('pfAssistantInput');
    const assistantSendBtn = document.getElementById('pfAssistantSendBtn');
    const portfolioDraft = document.querySelector('.portfolio-draft');
    const portfolioRevisionOverlay = document.getElementById('portfolioRevisionOverlay');
    const editPortfolioId = new URLSearchParams(window.location.search).get('edit');

    document.querySelectorAll('.format-card:not(:disabled)').forEach((card) => {
      card.addEventListener('click', () => selectFormat(card.dataset.format));
    });

    experienceDataList.addEventListener('change', () => {
      renderKeywordPool();
    });
    document.getElementById('generatePortfolioBtn').addEventListener('click', triggerGeneratePortfolio);
    assistantSendBtn.addEventListener('click', sendPfAssistantChat);
    document.querySelector('.master-actions').addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-master-action]');
      if (!actionButton) return;
      await handleMasterAction(actionButton.dataset.masterAction);
    });
    document.getElementById('workspaceContent').addEventListener('click', (event) => {
      const pdfRetryButton = event.target.closest('[data-pdf-preview-retry]');
      if (pdfRetryButton) {
        pdfPreviewUnavailable = false;
        renderActualPdfPreview();
        return;
      }

      const draftPageButton = event.target.closest('[data-draft-page-direction]');
      if (draftPageButton) {
        if (draftPageButton.disabled) return;
        moveDraftPage(Number(draftPageButton.dataset.draftPageDirection));
        return;
      }

      const slideButton = event.target.closest('[data-slide-direction]');
      if (!slideButton) return;
      moveSlide(Number(slideButton.dataset.slideDirection));
    });
    assistantInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendPfAssistantChat();
      }
    });

    function selectFormat(format) {
      formatSelect.value = format;
      document.querySelectorAll('.format-card').forEach((card) => {
        const isSelected = card.dataset.format === format;
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-checked', String(isSelected));
      });
    }

    function getMajorKey(majorName) {
      return majorAliasMap[String(majorName || '').trim()] || 'industrial';
    }

    function getCurrentMajor() {
      const major = majorKeywordMap[getMajorKey(profileMajor)] || majorKeywordMap.industrial;
      return {
        ...major,
        label: profileMajor || major.label
      };
    }

    const keywordCompactRules = [
      { pattern: /환경\s*문제\s*리서치|환경\s*문제\s*조사|환경.*리서치|환경.*조사/, keyword: '환경 리서치' },
      { pattern: /비교\s*분석/, keyword: '비교 분석' },
      { pattern: /문제\s*정의/, keyword: '문제 정의' },
      { pattern: /문제\s*규모\s*분석|규모\s*분석/, keyword: '규모 분석' },
      { pattern: /한계\s*분석/, keyword: '한계 분석' },
      { pattern: /영향\s*정리/, keyword: '영향 정리' },
      { pattern: /항목\s*구조화|구조화/, keyword: '항목 구조화' },
      { pattern: /가정\s*설정/, keyword: '가정 설정' },
      { pattern: /주제\s*기획/, keyword: '주제 기획' },
      { pattern: /소재\s*제안/, keyword: '소재 제안' },
      { pattern: /아이디어\s*도출/, keyword: '아이디어 도출' },
      { pattern: /자료\s*분석|데이터\s*분석/, keyword: '데이터 분석' },
      { pattern: /공정\s*최적화/, keyword: '공정 최적화' },
      { pattern: /문제\s*해결/, keyword: '문제 해결' },
    ];
    const keywordStopWords = new Set([
      '기반',
      '관점',
      '관점의',
      '방식',
      '방식의',
      '기존',
      '사용',
      '활용',
      '대한',
      '관련',
      '중심',
      '위한',
      '통한',
    ]);

    function hasBlockedKeywordText(keyword) {
      return /\uC870\uC0AC/.test(String(keyword || ''));
    }

    function stripTrailingPostposition(text) {
      return String(text || '')
        .replace(/(\S+\s+\S+)\s+(?:과|와|은|는|이|가|을|를|의|에|로|으로|도|만|까지|부터|처럼|보다|에게|께|한테|랑|이랑|하고)$/u, '$1')
        .replace(/(\S+\s+\S+)(?:과|와|은|는|이|가|을|를|의|에|로|으로|도|만|까지|부터|처럼|보다|에게|께|한테|랑|이랑|하고)$/u, '$1')
        .trim();
    }

    function compactKeyword(keyword) {
      const text = stripTrailingPostposition(String(keyword || '')
        .replace(/[·ㆍ,;/|+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim());
      if (!text) return '';
      if (hasBlockedKeywordText(text)) return '';

      const matchedRule = keywordCompactRules.find((rule) => rule.pattern.test(text));
      if (matchedRule) return hasBlockedKeywordText(matchedRule.keyword) ? '' : matchedRule.keyword;

      const words = text.split(' ')
        .map((word) => word.replace(/의$/, ''))
        .filter((word) => word && !keywordStopWords.has(word));
      const compacted = words.slice(0, 2).join(' ');
      return compacted.length > 14 ? compacted.slice(0, 14).trim() : compacted;
    }

    function normalizeKeywordList(keywords) {
      return [...new Set((Array.isArray(keywords) ? keywords : [])
        .map(compactKeyword)
        .filter((keyword) => keyword && !hasBlockedKeywordText(keyword)))]
        .slice(0, 12);
    }

    function renderKeywordTags(keywords, { source = 'local' } = {}) {
      const uniqueKeywords = normalizeKeywordList(keywords);

      keywordPool.innerHTML = uniqueKeywords.map((keyword) => {
        const sourceClass = source === 'ai' ? ' ai-tag' : '';
        return `<button class="tag${sourceClass}" type="button" data-keyword="${escapeHtml(keyword)}" aria-pressed="false">${escapeHtml(keyword)}</button>`;
      }).join('');

      keywordPool.querySelectorAll('[data-keyword]').forEach((tag) => {
        tag.addEventListener('click', () => {
          tag.classList.toggle('selected');
          tag.setAttribute('aria-pressed', String(tag.classList.contains('selected')));
        });
      });
    }

    function getFolderSummaryKeywords(folder) {
      return Array.isArray(folder?.projectAnalysis?.summaryKeywords)
        ? folder.projectAnalysis.summaryKeywords
        : [];
    }

    function getSelectedProjectFolders() {
      const selectedIds = new Set(
        Array.from(document.querySelectorAll('.experience-option input:checked'))
          .map((input) => input.dataset.projectId)
      );
      return portfolioSourceFolders.filter((folder) => selectedIds.has(String(folder.id)));
    }

    function getSelectedExperienceLabels() {
      return getSelectedProjectFolders().map((folder) => folder.label);
    }

    function getSelectedExperienceProjects() {
      return getSelectedProjectFolders()
        .filter((folder) => folder.projectAnalysis)
        .map((folder) => ({
          projectId: folder.id,
          projectName: folder.projectAnalysis.projectName || folder.label,
          headline: folder.projectAnalysis.headline || '',
          description: folder.projectAnalysis.description || '',
          summaryMd: folder.projectAnalysis.summaryMd || '',
          summaryKeywords: getFolderSummaryKeywords(folder),
        }));
    }

    function renderKeywordPool() {
      const selectedFolders = getSelectedProjectFolders();

      if (!selectedFolders.length && portfolioSourceFolders.length) {
        keywordPool.innerHTML = '<p class="keyword-empty">프로젝트 폴더를 선택하면 분석 결과의 포트폴리오 키워드가 표시됩니다.</p>';
        return;
      }

      if (!selectedFolders.length) {
        keywordPool.innerHTML = '<p class="keyword-empty">파일 관리에서 프로젝트 폴더를 만든 뒤 AI 분석을 실행해 주세요.</p>';
        return;
      }

      const summaryKeywords = selectedFolders.flatMap(getFolderSummaryKeywords);
      if (!summaryKeywords.length) {
        keywordPool.innerHTML = '<p class="keyword-empty">선택한 폴더에 사용할 키워드가 없습니다. 파일 관리에서 AI 분석을 먼저 실행해 주세요.</p>';
        return;
      }

      renderKeywordTags(summaryKeywords, { source: 'ai' });
    }

    function getFolderMeta(folder) {
      const groupLabel = folder.group === 'completed' ? '완료' : folder.group === 'inProgress' ? '진행중' : folder.group;
      const typeLabel = folder.type || '기타';
      const summaryText = folder.projectAnalysis ? '포트폴리오 키워드 사용' : 'AI 분석 필요';
      return [groupLabel, typeLabel, summaryText].filter(Boolean).join(' · ');
    }

    function renderExperienceOptions() {
      if (!portfolioSourceFolders.length) {
        experienceDataList.innerHTML = '<p class="experience-empty">파일 관리에서 프로젝트 폴더를 만들고 자료를 업로드하면 이곳에서 선택할 수 있습니다.</p>';
        renderKeywordPool();
        return;
      }

      experienceDataList.innerHTML = portfolioSourceFolders.map((folder) => {
        const label = folder.label || '이름 없는 프로젝트 폴더';
        const meta = getFolderMeta(folder);
        return `
          <label class="experience-option">
            <input type="checkbox" value="${escapeHtml(label)}" data-project-id="${escapeHtml(folder.id)}" />
            <span>
              <strong>${escapeHtml(label)}</strong>
              ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
            </span>
          </label>
        `;
      }).join('');

      renderKeywordPool();
    }

    async function loadProfileMajor() {
      try {
        const response = await window.MyfitfolioCache.cachedGet(PROFILE_ENDPOINT, { ttlMs: 20000 });
        if (!response.ok) throw new Error('Profile load failed.');

        const result = await response.json();
        profileData = result.profile || {};
        const educations = Array.isArray(result.profile?.educations) ? result.profile.educations : [];
        profileMajor = educations.find((education) => education?.major)?.major || '';
      } catch (error) {
        console.warn('Profile major load failed.', error);
        profileData = {};
        profileMajor = '';
      }

      if (majorDisplay) {
        majorDisplay.dataset.majorValue = profileMajor;
        majorDisplay.textContent = profileMajor || '마이페이지 전공 입력 필요';
      }
    }

    async function loadExperienceData() {
      try {
        const response = await fetch(PORTFOLIO_SOURCE_ENDPOINT, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('Portfolio source data load failed.');

        const result = await response.json();
        portfolioSourceFolders = Array.isArray(result.folders) ? result.folders : [];
      } catch (error) {
        console.warn('Portfolio source data API load failed.', error);
        portfolioSourceFolders = [];
      }

      renderExperienceOptions();
    }

    async function loadPortfolioSetupData() {
      await Promise.all([loadProfileMajor(), loadExperienceData()]);
      renderKeywordPool();
    }

    function getSelectedKeywords() {
      return normalizeKeywordList(Array.from(document.querySelectorAll('[data-keyword].selected'))
        .map((tag) => tag.textContent));
    }

    async function triggerGeneratePortfolio() {
      const format = formatSelect.value;
      const purpose = purposeSelect.value;
      const major = getCurrentMajor();
      const experiences = getSelectedExperienceLabels();
      const experienceProjects = getSelectedExperienceProjects();
      const projectIds = getSelectedProjectFolders().map((folder) => String(folder.id));
      const keywords = getSelectedKeywords();

      if (!keywords.length) {
        showToast('강조할 AI 역량 키워드를 선택해주세요!');
        keywordPool.classList.add('keyword-pool-alert');
        window.setTimeout(() => keywordPool.classList.remove('keyword-pool-alert'), 900);
        return;
      }

      const portfolioShell = buildPortfolioShell({ format, purpose, major, experiences, experienceProjects, keywords });

      cancelPdfPreviewRequest();
      currentPortfolio = null;
      currentSlideIndex = 0;
      currentDraftPageIndex = 0;
      chatHistory = [];

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.remove('hidden');
      document.getElementById('workspaceTitle').textContent = `${format} 초안`;
      await startLoadingProgress(async () => {
        try {
          const aiDraft = await requestPortfolioGeneration({ format, purpose, major: major.label, experiences, experienceProjects, projectIds, keywords });
          currentPortfolio = normalizeGeneratedPortfolio(aiDraft, portfolioShell);
          currentDraftPageIndex = 0;
          showToast(currentPortfolio.sourceLabel === '목데이터 생성'
            ? '목데이터로 초안을 생성했습니다.'
            : 'ChatGPT API로 초안을 생성했습니다.');
          renderPortfolioPreview();
        } catch (error) {
          console.warn('OpenAI portfolio generation failed.', error);
          currentPortfolio = {
            ...portfolioShell,
            blocks: [],
            slides: [],
            raw: null,
            sourceLabel: 'ChatGPT 실패',
            errorMessage: error.message || 'ChatGPT API 호출에 실패했습니다.',
            updatedAt: new Date().toISOString(),
          };
          renderPortfolioError(currentPortfolio.format, currentPortfolio.errorMessage);
          showToast('ChatGPT API 생성에 실패했습니다.');
        }
      });

      document.getElementById('pfLoadingScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.remove('hidden');
    }

    async function startLoadingProgress(onComplete) {
      const progressBar = document.getElementById('loadingProgressBar');
      const progressText = document.getElementById('loadingProgressText');
      const startedAt = Date.now();
      let currentProgress = 0;

      function setProgress(value) {
        currentProgress = Math.max(currentProgress, Math.min(100, Math.round(value)));
        progressBar.style.width = `${currentProgress}%`;
        progressText.textContent = `${currentProgress}%`;
      }

      setProgress(0);

      const timer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const easedProgress = 12 + (1 - Math.exp(-elapsed / 1800)) * 78;
        setProgress(Math.min(92, easedProgress));
      }, 80);

      try {
        await onComplete();
      } finally {
        window.clearInterval(timer);
        setProgress(100);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    }

    function buildPortfolioShell({ format, purpose, major, experiences, experienceProjects = [], keywords }) {
      return {
        id: `portfolio-${Date.now()}`,
        format,
        purpose,
        major: major.label || major,
        experiences,
        experienceProjects,
        keywords,
        sourceLabel: 'ChatGPT 생성',
        updatedAt: new Date().toISOString(),
      };
    }

    function readMyPageInfo() {
      if (profileData && Object.keys(profileData).length) return profileData;

      const storageKeys = ['careerfit_mypage', 'myfitfolio_mypage', 'mypage_profile', 'userProfile'];
      for (const key of storageKeys) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {
          // 저장 형식이 다르면 다음 후보를 확인합니다.
        }
      }
      return {};
    }

    async function requestPortfolioGeneration({ format, purpose, major, experiences, experienceProjects, projectIds, keywords }) {
      const response = await fetch('/api/portfolio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          format,
          purpose,
          major,
          experiences,
          experienceProjects,
          projectIds,
          keywords,
          myPageInfo: readMyPageInfo(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `ChatGPT API 요청 실패: ${response.status}`);
      }
      return payload.data || payload;
    }

    async function requestPortfolioRevision(revisionRequest) {
      const response = await fetch('/api/portfolio/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          currentDraft: currentPortfolio,
          revisionRequest,
          chatHistory,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `ChatGPT 수정 요청 실패: ${response.status}`);
      }
      return payload.data || payload;
    }

    function normalizeTextBlocks(blocks) {
      return (Array.isArray(blocks) ? blocks : [])
        .map((block, index) => ({
          title: block.title || `${index + 1}. 포트폴리오 섹션`,
          body: block.body || block.description || '',
        }))
        .filter((block) => block.title || block.body);
    }

    function normalizeGeneratedPortfolio(aiDraft, shell) {
      const blocks = normalizeTextBlocks(aiDraft.blocks);
      const slides = normalizeTextBlocks(aiDraft.slides);

      return {
        ...shell,
        title: aiDraft.title || `${shell.format} - ${shell.purpose}`,
        summary: aiDraft.summary || blocks[0]?.body || '',
        blocks: blocks.length ? blocks : buildPortfolioDraft(shell).blocks,
        slides: slides.length ? slides : buildSlides(shell.format, shell.purpose, shell.major, shell.experiences, shell.keywords),
        competencies: aiDraft.competencies || [],
        applicationSentences: aiDraft.applicationSentences || [],
        raw: aiDraft.raw || null,
        sourceLabel: aiDraft.sourceLabel || 'ChatGPT 생성',
        updatedAt: new Date().toISOString(),
      };
    }

    function applyRevisionToCurrentPortfolio(revised) {
      const nextBlocks = normalizeTextBlocks(revised.blocks);
      const nextSlides = normalizeTextBlocks(revised.slides);

      if (nextBlocks.length) currentPortfolio.blocks = nextBlocks;
      if (nextSlides.length) currentPortfolio.slides = nextSlides;
      if (nextBlocks[0]?.body) currentPortfolio.summary = nextBlocks[0].body;
      if (currentPortfolio.raw) {
        currentPortfolio.raw = mergeRawPortfolioText(currentPortfolio.raw, nextBlocks, nextSlides);
      }

      currentPortfolio.sourceLabel = 'ChatGPT 수정';
      currentPortfolio.updatedAt = new Date().toISOString();
    }

    function mergeRawPortfolioText(raw, blocks, slides) {
      const nextRaw = JSON.parse(JSON.stringify(raw || {}));
      if (nextRaw.problem_definition || nextRaw.design_process || nextRaw.implementation || nextRaw.result) {
        mergeCaseStudyRaw(nextRaw, blocks);
      } else if (nextRaw.basic_info || nextRaw.core_competencies || nextRaw.experiences) {
        mergeOnePageRaw(nextRaw, blocks);
      } else if (nextRaw.cover || nextRaw.contents || nextRaw.project_list) {
        mergeDeckRaw(nextRaw, blocks, slides);
      } else if (nextRaw.items || nextRaw.core_summary) {
        mergeCoverLetterRaw(nextRaw, blocks);
      }
      return nextRaw;
    }

    function splitRevisionLines(value) {
      return String(value || '')
        .split(/\n+|[•·]\s*/)
        .map((line) => line.replace(/^[-*\d.\s:]+/, '').trim())
        .filter(Boolean);
    }

    function toCompetencyItems(lines) {
      return lines.map((line) => {
        const [title, ...rest] = line.split(/\s*[:：]\s*/);
        return {
          title: title || line,
          description: rest.join(': ') || line,
        };
      });
    }

    function mergeCaseStudyRaw(raw, blocks) {
      const [overview, problem, process, implementation, result, reflection] = blocks;
      if (overview?.title) raw.project_title = overview.title;
      if (overview?.body) {
        raw.selection_reason = overview.body;
        raw.headline = overview.body;
      }

      const problemLines = splitRevisionLines(problem?.body);
      raw.problem_definition = raw.problem_definition || {};
      if (problemLines[0]) raw.problem_definition.background = problemLines[0];
      if (problemLines[1]) raw.problem_definition.goal = problemLines[1];

      raw.design_process = raw.design_process || {};
      const processLines = splitRevisionLines(process?.body);
      if (processLines.length) raw.design_process.approach_steps = processLines.slice(0, 5);

      raw.implementation = raw.implementation || {};
      const implementationLines = splitRevisionLines(implementation?.body);
      if (implementationLines.length) raw.implementation.my_contribution = implementationLines.slice(0, 5);

      raw.result = raw.result || {};
      const resultLines = splitRevisionLines(result?.body);
      if (resultLines[0]) raw.result.quantitative_result = resultLines[0];
      if (resultLines[1]) raw.result.qualitative_result = resultLines.slice(1).join(' ');

      raw.reflection = raw.reflection || {};
      if (reflection?.body) raw.reflection.learned = reflection.body;
    }

    function mergeOnePageRaw(raw, blocks) {
      if (blocks[0]?.body) raw.headline = blocks[0].body;
      const competencyLines = splitRevisionLines(blocks[2]?.body || blocks[1]?.body);
      const experienceLines = splitRevisionLines(blocks[3]?.body || blocks[2]?.body);
      const skillLines = splitRevisionLines(blocks[4]?.body);
      if (competencyLines.length) raw.core_competencies = toCompetencyItems(competencyLines);
      if (experienceLines.length) {
        raw.experiences = experienceLines.map((line) => ({
          project: line,
          role: '',
          highlight: line,
        }));
      }
      if (skillLines.length) raw.skills = skillLines;
    }

    function mergeDeckRaw(raw, blocks, slides) {
      const nextSlides = slides.length ? slides : blocks;
      raw.cover = raw.cover || {};
      if (nextSlides[0]?.title) raw.cover.headline = nextSlides[0].title;
      if (nextSlides.length) raw.contents = nextSlides.map((slide) => slide.title).filter(Boolean);
    }

    function mergeCoverLetterRaw(raw, blocks) {
      if (blocks[0]?.title) raw.name_title = blocks[0].title;
      if (blocks[0]?.body) {
        raw.core_summary = raw.core_summary || {};
        raw.core_summary.competency = blocks[0].body;
      }
      const items = blocks.slice(1).map((block) => ({
        question_title: block.title,
        question_reason: '사용자 수정 요청 반영',
        answer: block.body,
      })).filter((item) => item.question_title || item.answer);
      if (items.length) raw.items = items;
    }

    function buildPortfolioDraft({ format, purpose, major, experiences, keywords }) {
      const experienceText = experiences.length ? experiences.join(', ') : '선택한 경험 없음';
      const keywordText = keywords.length ? keywords.join(', ') : '강조 키워드 없음';
      const majorLabel = typeof major === 'string' ? major : major.label;

      const blocks = [
        {
          title: '1. 포트폴리오 목적',
          body: `${purpose}에 맞춰 ${format} 구조로 구성했습니다. 첫 화면에서 핵심 역량과 대표 경험이 빠르게 보이도록 설계했습니다.`
        },
        {
          title: '2. 전공 기반 역량 재해석',
          body: `${majorLabel} 관점에서 ${keywordText} 역량이 드러나도록 경험을 재배치했습니다. 전공 적합성과 AI 활용 역량을 함께 읽히는 흐름입니다.`
        },
        {
          title: '3. 반영 경험',
          body: `${experienceText}을 중심으로 문제 정의, 실행 과정, 역할, 결과를 STAR 흐름에 맞게 정리했습니다.`
        },
        {
          title: '4. 다음 보완 방향',
          body: '정량 성과, 사용 기술, 팀 내 기여도를 더 구체화하면 제출 완성도가 높아집니다.'
        }
      ];

      return {
        id: `portfolio-${Date.now()}`,
        format,
        purpose,
        major: majorLabel,
        experiences,
        keywords,
        blocks,
        slides: buildSlides(format, purpose, majorLabel, experiences, keywords),
        updatedAt: new Date().toISOString()
      };
    }

    function buildSlides(format, purpose, major, experiences, keywords) {
      const mainExperience = experiences[0] || '대표 프로젝트 경험';
      const keyFocus = keywords.slice(0, 3).join(', ') || '핵심 역량';

      return [
        {
          title: `${purpose} 포트폴리오`,
          body: `${major} 전공 기반의 경험과 AI 역량을 발표 흐름에 맞춰 정리한 ${format} 초안입니다.`
        },
        {
          title: '핵심 역량 요약',
          body: `${keyFocus}을 중심으로 지원 목적과 연결되는 강점을 먼저 제시합니다.`
        },
        {
          title: '대표 경험',
          body: `${mainExperience}을 문제 정의, 실행, 결과 순서로 압축해 설명합니다.`
        },
        {
          title: '성과 및 보완 방향',
          body: '정량 성과와 후속 개선 계획을 함께 배치해 성장 가능성과 실행력을 강조합니다.'
        }
      ];
    }

    function chunkItems(items, size) {
      const list = Array.isArray(items) ? items : [];
      return Array.from({ length: Math.ceil(list.length / size) || 1 }, (_, index) =>
        list.slice(index * size, index * size + size)
      );
    }

    function renderDraftPageViewer(pages) {
      const safePages = pages.filter(Boolean);
      const pageCount = safePages.length || 1;
      currentDraftPageIndex = Math.max(0, Math.min(currentDraftPageIndex, pageCount - 1));
      const isFirstPage = currentDraftPageIndex === 0;
      const isLastPage = currentDraftPageIndex === pageCount - 1;

      return `
        <div class="draft-page-viewer">
          <button class="draft-page-arrow prev" type="button" aria-label="이전 페이지" data-draft-page-direction="-1" ${isFirstPage ? 'disabled' : ''}>&lt;</button>
          <div class="draft-page-frame">
            ${safePages[currentDraftPageIndex] || safePages[0] || ''}
          </div>
          <button class="draft-page-arrow next" type="button" aria-label="다음 페이지" data-draft-page-direction="1" ${isLastPage ? 'disabled' : ''}>&gt;</button>
        </div>
        <div class="draft-page-counter">${currentDraftPageIndex + 1} / ${pageCount}</div>
      `;
    }

    function renderPlainDraftPage(blocks) {
      return blocks.map((block) => `
        <div class="portfolio-block">
          <h3>${escapeHtml(block.title)}</h3>
          <p>${escapeHtml(block.body)}</p>
        </div>
      `).join('');
    }

    function normalizePptxPreviewText(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function normalizePptxPreviewBlocks(portfolio) {
      const source = portfolio.format === 'PPT 발표 스펙' ? portfolio.slides : portfolio.blocks;
      const blocks = Array.isArray(source) ? source : [];
      if (blocks.length) {
        return blocks.map((block, index) => ({
          title: normalizePptxPreviewText(block.title) || `섹션 ${index + 1}`,
          body: normalizePptxPreviewText(block.body || block.description),
        }));
      }
      return [{
        title: normalizePptxPreviewText(portfolio.title || portfolio.format || '포트폴리오 초안'),
        body: normalizePptxPreviewText(portfolio.summary || '생성된 포트폴리오 초안입니다.'),
      }];
    }

    function createPptxMatchedPreviewSlides(portfolio) {
      if (portfolio.format === '1페이지 요약본') return [createOnePagePptxPreviewSlide(portfolio)];
      const blocks = normalizePptxPreviewBlocks(portfolio);
      const keywords = normalizeKeywordList(portfolio.keywords).slice(0, 3);
      return [
        {
          type: 'overview',
          eyebrow: normalizePptxPreviewText(portfolio.format || 'Portfolio'),
          title: normalizePptxPreviewText(portfolio.title || `${portfolio.format || '포트폴리오'} - ${portfolio.purpose || ''}`),
          subtitle: `${normalizePptxPreviewText(portfolio.major || '전공 정보')} / ${normalizePptxPreviewText(portfolio.purpose || '생성 목적')}`,
          meta: [
            ['형식', portfolio.format],
            ['전공', portfolio.major],
            ['키워드', keywords.join(', ')],
          ].filter(([, value]) => normalizePptxPreviewText(value)),
          cards: blocks.slice(0, 4),
        },
        ...blocks.slice(0, 5).map((block, index) => ({
          type: 'detail',
          eyebrow: `Slide ${index + 2}`,
          title: block.title,
          subtitle: normalizePptxPreviewText(portfolio.title || `${portfolio.format || '포트폴리오'} 초안`),
          body: block.body,
        })),
      ];
    }

    function createOnePagePptxPreviewSlide(portfolio) {
      const raw = portfolio.raw || {};
      const profile = raw.profile || raw.basic_info || {};
      const headline = raw.headline || {};
      const competencies = raw.core_competencies || [];
      const experiences = raw.representative_experiences || raw.experiences || [];
      const skills = raw.skill_keywords || raw.skills || normalizeKeywordList(portfolio.keywords);
      const targetFit = raw.target_fit || {};
      return {
        type: 'onepage',
        eyebrow: 'PORTFOLIO SUMMARY',
        title: normalizePptxPreviewText(headline.title || raw.headline || portfolio.title || '1페이지 요약본'),
        body: normalizePptxPreviewText(headline.one_line_intro || portfolio.summary || '승인된 활동 근거를 바탕으로 구성한 1페이지 요약본입니다.'),
        profile: [
          ['이름', profile.name],
          ['학교', [profile.school_name || profile.school, profile.school_type].filter(Boolean).join(' / ')],
          ['전공', profile.major || portfolio.major],
          ['이메일', profile.email],
        ].filter(([, value]) => normalizePptxPreviewText(value)),
        target: [
          ['ROLE', targetFit.role?.value],
          ['INDUSTRY', targetFit.industry?.value],
          ['COMPANY', targetFit.company?.value],
        ].filter(([, value]) => normalizePptxPreviewText(value)),
        competencies: competencies.map((item) => item.text || `${item.title || ''} ${item.description || ''}`.trim()).filter(Boolean).slice(0, 3),
        experiences: experiences.map((item) => ({
          title: item.title || item.project || '대표 경험',
          body: item.summary || item.highlight || item.role || '근거 보완 필요',
        })).slice(0, 3),
        skills: normalizeKeywordList(skills.map((item) => typeof item === 'string' ? item : item.text).filter(Boolean)).slice(0, 8),
      };
    }

    function renderPptxMatchedPreview() {
      const slides = createPptxMatchedPreviewSlides(currentPortfolio);
      const pages = slides.map((slide, index) => `
        <article class="pptx-preview-page ${slide.type === 'onepage' ? 'portrait' : ''}" aria-label="PPT 슬라이드 ${index + 1} 미리보기">
          <canvas
            class="pptx-preview-canvas"
            data-pptx-preview-index="${index}"
            width="${slide.type === 'onepage' ? 900 : 1600}"
            height="${slide.type === 'onepage' ? 1272 : 900}"
          ></canvas>
        </article>
      `);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
      drawPptxPreviewCanvases(slides);
    }

    function cancelPdfPreviewRequest() {
      pdfPreviewRequestId += 1;
      if (pdfPreviewController) {
        pdfPreviewController.abort();
        pdfPreviewController = null;
      }
    }

    function createPdfPreviewPayload(portfolio) {
      return {
        id: portfolio.id,
        title: portfolio.title,
        summary: portfolio.summary,
        content: portfolio.content,
        format: portfolio.format,
        purpose: portfolio.purpose,
        major: portfolio.major,
        experiences: portfolio.experiences || [],
        keywords: normalizeKeywordList(portfolio.keywords),
        blocks: portfolio.blocks || [],
        slides: portfolio.slides || [],
        raw: portfolio.raw || null,
      };
    }

    function renderPdfPreviewLoading() {
      document.getElementById('workspaceContent').innerHTML = `
        <div class="portfolio-pdf-preview-state" aria-live="polite">
          <span class="portfolio-pdf-spinner" aria-hidden="true"></span>
          <strong>실제 PPT를 PDF로 변환하는 중입니다.</strong>
          <p>변환 워커가 준비되면 생성된 PDF 미리보기를 바로 표시합니다.</p>
        </div>
      `;
    }

    function renderPdfPreviewError(message) {
      document.getElementById('workspaceContent').innerHTML = `
        <div class="portfolio-pdf-preview-state is-error" role="alert">
          <strong>PDF 미리보기를 표시하지 못했습니다.</strong>
          <p>${escapeHtml(message || '잠시 후 다시 시도해 주세요.')}</p>
          <button type="button" class="portfolio-pdf-retry-button" data-pdf-preview-retry>
            다시 시도
          </button>
        </div>
      `;
    }

    async function loadPdfJsModule() {
      if (!pdfJsModulePromise) {
        pdfJsModulePromise = import(PDFJS_MODULE_URL).then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          return pdfjs;
        }).catch((error) => {
          pdfJsModulePromise = null;
          throw error;
        });
      }
      return pdfJsModulePromise;
    }

    async function renderPdfPreviewDocument(source, requestId) {
      const pdfjs = await loadPdfJsModule();
      if (requestId !== pdfPreviewRequestId) return;

      const loadingTask = pdfjs.getDocument(source);
      const pdfDocument = await loadingTask.promise;

      try {
        if (requestId !== pdfPreviewRequestId) return;
        document.getElementById('workspaceContent').innerHTML = `
          <div class="portfolio-pdf-preview" aria-label="실제 변환 PDF 미리보기">
            <div class="portfolio-pdf-pages" role="list"></div>
          </div>
        `;

        const pagesContainer = document.querySelector('.portfolio-pdf-pages');
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (requestId !== pdfPreviewRequestId) return;

          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          const pageElement = document.createElement('article');
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });

          pageElement.className = 'portfolio-pdf-page';
          pageElement.setAttribute('role', 'listitem');
          pageElement.setAttribute('aria-label', `PDF ${pageNumber}페이지`);
          canvas.className = 'portfolio-pdf-page-canvas';
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          pageElement.appendChild(canvas);
          pagesContainer.appendChild(pageElement);

          await page.render({
            canvasContext: context,
            viewport,
            transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;
        }
      } finally {
        await pdfDocument.destroy();
      }
    }

    async function renderActualPdfPreview() {
      if (!currentPortfolio) return;
      if (pdfPreviewUnavailable) {
        renderPptxMatchedPreview();
        return;
      }

      const requestId = pdfPreviewRequestId + 1;
      pdfPreviewRequestId = requestId;
      if (pdfPreviewController) pdfPreviewController.abort();
      pdfPreviewController = new AbortController();
      renderPdfPreviewLoading();

      try {
        const response = await fetch(PORTFOLIO_PDF_PREVIEW_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(createPdfPreviewPayload(currentPortfolio)),
          signal: pdfPreviewController.signal,
        });

        if (requestId !== pdfPreviewRequestId) return;
        if (response.status === 503) {
          pdfPreviewUnavailable = true;
          renderPptxMatchedPreview();
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'PDF preview render failed.');
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          if (!payload.pdfUrl) throw new Error('PDF preview URL is missing.');
          await renderPdfPreviewDocument({ url: payload.pdfUrl }, requestId);
          return;
        }

        const pdfBuffer = await response.arrayBuffer();
        if (!pdfBuffer.byteLength) throw new Error('PDF preview response is empty.');
        await renderPdfPreviewDocument({ data: new Uint8Array(pdfBuffer) }, requestId);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.warn('Portfolio PDF preview could not be displayed.', error);
        renderPdfPreviewError(error.message);
      } finally {
        if (requestId === pdfPreviewRequestId) pdfPreviewController = null;
      }
    }

    function drawPptxPreviewCanvases(slides) {
      document.querySelectorAll('[data-pptx-preview-index]').forEach((canvas) => {
        const slide = slides[Number(canvas.dataset.pptxPreviewIndex)];
        if (!slide) return;
        const context = canvas.getContext('2d');
        if (slide.type === 'onepage') drawOnePagePptxPreview(context, slide, canvas.width, canvas.height);
        else drawWidePptxPreview(context, slide, canvas.width, canvas.height);
      });
    }

    function drawRoundRect(context, x, y, width, height, radius) {
      const safeRadius = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x + safeRadius, y);
      context.arcTo(x + width, y, x + width, y + height, safeRadius);
      context.arcTo(x + width, y + height, x, y + height, safeRadius);
      context.arcTo(x, y + height, x, y, safeRadius);
      context.arcTo(x, y, x + width, y, safeRadius);
      context.closePath();
    }

    function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
      const words = normalizePptxPreviewText(text).split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (context.measureText(nextLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = nextLine;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, maxLines).forEach((item, index) => context.fillText(item, x, y + index * lineHeight));
    }

    function drawPptxPill(context, text, x, y, width) {
      if (!text) return;
      context.fillStyle = '#eef4ff';
      context.strokeStyle = '#d6e4ff';
      context.lineWidth = 2;
      drawRoundRect(context, x, y, width, 42, 16);
      context.fill();
      context.stroke();
      context.fillStyle = '#3156e8';
      context.font = '700 18px Malgun Gothic, Arial, sans-serif';
      context.fillText(normalizePptxPreviewText(text).slice(0, 22), x + 18, y + 27);
    }

    function drawPptxCard(context, block, x, y, width, height, compact = false) {
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#d8e2f5';
      context.lineWidth = 2;
      drawRoundRect(context, x, y, width, height, 18);
      context.fill();
      context.stroke();
      context.fillStyle = '#101828';
      context.font = `${compact ? '800 20px' : '800 25px'} Malgun Gothic, Arial, sans-serif`;
      drawWrappedText(context, block.title, x + 28, y + (compact ? 42 : 50), width - 56, 30, compact ? 1 : 2);
      context.fillStyle = '#344054';
      context.font = `${compact ? '500 18px' : '500 20px'} Malgun Gothic, Arial, sans-serif`;
      drawWrappedText(context, block.body, x + 28, y + (compact ? 82 : 112), width - 56, compact ? 29 : 34, compact ? 3 : 5);
    }

    function drawWidePptxPreview(context, slide, width, height) {
      context.fillStyle = slide.type === 'overview' ? '#f5f7fb' : '#f8fafc';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#dbe4f4';
      context.lineWidth = 2;
      drawRoundRect(context, 34, 30, width - 68, height - 60, 22);
      context.fill();
      context.stroke();
      drawPptxPill(context, slide.eyebrow, 78, 76, slide.type === 'overview' ? 198 : 138);
      context.fillStyle = '#101828';
      context.font = '900 48px Malgun Gothic, Arial, sans-serif';
      drawWrappedText(context, slide.title, 78, 170, 1320, 58, 2);

      if (slide.type === 'overview') {
        context.fillStyle = '#667085';
        context.font = '600 24px Malgun Gothic, Arial, sans-serif';
        context.fillText(slide.subtitle || '', 80, 270);
        context.strokeStyle = '#101828';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(78, 300);
        context.lineTo(1460, 300);
        context.stroke();
        slide.meta.forEach(([label, value], index) => {
          drawPptxCard(context, { title: label, body: normalizePptxPreviewText(value) }, 82 + index * 474, 336, 410, 95, true);
        });
        [[82, 474, 670, 160], [804, 474, 670, 160], [82, 666, 670, 160], [804, 666, 670, 160]]
          .forEach((position, index) => {
            if (slide.cards[index]) drawPptxCard(context, slide.cards[index], ...position, true);
          });
        return;
      }

      context.fillStyle = '#667085';
      context.font = '600 24px Malgun Gothic, Arial, sans-serif';
      context.fillText(slide.subtitle || '', 80, 250);
      drawPptxCard(context, { title: '핵심 내용', body: slide.body }, 90, 330, 1420, 420);
    }

    function drawOnePagePptxPreview(context, slide, width, height) {
      context.fillStyle = '#f7faf9';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#d8e7e3';
      context.lineWidth = 2;
      drawRoundRect(context, 34, 34, width - 68, height - 68, 24);
      context.fill();
      context.stroke();
      context.fillStyle = '#2f766d';
      context.font = '900 20px Malgun Gothic, Arial, sans-serif';
      context.fillText(slide.eyebrow, 74, 96);
      context.fillStyle = '#111827';
      context.font = '900 38px Malgun Gothic, Arial, sans-serif';
      drawWrappedText(context, slide.title, 74, 150, 720, 48, 2);
      context.fillStyle = '#4b5563';
      context.font = '600 22px Malgun Gothic, Arial, sans-serif';
      drawWrappedText(context, slide.body, 74, 260, 720, 34, 3);
      drawPptxCard(context, { title: 'ABOUT ME', body: slide.profile.map(([label, value]) => `${label}: ${value}`).join(' / ') || '프로필 정보 보완 필요' }, 74, 380, 350, 160, true);
      drawPptxCard(context, { title: 'TARGET FIT', body: slide.target.map(([label, value]) => `${label}: ${value}`).join(' / ') || '목표 직무 정보 보완 필요' }, 476, 380, 350, 160, true);
      drawPptxCard(context, { title: 'CORE COMPETENCIES', body: slide.competencies.join(' / ') || '역량 정보 보완 필요' }, 74, 582, 752, 180, true);
      slide.experiences.forEach((item, index) => drawPptxCard(context, item, 74 + index * 252, 804, 224, 180, true));
      drawPptxCard(context, { title: 'SKILL KEYWORDS', body: slide.skills.join(' / ') || '키워드 보완 필요' }, 74, 1028, 752, 150, true);
    }

    function renderPortfolioPreview() {
      if (!currentPortfolio) return;

      document.getElementById('workspaceTitle').textContent = `${currentPortfolio.format} 초안`;
      document.getElementById('workspaceSubtitle').textContent = `${currentPortfolio.major} / ${currentPortfolio.purpose} 기준으로 생성한 초안입니다.`;
      document.getElementById('workspaceBadge').textContent = '실제 PDF 미리보기';
      renderActualPdfPreview();
    }

    function renderPortfolioError(format, message) {
      document.getElementById('workspaceTitle').textContent = `${format} 생성 실패`;
      document.getElementById('workspaceSubtitle').textContent = '환경변수 또는 ChatGPT API 응답을 확인해 주세요.';
      document.getElementById('workspaceBadge').textContent = 'ChatGPT 실패';
      document.getElementById('workspaceContent').innerHTML = `
        <div class="portfolio-block">
          <h3>ChatGPT API 응답을 받아오지 못했습니다.</h3>
          <p>${escapeHtml(message)}</p>
        </div>
      `;
    }

    function renderPortfolioImagePreview() {
      const raw = currentPortfolio.raw || {};
      if (currentPortfolio.format === '1페이지 요약본') {
        renderOnePagePortfolio(raw);
        return;
      }
      if (currentPortfolio.format === '상세 기술 포트폴리오') {
        renderCaseStudyPortfolio(raw);
        return;
      }
      if (currentPortfolio.format === 'PPT 발표 스펙') {
        renderDeckPortfolio(raw);
        return;
      }
      if (currentPortfolio.format === '자기소개서 연결형') {
        renderCoverLetterPortfolio(raw);
        return;
      }
      const pages = chunkItems(currentPortfolio.blocks, 3).map(renderPlainDraftPage);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
    }

    function renderOnePagePortfolio(raw) {
      const info = raw.profile || raw.basic_info || {};
      const headline = raw.headline || {};
      const targetFit = raw.target_fit || {};
      const competencies = raw.core_competencies || [];
      const experiences = raw.representative_experiences || raw.experiences || [];
      const skillKeywords = raw.skill_keywords || raw.skills || normalizeKeywordList(currentPortfolio.keywords);
      const educationItems = raw.license_awards_education || raw.licenses_and_awards || [];
      const differentiator = raw.differentiator || {};
      const title = headline.title || raw.headline || currentPortfolio.title || '1페이지 요약본';
      const intro = headline.one_line_intro || currentPortfolio.summary || '승인된 근거를 바탕으로 구성한 1페이지 요약본입니다.';
      const selfIntro = headline.self_intro || headline.fit_label || '';
      const profileRows = [
        ['이름', info.name],
        ['성별', info.gender],
        ['생년월일', info.birth || info.birth_date],
        ['이메일', info.email],
        ['휴대폰', info.phone],
        ['주소', info.address],
        ['학교', [info.school_name || info.school, info.school_type].filter(Boolean).join(' / ')],
        ['전공', info.major || currentPortfolio.major],
        ['부전공', info.minor],
      ];
      const targetRows = [
        ['ROLE', targetFit.role?.value],
        ['INDUSTRY', targetFit.industry?.value],
        ['COMPANY', targetFit.company?.value],
      ];
      const skillTexts = normalizeKeywordList(skillKeywords.map((item) => typeof item === 'string' ? item : item.text).filter(Boolean));
      const educationTexts = educationItems.map((item) => {
        if (typeof item === 'string') return item;
        return item.text || [item.year, item.title].filter(Boolean).join(' ');
      }).filter(Boolean);
      const experienceCards = experiences.slice(0, 3);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer([`
        <article class="portfolio-canvas onepage-summary-canvas">
          <div class="onepage-top">
            <section class="onepage-profile-visual">
              ${info.profile_image_path
                ? `<img src="${escapeHtml(info.profile_image_path)}" alt="" />`
                : '<span class="onepage-human-icon" aria-hidden="true"></span>'}
            </section>
            <section class="onepage-headline">
              <span class="canvas-kicker">PORTFOLIO SUMMARY</span>
              <h3>${escapeHtml(compactText(title, 42))}</h3>
              <p>${escapeHtml(compactText(intro, 70))}</p>
              ${selfIntro ? `<p class="onepage-self-intro">${escapeHtml(compactText(selfIntro, 110))}</p>` : ''}
              <strong>${escapeHtml(compactText(headline.fit_label || '근거 기반 초안', 34))}</strong>
            </section>
            <section class="onepage-about-card">
              <h4>ABOUT ME</h4>
              ${renderInfoRows(profileRows)}
            </section>
          </div>
          <div class="onepage-mid-grid">
            <section class="onepage-card target-card">
              <h4>TARGET FIT</h4>
              ${renderInfoRows(targetRows)}
            </section>
            <section class="onepage-card">
              <h4>CORE COMPETENCIES</h4>
              ${renderBulletList(competencies.map((item) => item.text || `${item.title || ''} ${item.description || ''}`.trim()).slice(0, 3))}
            </section>
          </div>
          <section class="onepage-experience-section">
            <h4>REPRESENTATIVE EXPERIENCES</h4>
            <div class="onepage-experience-grid">
              ${experienceCards.length ? experienceCards.map((item, index) => `
                <section class="onepage-experience-card">
                  <span>${escapeHtml((item.evidence_ids || [])[0] || `EXP-${index + 1}`)}</span>
                  <h5>${escapeHtml(compactText(item.title || item.project || `대표 경험 ${index + 1}`, 24))}</h5>
                  <p>${escapeHtml(compactText(item.summary || item.highlight || item.role || '제공된 정보 부족', 70))}</p>
                  <strong>${escapeHtml(compactText(item.fit_point || item.role || '직무 연결 근거 보완 필요', 32))}</strong>
                </section>
              `).join('') : `
                <section class="onepage-experience-card onepage-missing-card">
                  <span>MISSING</span>
                  <h5>대표 활동 자료 부족</h5>
                  <p>승인된 활동 요약을 추가하면 직무 맞춤 경험으로 교체됩니다.</p>
                  <strong>자료 업로드 필요</strong>
                </section>
              `}
            </div>
          </section>
          <div class="onepage-bottom-grid">
            <section class="onepage-card">
              <h4>SKILL KEYWORDS</h4>
              ${renderChipSection(skillTexts)}
            </section>
            <section class="onepage-card">
              <h4>LICENSE · AWARDS · EDUCATION</h4>
              ${renderBulletList(educationTexts.slice(0, 4))}
            </section>
          </div>
          <p class="onepage-differentiator"><b>DIFFERENTIATOR</b> ${escapeHtml(compactText(differentiator.text || '직무·산업·승인 활동 입력 시 완성도가 높아집니다.', 78))}</p>
        </article>
      `]);
    }

    function renderCaseStudyPortfolio(raw) {
      const problem = raw.problem_definition || {};
      const process = raw.design_process || {};
      const implementation = raw.implementation || {};
      const result = raw.result || {};
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer([`
        <article class="portfolio-canvas compact-case-canvas">
          <header class="canvas-hero">
            <span class="canvas-kicker">Case Study</span>
            <h3>${escapeHtml(raw.project_title || currentPortfolio.title || '상세 기술 포트폴리오')}</h3>
            <p>${escapeHtml(compactText(raw.selection_reason || raw.headline || currentPortfolio.summary, 130))}</p>
          </header>
          <div class="case-summary-strip">
            ${renderSummaryPill('문제', problem.goal || problem.background)}
            ${renderSummaryPill('도구', (implementation.tools_used || []).slice(0, 3).join(', '))}
            ${renderSummaryPill('성과', result.qualitative_result || result.quantitative_result)}
          </div>
          <div class="case-section-grid">
            ${renderCaseCard('문제 정의', [problem.background, problem.goal])}
            ${renderCaseCard('설계 과정', [...(process.approach_steps || []), ...(process.design_decisions || []).map((item) => `${item.decision}: ${item.reason}`)])}
            ${renderCaseCard('구현 및 기여도', [...(implementation.my_contribution || []), implementation.team_context])}
            ${renderCaseCard('결과 및 성과', [result.quantitative_result, result.qualitative_result, raw.reflection?.learned])}
          </div>
        </article>
      `]);
    }

    function renderDeckPortfolio(raw) {
      const slides = currentPortfolio.slides || [];
      const pages = chunkItems(slides, 4).map((pageSlides, pageIndex) => `
        <article class="portfolio-canvas">
          <header class="canvas-hero">
            <span class="canvas-kicker">Presentation Preview</span>
            <h3>${escapeHtml(raw.cover?.headline || currentPortfolio.title || 'PPT 발표 스펙')}</h3>
            <p>${escapeHtml(currentPortfolio.summary || '발표 흐름에 맞춰 핵심 슬라이드를 구성했습니다.')}</p>
          </header>
          <div class="deck-grid">
            ${pageSlides.map((slide, index) => `
              <section class="deck-slide-card">
                <span>Slide ${pageIndex * 4 + index + 1}</span>
                <h4>${escapeHtml(slide.title)}</h4>
                ${renderBulletList(String(slide.body || '').split(/\n+/).slice(0, 4))}
              </section>
            `).join('')}
          </div>
        </article>
      `);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
    }

    function renderCoverLetterPortfolio(raw) {
      if (raw.templateId === 'coverletter_ppt_v2' || raw.cover || raw.positioning || raw.strengths || raw.competencyEvidence) {
        const storySections = [
          raw.positioning && {
            question_title: '지원자 포지셔닝',
            question_reason: '직무 관심과 핵심 경험 연결',
            answer: [
              raw.positioning.statement,
              raw.positioning.jobInterest,
              raw.positioning.coreExperience,
              raw.positioning.contributionDirection,
            ].filter(Boolean).join('\n'),
          },
          raw.motivation && {
            question_title: '지원 동기',
            question_reason: '직무 이해와 개인 경험 연결',
            answer: [
              raw.motivation.companyUnderstanding,
              raw.motivation.roleUnderstanding,
              raw.motivation.personalConnection,
              raw.motivation.finalSentence,
            ].filter(Boolean).join('\n'),
          },
          raw.strengths?.length && {
            question_title: '직무 적합 강점',
            question_reason: '강점별 경험 근거',
            answer: raw.strengths.map((item) => `${item.name}: ${item.description} (${item.evidence})`).join('\n'),
          },
          raw.experiences?.[0] && {
            question_title: raw.experiences[0].title || '대표 경험 서술',
            question_reason: raw.experiences[0].keywordsText || 'STAR 흐름',
            answer: [
              raw.experiences[0].summary,
              raw.experiences[0].star?.situation && `S: ${raw.experiences[0].star.situation}`,
              raw.experiences[0].star?.task && `T: ${raw.experiences[0].star.task}`,
              raw.experiences[0].star?.action && `A: ${raw.experiences[0].star.action}`,
              raw.experiences[0].star?.result && `R: ${raw.experiences[0].star.result}`,
            ].filter(Boolean).join('\n'),
          },
          raw.experiences?.[1] && {
            question_title: '협업과 실행 과정',
            question_reason: '문제 발견부터 결과 정리까지',
            answer: [
              ...(raw.experiences[1].process || []).map((item, index) => `${index + 1}. ${item.answer}`),
              raw.experiences[1].resultSentence,
            ].filter(Boolean).join('\n'),
          },
          raw.competencyEvidence?.length && {
            question_title: '역량 근거',
            question_reason: '자기소개서 문항 연결',
            answer: raw.competencyEvidence.map((item) => `${item.competency}: ${item.experience} - ${item.outcome} (${item.question})`).join('\n'),
          },
          raw.contributionPlan?.length && {
            question_title: '입사 후 기여 계획',
            question_reason: '단계별 기여 방향',
            answer: raw.contributionPlan.map((item) => `${item.period} ${item.title}: ${item.plan}`).join('\n'),
          },
        ].filter(Boolean);

        const pages = chunkItems(storySections, 2).map((pageItems) => `
          <article class="portfolio-canvas">
            <header class="canvas-hero">
              <span class="canvas-kicker">Cover Letter PPT</span>
              <h3>${escapeHtml(raw.cover?.applicantLine || currentPortfolio.title || '자기소개서 연결형')}</h3>
              <p>${escapeHtml(raw.cover?.headline || currentPortfolio.summary || '경험을 자기소개서형 PPT 흐름으로 정리했습니다.')}</p>
            </header>
            ${renderChipSection(raw.cover?.tags || [])}
            ${pageItems.map((item) => `
              <section class="coverletter-question">
                <h4>${escapeHtml(item.question_title || '자기소개서 문항')}</h4>
                <small>${escapeHtml(item.question_reason || '경험과 직무 연결')}</small>
                <p>${escapeHtml(item.answer || '')}</p>
              </section>
            `).join('')}
          </article>
        `);
        document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
        return;
      }

      if (raw.templateId === 'coverletter_ppt_v1' || raw.motivation || raw.representativeExperience) {
        const storySections = [
          raw.motivation && {
            question_title: '지원 동기',
            question_reason: raw.motivation.subtitle || '경험과 직무 관심 연결',
            answer: raw.motivation.narrative,
          },
          raw.competencies?.length && {
            question_title: '직무 적합 역량',
            question_reason: '선택 경험에서 확인한 역량',
            answer: raw.competencies.map((item) => `${item.name}: ${item.evidence}`).join('\n'),
          },
          raw.representativeExperience && {
            question_title: raw.representativeExperience.title || '대표 경험 서술',
            question_reason: '문제, 행동, 결과 흐름',
            answer: [
              raw.representativeExperience.narrative,
              ...(raw.representativeExperience.star || []).map((item) => `${item.label}: ${item.text}`),
            ].filter(Boolean).join('\n'),
          },
          raw.contributionPlan?.length && {
            question_title: '입사 후 기여 계획',
            question_reason: '초기 적응부터 실무 기여까지',
            answer: raw.contributionPlan.map((item) => `${item.period}: ${item.plan}`).join('\n'),
          },
          raw.questionMap?.length && {
            question_title: '자기소개서 문항 연결',
            question_reason: '문항별 연결 경험과 답변 포인트',
            answer: raw.questionMap.map((item) => `${item.question}: ${item.experience} - ${item.answerPoint}`).join('\n'),
          },
        ].filter(Boolean);

        const pages = chunkItems(storySections, 2).map((pageItems) => `
          <article class="portfolio-canvas">
            <header class="canvas-hero">
              <span class="canvas-kicker">Cover Letter PPT</span>
              <h3>${escapeHtml(raw.title || currentPortfolio.title || '자기소개서 연결형')}</h3>
              <p>${escapeHtml(raw.headline || currentPortfolio.summary || '경험을 자기소개서형 PPT 흐름으로 정리했습니다.')}</p>
            </header>
            ${renderChipSection(raw.coverChips || [])}
            ${pageItems.map((item) => `
              <section class="coverletter-question">
                <h4>${escapeHtml(item.question_title || '자기소개서 문항')}</h4>
                <small>${escapeHtml(item.question_reason || '경험과 직무 연결')}</small>
                <p>${escapeHtml(item.answer || '')}</p>
              </section>
            `).join('')}
          </article>
        `);
        document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
        return;
      }

      const items = raw.items || [];
      const pages = chunkItems(items, 2).map((pageItems) => `
        <article class="portfolio-canvas">
          <header class="canvas-hero">
            <span class="canvas-kicker">Story Portfolio</span>
            <h3>${escapeHtml(raw.name_title || currentPortfolio.title || '자기소개서 연결형')}</h3>
            <p>${escapeHtml(currentPortfolio.summary || '경험을 자기소개서 문항으로 확장했습니다.')}</p>
          </header>
          ${renderChipSection([
            raw.core_summary?.competency,
            raw.core_summary?.experience,
            raw.core_summary?.skill,
          ].filter(Boolean))}
          ${pageItems.map((item) => `
            <section class="coverletter-question">
              <h4>${escapeHtml(item.question_title || '자기소개서 문항')}</h4>
              <small>${escapeHtml(item.question_reason || '경험과 직무 연결')}</small>
              <p>${escapeHtml(item.answer || '')}</p>
            </section>
          `).join('')}
        </article>
      `);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
    }

    function renderInfoRows(rows) {
      return `<dl class="info-rows">${rows.filter(([, value]) => value).map(([label, value]) => `
        <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
      `).join('')}</dl>`;
    }

    function renderBulletList(items) {
      const list = (items || []).filter(Boolean);
      if (!list.length) return '<p>제공된 정보가 부족합니다.</p>';
      return `<ul>${list.map((item) => `<li>${escapeHtml(compactText(item, 140))}</li>`).join('')}</ul>`;
    }

    function renderChipSection(items) {
      const chips = (items || []).filter(Boolean);
      if (!chips.length) return '<p>제공된 정보가 부족합니다.</p>';
      return `<div class="canvas-chip-list">${chips.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
    }

    function renderSummaryPill(label, value) {
      return `
        <div>
          <b>${escapeHtml(label)}</b>
          <span>${escapeHtml(compactText(value || '정보 보완 필요', 44))}</span>
        </div>
      `;
    }

    function renderCaseCard(title, items) {
      return `
        <section class="case-card">
          <h4>${escapeHtml(title)}</h4>
          ${renderBulletList((items || []).filter(Boolean).map((item) => compactText(item, 72)))}
        </section>
      `;
    }

    function compactText(value, maxLength) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 1)}…`;
    }

    function renderPptPreview() {
      const slide = currentPortfolio.slides[currentSlideIndex];
      document.getElementById('workspaceContent').innerHTML = `
        <div class="ppt-preview-wrap">
          <button class="slide-arrow prev" type="button" aria-label="이전 슬라이드" data-slide-direction="-1">‹</button>
          <article class="ppt-slide">
            <span class="ppt-slide-label">Slide ${currentSlideIndex + 1}</span>
            <h3>${escapeHtml(slide.title)}</h3>
            <p>${escapeHtml(slide.body)}</p>
          </article>
          <button class="slide-arrow next" type="button" aria-label="다음 슬라이드" data-slide-direction="1">›</button>
        </div>
        <div class="slide-counter">${currentSlideIndex + 1} / ${currentPortfolio.slides.length}</div>
      `;
    }

    function moveSlide(direction) {
      if (!currentPortfolio || currentPortfolio.format !== 'PPT 발표 스펙') return;
      const slideCount = currentPortfolio.slides.length;
      currentSlideIndex = (currentSlideIndex + direction + slideCount) % slideCount;
      renderPptPreview();
    }

    function moveDraftPage(direction) {
      if (!currentPortfolio) return;
      currentDraftPageIndex += direction;
      renderPortfolioPreview();
    }

    function resetPortfolioStudio() {
      cancelPdfPreviewRequest();
      document.documentElement.classList.add('portfolio-create-ready');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.add('hidden');
      document.getElementById('pfSetupScreen').classList.remove('hidden');
    }

    function readPortfolioStore() {
      try {
        const parsed = JSON.parse(localStorage.getItem(PORTFOLIO_STORAGE_KEY)) || [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    async function saveGeneratedPortfolio({ requireRemote = false } = {}) {
      if (!currentPortfolio) return null;

      const content = currentPortfolio.format === 'PPT 발표 스펙'
        ? currentPortfolio.slides.map((slide, index) => `${index + 1}. ${slide.title}\n${slide.body}`).join('\n\n')
        : currentPortfolio.blocks.map((block) => `${block.title}\n${block.body}`).join('\n\n');
      const summary = currentPortfolio.blocks[1]?.body || `${currentPortfolio.purpose}에 맞춰 생성한 포트폴리오입니다.`;
      const nextPortfolio = {
        id: currentPortfolio.id,
        title: currentPortfolio.title || `${currentPortfolio.format} - ${currentPortfolio.purpose}`,
        createdAt: currentPortfolio.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        purpose: currentPortfolio.purpose,
        summary,
        status: 'done',
        liked: Boolean(currentPortfolio.liked),
        content,
        format: currentPortfolio.format,
        experiences: currentPortfolio.experiences,
        experienceProjects: currentPortfolio.experienceProjects || [],
        keywords: normalizeKeywordList(currentPortfolio.keywords),
        blocks: currentPortfolio.blocks || [],
        slides: currentPortfolio.slides || [],
        coverLines: currentPortfolio.coverLines || [],
        raw: currentPortfolio.raw || null,
        templateValues: currentPortfolio.raw?.template_values || currentPortfolio.templateValues || null,
      };
      const saved = readPortfolioStore().filter((item) => item.id !== nextPortfolio.id);

      try {
        const response = await fetch(PORTFOLIO_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(nextPortfolio),
        });

        if (!response.ok) throw new Error('Portfolio save failed.');

        const result = await response.json();
        const savedPortfolio = result.portfolio || nextPortfolio;
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify([savedPortfolio, ...saved]));
        currentPortfolio.id = savedPortfolio.id || currentPortfolio.id;
        return savedPortfolio;
      } catch (error) {
        if (requireRemote) {
          throw error;
        }
        console.warn('Portfolio API save fell back to local state.', error);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify([nextPortfolio, ...saved]));
        return nextPortfolio;
      }
    }

    async function openPortfolioEditorFromQuery() {
      if (!editPortfolioId) return;

      let portfolio = null;
      try {
        const response = await fetch(`${PORTFOLIO_ENDPOINT}?id=${encodeURIComponent(editPortfolioId)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (response.ok) {
          const payload = await response.json();
          portfolio = payload.portfolio;
        }
      } catch (error) {
        console.warn('Portfolio API edit load failed.', error);
      }

      if (!portfolio) portfolio = readPortfolioStore().find((item) => item.id === editPortfolioId);
      if (!portfolio) {
        document.documentElement.classList.add('portfolio-create-ready');
        document.documentElement.classList.remove('portfolio-edit-entry');
        document.getElementById('pfLoadingScreen').classList.add('hidden');
        document.getElementById('pfSetupScreen').classList.remove('hidden');
        showToast('수정할 포트폴리오를 찾지 못했습니다.');
        return;
      }

      const format = portfolio.format || '상세 기술 포트폴리오';
      const purpose = portfolio.purpose || '취업 지원용';
      const major = portfolio.major || '기존 저장 항목';
      const experiences = Array.isArray(portfolio.experiences) ? portfolio.experiences : [];
      const keywords = normalizeKeywordList(portfolio.keywords);
      const fallbackBlocks = (portfolio.content || portfolio.summary || '저장된 포트폴리오입니다.')
        .split(/\n{2,}/)
        .map((text, index) => ({ title: `${index + 1}. 저장된 내용`, body: text.replace(/\s+/g, ' ').trim() }));

      currentPortfolio = {
        id: portfolio.id,
        title: portfolio.title || `${format} 초안`,
        summary: portfolio.summary || '',
        content: portfolio.content || '',
        format,
        purpose,
        major,
        experiences,
        experienceProjects: Array.isArray(portfolio.experienceProjects) ? portfolio.experienceProjects : [],
        keywords,
        blocks: Array.isArray(portfolio.blocks) && portfolio.blocks.length ? portfolio.blocks : fallbackBlocks,
        slides: Array.isArray(portfolio.slides) && portfolio.slides.length
          ? portfolio.slides
          : buildSlides(format, purpose, major, experiences, keywords),
        coverLines: Array.isArray(portfolio.coverLines) ? portfolio.coverLines : [],
        raw: portfolio.raw || null,
        templateValues: portfolio.templateValues || null,
        sourceLabel: '저장본 편집',
        liked: Boolean(portfolio.liked),
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt || new Date().toISOString(),
      };
      currentDraftPageIndex = 0;

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.remove('hidden');
      document.documentElement.classList.add('portfolio-create-ready');
      document.documentElement.classList.remove('portfolio-edit-entry');
      resetAssistantChat();
      renderPortfolioPreview();
      focusAssistantConversation();
    }

    async function handleMasterAction(action) {
      if (action === 'save') {
        try {
          await saveGeneratedPortfolio({ requireRemote: true });
          showToast('DB 저장이 완료되었습니다. 보관함으로 이동합니다.');
          window.setTimeout(() => {
            window.location.href = 'portfolio_manage.html';
          }, 500);
        } catch (error) {
          console.warn('Portfolio DB save failed.', error);
          showToast('DB 저장에 실패했습니다. 로그인 상태를 확인한 뒤 다시 저장해 주세요.');
        }
        return;
      }

      if (action === 'download') {
        try {
          await downloadPptPreview();
          showToast('보관함 저장 후 PPT 다운로드 파일을 준비했습니다.');
        } catch (error) {
          console.warn('PPT save/download failed.', error);
          showToast('보관함 저장에 실패해 PPT 다운로드를 중단했습니다. 로그인 상태를 확인해주세요.');
        }
        return;
      }

      if (action === 'exit') {
        exitEditingSession();
      }
    }

    async function downloadPptPreview() {
      if (!currentPortfolio) return;

      const response = await fetch('/api/portfolio/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(currentPortfolio),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'PPT 파일 생성에 실패했습니다.');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      const downloadUrl = URL.createObjectURL(blob);
      link.href = downloadUrl;
      link.download = `${currentPortfolio.format.replace(/[\\/:*?"<>|]/g, '_')}.pptx`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    }

    function exitEditingSession() {
      const workspace = document.getElementById('pfWorkspaceScreen');
      workspace.classList.add('leaving');
      cancelPdfPreviewRequest();
      window.setTimeout(() => {
        currentPortfolio = null;
        chatHistory = [];
        currentSlideIndex = 0;
        currentDraftPageIndex = 0;
        workspace.classList.add('hidden');
        workspace.classList.remove('leaving');
        document.getElementById('pfLoadingScreen').classList.add('hidden');
        document.getElementById('pfSetupScreen').classList.remove('hidden');
        resetAssistantChat();
      }, 180);
    }

    async function sendPfAssistantChat() {
      const message = assistantInput.value.trim();
      if (!message || isPortfolioRevising) return;
      if (!currentPortfolio) {
        appendChatBubble('ai', '먼저 포트폴리오를 생성한 뒤 수정 요청을 입력해주세요.');
        return;
      }

      appendChatBubble('user', message);
      chatHistory.push({ role: 'user', content: message });
      assistantInput.value = '';

      appendChatBubble('ai', '수정 요청을 반영해 왼쪽 초안을 다시 작성하고 있습니다.');
      await reviseDraftFromConversation();
    }

    async function reviseDraftFromConversation() {
      if (!currentPortfolio) return;

      const userContext = chatHistory
        .filter((item) => item.role === 'user')
        .map((item) => item.content.replace(/수정해줘\s*$/, '').trim())
        .filter(Boolean)
        .join(' / ');
      const revisionNote = userContext || '사용자 요청';

      setPortfolioRevisionState(true);
      try {
        const revised = await requestPortfolioRevision(revisionNote);
        applyRevisionToCurrentPortfolio(revised);
        currentDraftPageIndex = 0;
        if (currentPortfolio.raw) {
        currentPortfolio.raw = mergeRawPortfolioText(
          currentPortfolio.raw,
          currentPortfolio.blocks || [],
          currentPortfolio.slides || []
        );
      }

      renderPortfolioPreview();
        setPortfolioRevisionState(false);
        appendChatBubble('ai', revised.assistantMessage || 'ChatGPT가 요청을 반영해 초안을 수정했습니다.');
        showToast('ChatGPT 수정 요청을 초안에 반영했습니다.');
        return;
      } catch (error) {
        console.warn('OpenAI portfolio revision failed. Falling back to local revision.', error);
      }

      currentPortfolio.updatedAt = new Date().toISOString();
      currentDraftPageIndex = 0;

      if (currentPortfolio.format === 'PPT 발표 스펙') {
        currentPortfolio.slides = currentPortfolio.slides.map((slide, index) => {
          if (index === currentSlideIndex) {
            return {
              title: slide.title,
              body: `${slide.body} 요청 반영: ${revisionNote} 방향으로 메시지를 더 선명하게 다듬었습니다.`
            };
          }
          return slide;
        });
      } else {
        currentPortfolio.blocks = currentPortfolio.blocks.map((block, index) => {
          if (index === 1) {
            return {
              title: block.title,
              body: `${block.body} 추가로 ${revisionNote} 흐름이 드러나도록 문장 톤과 강조점을 조정했습니다.`
            };
          }
          if (index === 3) {
            return {
              title: block.title,
              body: `대화에서 제시한 "${revisionNote}" 요청을 반영해 정량 성과, 전문성, 지원 목적의 연결성을 우선 보완하도록 수정했습니다.`
            };
          }
          return block;
        });
      }

      renderPortfolioPreview();
      showToast('AI 수정 요청을 초안에 반영했습니다.');
    }

    function appendChatBubble(type, message) {
      const log = document.getElementById('pfAssistantLog');
      log.insertAdjacentHTML('beforeend', `<div class="bubble ${type}">${escapeHtml(message)}</div>`);
      log.scrollTop = log.scrollHeight;
    }

    function setPortfolioRevisionState(isRevising) {
      isPortfolioRevising = isRevising;
      portfolioDraft?.classList.toggle('revising', isRevising);
      portfolioRevisionOverlay?.classList.toggle('hidden', !isRevising);
      assistantInput.disabled = isRevising;
      assistantSendBtn.disabled = isRevising;
    }

    function resetAssistantChat() {
      document.getElementById('pfAssistantLog').innerHTML = '<div class="bubble ai">초안이 생성되었습니다. 원하는 방향을 대화로 알려주면 왼쪽 초안에 바로 반영합니다.</div>';
      assistantInput.value = '';
      setPortfolioRevisionState(false);
    }

    function prepareEditorEntryScreen() {
      if (!editPortfolioId) return;
      document.documentElement.classList.add('portfolio-create-ready');
      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.add('hidden');
    }

    function focusAssistantConversation() {
      window.setTimeout(() => {
        document.querySelector('.portfolio-ai')?.scrollIntoView({ block: 'nearest' });
        assistantInput.focus();
      }, 0);
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      window.setTimeout(() => toast.classList.remove('show'), 1800);
    }

    async function initializePortfolioCreatePage() {
      if (editPortfolioId) {
        prepareEditorEntryScreen();
        await openPortfolioEditorFromQuery();
        loadPortfolioSetupData();
        return;
      }

      document.documentElement.classList.add('portfolio-create-ready');
      await loadPortfolioSetupData();
    }

    initializePortfolioCreatePage();
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
