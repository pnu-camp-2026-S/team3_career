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
    const commonKeywords = ['문제 해결 및 비판적 사고', '소통 및 협업 역량', '적응력 및 학습민첩성'];
    const majorKeywordMap = {
      industrial: {
        label: '산업공학과',
        keywords: ['데이터 기반 프로세스 최적화', 'SCM 및 물류 효율화', '린 경영 시스템']
      },
      chemical: {
        label: '화학공학과',
        keywords: ['공정 설계 및 스케일업', '반응 공학 데이터 분석', '화학 물질 안전 관리']
      },
      electrical: {
        label: '전기공학과',
        keywords: ['회로 및 전력 시스템 설계', '임베디드 제어 알고리즘', '신재생 에너지 변환']
      },
      computer: {
        label: '컴퓨터공학과',
        keywords: ['대학생 소프트웨어 개발', '알고리즘 최적화', 'AI 및 데이터 모델링']
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
      { pattern: /공모|대회|경진|contest|award|수상/i, keywords: ['문제 정의 역량', '기획력', '성과 정리 역량'] },
      { pattern: /봉사|멘토|서포터|대외|volunteer|supporter/i, keywords: ['소통 및 협업 역량', '책임감', '사용자 이해'] },
      { pattern: /팀|협업|회의|발표|presentation|team/i, keywords: ['협업 조율 역량', '발표 역량', '문서화 역량'] },
      { pattern: /개발|코드|github|프로그래밍|테스트|app|web|api/i, keywords: ['구현 역량', '테스트 및 개선 역량', '시스템 설계'] },
      { pattern: /데이터|분석|ai|인공지능|모델|추천/i, keywords: ['데이터 기반 사고', 'AI 활용 역량', '추천 로직 설계'] },
      { pattern: /실험|공정|화학|바이오|품질|안전/i, keywords: ['실험 설계 역량', '공정 이해', '품질 및 안전 관리'] },
      { pattern: /전기|회로|전력|임베디드|제어|센서/i, keywords: ['회로 및 시스템 이해', '제어 설계 역량', '문제 진단 역량'] }
    ];

    let currentPortfolio = null;
    let chatHistory = [];
    let currentSlideIndex = 0;
    let profileMajor = '';
    let activityFiles = [];

    const formatSelect = document.getElementById('pfFormatSelect');
    const purposeSelect = document.getElementById('pfPurposeSelect');
    const majorDisplay = document.getElementById('pfMajorDisplay');
    const experienceDataList = document.getElementById('experienceDataList');
    const keywordPool = document.getElementById('keywordPool');
    const assistantInput = document.getElementById('pfAssistantInput');

    document.querySelectorAll('.format-card').forEach((card) => {
      card.addEventListener('click', () => selectFormat(card.dataset.format));
    });

    experienceDataList.addEventListener('change', renderKeywordPool);
    document.getElementById('generatePortfolioBtn').addEventListener('click', triggerGeneratePortfolio);
    document.getElementById('pfAssistantSendBtn').addEventListener('click', sendPfAssistantChat);
    document.querySelector('.master-actions').addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-master-action]');
      if (!actionButton) return;
      await handleMasterAction(actionButton.dataset.masterAction);
    });
    document.getElementById('workspaceContent').addEventListener('click', (event) => {
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

    function getExperienceKeywordRecommendations() {
      const selectedTexts = getSelectedExperienceLabels();
      if (!selectedTexts.length) return [];

      const joinedText = selectedTexts.join(' ');
      return experienceKeywordRules
        .filter((rule) => rule.pattern.test(joinedText))
        .flatMap((rule) => rule.keywords);
    }

    function renderKeywordPool() {
      const selectedMajor = getCurrentMajor();
      const recommendedKeywords = [
        ...commonKeywords,
        ...selectedMajor.keywords,
        ...getExperienceKeywordRecommendations()
      ];
      const keywords = [...new Set(recommendedKeywords)].slice(0, 12);

      if (!getSelectedExperienceLabels().length && activityFiles.length) {
        keywordPool.innerHTML = '<p class="keyword-empty">경험 데이터를 선택하면 추천 키워드가 표시됩니다.</p>';
        return;
      }

      keywordPool.innerHTML = keywords.map((keyword) => (
        `<button class="tag selected" type="button" data-keyword="${escapeHtml(keyword)}" aria-pressed="true">${escapeHtml(keyword)}</button>`
      )).join('');

      keywordPool.querySelectorAll('[data-keyword]').forEach((tag) => {
        tag.addEventListener('click', () => {
          tag.classList.toggle('selected');
          tag.setAttribute('aria-pressed', String(tag.classList.contains('selected')));
        });
      });
    }

    function getSelectedExperienceLabels() {
      return Array.from(document.querySelectorAll('.experience-option input:checked'))
        .map((input) => input.value);
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
        majorDisplay.textContent = profileMajor ? `전공: ${profileMajor}` : '전공: 마이페이지에서 전공을 입력해주세요';
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

      currentPortfolio = buildPortfolioDraft({ format, purpose, major, experiences, keywords });
      currentSlideIndex = 0;
      chatHistory = [];

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.remove('hidden');
      document.getElementById('workspaceTitle').textContent = `${format} 초안`;
      startLoadingProgress(() => {
        renderPortfolioPreview();
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

    function buildPortfolioDraft({ format, purpose, major, experiences, keywords }) {
      const experienceText = experiences.length ? experiences.join(', ') : '선택한 경험 없음';
      const keywordText = keywords.length ? keywords.join(', ') : '강조 키워드 없음';

      const blocks = [
        {
          title: '1. 포트폴리오 목적',
          body: `${purpose}에 맞춰 ${format} 구조로 구성했습니다. 첫 화면에서 핵심 역량과 대표 경험이 빠르게 보이도록 설계했습니다.`
        },
        {
          title: '2. 전공 기반 역량 재해석',
          body: `${major.label} 관점에서 ${keywordText} 역량이 드러나도록 경험을 재배치했습니다. 전공 적합성과 AI 활용 역량을 함께 읽히는 흐름입니다.`
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
        major: major.label,
        experiences,
        keywords,
        blocks,
        slides: buildSlides(format, purpose, major.label, experiences, keywords),
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

    function renderPortfolioPreview() {
      if (!currentPortfolio) return;

      document.getElementById('workspaceTitle').textContent = `${currentPortfolio.format} 초안`;
      document.getElementById('workspaceSubtitle').textContent = `${currentPortfolio.major} / ${currentPortfolio.purpose} 기준으로 생성한 초안입니다.`;
      document.getElementById('workspaceBadge').textContent = currentPortfolio.format === 'PPT 발표 스펙' ? 'PPT 프리뷰' : '초안 생성';

      if (currentPortfolio.format === 'PPT 발표 스펙') {
        renderPptPreview();
        return;
      }

      document.getElementById('workspaceContent').innerHTML = currentPortfolio.blocks.map((block) => `
        <div class="portfolio-block">
          <h3>${escapeHtml(block.title)}</h3>
          <p>${escapeHtml(block.body)}</p>
        </div>
      `).join('');
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

    async function saveGeneratedPortfolio() {
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
        return savedPortfolio;
      } catch (error) {
        console.warn('Portfolio API save fell back to local state.', error);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify([nextPortfolio, ...saved]));
        return nextPortfolio;
      }
    }

    async function openPortfolioEditorFromQuery() {
      const editId = new URLSearchParams(window.location.search).get('edit');
      if (!editId) return;

      let portfolio = null;
      try {
        const response = await fetch(`${PORTFOLIO_ENDPOINT}?id=${encodeURIComponent(editId)}`, {
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

      if (!portfolio) portfolio = readPortfolioStore().find((item) => item.id === editId);
      if (!portfolio) return;

      currentPortfolio = {
        id: portfolio.id,
        format: portfolio.format || '상세 기술 포트폴리오',
        purpose: portfolio.purpose || '취업 지원용',
        major: '기존 저장 항목',
        experiences: portfolio.experiences || [],
        keywords: portfolio.keywords || [],
        blocks: (portfolio.content || portfolio.summary || '저장된 포트폴리오입니다.')
          .split(/\n{2,}/)
          .map((text, index) => ({ title: `${index + 1}. 저장된 내용`, body: text.replace(/\s+/g, ' ').trim() })),
        slides: buildSlides(portfolio.format || '상세 기술 포트폴리오', portfolio.purpose || '취업 지원용', '기존 저장 항목', portfolio.experiences || [], portfolio.keywords || [])
      };

      document.getElementById('pfSetupScreen').classList.add('hidden');
      document.getElementById('pfLoadingScreen').classList.add('hidden');
      document.getElementById('pfWorkspaceScreen').classList.remove('hidden');
      renderPortfolioPreview();
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
        downloadPptPreview();
        showToast('PPT 다운로드 파일을 준비했습니다.');
        return;
      }

      if (action === 'exit') {
        exitEditingSession();
      }
    }

    function downloadPptPreview() {
      if (!currentPortfolio) return;

      const body = [
        'Myfitfolio Portfolio',
        '',
        `제목: ${currentPortfolio.format} - ${currentPortfolio.purpose}`,
        `전공: ${currentPortfolio.major}`,
        '',
        currentPortfolio.format === 'PPT 발표 스펙'
          ? currentPortfolio.slides.map((slide, index) => `Slide ${index + 1}. ${slide.title}\n${slide.body}`).join('\n\n')
          : currentPortfolio.blocks.map((block) => `${block.title}\n${block.body}`).join('\n\n')
      ].join('\n');
      const blob = new Blob([body], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
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
        workspace.classList.add('hidden');
        workspace.classList.remove('leaving');
        document.getElementById('pfLoadingScreen').classList.add('hidden');
        document.getElementById('pfSetupScreen').classList.remove('hidden');
        resetAssistantChat();
      }, 180);
    }

    function sendPfAssistantChat() {
      const message = assistantInput.value.trim();
      if (!message) return;

      appendChatBubble('user', message);
      chatHistory.push({ role: 'user', content: message });
      assistantInput.value = '';

      const shouldRevise = /수정해줘\s*$/.test(message);
      const reply = shouldRevise
        ? '대화 맥락을 반영해 왼쪽 초안을 업데이트했습니다.'
        : '좋습니다. 방향을 기억해둘게요. 마지막에 "수정해줘"라고 입력하면 초안에 바로 반영합니다.';

      window.setTimeout(() => {
        appendChatBubble('ai', reply);
        chatHistory.push({ role: 'ai', content: reply });
        if (shouldRevise) reviseDraftFromConversation();
      }, 180);
    }

    function reviseDraftFromConversation() {
      if (!currentPortfolio) return;

      const userContext = chatHistory
        .filter((item) => item.role === 'user')
        .map((item) => item.content.replace(/수정해줘\s*$/, '').trim())
        .filter(Boolean)
        .join(' / ');
      const revisionNote = userContext || '사용자 요청';

      currentPortfolio.updatedAt = new Date().toISOString();

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

    function resetAssistantChat() {
      document.getElementById('pfAssistantLog').innerHTML = '<div class="bubble ai">초안이 생성되었습니다. 원하는 방향을 대화로 알려주세요. 문장 끝에 "수정해줘"라고 입력하면 왼쪽 초안에 즉시 반영합니다.</div>';
      assistantInput.value = '';
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
