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
    const PROFILE_ENDPOINT = '/api/profile';
    const ACTIVITY_FILES_ENDPOINT = '/api/activity-files';
    const KEYWORD_RECOMMEND_ENDPOINT = '/api/portfolio/keywords';
    const commonKeywords = ['문제 해결', '협업', '학습 민첩성'];
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
    const experienceKeywordRules = [
      { pattern: /공모|대회|경진|contest|award|수상/i, keywords: ['문제 정의', '기획', '성과 정리'] },
      { pattern: /봉사|멘토|서포터|대외|volunteer|supporter/i, keywords: ['사용자 이해', '책임감', '커뮤니케이션'] },
      { pattern: /팀|협업|회의|발표|presentation|team/i, keywords: ['협업 조율', '발표', '문서화'] },
      { pattern: /개발|코드|github|프로그래밍|테스트|app|web|api/i, keywords: ['서비스 구현', '테스트 개선', '시스템 설계'] },
      { pattern: /데이터|분석|ai|인공지능|모델|추천/i, keywords: ['데이터 분석', 'AI 활용', '추천 시스템'] },
      { pattern: /실험|공정|화학|바이오|품질|안전/i, keywords: ['실험 설계', '공정 이해', '품질 안전'] },
      { pattern: /전기|회로|전력|임베디드|제어|센서/i, keywords: ['회로 이해', '제어 설계', '문제 진단'] }
    ];

    let currentPortfolio = null;
    let chatHistory = [];
    let currentSlideIndex = 0;
    let currentDraftPageIndex = 0;
    let profileMajor = '';
    let activityFiles = [];
    let isPortfolioRevising = false;
    let keywordRequestId = 0;

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

    document.querySelectorAll('.format-card').forEach((card) => {
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

    function getExperienceKeywordRecommendations(selectedFiles = getSelectedExperienceFiles()) {
      const selectedTexts = selectedFiles.length
        ? selectedFiles.map((file) => [
          getExperienceLabel(file),
          file.folderGroup,
          file.folderType,
          file.analysis?.summaryMd
        ].filter(Boolean).join(' '))
        : getSelectedExperienceLabels();
      if (!selectedTexts.length) return [];

      const joinedText = selectedTexts.join(' ');
      return experienceKeywordRules
        .filter((rule) => rule.pattern.test(joinedText))
        .flatMap((rule) => rule.keywords);
    }

    function buildLocalKeywordRecommendations(selectedFiles = getSelectedExperienceFiles()) {
      const selectedMajor = getCurrentMajor();
      return [
        ...commonKeywords,
        ...selectedMajor.keywords.slice(0, 4),
        ...getExperienceKeywordRecommendations(selectedFiles)
      ];
    }

    function renderKeywordTags(keywords, { source = 'local' } = {}) {
      const uniqueKeywords = [...new Set(keywords.filter(Boolean))].slice(0, 12);

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

    function compactExperienceForKeywords(file) {
      return {
        id: file.id,
        name: file.name,
        folderGroup: file.folderGroup,
        folderType: file.folderType,
        folderLabel: file.folderLabel,
        analysisStatus: file.analysisStatus,
        analysisSummary: file.analysis?.summaryMd || '',
      };
    }

    async function requestKeywordRecommendations(selectedFiles, fallbackKeywords) {
      const response = await fetch(KEYWORD_RECOMMEND_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          major: getCurrentMajor().label,
          experiences: selectedFiles.map(compactExperienceForKeywords),
          fallbackKeywords,
        }),
      });

      if (!response.ok) throw new Error('Keyword recommendation failed.');

      const result = await response.json();
      return Array.isArray(result.keywords) ? result.keywords : [];
    }

    async function renderKeywordPool() {
      const selectedFiles = getSelectedExperienceFiles();
      const currentRequestId = ++keywordRequestId;

      if (!selectedFiles.length && activityFiles.length) {
        keywordPool.innerHTML = '<p class="keyword-empty">경험 데이터를 선택하면 추천 키워드가 표시됩니다.</p>';
        return;
      }

      const fallbackKeywords = buildLocalKeywordRecommendations(selectedFiles);
      renderKeywordTags(fallbackKeywords);

      if (!selectedFiles.length) return;

      try {
        const aiKeywords = await requestKeywordRecommendations(selectedFiles, fallbackKeywords);
        if (currentRequestId !== keywordRequestId || !aiKeywords.length) return;
        renderKeywordTags(aiKeywords, { source: 'ai' });
      } catch (error) {
        console.warn('Contextual keyword recommendation failed.', error);
      }
    }

    function getSelectedExperienceLabels() {
      return Array.from(document.querySelectorAll('.experience-option input:checked'))
        .map((input) => input.value);
    }

    function getSelectedExperienceFiles() {
      const selectedIds = new Set(
        Array.from(document.querySelectorAll('.experience-option input:checked'))
          .map((input) => input.dataset.experienceId)
      );
      return activityFiles.filter((file) => selectedIds.has(String(file.id)));
    }

    function getExperienceLabel(file) {
      const folder = file.folderLabel ? `${file.folderLabel} - ` : '';
      return `${folder}${file.name || '이름 없는 경험'}`;
    }

    function renderExperienceOptions() {
      if (!activityFiles.length) {
        experienceDataList.innerHTML = '<p class="experience-empty">파일 관리에서 경험 데이터를 업로드하면 이곳에서 선택할 수 있습니다.</p>';
        renderKeywordPool();
        return;
      }

      experienceDataList.innerHTML = activityFiles.map((file) => {
        const label = getExperienceLabel(file);
        const meta = [file.folderGroup, file.folderType].filter(Boolean).join(' · ');
        return `
          <label class="experience-option">
            <input type="checkbox" value="${escapeHtml(label)}" data-experience-id="${escapeHtml(file.id)}" />
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
        const response = await fetch(PROFILE_ENDPOINT, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('Profile load failed.');

        const result = await response.json();
        const educations = Array.isArray(result.profile?.educations) ? result.profile.educations : [];
        profileMajor = educations.find((education) => education?.major)?.major || '';
      } catch (error) {
        console.warn('Profile major load failed.', error);
        profileMajor = '';
      }

      if (majorDisplay) {
        majorDisplay.dataset.majorValue = profileMajor;
        majorDisplay.textContent = profileMajor || '마이페이지 전공 입력 필요';
      }
    }

    async function loadExperienceData() {
      try {
        const response = await fetch(ACTIVITY_FILES_ENDPOINT, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('Activity file load failed.');

        const result = await response.json();
        activityFiles = Array.isArray(result.files) ? result.files : [];
      } catch (error) {
        console.warn('Activity file API load failed.', error);
        activityFiles = [];
      }

      renderExperienceOptions();
    }

    async function loadPortfolioSetupData() {
      await Promise.all([loadProfileMajor(), loadExperienceData()]);
      renderKeywordPool();
    }

    function getSelectedKeywords() {
      return Array.from(document.querySelectorAll('[data-keyword].selected'))
        .map((tag) => tag.textContent.trim());
    }

    function triggerGeneratePortfolio() {
      const format = formatSelect.value;
      const purpose = purposeSelect.value;
      const major = getCurrentMajor();
      const experiences = getSelectedExperienceLabels();
      const keywords = getSelectedKeywords();

      if (!keywords.length) {
        showToast('강조할 AI 역량 키워드를 선택해주세요!');
        keywordPool.classList.add('keyword-pool-alert');
        window.setTimeout(() => keywordPool.classList.remove('keyword-pool-alert'), 900);
        return;
      }

      const portfolioShell = buildPortfolioShell({ format, purpose, major, experiences, keywords });

      currentPortfolio = null;
      currentSlideIndex = 0;
      currentDraftPageIndex = 0;
      chatHistory = [];

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.remove('hidden');
      document.getElementById('workspaceTitle').textContent = `${format} 초안`;
      startLoadingProgress(async () => {
        try {
          const aiDraft = await requestPortfolioGeneration({ format, purpose, major: major.label, experiences, keywords });
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

        document.getElementById('pfLoadingScreen').classList.add('hidden');
        document.getElementById('pfWorkspaceScreen').classList.remove('hidden');
      });
    }

    function startLoadingProgress(onComplete) {
      const loadingDuration = 1200;
      const progressBar = document.getElementById('loadingProgressBar');
      const progressText = document.getElementById('loadingProgressText');
      const startedAt = Date.now();

      progressBar.style.width = '0%';
      progressText.textContent = '0%';

      const timer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const progress = Math.min(100, Math.round((elapsed / loadingDuration) * 100));

        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;

        if (progress >= 100) {
          window.clearInterval(timer);
          onComplete();
        }
      }, 60);
    }

    function buildPortfolioShell({ format, purpose, major, experiences, keywords }) {
      return {
        id: `portfolio-${Date.now()}`,
        format,
        purpose,
        major: major.label || major,
        experiences,
        keywords,
        sourceLabel: 'ChatGPT 생성',
        updatedAt: new Date().toISOString(),
      };
    }

    function readMyPageInfo() {
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

    async function requestPortfolioGeneration({ format, purpose, major, experiences, keywords }) {
      const response = await fetch('/api/portfolio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          format,
          purpose,
          major,
          experiences,
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

    function renderPortfolioPreview() {
      if (!currentPortfolio) return;

      document.getElementById('workspaceTitle').textContent = `${currentPortfolio.format} 초안`;
      document.getElementById('workspaceSubtitle').textContent = `${currentPortfolio.major} / ${currentPortfolio.purpose} 기준으로 생성한 초안입니다.`;
      document.getElementById('workspaceBadge').textContent = currentPortfolio.sourceLabel || (currentPortfolio.format === 'PPT 발표 스펙' ? 'PPT 프리뷰' : '초안 생성');

      if (currentPortfolio.raw) {
        renderPortfolioImagePreview();
        return;
      }

      if (currentPortfolio.format === 'PPT 발표 스펙') {
        renderPptPreview();
        return;
      }

      const pages = chunkItems(currentPortfolio.blocks, 3).map(renderPlainDraftPage);
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer(pages);
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
      const info = raw.basic_info || {};
      const competencies = raw.core_competencies || [];
      const experiences = raw.experiences || [];
      document.getElementById('workspaceContent').innerHTML = renderDraftPageViewer([`
        <article class="portfolio-canvas">
          <header class="canvas-hero">
            <span class="canvas-kicker">One Page Portfolio</span>
            <h3>${escapeHtml(raw.headline || currentPortfolio.title || '1페이지 요약본')}</h3>
            <p>${escapeHtml(currentPortfolio.summary || '핵심 경험과 역량을 한 장으로 압축했습니다.')}</p>
          </header>
          <div class="resume-grid">
            <section class="resume-profile-panel">
              <div class="profile-avatar">${escapeHtml((info.name || 'MY').slice(0, 2))}</div>
              ${renderInfoRows([
                ['이름', info.name],
                ['학교', info.school],
                ['전공', info.major || currentPortfolio.major],
                ['연계전공', info.minor],
                ['이메일', info.email],
                ['전화번호', info.phone],
              ])}
            </section>
            <section class="mini-section">
              <h4>핵심 역량</h4>
              ${renderBulletList(competencies.map((item) => `${item.title || ''} ${item.description || ''}`.trim()))}
            </section>
            <section class="mini-section">
              <h4>핵심 활동</h4>
              ${renderBulletList(experiences.map((item) => `${item.project || ''} / ${item.role || ''} / ${item.highlight || ''}`.trim()))}
            </section>
            <section class="mini-section">
              <h4>Skills</h4>
              ${renderChipSection(raw.skills || currentPortfolio.keywords)}
            </section>
            <section class="mini-section">
              <h4>Awards</h4>
              ${renderBulletList((raw.licenses_and_awards || []).map((item) => `${item.year || ''} ${item.title || ''}`.trim()))}
            </section>
          </div>
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
        title: `${currentPortfolio.format} - ${currentPortfolio.purpose}`,
        createdAt: new Date().toISOString(),
        purpose: currentPortfolio.purpose,
        summary,
        status: 'done',
        liked: false,
        content,
        format: currentPortfolio.format,
        experiences: currentPortfolio.experiences,
        keywords: currentPortfolio.keywords
      };
      const saved = readPortfolioStore().filter((item) => item.id !== nextPortfolio.id);

      try {
        const response = await fetch(PORTFOLIO_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            ...nextPortfolio,
            blocks: currentPortfolio.blocks || [],
            slides: currentPortfolio.slides || [],
          }),
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
        document.getElementById('pfLoadingScreen').classList.add('hidden');
        document.getElementById('pfSetupScreen').classList.remove('hidden');
        showToast('수정할 포트폴리오를 찾지 못했습니다.');
        return;
      }

      const format = portfolio.format || '상세 기술 포트폴리오';
      const purpose = portfolio.purpose || '취업 지원용';
      const major = portfolio.major || '기존 저장 항목';
      const experiences = Array.isArray(portfolio.experiences) ? portfolio.experiences : [];
      const keywords = Array.isArray(portfolio.keywords) ? portfolio.keywords : [];
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
        keywords,
        blocks: Array.isArray(portfolio.blocks) && portfolio.blocks.length ? portfolio.blocks : fallbackBlocks,
        slides: Array.isArray(portfolio.slides) && portfolio.slides.length
          ? portfolio.slides
          : buildSlides(format, purpose, major, experiences, keywords),
        raw: portfolio.raw || null,
        sourceLabel: '저장본 편집',
        updatedAt: portfolio.updatedAt || new Date().toISOString(),
      };
      currentDraftPageIndex = 0;

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.remove('hidden');
      resetAssistantChat();
      renderPortfolioPreview();
      focusAssistantConversation();
    }

    async function handleMasterAction(action) {
      if (action === 'save') {
        await saveGeneratedPortfolio();
        showToast('마스터 저장이 완료되었습니다. 보관함으로 이동합니다.');
        window.setTimeout(() => {
          window.location.href = 'portfolio_manage.html';
        }, 500);
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

      const savedPortfolio = await saveGeneratedPortfolio({ requireRemote: true });
      currentPortfolio.id = savedPortfolio?.id || currentPortfolio.id;

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
      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.remove('hidden');
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

    prepareEditorEntryScreen();
    loadPortfolioSetupData();
    openPortfolioEditorFromQuery();
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
