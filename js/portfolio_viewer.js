(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const STORAGE_KEY = 'careerfit_portfolios';
    const fallbackPortfolios = [
      {
        id: 'portfolio-data',
        title: '데이터 분석 직무 포트폴리오',
        purpose: '데이터 분석 직무 지원',
        summary: '공공데이터 시각화 프로젝트 경험을 중심으로 정리한 포트폴리오입니다.',
        content: '공공데이터 수집과 전처리, 시각화 대시보드 제작 경험을 STAR 흐름에 맞게 정리했습니다.'
      },
      {
        id: 'portfolio-contest',
        title: '공모전 제출용 포트폴리오',
        purpose: '공모전 제출',
        summary: '문제 정의, 기획 의도, 팀 역할, 결과물을 중심으로 구성한 제출용 예시입니다.',
        content: '공모전 심사자가 빠르게 맥락을 파악하도록 핵심 경험과 결과를 앞쪽에 배치했습니다.'
      },
      {
        id: 'portfolio-ux',
        title: 'UX 프로젝트 중심 포트폴리오',
        purpose: 'UX 리서치 직무 지원',
        summary: '사용자 조사와 화면 개선 사례를 중심으로 정리한 포트폴리오입니다.',
        content: '사용자 조사, 문제 발견, 개선안 도출, 검증 결과를 순서대로 정리했습니다.'
      },
      {
        id: 'portfolio-marketing',
        title: '마케팅 인턴 지원 포트폴리오',
        purpose: '마케팅 인턴 지원',
        summary: '콘텐츠 기획과 캠페인 성과를 중심으로 구성한 포트폴리오입니다.',
        content: '콘텐츠 캘린더 작성, 카드뉴스 제작, 캠페인 지표 분석 경험을 지원 직무와 연결해 정리했습니다.'
      },
      {
        id: 'portfolio-ai-service',
        title: 'AI 포트폴리오 추천 서비스',
        purpose: '서비스 기획 직무 지원',
        summary: 'AI 추천 흐름과 사용자 문제 해결 과정을 보여주는 서비스 기획 포트폴리오입니다.',
        content: '사용자 활동 자료를 기반으로 포트폴리오 방향을 추천하는 서비스의 문제 정의, 핵심 기능, 화면 흐름을 정리했습니다.'
      },
      {
        id: 'portfolio-design-team',
        title: '캡스톤 디자인 팀 프로젝트',
        purpose: '팀 프로젝트 제출',
        summary: '팀 내 역할과 협업 과정을 중심으로 정리한 캡스톤 프로젝트 포트폴리오입니다.',
        content: '기획, 디자인, 구현 파트를 나누어 진행한 캡스톤 프로젝트에서 맡은 역할과 의사결정 과정을 정리했습니다.'
      },
      {
        id: 'portfolio-volunteer',
        title: '봉사 활동 멘토링 포트폴리오',
        purpose: '대외활동 지원',
        summary: '멘토링 활동에서의 문제 해결과 소통 경험을 담은 포트폴리오입니다.',
        content: '학습 멘토링 활동에서 참여자의 어려움을 파악하고 맞춤형 자료를 제공한 경험을 중심으로 구성했습니다.'
      },
      {
        id: 'portfolio-sw-idea',
        title: '교내 SW 아이디어 공모전',
        purpose: '아이디어 공모전 제출',
        summary: '아이디어 배경, 핵심 기능, 기대 효과를 중심으로 만든 공모전 포트폴리오입니다.',
        content: '교내 문제를 해결하기 위한 SW 아이디어를 사용자 시나리오와 기능 우선순위 중심으로 정리했습니다.'
      }
    ];

    function mergeWithFallbackPortfolios(items) {
      const usedIds = new Set(items.map((item) => item.id));
      return [...items, ...fallbackPortfolios.filter((item) => !usedIds.has(item.id))];
    }

    function readPortfolios() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) && saved.length ? mergeWithFallbackPortfolios(saved) : fallbackPortfolios;
      } catch {
        return fallbackPortfolios;
      }
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

    function splitContent(portfolio) {
      const content = portfolio.content || portfolio.summary || '포트폴리오 내용이 없습니다.';
      const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
      return blocks.length ? blocks : [content];
    }

    function createSlides(portfolio) {
      const blocks = splitContent(portfolio);
      return [
        {
          eyebrow: portfolio.purpose || 'Portfolio',
          title: portfolio.title || '포트폴리오',
          body: portfolio.summary || blocks[0],
        },
        ...blocks.map((block, index) => ({
          eyebrow: `${index + 1} / ${blocks.length}`,
          title: index === 0 ? '핵심 내용' : '세부 내용',
          body: block,
        })),
      ];
    }

    function wrapText(context, text, maxWidth) {
      const words = String(text || '').split(/\s+/);
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

    function drawSlideImage(slide) {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 900;
      const context = canvas.getContext('2d');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#5965e8';
      context.fillRect(0, 0, canvas.width, 34);

      context.fillStyle = '#eef2ff';
      context.beginPath();
      context.arc(1390, 720, 80, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#5965e8';
      context.beginPath();
      context.moveTo(1390, 720);
      context.arc(1390, 720, 80, -Math.PI / 2, Math.PI * 1.35);
      context.closePath();
      context.fill();

      context.fillStyle = '#5965e8';
      context.font = '700 30px Arial, sans-serif';
      context.fillText(slide.eyebrow, 130, 168);

      context.fillStyle = '#151b32';
      context.font = '900 64px Arial, sans-serif';
      const titleLines = wrapText(context, slide.title, 1180).slice(0, 2);
      titleLines.forEach((line, index) => context.fillText(line, 130, 270 + index * 78));

      context.fillStyle = '#4d566d';
      context.font = '600 38px Arial, sans-serif';
      const bodyStartY = 270 + titleLines.length * 78 + 70;
      const bodyLines = wrapText(context, slide.body, 1220).slice(0, 5);
      bodyLines.forEach((line, index) => context.fillText(line, 130, bodyStartY + index * 58));

      return canvas.toDataURL('image/png');
    }

    function renderSlide() {
      const slide = slides[currentSlideIndex];
      document.getElementById('viewerBody').src = drawSlideImage(slide);
      document.getElementById('slideCount').textContent = `${currentSlideIndex + 1} / ${slides.length}`;
      document.getElementById('prevSlideBtn').disabled = currentSlideIndex === 0;
      document.getElementById('nextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
      document.getElementById('bottomPrevSlideBtn').disabled = currentSlideIndex === 0;
      document.getElementById('bottomNextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
    }

    const portfolioId = new URLSearchParams(window.location.search).get('id');
    const portfolio = readPortfolios().find((item) => item.id === portfolioId) || readPortfolios()[0];
    const slides = createSlides(portfolio);
    let currentSlideIndex = 0;

    function goPrevSlide() {
      currentSlideIndex = Math.max(0, currentSlideIndex - 1);
      renderSlide();
    }

    function goNextSlide() {
      currentSlideIndex = Math.min(slides.length - 1, currentSlideIndex + 1);
      renderSlide();
    }

    document.getElementById('prevSlideBtn').addEventListener('click', goPrevSlide);
    document.getElementById('nextSlideBtn').addEventListener('click', goNextSlide);
    document.getElementById('bottomPrevSlideBtn').addEventListener('click', goPrevSlide);
    document.getElementById('bottomNextSlideBtn').addEventListener('click', goNextSlide);

    renderSlide();
    document.getElementById('viewerContent').scrollIntoView({ block: 'start' });
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
