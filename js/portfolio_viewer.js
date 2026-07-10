(function () {
  // 1. 전역 상수 및 상태 변수 선언
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택
  // DOM 조회는 defer 로딩 이후 runPageScript 안에서 진행합니다.

  // 3. 유틸리티 및 일반 함수 정의
  function runPageScript() {
    const STORAGE_KEY = 'careerfit_portfolios';
    const PORTFOLIO_ENDPOINT = '/api/portfolios';
    const portfolioId = new URLSearchParams(window.location.search).get('id');
    let slides = [];
    let currentSlideIndex = 0;

    function normalizeText(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

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

    function normalizeBlocks(portfolio) {
      const isPptFormat = String(portfolio.format || '').includes('PPT');
      const source = isPptFormat && Array.isArray(portfolio.slides) && portfolio.slides.length
        ? portfolio.slides
        : portfolio.blocks;
      const blocks = Array.isArray(source) ? source : [];

      if (blocks.length) {
        return blocks.map((block, index) => ({
          title: normalizeText(block.title) || `섹션 ${index + 1}`,
          body: normalizeText(block.body || block.description),
        }));
      }

      const content = normalizeText(portfolio.content || portfolio.summary);
      if (content) {
        return content.split(/\n{2,}/)
          .map((block, index) => ({
            title: index === 0 ? normalizeText(portfolio.title || '포트폴리오') : `섹션 ${index + 1}`,
            body: normalizeText(block),
          }))
          .filter((block) => block.body);
      }

      return [{
        title: normalizeText(portfolio.title || portfolio.format || '포트폴리오 초안'),
        body: normalizeText(portfolio.summary || '생성된 포트폴리오 초안입니다.'),
      }];
    }

    function createSlides(portfolio) {
      const blocks = normalizeBlocks(portfolio);
      const keywords = normalizeKeywordList(portfolio.keywords).slice(0, 3);
      return [
        {
          type: 'overview',
          eyebrow: normalizeText(portfolio.format || 'Portfolio'),
          title: normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} - ${portfolio.purpose || ''}`),
          body: normalizeText(portfolio.summary || blocks[0]?.body),
          meta: [
            ['형식', portfolio.format],
            ['전공', portfolio.major],
            ['키워드', keywords.join(', ')],
          ].filter(([, value]) => normalizeText(value)),
          cards: blocks.slice(0, 4),
        },
        ...blocks.slice(0, 5).map((block, index) => ({
          type: 'detail',
          eyebrow: `Slide ${index + 2}`,
          title: block.title,
          body: block.body,
          subtitle: normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} 초안`),
        })),
      ];
    }

    function readLocalPortfolios() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
      } catch {
        return [];
      }
    }

    function cachePortfolio(portfolio) {
      if (!portfolio?.id) return;
      const saved = readLocalPortfolios().filter((item) => item.id !== portfolio.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([portfolio, ...saved]));
    }

    async function loadPortfolioById(id) {
      if (id) {
        try {
          const response = await fetch(`${PORTFOLIO_ENDPOINT}?id=${encodeURIComponent(id)}`, {
            credentials: 'same-origin',
            cache: 'no-store',
          });
          if (response.ok) {
            const payload = await response.json();
            if (payload.portfolio) {
              cachePortfolio(payload.portfolio);
              return payload.portfolio;
            }
          }
        } catch (error) {
          console.warn('Portfolio API viewer load failed.', error);
        }
      }

      const localPortfolios = readLocalPortfolios();
      return localPortfolios.find((item) => item.id === id) || localPortfolios[0] || null;
    }

    function wrapText(context, text, maxWidth) {
      const words = String(text || '').split(/\s+/).filter(Boolean);
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
      return lines;
    }

    function drawPill(context, text, x, y, width) {
      if (!text) return;
      context.fillStyle = '#eef4ff';
      context.strokeStyle = '#d6e4ff';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(x, y, width, 42, 16);
      context.fill();
      context.stroke();
      context.fillStyle = '#3156e8';
      context.font = '700 18px Malgun Gothic, Arial, sans-serif';
      context.fillText(text, x + 18, y + 27);
    }

    function drawCard(context, block, x, y, width, height) {
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#d8e2f5';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(x, y, width, height, 18);
      context.fill();
      context.stroke();

      context.fillStyle = '#101828';
      context.font = '800 25px Malgun Gothic, Arial, sans-serif';
      wrapText(context, block.title, width - 56).slice(0, 1)
        .forEach((line, index) => context.fillText(line, x + 28, y + 50 + index * 32));

      context.fillStyle = '#344054';
      context.font = '500 20px Malgun Gothic, Arial, sans-serif';
      wrapText(context, block.body, width - 56).slice(0, 4)
        .forEach((line, index) => context.fillText(line, x + 28, y + 98 + index * 34));
    }

    function drawSlideImage(slide) {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 900;
      const context = canvas.getContext('2d');

      context.fillStyle = '#f5f7fb';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#dbe4f4';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(34, 30, 1532, 840, 22);
      context.fill();
      context.stroke();

      drawPill(context, slide.eyebrow, 78, 76, slide.type === 'overview' ? 198 : 138);

      context.fillStyle = '#101828';
      context.font = '900 48px Malgun Gothic, Arial, sans-serif';
      wrapText(context, slide.title, 1320).slice(0, 2)
        .forEach((line, index) => context.fillText(line, 78, 170 + index * 58));

      if (slide.type === 'overview') {
        context.strokeStyle = '#101828';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(78, 300);
        context.lineTo(1460, 300);
        context.stroke();

        slide.meta.forEach(([label, value], index) => {
          const x = 82 + index * 474;
          drawCard(context, { title: label, body: normalizeText(value) }, x, 336, 410, 95);
        });

        const positions = [
          [82, 474, 670, 160],
          [804, 474, 670, 160],
          [82, 666, 670, 160],
          [804, 666, 670, 160],
        ];
        slide.cards.forEach((block, index) => drawCard(context, block, ...positions[index]));
      } else {
        context.fillStyle = '#667085';
        context.font = '600 24px Malgun Gothic, Arial, sans-serif';
        context.fillText(slide.subtitle || '', 80, 250);
        drawCard(context, { title: '핵심 내용', body: slide.body }, 90, 330, 1420, 420);
      }

      return canvas.toDataURL('image/png');
    }

    function renderEmptyViewer() {
      const viewerBody = document.getElementById('viewerBody');
      viewerBody.removeAttribute('src');
      viewerBody.alt = '포트폴리오를 찾을 수 없습니다.';
      document.getElementById('slideCount').textContent = '0 / 0';
      document.getElementById('prevSlideBtn').disabled = true;
      document.getElementById('nextSlideBtn').disabled = true;
      document.getElementById('bottomPrevSlideBtn').disabled = true;
      document.getElementById('bottomNextSlideBtn').disabled = true;
    }

    function renderSlide() {
      if (!slides.length) {
        renderEmptyViewer();
        return;
      }
      const slide = slides[currentSlideIndex];
      document.getElementById('viewerBody').src = drawSlideImage(slide);
      document.getElementById('slideCount').textContent = `${currentSlideIndex + 1} / ${slides.length}`;
      document.getElementById('prevSlideBtn').disabled = currentSlideIndex === 0;
      document.getElementById('nextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
      document.getElementById('bottomPrevSlideBtn').disabled = currentSlideIndex === 0;
      document.getElementById('bottomNextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
    }

    function goPrevSlide() {
      currentSlideIndex = Math.max(0, currentSlideIndex - 1);
      renderSlide();
    }

    function goNextSlide() {
      currentSlideIndex = Math.min(slides.length - 1, currentSlideIndex + 1);
      renderSlide();
    }

    async function initializeViewer() {
      const portfolio = await loadPortfolioById(portfolioId);
      slides = portfolio ? createSlides(portfolio) : [];

      document.getElementById('prevSlideBtn').addEventListener('click', goPrevSlide);
      document.getElementById('nextSlideBtn').addEventListener('click', goNextSlide);
      document.getElementById('bottomPrevSlideBtn').addEventListener('click', goPrevSlide);
      document.getElementById('bottomNextSlideBtn').addEventListener('click', goNextSlide);

      renderSlide();
      document.getElementById('viewerContent').scrollIntoView({ block: 'start' });
    }

    initializeViewer();
  }

  // 4. 이벤트 리스너 등록
  function initializePageScript() {
    if (pageScriptInitialized) return;
    pageScriptInitialized = true;
    runPageScript();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePageScript, { once: true });
  }

  // 5. 초기화 실행
  if (document.readyState !== 'loading') {
    initializePageScript();
  }
}());
