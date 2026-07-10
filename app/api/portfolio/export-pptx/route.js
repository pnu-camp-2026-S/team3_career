import pptxgen from 'pptxgenjs';

import { renderPortfolioDetailTemplate } from '../../../../lib/portfolio-detail-pptx.js';
import { renderPortfolioSummaryTemplate } from '../../../../lib/portfolio-summary-pptx.js';

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

function naturalText(value, maxLength, fallback = '내용 입력 필요') {
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

function asList(items, limit = 4) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return normalizeText(item);
      return normalizeText([item.period, item.content, item.title, item.name, item.level, item.description].filter(Boolean).join(' '));
    })
    .filter(Boolean)
    .slice(0, limit);
}

function text(slide, value, options) {
  slide.addText(naturalText(value, options.maxLength || 90, options.fallback), {
    fontFace: 'Malgun Gothic',
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    color: '111111',
    ...options,
  });
}

function line(slide, x, y, w, color = 'E8E8E8', width = 1) {
  slide.addShape('line', { x, y, w, h: 0, line: { color, width } });
}

function roundRect(slide, x, y, w, h, fill = 'FFFFFF', border = 'FFFFFF') {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: border, width: 1 },
  });
}

function addBottomWash(slide) {
  slide.addShape('rect', {
    x: 0,
    y: 6.9,
    w: 13.333,
    h: 0.6,
    fill: { color: 'EAF8FD', transparency: 16 },
    line: { color: 'EAF8FD', transparency: 100 },
  });
}

function imageBox(slide, x, y, w, h) {
  roundRect(slide, x, y, w, h, 'EEF3F6', 'EEF3F6');
  slide.addShape('ellipse', {
    x: x + w * 0.38,
    y: y + h * 0.2,
    w: w * 0.24,
    h: h * 0.26,
    fill: { color: 'D8E1E7' },
    line: { color: 'D8E1E7' },
  });
  slide.addShape('ellipse', {
    x: x + w * 0.18,
    y: y + h * 0.5,
    w: w * 0.64,
    h: h * 0.34,
    fill: { color: 'D8E1E7' },
    line: { color: 'D8E1E7' },
  });
}

function placeholderMap(portfolio) {
  const raw = portfolio.raw || {};
  const slides = Array.isArray(portfolio.slides) ? portfolio.slides : [];
  const cover = raw.cover || {};
  const profile = raw.profile || {};
  const fallbackExperience = {
    projectLabel: 'Project 01',
    introTitle: slides[2]?.title || `${portfolio.experiences?.[0] || portfolio.title || '프로젝트 경험'} 소개`,
    cards: {
      customerNeed: {
        description: splitBodyLines(slides[2]?.body)[0] || '사용자 또는 과제에서 확인한 핵심 요구를 정리했습니다.',
        keyword: '고객 니즈',
      },
      problemOpportunity: {
        description: splitBodyLines(slides[2]?.body)[1] || '해결해야 할 문제와 기회 상황을 구분했습니다.',
        keyword: '문제 정의',
      },
      comparisonTarget: {
        description: splitBodyLines(slides[2]?.body)[2] || '비교 대상과 판단 기준을 정리했습니다.',
        keyword: '비교 대상',
      },
    },
    resultTitle: slides[3]?.title || '결과물 : 이 경험의 결과를 잘 보여주는 KPI',
    visual: {
      title: portfolio.experiences?.[0] || portfolio.title || '프로젝트명 입력',
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
      headline: cover.headline || slides[0]?.title || portfolio.title || '성장하고 확장하는 지원자입니다.',
      description: cover.description || portfolio.summary || '포트폴리오에 대한 전체적인 설명을 입력해 주세요.',
      name: cover.name || raw.name || '지원자',
      mobile: cover.mobile || cover.phone || raw.phone || '',
      email: cover.email || raw.email || '',
      web: cover.web || raw.web || '',
    },
    profile: {
      greeting: profile.greeting || slides[1]?.title || '안녕하세요\n지원자입니다.',
      intro: profile.intro || slides[1]?.body || '나를 소개하는 내용을 간단하게 입력해 주세요.',
      about: asList(profile.about || [cover.name, cover.email, cover.mobile || cover.phone], 4),
      education: asList(profile.education, 4),
      experience: asList(profile.experience, 4),
      licenses: asList(profile.licenses, 4),
      skills: asList(profile.skills || portfolio.keywords, 4),
    },
    experiences: (Array.isArray(raw.experiences) && raw.experiences.length ? raw.experiences : [fallbackExperience]).slice(0, 6),
  };
}

function addReferenceHeader(slide, label, title) {
  text(slide, label, {
    x: 0,
    y: 0.52,
    w: 13.333,
    h: 0.22,
    fontSize: 12,
    bold: true,
    color: '66BDEB',
    align: 'center',
    underline: true,
    maxLength: 20,
  });
  text(slide, title, {
    x: 0.55,
    y: 0.95,
    w: 12.2,
    h: 0.38,
    fontSize: 22,
    bold: true,
    align: 'center',
    maxLength: 48,
  });
  line(slide, 0.35, 1.55, 12.65, 'E8E8E8', 1.2);
}

function addCoverSlide(pptx, data) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addBottomWash(slide);
  slide.addShape('rect', {
    x: 6.665,
    y: 0,
    w: 0.01,
    h: 0.55,
    fill: { color: 'D8D8D8' },
    line: { color: 'D8D8D8' },
  });

  text(slide, 'Portfolio', {
    x: 0,
    y: 1.12,
    w: 13.333,
    h: 0.3,
    fontSize: 19,
    align: 'center',
    maxLength: 14,
  });
  text(slide, data.cover.headline, {
    x: 2.1,
    y: 1.82,
    w: 9.1,
    h: 0.95,
    fontSize: 35,
    bold: true,
    align: 'center',
    maxLength: 34,
  });
  text(slide, data.cover.description, {
    x: 2.4,
    y: 3.5,
    w: 8.55,
    h: 0.25,
    fontSize: 12,
    color: '555555',
    align: 'center',
    maxLength: 58,
  });

  roundRect(slide, 0.52, 6.55, 12.3, 0.6, 'FFFFFF', 'FFFFFF');
  [
    ['Name', data.cover.name],
    ['Mobile', data.cover.mobile],
    ['E-mail', data.cover.email],
    ['Web', data.cover.web],
  ].forEach(([label, value], index) => {
    const x = 1.25 + index * 2.85;
    text(slide, `${label}  |`, { x, y: 6.78, w: 0.75, h: 0.1, fontSize: 7, bold: true, maxLength: 9 });
    text(slide, value || '-', { x: x + 0.78, y: 6.78, w: 1.72, h: 0.1, fontSize: 7, color: '333333', maxLength: 28 });
  });
}

function addProfileSlide(pptx, data) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addBottomWash(slide);
  imageBox(slide, 0.78, 0.8, 2.75, 1.95);
  text(slide, data.profile.greeting, {
    x: 1.05,
    y: 3.13,
    w: 2.6,
    h: 0.65,
    fontSize: 21,
    bold: true,
    maxLength: 24,
  });
  text(slide, 'About', { x: 1.08, y: 4.25, w: 1.1, h: 0.18, fontSize: 12, bold: true, color: '66BDEB', maxLength: 10 });
  (data.profile.about.length ? data.profile.about : ['정보 입력 필요']).slice(0, 4).forEach((item, index) => {
    text(slide, item, { x: 1.08, y: 4.65 + index * 0.25, w: 2.6, h: 0.11, fontSize: 8, maxLength: 30 });
  });
  text(slide, data.profile.intro, {
    x: 4.7,
    y: 0.92,
    w: 6.8,
    h: 0.46,
    fontSize: 10,
    color: '888888',
    maxLength: 88,
  });

  const groups = [
    ['Education', data.profile.education, 4.7, 2.08],
    ['Experience', data.profile.experience, 8.55, 2.08],
    ['Licenses', data.profile.licenses, 4.7, 4.32],
    ['Skills', data.profile.skills, 8.55, 4.32],
  ];
  groups.forEach(([title, items, x, y]) => {
    text(slide, title, { x, y, w: 2.4, h: 0.18, fontSize: 12, bold: true, color: '66BDEB', maxLength: 16 });
    (items.length ? items : ['내용 입력 필요']).slice(0, 4).forEach((item, index) => {
      text(slide, item, { x, y: y + 0.38 + index * 0.25, w: 3.1, h: 0.1, fontSize: 8, maxLength: 38 });
    });
  });
}

function addExperienceIntroSlide(pptx, item, index) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addBottomWash(slide);
  addReferenceHeader(slide, item.projectLabel || `Project ${String(index + 1).padStart(2, '0')}`, item.introTitle || `경험 ${index + 1} : 프로젝트 경험 소개`);

  const cards = [
    ['customerNeed', '고객 니즈', 0.8],
    ['problemOpportunity', '문제 OR 기회상황', 4.77],
    ['comparisonTarget', '비교 대상', 8.74],
  ];
  cards.forEach(([key, title, x]) => {
    const card = item.cards?.[key] || {};
    imageBox(slide, x, 2.02, 3.25, 1.38);
    text(slide, title, { x, y: 3.88, w: 3.25, h: 0.24, fontSize: 16, bold: true, align: 'center', maxLength: 18 });
    text(slide, card.description || '관련 내용을 간략하게 입력해 주세요.', {
      x: x + 0.05,
      y: 4.58,
      w: 3.15,
      h: 0.4,
      fontSize: 8.5,
      color: '444444',
      align: 'center',
      maxLength: 52,
    });
    roundRect(slide, x + 0.75, 5.42, 1.75, 0.28, '000000', '000000');
    text(slide, card.keyword || title, {
      x: x + 0.75,
      y: 5.5,
      w: 1.75,
      h: 0.08,
      fontSize: 7.2,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      maxLength: 14,
    });
  });
}

function addChartCard(slide, visual) {
  roundRect(slide, 0.95, 2.05, 5.7, 3.88, 'FFFFFF', 'FFFFFF');
  roundRect(slide, 2.75, 2.3, 2.2, 0.28, '000000', '000000');
  text(slide, visual?.title || '프로젝트명 입력', {
    x: 2.75,
    y: 2.38,
    w: 2.2,
    h: 0.08,
    fontSize: 7.2,
    color: 'FFFFFF',
    bold: true,
    align: 'center',
    maxLength: 20,
  });
  [0, 1, 2, 3].forEach((i) => line(slide, 1.7, 3.08 + i * 0.38, 4.1, 'E6E6E6', 0.8));
  [
    [1.95, 4.15, 0.34, 0.55, 'D8F1FB'],
    [2.65, 3.92, 0.34, 0.78, 'BDE8F8'],
    [3.35, 3.65, 0.34, 1.05, '8ED4EF'],
    [4.05, 3.35, 0.34, 1.35, '66BDEB'],
    [4.75, 3.12, 0.34, 1.58, '2C82C9'],
  ].forEach(([x, y, w, h, color]) => {
    slide.addShape('rect', {
      x,
      y,
      w,
      h,
      fill: { color, transparency: 18 },
      line: { color, transparency: 100 },
    });
  });
  asList(visual?.items, 3).forEach((item, index) => {
    text(slide, `• ${item}`, { x: 1.5, y: 5.18 + index * 0.18, w: 4.6, h: 0.08, fontSize: 6.5, color: '444444', maxLength: 36 });
  });
}

function addResultSlide(pptx, item, index) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addBottomWash(slide);
  addReferenceHeader(slide, item.projectLabel || `Project ${String(index + 1).padStart(2, '0')}`, item.resultTitle || '결과물 : 이 경험의 결과를 잘 보여주는 KPI');
  addChartCard(slide, item.visual);

  text(slide, '›', { x: 7.35, y: 3.58, w: 0.35, h: 0.4, fontSize: 38, color: '66BDEB', align: 'center', maxLength: 1 });
  const actions = [
    ['01. 문제 해결 액션', item.actions?.problemAction],
    ['02. 생산성 증가 액션', item.actions?.productivityAction],
    ['03. 의사소통/협상 액션', item.actions?.communicationAction],
  ];
  actions.forEach(([title, items], index) => {
    const y = 2.05 + index * 1.35;
    roundRect(slide, 8.05, y, 4.2, 0.82, 'FFFFFF', 'FFFFFF');
    text(slide, title, { x: 8.35, y: y + 0.18, w: 3.55, h: 0.13, fontSize: 10.5, bold: true, maxLength: 22 });
    const lines = asList(items, 2);
    (lines.length ? lines : ['내용 입력 필요']).forEach((lineItem, lineIndex) => {
      text(slide, `• ${lineItem}`, { x: 8.4, y: y + 0.46 + lineIndex * 0.16, w: 3.55, h: 0.08, fontSize: 7.4, color: '444444', maxLength: 34 });
    });
  });
}

function renderPptPresentationTemplate(pptx, portfolio) {
  const data = placeholderMap(portfolio);
  addCoverSlide(pptx, data);
  addProfileSlide(pptx, data);
  data.experiences.forEach((item, index) => {
    addExperienceIntroSlide(pptx, item, index);
    addResultSlide(pptx, item, index);
  });
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
    const isDetailPortfolio = portfolio.format === '상세 기술 포트폴리오';
    const isPptPresentation = normalizeText(portfolio.format).includes('PPT');
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
    } else if (isDetailPortfolio) {
      renderPortfolioDetailTemplate(pptx, portfolio);
    } else if (isPptPresentation) {
      renderPptPresentationTemplate(pptx, portfolio);
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

