import pptxgen from 'pptxgenjs';

import { renderPortfolioSummaryTemplate } from '../../../../lib/portfolio-summary-pptx';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeBlocks(portfolio) {
  const source = portfolio.format === 'PPT 발표 스펙'
    ? portfolio.slides
    : portfolio.blocks;
  const blocks = Array.isArray(source) ? source : [];

  if (blocks.length) {
    return blocks.map((block, index) => ({
      title: normalizeText(block.title) || `섹션 ${index + 1}`,
      body: normalizeText(block.body || block.description),
    }));
  }

  return [{
    title: normalizeText(portfolio.title || portfolio.format || '포트폴리오 초안'),
    body: normalizeText(portfolio.summary || '생성된 포트폴리오 초안입니다.'),
  }];
}

function splitBodyLines(body) {
  return normalizeText(body)
    .split(/(?:\n|•|ㆍ| - )+/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .slice(0, 6);
}

function truncateText(value, maxLength, fallback = '제공된 정보 부족') {
  const text = normalizeText(value) || fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function addTitle(slide, text, y = 0.55) {
  slide.addText(text, {
    x: 0.65,
    y,
    w: 11.0,
    h: 0.55,
    fontFace: 'Malgun Gothic',
    fontSize: 25,
    bold: true,
    color: '101828',
    margin: 0,
    fit: 'shrink',
  });
}

function addSubText(slide, text, y = 1.18) {
  slide.addText(text, {
    x: 0.67,
    y,
    w: 11.0,
    h: 0.35,
    fontFace: 'Malgun Gothic',
    fontSize: 12,
    color: '667085',
    margin: 0,
    fit: 'shrink',
  });
}

function addPill(slide, text, x, y, w) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h: 0.36,
    rectRadius: 0.08,
    fill: { color: 'EEF4FF' },
    line: { color: 'D6E4FF' },
  });
  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.08,
    w: w - 0.24,
    h: 0.16,
    fontFace: 'Malgun Gothic',
    fontSize: 9,
    bold: true,
    color: '3156E8',
    margin: 0,
    fit: 'shrink',
  });
}

function addCard(slide, block, x, y, w, h) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'D8E2F5', width: 1 },
  });
  slide.addText(block.title, {
    x: x + 0.22,
    y: y + 0.22,
    w: w - 0.44,
    h: 0.28,
    fontFace: 'Malgun Gothic',
    fontSize: 14,
    bold: true,
    color: '101828',
    margin: 0,
    fit: 'shrink',
  });

  const lines = splitBodyLines(block.body);
  const bulletText = lines.length ? lines.map((line) => ({ text: line, options: { bullet: { type: 'bullet' } } })) : [{ text: '내용 보완 필요' }];
  slide.addText(bulletText, {
    x: x + 0.26,
    y: y + 0.72,
    w: w - 0.52,
    h: h - 0.92,
    fontFace: 'Malgun Gothic',
    fontSize: 10.5,
    color: '344054',
    breakLine: false,
    fit: 'shrink',
    paraSpaceAfterPt: 4,
    margin: 0,
  });
}

function addOnePageText(slide, text, options) {
  slide.addText(truncateText(text, options.maxLength || 80), {
    fontFace: 'Malgun Gothic',
    color: '222222',
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    ...options,
  });
}

function addOnePageRoundRect(slide, x, y, w, h, fill = 'FFFFFF', line = 'E1E6E2') {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: line },
  });
}

function addHumanIcon(slide, x, y, size) {
  slide.addShape('ellipse', {
    x,
    y,
    w: size,
    h: size,
    fill: { color: 'E7EBEE' },
    line: { color: 'E7EBEE' },
  });
  slide.addShape('ellipse', {
    x: x + size * 0.38,
    y: y + size * 0.22,
    w: size * 0.24,
    h: size * 0.24,
    fill: { color: 'C5CBD3' },
    line: { color: 'C5CBD3' },
  });
  slide.addShape('ellipse', {
    x: x + size * 0.18,
    y: y + size * 0.50,
    w: size * 0.64,
    h: size * 0.34,
    fill: { color: 'C5CBD3' },
    line: { color: 'C5CBD3' },
  });
}

function addOnePageInfoRows(slide, rows, x, y, labelW, valueW, rowH = 0.28) {
  rows.filter(([, value]) => normalizeText(value)).slice(0, 9).forEach(([label, value], index) => {
    const rowY = y + index * rowH;
    addOnePageText(slide, label, {
      x,
      y: rowY,
      w: labelW,
      h: 0.14,
      fontSize: 6,
      bold: true,
      color: '3F776F',
      maxLength: 12,
    });
    addOnePageText(slide, value, {
      x: x + labelW + 0.08,
      y: rowY,
      w: valueW,
      h: 0.14,
      fontSize: 6.2,
      bold: true,
      maxLength: 36,
    });
  });
}

function addOnePageChip(slide, text, x, y, w = 0.7) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h: 0.22,
    rectRadius: 0.05,
    fill: { color: '3F776F' },
    line: { color: '3F776F' },
  });
  addOnePageText(slide, text, {
    x,
    y: y + 0.055,
    w,
    h: 0.08,
    fontSize: 5.4,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    maxLength: 8,
  });
}

function addOnePageCardTitle(slide, title, x, y, w) {
  addOnePageText(slide, title, {
    x,
    y,
    w,
    h: 0.2,
    fontSize: 8.3,
    bold: true,
    maxLength: 32,
  });
}

function addOnePageSummarySlide(pptx, portfolio) {
  const raw = portfolio.raw || {};
  const profile = raw.profile || {};
  const headline = raw.headline || {};
  const targetFit = raw.target_fit || {};
  const competencies = Array.isArray(raw.core_competencies) ? raw.core_competencies : [];
  const experiences = Array.isArray(raw.representative_experiences) ? raw.representative_experiences : [];
  const skills = Array.isArray(raw.skill_keywords) ? raw.skill_keywords : [];
  const educationItems = Array.isArray(raw.license_awards_education) ? raw.license_awards_education : [];
  const differentiator = raw.differentiator || {};

  const slide = pptx.addSlide();
  slide.background = { color: 'F3F4F1' };
  addHumanIcon(slide, 0.65, 0.72, 0.74);

  addOnePageText(slide, 'PORTFOLIO SUMMARY', {
    x: 1.88,
    y: 0.56,
    w: 2.0,
    h: 0.16,
    fontSize: 7,
    bold: true,
    color: '3F776F',
    maxLength: 24,
  });
  addOnePageText(slide, headline.title || portfolio.title || '1페이지 요약본', {
    x: 1.88,
    y: 0.88,
    w: 2.8,
    h: 0.28,
    fontSize: 16,
    bold: true,
    maxLength: 22,
  });
  addOnePageText(slide, headline.one_line_intro || portfolio.summary || '근거 기반 1페이지 초안입니다.', {
    x: 1.88,
    y: 1.35,
    w: 2.65,
    h: 0.18,
    fontSize: 8,
    color: '697471',
    maxLength: 38,
  });
  addOnePageText(slide, headline.self_intro || '', {
    x: 1.88,
    y: 1.78,
    w: 2.75,
    h: 0.42,
    fontSize: 7.2,
    maxLength: 95,
  });
  slide.addShape('roundRect', {
    x: 1.88,
    y: 2.52,
    w: 1.12,
    h: 0.28,
    rectRadius: 0.08,
    fill: { color: '3F776F' },
    line: { color: '3F776F' },
  });
  addOnePageText(slide, headline.fit_label || '근거 기반 초안', {
    x: 1.88,
    y: 2.60,
    w: 1.12,
    h: 0.08,
    fontSize: 6.2,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    maxLength: 18,
  });

  addOnePageRoundRect(slide, 4.85, 0.58, 2.16, 2.58);
  addOnePageCardTitle(slide, 'ABOUT ME', 5.08, 0.9, 1.3);
  addOnePageInfoRows(slide, [
    ['이름', profile.name],
    ['성별', profile.gender],
    ['생년월일', profile.birth],
    ['이메일', profile.email],
    ['휴대폰', profile.phone],
    ['주소', profile.address],
    ['학교', [profile.school_name, profile.school_type].filter(Boolean).join(' / ')],
    ['전공', profile.major || portfolio.major],
    ['부전공', profile.minor],
  ], 5.08, 1.24, 0.62, 1.1, 0.23);

  addOnePageRoundRect(slide, 0.65, 3.74, 2.95, 1.86);
  addOnePageCardTitle(slide, 'TARGET FIT', 0.88, 4.0, 1.4);
  addOnePageInfoRows(slide, [
    ['ROLE', targetFit.role?.value],
    ['INDUSTRY', targetFit.industry?.value],
    ['COMPANY', targetFit.company?.value],
  ], 0.88, 4.45, 0.72, 1.55, 0.34);

  addOnePageRoundRect(slide, 3.9, 3.74, 2.95, 1.86);
  addOnePageCardTitle(slide, 'CORE COMPETENCIES', 4.15, 4.0, 1.8);
  competencies.slice(0, 3).forEach((item, index) => {
    addOnePageText(slide, `• ${item.text || '제공된 정보 부족'}`, {
      x: 4.16,
      y: 4.45 + index * 0.34,
      w: 2.1,
      h: 0.16,
      fontSize: 8,
      bold: true,
      maxLength: 34,
    });
  });

  addOnePageText(slide, 'REPRESENTATIVE EXPERIENCES', {
    x: 0.65,
    y: 6.2,
    w: 3.0,
    h: 0.2,
    fontSize: 8.3,
    bold: true,
    maxLength: 34,
  });
  const experienceCards = experiences.length ? experiences.slice(0, 3) : [{
    title: '대표 활동 자료 부족',
    summary: '승인된 활동 요약을 추가하면 직무 맞춤 경험으로 교체됩니다.',
    fit_point: '자료 업로드 필요',
    evidence_ids: ['MISSING'],
  }];
  experienceCards.forEach((item, index) => {
    const x = 0.65 + index * 2.15;
    addOnePageRoundRect(slide, x, 6.58, 1.82, 1.62);
    slide.addShape('roundRect', {
      x: x + 0.17,
      y: 6.82,
      w: 0.68,
      h: 0.22,
      rectRadius: 0.05,
      fill: { color: 'EAF3F1' },
      line: { color: 'EAF3F1' },
    });
    addOnePageText(slide, item.evidence_ids?.[0] || `EXP-${index + 1}`, {
      x: x + 0.17,
      y: 6.875,
      w: 0.68,
      h: 0.08,
      fontSize: 5.4,
      bold: true,
      color: '3F776F',
      align: 'center',
      maxLength: 10,
    });
    addOnePageText(slide, item.title, {
      x: x + 0.18,
      y: 7.18,
      w: 1.38,
      h: 0.18,
      fontSize: 7.6,
      bold: true,
      maxLength: 21,
    });
    addOnePageText(slide, item.summary, {
      x: x + 0.18,
      y: 7.55,
      w: 1.42,
      h: 0.28,
      fontSize: 5.9,
      color: '4C5754',
      maxLength: 46,
    });
    addOnePageText(slide, item.fit_point, {
      x: x + 0.18,
      y: 7.98,
      w: 1.38,
      h: 0.1,
      fontSize: 5.7,
      bold: true,
      color: '2E625C',
      maxLength: 30,
    });
  });

  addOnePageRoundRect(slide, 0.65, 8.72, 2.95, 0.92);
  addOnePageCardTitle(slide, 'SKILL KEYWORDS', 0.88, 9.02, 1.4);
  skills.slice(0, 3).forEach((item, index) => addOnePageChip(slide, item.text, 0.88 + index * 0.82, 9.28, 0.72));

  addOnePageRoundRect(slide, 3.9, 8.72, 2.95, 0.92);
  addOnePageCardTitle(slide, 'LICENSE · AWARDS · EDUCATION', 4.15, 9.02, 2.3);
  addOnePageText(slide, educationItems.map((item) => item.text).filter(Boolean).join(' · ') || '제공된 정보 부족', {
    x: 4.15,
    y: 9.34,
    w: 2.35,
    h: 0.12,
    fontSize: 6.1,
    bold: true,
    maxLength: 56,
  });

  addOnePageText(slide, 'DIFFERENTIATOR', {
    x: 0.65,
    y: 10.05,
    w: 1.1,
    h: 0.14,
    fontSize: 6.3,
    bold: true,
    color: '3F776F',
    maxLength: 18,
  });
  addOnePageText(slide, differentiator.text || '직무·산업·승인 활동 입력 시 완성도가 높아집니다.', {
    x: 1.75,
    y: 10.05,
    w: 5.0,
    h: 0.14,
    fontSize: 7,
    bold: true,
    maxLength: 62,
  });
}

function addOverviewSlide(pptx, portfolio, blocks) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F7FB' };
  slide.addShape('roundRect', {
    x: 0.28,
    y: 0.25,
    w: 12.75,
    h: 7.0,
    rectRadius: 0.12,
    fill: { color: 'FFFFFF' },
    line: { color: 'DBE4F4' },
  });

  addPill(slide, normalizeText(portfolio.format || 'Portfolio'), 0.65, 0.62, 1.65);
  addTitle(slide, normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} - ${portfolio.purpose || ''}`));
  addSubText(slide, `${normalizeText(portfolio.major || '전공 정보')} / ${normalizeText(portfolio.purpose || '생성 목적')}`);

  slide.addShape('line', {
    x: 0.65,
    y: 1.75,
    w: 11.55,
    h: 0,
    line: { color: '101828', width: 2 },
  });

  const keywords = Array.isArray(portfolio.keywords) ? portfolio.keywords.slice(0, 3) : [];
  [
    ['형식', portfolio.format],
    ['전공', portfolio.major],
    ['키워드', keywords.join(', ')],
  ].filter(([, value]) => value).forEach(([label, value], index) => {
    const x = 0.68 + index * 3.95;
    slide.addShape('roundRect', {
      x,
      y: 2.05,
      w: 3.45,
      h: 0.64,
      rectRadius: 0.08,
      fill: { color: 'F7F9FF' },
      line: { color: 'DCE6FF' },
    });
    slide.addText(label, {
      x: x + 0.18,
      y: 2.18,
      w: 0.7,
      h: 0.18,
      fontFace: 'Malgun Gothic',
      fontSize: 9,
      bold: true,
      color: '3156E8',
      margin: 0,
    });
    slide.addText(normalizeText(value), {
      x: x + 0.9,
      y: 2.16,
      w: 2.35,
      h: 0.24,
      fontFace: 'Malgun Gothic',
      fontSize: 10,
      color: '101828',
      margin: 0,
      fit: 'shrink',
    });
  });

  const positions = [
    [0.68, 3.0, 5.85, 1.55],
    [6.72, 3.0, 5.85, 1.55],
    [0.68, 4.82, 5.85, 1.55],
    [6.72, 4.82, 5.85, 1.55],
  ];
  blocks.slice(0, 4).forEach((block, index) => addCard(slide, block, ...positions[index]));
}

function addDetailSlides(pptx, portfolio, blocks) {
  blocks.forEach((block, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    addPill(slide, `Slide ${index + 2}`, 0.65, 0.55, 1.1);
    addTitle(slide, block.title, 1.05);
    addSubText(slide, normalizeText(portfolio.title || `${portfolio.format || '포트폴리오'} 초안`), 1.6);

    slide.addShape('roundRect', {
      x: 0.75,
      y: 2.15,
      w: 11.85,
      h: 4.35,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'D8E2F5' },
    });

    const lines = splitBodyLines(block.body);
    const bulletText = lines.length ? lines.map((line) => ({ text: line, options: { bullet: { type: 'bullet' } } })) : [{ text: block.body || '내용 보완 필요' }];
    slide.addText(bulletText, {
      x: 1.12,
      y: 2.58,
      w: 10.95,
      h: 3.55,
      fontFace: 'Malgun Gothic',
      fontSize: 18,
      color: '263244',
      breakLine: false,
      fit: 'shrink',
      paraSpaceAfterPt: 8,
      margin: 0,
    });
  });
}

export async function POST(request) {
  try {
    const portfolio = await request.json();
    if (!portfolio || typeof portfolio !== 'object') {
      return Response.json({ message: '포트폴리오 데이터가 필요합니다.' }, { status: 400 });
    }

    const pptx = new pptxgen();
    const isOnePageSummary = portfolio.format === '1페이지 요약본';
    if (!isOnePageSummary) {
      pptx.layout = 'LAYOUT_WIDE';
    }
    pptx.author = 'Myfitfolio';
    pptx.subject = normalizeText(portfolio.purpose || '포트폴리오 생성');
    pptx.title = normalizeText(portfolio.title || portfolio.format || 'Myfitfolio Portfolio');
    pptx.company = 'Myfitfolio';
    pptx.lang = 'ko-KR';
    pptx.theme = {
      headFontFace: 'Malgun Gothic',
      bodyFontFace: 'Malgun Gothic',
      lang: 'ko-KR',
    };

    if (isOnePageSummary) {
      renderPortfolioSummaryTemplate(pptx, portfolio);
    } else {
      const blocks = normalizeBlocks(portfolio);
      addOverviewSlide(pptx, portfolio, blocks);
      addDetailSlides(pptx, portfolio, blocks.slice(0, 5));
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="myfitfolio-portfolio.pptx"',
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return Response.json({ message: error.message || 'PPTX 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

