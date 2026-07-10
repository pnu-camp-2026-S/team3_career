(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const STORAGE_KEY = 'careerfit_portfolios';
    const DELETED_PORTFOLIO_STORAGE_KEY = 'careerfit_deleted_portfolios';
    const PORTFOLIO_ENDPOINT = '/api/portfolios';
    const downloadingPortfolioIds = new Set();
    const seedPortfolios = [
      {
        id: 'portfolio-data',
        title: '데이터 분석 직무 포트폴리오',
        createdAt: '2026-07-02T09:00:00.000Z',
        purpose: '데이터 분석 직무 지원',
        summary: '공공데이터 시각화 프로젝트 경험을 중심으로 정리한 포트폴리오입니다.',
        liked: true,
        coverLines: ['공공데이터 분석', '시각화 대시보드', '인사이트 도출'],
        content: '공공데이터 수집과 전처리, 시각화 대시보드 제작 경험을 STAR 흐름에 맞게 정리했습니다.'
      },
      {
        id: 'portfolio-contest',
        title: '공모전 제출용 포트폴리오',
        createdAt: '2026-07-02T08:00:00.000Z',
        purpose: '공모전 제출',
        summary: '문제 정의, 기획 의도, 팀 역할, 결과물을 중심으로 구성한 제출용 예시입니다.',
        liked: false,
        coverLines: ['문제 정의', '기획 의도', '결과물'],
        content: '공모전 심사자가 빠르게 맥락을 파악하도록 핵심 경험과 결과를 앞쪽에 배치했습니다.'
      },
      {
        id: 'portfolio-ux',
        title: 'UX 프로젝트 중심 포트폴리오',
        createdAt: '2026-06-30T10:00:00.000Z',
        purpose: 'UX 리서치 직무 지원',
        summary: '사용자 조사와 화면 개선 사례를 중심으로 정리한 포트폴리오입니다.',
        liked: false,
        coverLines: ['사용자 조사', '화면 개선', '검증 결과'],
        content: '사용자 조사, 문제 발견, 개선안 도출, 검증 결과를 순서대로 정리했습니다.'
      },
      {
        id: 'portfolio-marketing',
        title: '마케팅 인턴 지원 포트폴리오',
        createdAt: '2026-06-29T11:30:00.000Z',
        purpose: '마케팅 인턴 지원',
        summary: '콘텐츠 기획과 캠페인 성과를 중심으로 구성한 포트폴리오입니다.',
        liked: false,
        coverLines: ['콘텐츠 기획', '캠페인 운영', '성과 분석'],
        content: '콘텐츠 캘린더 작성, 카드뉴스 제작, 캠페인 지표 분석 경험을 지원 직무와 연결해 정리했습니다.'
      },
      {
        id: 'portfolio-ai-service',
        title: 'AI 포트폴리오 추천 서비스',
        createdAt: '2026-06-28T14:20:00.000Z',
        purpose: '서비스 기획 직무 지원',
        summary: 'AI 추천 흐름과 사용자 문제 해결 과정을 보여주는 서비스 기획 포트폴리오입니다.',
        liked: true,
        coverLines: ['문제 발견', 'AI 추천 흐름', '프로토타입'],
        content: '사용자 활동 자료를 기반으로 포트폴리오 방향을 추천하는 서비스의 문제 정의, 핵심 기능, 화면 흐름을 정리했습니다.'
      },
      {
        id: 'portfolio-design-team',
        title: '캡스톤 디자인 팀 프로젝트',
        createdAt: '2026-06-25T16:00:00.000Z',
        purpose: '팀 프로젝트 제출',
        summary: '팀 내 역할과 협업 과정을 중심으로 정리한 캡스톤 프로젝트 포트폴리오입니다.',
        liked: false,
        coverLines: ['팀 역할', '협업 과정', '결과물'],
        content: '기획, 디자인, 구현 파트를 나누어 진행한 캡스톤 프로젝트에서 맡은 역할과 의사결정 과정을 정리했습니다.'
      },
      {
        id: 'portfolio-volunteer',
        title: '봉사 활동 멘토링 포트폴리오',
        createdAt: '2026-06-21T09:40:00.000Z',
        purpose: '대외활동 지원',
        summary: '멘토링 활동에서의 문제 해결과 소통 경험을 담은 포트폴리오입니다.',
        liked: false,
        coverLines: ['멘토링 운영', '소통 경험', '성장 기록'],
        content: '학습 멘토링 활동에서 참여자의 어려움을 파악하고 맞춤형 자료를 제공한 경험을 중심으로 구성했습니다.'
      },
      {
        id: 'portfolio-sw-idea',
        title: '교내 SW 아이디어 공모전',
        createdAt: '2026-06-18T13:10:00.000Z',
        purpose: '아이디어 공모전 제출',
        summary: '아이디어 배경, 핵심 기능, 기대 효과를 중심으로 만든 공모전 포트폴리오입니다.',
        liked: false,
        coverLines: ['아이디어 배경', '핵심 기능', '기대 효과'],
        content: '교내 문제를 해결하기 위한 SW 아이디어를 사용자 시나리오와 기능 우선순위 중심으로 정리했습니다.'
      }
    ];

    function stripTrailingPostposition(text) {
      return String(text || '')
        .replace(/(\S+\s+\S+)\s+(?:과|와|은|는|이|가|을|를|의|에|로|으로|도|만|까지|부터|처럼|보다|에게|께|한테|랑|이랑|하고)$/u, '$1')
        .replace(/(\S+\s+\S+)(?:과|와|은|는|이|가|을|를|의|에|로|으로|도|만|까지|부터|처럼|보다|에게|께|한테|랑|이랑|하고)$/u, '$1')
        .trim();
    }

    function normalizeKeywordList(keywords) {
      return [...new Set((Array.isArray(keywords) ? keywords : [])
        .map((keyword) => stripTrailingPostposition(keyword))
        .filter(Boolean))]
        .slice(0, 12);
    }

    function normalizePortfolio(item, index = 0) {
      const fallback = seedPortfolios[index % seedPortfolios.length];
      return {
        id: item.id || `portfolio-${index}`,
        title: String(item.title || fallback.title).replace(/\s*초안\s*/g, ' '),
        createdAt: item.createdAt || fallback.createdAt,
        purpose: item.purpose || item.targetRole || fallback.purpose,
        summary: String(item.summary || item.content || fallback.summary).replace(/\s*초안\s*/g, ' '),
        liked: Boolean(item.liked),
        coverLines: normalizeKeywordList(item.coverLines || [item.title, item.purpose || item.targetRole, item.summary || item.content]),
        content: item.content || item.summary || fallback.content,
        format: item.format || fallback.format || '',
        blocks: Array.isArray(item.blocks) ? item.blocks : [],
        slides: Array.isArray(item.slides) ? item.slides : [],
        updatedAt: item.updatedAt || item.updated_at || item.createdAt || fallback.createdAt,
        keywords: normalizeKeywordList(item.keywords),
        experiences: Array.isArray(item.experiences) ? item.experiences : [],
        source: item.source || 'local'
      };
    }

    function readDeletedPortfolioIds() {
      try {
        const parsed = JSON.parse(localStorage.getItem(DELETED_PORTFOLIO_STORAGE_KEY));
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }

    function writeDeletedPortfolioIds(ids) {
      localStorage.setItem(DELETED_PORTFOLIO_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
    }

    function mergeWithSeedPortfolios(items) {
      const deletedIds = new Set(readDeletedPortfolioIds());
      const keptItems = items.filter((item) => !deletedIds.has(item.id));
      const usedIds = new Set(keptItems.map((item) => item.id));
      const missingSeeds = seedPortfolios.filter((item) => !usedIds.has(item.id) && !deletedIds.has(item.id));
      return [...keptItems, ...missingSeeds];
    }

    function readLocalPortfolios() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(saved) || !saved.length) return mergeWithSeedPortfolios([]);
        const normalized = mergeWithSeedPortfolios(saved.map(normalizePortfolio));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      } catch {
        return mergeWithSeedPortfolios([]);
      }
    }

    async function readPortfolios() {
      try {
        const response = await fetch(PORTFOLIO_ENDPOINT, {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (response.ok) {
          const payload = await response.json();
          const portfolios = Array.isArray(payload.portfolios)
            ? payload.portfolios.map((item, index) => normalizePortfolio({ ...item, source: 'remote' }, index))
            : [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
          return portfolios;
        }
      } catch (error) {
        console.warn('Portfolio API list failed.', error);
      }

      return readLocalPortfolios();
    }

    function writePortfolios(items) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    function sortPortfolios(items) {
      return [...items].sort((a, b) => {
        if (Boolean(a.liked) !== Boolean(b.liked)) return a.liked ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
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

    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }

    function safeFileName(value) {
      return `${value || 'portfolio'}`.replace(/[\\/:*?"<>|]/g, '_');
    }

    async function downloadPortfolioPpt(portfolio) {
      const response = await fetch('/api/portfolio/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(portfolio),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || payload.error || 'PPT 파일 생성에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeFileName(portfolio.title)}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function compactText(value, maxLength = 90) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 1)}…`;
    }

    function normalizePreviewBlocks(items) {
      return (Array.isArray(items) ? items : [])
        .map((item, index) => ({
          title: compactText(item?.title || `섹션 ${index + 1}`, 38),
          body: compactText(item?.body || item?.description || '', 78),
        }))
        .filter((item) => item.title || item.body);
    }

    function getPortfolioFirstPage(portfolio) {
      const slides = normalizePreviewBlocks(portfolio.slides);
      const blocks = normalizePreviewBlocks(portfolio.blocks);
      const source = slides.length ? slides : blocks;
      const first = source[0] || {};
      const second = source[1] || {};
      return {
        kicker: portfolio.format || 'Portfolio',
        title: first.title || portfolio.title,
        summary: first.body || portfolio.summary,
        detail: second.title || portfolio.purpose,
        chips: normalizeKeywordList(portfolio.keywords || portfolio.coverLines || [])
          .filter(Boolean)
          .slice(0, 3)
          .map((item) => compactText(item, 16)),
      };
    }

    function firstPagePreview(portfolio) {
      const page = getPortfolioFirstPage(portfolio);
      const image = portfolio.coverImage || portfolio.thumbnail || portfolio.firstPageImage;
      if (image) {
        return `
          <div class="portfolio-library-thumb portfolio-library-thumb-image" aria-label="${escapeHtml(portfolio.title)} 첫 페이지 썸네일">
            <img src="${escapeHtml(image)}" alt="" />
          </div>
        `;
      }
      return `
        <div class="portfolio-library-thumb portfolio-library-first-page" aria-label="${escapeHtml(portfolio.title)} 첫 페이지 썸네일">
          <small>${escapeHtml(page.kicker)}</small>
          <h3>${escapeHtml(page.title)}</h3>
          <p>${escapeHtml(page.summary)}</p>
          <b>${escapeHtml(page.detail)}</b>
          <div>
            ${page.chips.map((chip) => `<i>${escapeHtml(chip)}</i>`).join('')}
          </div>
        </div>
      `;
    }

    async function renderPortfolios() {
      const list = document.getElementById('portfolioList');
      const portfolios = sortPortfolios(await readPortfolios());

      if (!portfolios.length) {
        list.innerHTML = '<div class="empty">포트폴리오가 없습니다.</div>';
        return;
      }

      list.innerHTML = portfolios.map((portfolio) => `
        <article class="portfolio-library-card" data-id="${escapeHtml(portfolio.id)}">
          ${firstPagePreview(portfolio)}
          <div class="portfolio-library-info">
            <div class="portfolio-library-title">
              <h2>${escapeHtml(portfolio.title)}</h2>
            </div>
            <p class="portfolio-library-meta">${formatDate(portfolio.createdAt)} 생성 <b>${escapeHtml(portfolio.purpose)}</b></p>
            <p class="portfolio-library-summary">${escapeHtml(portfolio.summary)}</p>
          </div>
          <div class="portfolio-library-actions">
            <button class="like-action ${portfolio.liked ? 'liked' : ''}" type="button" data-action="like" data-id="${escapeHtml(portfolio.id)}" aria-label="${portfolio.liked ? '좋아요 취소' : '좋아요'}">
              <svg class="portfolio-heart" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20.3s-6.9-4.2-9.2-8.3C.7 8.2 2.8 4 6.8 4c2 0 3.6 1 4.5 2.4C12.2 5 13.8 4 15.8 4c4 0 6.1 4.2 4 8C17.5 16.1 12 20.3 12 20.3Z"></path>
              </svg>
            </button>
            <a class="outline-button" href="portfolio_viewer.html?id=${encodeURIComponent(portfolio.id)}#viewerContent">열기</a>
            <a class="ghost-button" href="portfolio_create.html?edit=${encodeURIComponent(portfolio.id)}#pfWorkspaceScreen">수정</a>
            <button class="ghost-button" type="button" data-action="ppt" data-id="${escapeHtml(portfolio.id)}">PPT 저장</button>
            <button class="ghost-button delete-action" type="button" data-action="delete" data-id="${escapeHtml(portfolio.id)}">삭제</button>
          </div>
        </article>
      `).join('');
    }

    document.getElementById('portfolioList').addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      if (target.dataset.action === 'ppt') {
        event.preventDefault();
        event.stopPropagation();
      }

      const portfolios = await readPortfolios();
      const portfolio = portfolios.find((item) => item.id === target.dataset.id);
      if (!portfolio) return;

      if (target.dataset.action === 'like') {
        portfolio.liked = !portfolio.liked;
        await fetch(PORTFOLIO_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ id: portfolio.id, liked: portfolio.liked }),
        }).catch((error) => console.warn('Portfolio like API failed.', error));
        writePortfolios(portfolios);
        target.classList.toggle('liked', portfolio.liked);
        target.setAttribute('aria-label', portfolio.liked ? '좋아요 취소' : '좋아요');
        return;
      }

      if (target.dataset.action === 'ppt') {
        if (downloadingPortfolioIds.has(portfolio.id)) return;
        downloadingPortfolioIds.add(portfolio.id);
        target.disabled = true;
        try {
          await downloadPortfolioPpt(portfolio);
        } catch (error) {
          console.warn('Portfolio PPT export failed.', error);
          window.alert('PPT 저장에 실패했습니다. 로그인 상태와 저장된 포트폴리오를 확인해 주세요.');
        } finally {
          downloadingPortfolioIds.delete(portfolio.id);
          target.disabled = false;
        }
        return;
      }

      if (target.dataset.action === 'delete') {
        if (!window.confirm(`"${portfolio.title}" 포트폴리오를 삭제할까요?`)) return;
        const nextPortfolios = portfolios.filter((item) => item.id !== portfolio.id);
        await fetch(PORTFOLIO_ENDPOINT, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ id: portfolio.id }),
        }).catch((error) => console.warn('Portfolio delete API failed.', error));
        writeDeletedPortfolioIds([...readDeletedPortfolioIds(), portfolio.id]);
        writePortfolios(nextPortfolios);
        renderPortfolios();
      }
    });

    renderPortfolios();
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
