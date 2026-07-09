import fs from 'fs';
import path from 'path';
import pptxgen from 'pptxgenjs';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeBlocks(portfolio) {
  const source = isPptPresentationSpec(portfolio)
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
function isPptPresentationSpec(portfolio) {
  return normalizeText(portfolio?.format).includes('PPT');
}
function readPptSpecTemplate() {
  const templatePath = path.join(process.cwd(), 'portfolio_design', 'portfolio-presentation', 'pptxgen-template.json');
  try {
    return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  } catch (error) {
    console.warn('PPT 발표 스펙 템플릿 로드 실패:', error.message);
    return null;
  }
}

function truncateText(value, maxLength, fallback = '제공된 정보 부족') {
  const text = normalizeText(value) || fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function truncateNatural(value, maxLength, fallback = '정보 입력 필요') {
  const text = normalizeText(value) || fallback;
  if (text.length <= maxLength) return text;

  const sentence = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((item) => normalizeText(item))
    .find((item) => item && item.length <= maxLength);
  if (sentence) return sentence;

  const words = text.split(/\s+/);
  let result = '';
  for (const word of words) {
    const next = result ? `${result} ${word}` : word;
    if (next.length > maxLength) break;
    result = next;
  }
  return result || text.slice(0, maxLength);
}

function listItems(items, limit = 4) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return normalizeText(item);
      return normalizeText([item.period, item.content, item.name, item.level].filter(Boolean).join(' '));
    })
    .filter(Boolean)
    .slice(0, limit);
}

function addSpecText(slide, text, options) {
  slide.addText(truncateNatural(text, options.maxLength || options.maxChars || 120, options.fallback), {
    fontFace: 'Malgun Gothic',
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    color: '111111',
    ...options,
  });
}

function addSpecRoundRect(slide, x, y, w, h, fill = 'FFFFFF', line = 'E5E7EB', radius = 0.08) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: radius,
    fill: { color: fill },
    line: { color: line, width: 1 },
  });
}

function addSpecLine(slide, lineDef) {
  slide.addShape('line', {
    x: lineDef.x,
    y: lineDef.y,
    w: lineDef.w,
    h: lineDef.h || 0,
    line: { color: lineDef.color || 'E5E7EB', width: lineDef.width || 1 },
  });
}

function addSpecPhotoPlaceholder(slide, x, y, w, h, label = 'IMAGE') {
  addSpecRoundRect(slide, x, y, w, h, 'F3F7FA', 'E3EDF4', 0.08);
  slide.addShape('ellipse', {
    x: x + w * 0.38,
    y: y + h * 0.22,
    w: w * 0.24,
    h: h * 0.24,
    fill: { color: 'D7E7F1' },
    line: { color: 'D7E7F1' },
  });
  slide.addShape('ellipse', {
    x: x + w * 0.24,
    y: y + h * 0.5,
    w: w * 0.52,
    h: h * 0.28,
    fill: { color: 'D7E7F1' },
    line: { color: 'D7E7F1' },
  });
  addSpecText(slide, label, {
    x: x + 0.08,
    y: y + h - 0.28,
    w: w - 0.16,
    h: 0.12,
    fontSize: 6.5,
    bold: true,
    color: '8BA8B8',
    align: 'center',
    maxLength: 18,
  });
}

function addSpecFooterWash(slide) {
  slide.addShape('rect', {
    x: 0,
    y: 6.9,
    w: 13.333,
    h: 0.6,
    fill: { color: 'EAF7FD', transparency: 15 },
    line: { color: 'EAF7FD', transparency: 100 },
  });
}

function getPptSpecData(portfolio) {
  const raw = portfolio.raw || {};
  const cover = raw.cover || {};
  const profile = raw.profile || {};
  const slides = Array.isArray(portfolio.slides) ? portfolio.slides : [];
  const firstSlide = slides[0] || {};
  const secondSlide = slides[1] || {};
  const fallbackExperience = {
    projectLabel: 'Project 01',
    introTitle: slides[2]?.title || '경험 1 : 핵심 경험을 발표 흐름으로 정리',
    cards: {
      customerNeed: {
        description: splitBodyLines(slides[2]?.body)[0] || '사용자와 목표에 맞는 경험 정리가 필요했습니다.',
        keyword: portfolio.keywords?.[0] || '고객 니즈',
      },
      problemOpportunity: {
        description: splitBodyLines(slides[2]?.body)[1] || '흩어진 자료를 발표 가능한 구조로 바꾸는 과제가 있었습니다.',
        keyword: portfolio.keywords?.[1] || '문제 정의',
      },
      comparisonTarget: {
        description: splitBodyLines(slides[2]?.body)[2] || '기존 정리 방식과 발표용 구성을 비교했습니다.',
        keyword: portfolio.keywords?.[2] || '비교 분석',
      },
    },
    resultTitle: slides[3]?.title || '결과물 : 경험의 흐름을 발표 가능한 구조로 정리',
    visual: {
      type: 'qualitative_card',
      title: portfolio.experiences?.[0] || portfolio.title || '대표 프로젝트',
      items: splitBodyLines(slides[3]?.body).slice(0, 3),
    },
    actions: {
      problemAction: splitBodyLines(slides[3]?.body).slice(0, 2),
      productivityAction: splitBodyLines(slides[4]?.body).slice(0, 2),
      communicationAction: splitBodyLines(slides[5]?.body).slice(0, 2),
    },
  };

  return {
    cover: {
      headline: cover.headline || firstSlide.title || portfolio.title || '성장하고 확장하는 지원자입니다.',
      description: cover.description || firstSlide.body || portfolio.summary || '핵심 경험과 결과를 발표용 포트폴리오로 정리했습니다.',
      name: cover.name || '지원자',
      mobile: cover.mobile || cover.phone || '',
      email: cover.email || '',
      web: cover.web || '',
    },
    profile: {
      photo: profile.photo || '',
      greeting: profile.greeting || secondSlide.title || '안녕하세요\n지원자입니다.',
      about: listItems(profile.about || [cover.name, cover.email, cover.mobile || cover.phone], 4),
      intro: profile.intro || secondSlide.body || '프로젝트 경험을 바탕으로 문제를 정의하고 결과를 정리합니다.',
      education: listItems(profile.education, 4),
      experience: listItems(profile.experience, 4),
      licenses: listItems(profile.licenses, 4),
      skills: listItems(profile.skills, 4),
    },
    experiences: (Array.isArray(raw.experiences) && raw.experiences.length ? raw.experiences : [fallbackExperience])
      .slice(0, 4),
  };
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

function addPptSpecCommonHeader(slide, template, projectLabel, title) {
  const labelDef = template.common?.topProjectLabel || {};
  const titleDef = template.common?.centerTitle || {};
  const dividerDef = template.common?.divider || {};
  addSpecText(slide, projectLabel, {
    x: labelDef.x ?? 0,
    y: labelDef.y ?? 0.32,
    w: labelDef.w ?? 13.333,
    h: labelDef.h ?? 0.24,
    fontSize: labelDef.fontSize ?? 12,
    bold: true,
    color: labelDef.color ?? '66BDEB',
    align: labelDef.align ?? 'center',
    maxLength: 18,
  });
  addSpecText(slide, title, {
    x: titleDef.x ?? 0.7,
    y: titleDef.y ?? 0.72,
    w: titleDef.w ?? 11.93,
    h: titleDef.h ?? 0.44,
    fontSize: titleDef.fontSize ?? 22,
    bold: true,
    color: titleDef.color ?? '111111',
    align: titleDef.align ?? 'center',
    maxLength: 46,
  });
  addSpecLine(slide, dividerDef.x ? dividerDef : { x: 0.48, y: 1.48, w: 12.38, color: 'E5E7EB' });
}

function addPptSpecCoverSlide(pptx, template, data) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  const coverSlide = template.slides?.find((item) => item.type === 'cover') || {};
  const fields = coverSlide.fields || {};
  const cover = data.cover;

  (coverSlide.decorations || []).forEach((decoration) => {
    if (decoration.type === 'rect') {
      slide.addShape('rect', {
        x: decoration.x,
        y: decoration.y,
        w: decoration.w,
        h: decoration.h,
        fill: { color: decoration.fill || 'EAF7FD' },
        line: { color: decoration.line || decoration.fill || 'EAF7FD' },
      });
    }
  });

  addSpecText(slide, fields.label?.text || 'Portfolio', {
    x: fields.label?.x ?? 0,
    y: fields.label?.y ?? 1.1,
    w: fields.label?.w ?? 13.333,
    h: fields.label?.h ?? 0.32,
    fontSize: fields.label?.fontSize ?? 20,
    color: fields.label?.color ?? '111111',
    align: fields.label?.align ?? 'center',
    maxLength: 16,
  });
  addSpecText(slide, cover.headline, {
    x: fields.headline?.x ?? 2.2,
    y: fields.headline?.y ?? 1.74,
    w: fields.headline?.w ?? 8.95,
    h: fields.headline?.h ?? 1.0,
    fontSize: fields.headline?.fontSize ?? 34,
    bold: true,
    color: '000000',
    align: 'center',
    maxLength: fields.headline?.maxChars ?? 34,
  });
  addSpecText(slide, cover.description, {
    x: fields.description?.x ?? 2.6,
    y: fields.description?.y ?? 3.45,
    w: fields.description?.w ?? 8.14,
    h: fields.description?.h ?? 0.35,
    fontSize: fields.description?.fontSize ?? 12,
    color: '6B7280',
    align: 'center',
    maxLength: fields.description?.maxChars ?? 46,
  });

  const bar = fields.contactBar || {};
  addSpecRoundRect(slide, bar.x ?? 0.5, bar.y ?? 6.65, bar.w ?? 12.33, bar.h ?? 0.56, 'FFFFFF', 'FFFFFF', 0.08);
  const contactItems = [
    ['Name', cover.name],
    ['Mobile', cover.mobile],
    ['E-mail', cover.email],
    ['Web', cover.web],
  ];
  contactItems.forEach(([label, value], index) => {
    const x = (bar.x ?? 0.5) + 0.45 + index * 2.9;
    addSpecText(slide, `${label}  |`, {
      x,
      y: (bar.y ?? 6.65) + 0.18,
      w: 0.76,
      h: 0.12,
      fontSize: 7.2,
      bold: true,
      maxLength: 10,
    });
    addSpecText(slide, value || '-', {
      x: x + 0.86,
      y: (bar.y ?? 6.65) + 0.18,
      w: 1.75,
      h: 0.12,
      fontSize: 7.2,
      color: '333333',
      maxLength: 28,
    });
  });
}

function addPptSpecProfileSection(slide, section, items) {
  addSpecText(slide, section.title, {
    x: section.x,
    y: section.y,
    w: section.w,
    h: 0.2,
    fontSize: 11.5,
    bold: true,
    color: '66BDEB',
    maxLength: 18,
  });
  const list = items.length ? items : ['정보 입력 필요'];
  list.slice(0, 4).forEach((item, index) => {
    addSpecText(slide, item, {
      x: section.x,
      y: section.y + 0.36 + index * 0.26,
      w: section.w,
      h: 0.12,
      fontSize: 7.8,
      color: '333333',
      maxLength: 38,
    });
  });
}

function addPptSpecProfileSlide(pptx, template, data) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSpecFooterWash(slide);
  const profileSlide = template.slides?.find((item) => item.type === 'profile') || {};
  const fields = profileSlide.fields || {};
  const profile = data.profile;
  const photo = fields.photo || {};

  addSpecPhotoPlaceholder(slide, photo.x ?? 0.82, photo.y ?? 0.78, photo.w ?? 2.7, photo.h ?? 2.45, 'PROFILE');
  addSpecText(slide, profile.greeting, {
    x: fields.greeting?.x ?? 1.05,
    y: fields.greeting?.y ?? 3.75,
    w: fields.greeting?.w ?? 2.45,
    h: fields.greeting?.h ?? 0.6,
    fontSize: fields.greeting?.fontSize ?? 21,
    bold: true,
    maxLength: fields.greeting?.maxChars ?? 22,
  });
  addSpecText(slide, 'About', {
    x: fields.about?.x ?? 1.08,
    y: 4.55,
    w: 1.2,
    h: 0.16,
    fontSize: 10,
    bold: true,
    color: '66BDEB',
    maxLength: 10,
  });
  profile.about.slice(0, 4).forEach((item, index) => {
    addSpecText(slide, item, {
      x: fields.about?.x ?? 1.08,
      y: (fields.about?.y ?? 4.9) + index * 0.23,
      w: fields.about?.w ?? 2.4,
      h: 0.11,
      fontSize: 7.4,
      maxLength: fields.about?.maxCharsPerItem ?? 24,
    });
  });
  addSpecText(slide, profile.intro, {
    x: fields.intro?.x ?? 4.7,
    y: fields.intro?.y ?? 1.05,
    w: fields.intro?.w ?? 6.9,
    h: fields.intro?.h ?? 0.55,
    fontSize: fields.intro?.fontSize ?? 11,
    color: '6B7280',
    maxLength: fields.intro?.maxChars ?? 58,
  });
  (fields.sections || []).forEach((section) => {
    addPptSpecProfileSection(slide, section, profile[section.key] || []);
  });
}

function getExperienceCard(item, key) {
  return item.cards?.[key] || {};
}

function addPptSpecExperienceIntroSlide(pptx, template, item, index) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSpecFooterWash(slide);
  addPptSpecCommonHeader(
    slide,
    template,
    item.projectLabel || `Project ${String(index + 1).padStart(2, '0')}`,
    item.introTitle || `경험 ${index + 1} : 핵심 경험 소개`
  );

  const introSlide = template.slides?.find((slideDef) => slideDef.type === 'experience_intro') || {};
  const fields = introSlide.fields || {};
  const cardStyle = fields.cardStyle || {};
  (fields.cards || []).forEach((cardDef) => {
    const card = getExperienceCard(item, cardDef.key);
    addSpecPhotoPlaceholder(slide, cardDef.x, cardDef.y, cardDef.w, cardStyle.image?.h ?? 1.78, cardDef.title);
    addSpecText(slide, cardDef.title, {
      x: cardDef.x,
      y: cardDef.y + (cardStyle.title?.yOffset ?? 2.28),
      w: cardDef.w,
      h: cardStyle.title?.h ?? 0.34,
      fontSize: cardStyle.title?.fontSize ?? 16,
      bold: true,
      align: 'center',
      maxLength: 16,
    });
    addSpecText(slide, card.description, {
      x: cardDef.x + 0.12,
      y: cardDef.y + (cardStyle.description?.yOffset ?? 2.9),
      w: cardDef.w - 0.24,
      h: cardStyle.description?.h ?? 0.5,
      fontSize: cardStyle.description?.fontSize ?? 9.5,
      align: 'center',
      color: '333333',
      maxLength: cardStyle.description?.maxChars ?? 46,
    });
    const keywordW = cardStyle.keyword?.w ?? 2.35;
    const keywordX = cardDef.x + (cardDef.w - keywordW) / 2;
    addSpecRoundRect(
      slide,
      keywordX,
      cardDef.y + (cardStyle.keyword?.yOffset ?? 3.62),
      keywordW,
      cardStyle.keyword?.h ?? 0.3,
      cardStyle.keyword?.fill ?? '000000',
      cardStyle.keyword?.fill ?? '000000',
      0.04
    );
    addSpecText(slide, card.keyword || cardDef.title, {
      x: keywordX,
      y: cardDef.y + (cardStyle.keyword?.yOffset ?? 3.62) + 0.08,
      w: keywordW,
      h: 0.08,
      fontSize: cardStyle.keyword?.fontSize ?? 8.5,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      maxLength: cardStyle.keyword?.maxChars ?? 12,
    });
  });
}

function addPptSpecVisual(slide, visualDef, visual) {
  addSpecRoundRect(slide, visualDef.x, visualDef.y, visualDef.w, visualDef.h, 'FFFFFF', 'F1F5F9', 0.08);
  addSpecRoundRect(slide, visualDef.x + 1.68, visualDef.y + 0.18, 2.2, 0.34, '000000', '000000', 0.04);
  addSpecText(slide, visual?.title || '프로젝트명 입력', {
    x: visualDef.x + 0.25,
    y: visualDef.y + 0.25,
    w: visualDef.w - 0.5,
    h: 0.2,
    fontSize: 10,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    maxLength: 22,
  });

  const items = listItems(visual?.items, 3);
  const baseY = visualDef.y + 1.02;
  [0.25, 0.55, 0.78].forEach((heightRatio, lineIndex) => {
    slide.addShape('line', {
      x: visualDef.x + 0.65,
      y: baseY + lineIndex * 0.55,
      w: visualDef.w - 1.2,
      h: 0,
      line: { color: 'E5E7EB', width: 1 },
    });
    slide.addShape('line', {
      x: visualDef.x + 0.92 + lineIndex * 1.05,
      y: baseY + 1.75,
      w: 0,
      h: -heightRatio * 1.85,
      line: { color: ['66BDEB', '96D7F1', '2C82C9'][lineIndex], width: 2 },
    });
    slide.addShape('ellipse', {
      x: visualDef.x + 0.86 + lineIndex * 1.05,
      y: baseY + 1.68 - heightRatio * 1.85,
      w: 0.12,
      h: 0.12,
      fill: { color: ['66BDEB', '96D7F1', '2C82C9'][lineIndex] },
      line: { color: ['66BDEB', '96D7F1', '2C82C9'][lineIndex] },
    });
  });
  const summary = items.length ? items : ['핵심 경험 정리', '발표 흐름 구성', '보완 정보 확인'];
  summary.forEach((item, index) => {
    addSpecText(slide, `• ${item}`, {
      x: visualDef.x + 0.58,
      y: visualDef.y + 3.05 + index * 0.18,
      w: visualDef.w - 1.1,
      h: 0.09,
      fontSize: 6.3,
      color: '4B5563',
      maxLength: 34,
    });
  });
}

function addPptSpecActionBox(slide, boxDef, actionStyle, bullets) {
  addSpecRoundRect(slide, boxDef.x, boxDef.y, boxDef.w, boxDef.h, actionStyle.fill || 'FFFFFF', 'F1F5F9', 0.08);
  addSpecText(slide, boxDef.title, {
    x: boxDef.x + 0.28,
    y: boxDef.y + 0.22,
    w: boxDef.w - 0.56,
    h: 0.16,
    fontSize: actionStyle.titleFontSize ?? 11.5,
    bold: true,
    maxLength: 24,
  });
  const list = listItems(bullets, actionStyle.maxBullets ?? 2);
  (list.length ? list : ['내용 입력 필요']).forEach((bullet, index) => {
    addSpecText(slide, `• ${bullet}`, {
      x: boxDef.x + 0.32,
      y: boxDef.y + 0.56 + index * 0.19,
      w: boxDef.w - 0.64,
      h: 0.08,
      fontSize: actionStyle.bodyFontSize ?? 8.5,
      color: '444444',
      maxLength: actionStyle.maxCharsPerBullet ?? 34,
    });
  });
}

function addPptSpecResultSlide(pptx, template, item, index) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSpecFooterWash(slide);
  addPptSpecCommonHeader(
    slide,
    template,
    item.projectLabel || `Project ${String(index + 1).padStart(2, '0')}`,
    item.resultTitle || '결과물 : 이 경험의 결과를 잘 보여주는 KPI'
  );

  const resultSlide = template.slides?.find((slideDef) => slideDef.type === 'result_kpi') || {};
  const fields = resultSlide.fields || {};
  addPptSpecVisual(slide, fields.visual || { x: 1.0, y: 2.1, w: 5.55, h: 3.78 }, item.visual || {});

  slide.addShape('triangle', {
    x: fields.arrow?.x ?? 7.15,
    y: fields.arrow?.y ?? 3.58,
    w: fields.arrow?.w ?? 0.36,
    h: fields.arrow?.h ?? 0.36,
    fill: { color: fields.arrow?.color ?? '66BDEB', transparency: 15 },
    line: { color: fields.arrow?.color ?? '66BDEB', transparency: 60 },
  });

  const actionStyle = fields.actionStyle || {};
  const actions = item.actions || {};
  (fields.actions || []).forEach((boxDef) => {
    addPptSpecActionBox(slide, boxDef, actionStyle, actions[boxDef.key]);
  });
}

function addPptSpecSlides(pptx, portfolio) {
  const template = readPptSpecTemplate() || {};
  const data = getPptSpecData(portfolio);
  addPptSpecCoverSlide(pptx, template, data);
  addPptSpecProfileSlide(pptx, template, data);
  data.experiences.forEach((item, index) => {
    addPptSpecExperienceIntroSlide(pptx, template, item, index);
    addPptSpecResultSlide(pptx, template, item, index);
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
    if (isOnePageSummary) {
      pptx.defineLayout({ name: 'MYFIT_A4_PORTRAIT_SAFE', width: 7.5, height: 10.6 });
      pptx.layout = 'MYFIT_A4_PORTRAIT_SAFE';
    } else {
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
      addOnePageSummarySlide(pptx, portfolio);
    } else if (isPptPresentationSpec(portfolio)) {
      addPptSpecSlides(pptx, portfolio);
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

