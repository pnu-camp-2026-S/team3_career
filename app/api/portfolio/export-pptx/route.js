import pptxgen from 'pptxgenjs';

import fs from 'fs';
import path from 'path';

const DETAIL_A4_TEMPLATE_ID = 'detail_a4_two_page_half_blocks';
const DETAIL_A4_TEMPLATE_PATH = path.join(
  process.cwd(),
  'portfolio_design',
  'portfolio-detail',
  'detail_a4_two_page_half_blocks.json'
);

function loadDetailA4Template() {
  try {
    return JSON.parse(fs.readFileSync(DETAIL_A4_TEMPLATE_PATH, 'utf8'));
  } catch (error) {
    console.warn('상세기술 A4 템플릿 로드 실패:', error.message);
    return null;
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeList(items, limit = 3) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, limit);
}

function parseBlockLine(body, label) {
  const line = String(body || '')
    .split(/\n+/)
    .find((item) => item.trim().startsWith(`${label}:`));
  if (!line) return [];
  return line
    .replace(`${label}:`, '')
    .split(/\s*\/\s*/)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 3);
}

function isDetailA4Portfolio(portfolio) {
  if (portfolio?.raw?.templateId === DETAIL_A4_TEMPLATE_ID || portfolio?.templateId === DETAIL_A4_TEMPLATE_ID) {
    return true;
  }
  if (portfolio?.format !== '상세 기술 포트폴리오') {
    return false;
  }
  if (portfolio?.raw?.profile && Array.isArray(portfolio?.raw?.experiences)) {
    return true;
  }
  return Array.isArray(portfolio?.blocks)
    && portfolio.blocks.some((block) => /^경험\s*\d+/.test(normalizeText(block?.title)));
}

function buildDetailA4Data(portfolio) {
  const raw = portfolio.raw && typeof portfolio.raw === 'object' ? portfolio.raw : {};
  if (raw.templateId === DETAIL_A4_TEMPLATE_ID || raw.profile || Array.isArray(raw.experiences)) {
    return {
      format: '상세 기술 포트폴리오',
      templateId: DETAIL_A4_TEMPLATE_ID,
      pageSize: 'A4_PORTRAIT',
      pageCount: 2,
      profile: normalizeDetailProfile(raw.profile || {}, portfolio),
      experiences: normalizeDetailExperiences(raw.experiences || [], portfolio),
      missingFields: normalizeList(raw.missingFields || raw.missing_fields, 12),
    };
  }

  return {
    format: '상세 기술 포트폴리오',
    templateId: DETAIL_A4_TEMPLATE_ID,
    pageSize: 'A4_PORTRAIT',
    pageCount: 2,
    profile: normalizeDetailProfile({}, portfolio),
    experiences: normalizeDetailExperiences([], portfolio, Array.isArray(portfolio.blocks) ? portfolio.blocks : []),
    missingFields: [],
  };
}

function normalizeDetailProfile(profile, portfolio) {
  const keywords = Array.isArray(profile.keywords) && profile.keywords.length
    ? profile.keywords
    : (portfolio.keywords || []).slice(0, 3).map((label, index) => ({
      rank: index + 1,
      label,
      reason: '선택한 강조 키워드입니다.',
    }));

  const normalizedKeywords = keywords
    .map((item, index) => ({
      rank: Number(item?.rank || index + 1),
      label: normalizeText(item?.label || item),
      reason: normalizeText(item?.reason || ''),
    }))
    .filter((item) => item.label)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  while (normalizedKeywords.length < 3) {
    normalizedKeywords.push({
      rank: normalizedKeywords.length + 1,
      label: '키워드 보완 필요',
      reason: '',
    });
  }

  return {
    photo: {
      path: normalizeText(profile.photo?.path),
      description: normalizeText(profile.photo?.description || 'PROFILE'),
    },
    name: normalizeText(profile.name || '정보 없음'),
    gender: normalizeText(profile.gender || '정보 없음'),
    education: normalizeText(profile.education || '정보 없음'),
    major: normalizeText(profile.major || portfolio.major || '정보 없음'),
    targetRole: normalizeText(profile.targetRole || portfolio.purpose || '정보 없음'),
    contact: normalizeText(profile.contact || '정보 없음'),
    keywords: normalizedKeywords.map((item, index) => ({ ...item, rank: index + 1 })),
  };
}

function normalizeDetailExperiences(experiences, portfolio, blocks = []) {
  const source = Array.isArray(experiences) && experiences.length
    ? experiences
    : blocks
      .filter((block) => /^경험\s*\d+/.test(String(block.title || '')))
      .map((block, index) => ({
        rank: index + 1,
        projectName: String(block.title || '').replace(/^경험\s*\d+\s*:\s*/, ''),
        summary: String(block.body || '').split(/\n+/)[0] || portfolio.summary,
        process: parseBlockLine(block.body, '과정'),
        contribution: parseBlockLine(block.body, '기여도'),
        result: parseBlockLine(block.body, '결과'),
        growth: parseBlockLine(block.body, '발전한 점')[0] || '',
      }));

  const normalized = source.slice(0, 3).map((item, index) => ({
    rank: Number(item?.rank || index + 1),
    projectName: normalizeText(item?.projectName || item?.project_name || '추가 경험 입력 필요'),
    summary: normalizeText(item?.summary || '프로젝트 한 줄 설명 보완 필요'),
    process: normalizeList(item?.process, 3),
    contribution: normalizeList(item?.contribution || item?.myContribution, 3),
    result: normalizeList(item?.result || item?.outputs, 3),
    growth: normalizeText(item?.growth || item?.learning || '이 프로젝트를 통해 발전한 점 보완 필요'),
  }));

  while (normalized.length < 3) {
    const rank = normalized.length + 1;
    normalized.push({
      rank,
      projectName: '추가 경험 입력 필요',
      summary: `${rank}번째 경험 정보가 부족합니다.`,
      process: ['경험 자료 추가 필요'],
      contribution: ['본인 역할 확인 필요'],
      result: ['결과 또는 산출물 확인 필요'],
      growth: '추가 자료 입력 후 작성할 수 있습니다.',
    });
  }

  return normalized;
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

function addSmallText(slide, text, options) {
  slide.addText(normalizeText(text) || '정보 없음', {
    fontFace: 'Malgun Gothic',
    color: '111827',
    margin: 0,
    fit: 'shrink',
    ...options,
  });
}

function addDetailA4Profile(slide, profile, template) {
  const theme = template.theme || {};
  const photo = template.components.profileBlock.photo;
  slide.addShape('roundRect', {
    x: photo.x,
    y: photo.y,
    w: photo.w,
    h: photo.h,
    rectRadius: 0.12,
    fill: { color: 'EEF4FF' },
    line: { color: theme.cardLine || 'AFC8E8', width: 1 },
  });
  addSmallText(slide, profile.photo?.description || photo.placeholderText || 'PROFILE', {
    x: photo.x + 0.18,
    y: photo.y + photo.h / 2 - 0.11,
    w: photo.w - 0.36,
    h: 0.22,
    fontSize: 9,
    bold: true,
    color: theme.primary || '2563EB',
    align: 'center',
  });

  const name = template.components.profileBlock.name;
  addSmallText(slide, profile.name, {
    x: name.x,
    y: name.y,
    w: name.w,
    h: name.h,
    fontSize: name.fontSize,
    bold: true,
    color: theme.text || '111827',
  });

  const rows = [
    ['성별', profile.gender],
    ['학력', profile.education],
    ['전공', profile.major],
    ['희망 직무', profile.targetRole],
    ['연락처', profile.contact],
  ];
  const meta = template.components.profileBlock.metaGrid;
  rows.forEach(([label, value], index) => {
    const y = meta.y + index * 0.24;
    addSmallText(slide, label, {
      x: meta.x,
      y,
      w: 0.72,
      h: 0.16,
      fontSize: meta.fontSize - 1,
      bold: true,
      color: theme.primary || '2563EB',
    });
    addSmallText(slide, value, {
      x: meta.x + 0.85,
      y,
      w: meta.w - 0.9,
      h: 0.18,
      fontSize: meta.fontSize,
      color: theme.mutedText || '4B5563',
    });
  });

  const keywordBox = template.components.profileBlock.keywordCards;
  profile.keywords.forEach((keyword, index) => {
    const x = keywordBox.x + index * (keywordBox.w + keywordBox.gap);
    slide.addShape('roundRect', {
      x,
      y: keywordBox.y,
      w: keywordBox.w,
      h: keywordBox.h,
      rectRadius: 0.08,
      fill: { color: theme.keywordFill || 'EFF6FF' },
      line: { color: theme.cardLine || 'AFC8E8', width: 1 },
    });
    addSmallText(slide, `${keyword.rank}순위`, {
      x: x + 0.12,
      y: keywordBox.y + 0.12,
      w: 0.58,
      h: 0.14,
      fontSize: 7,
      bold: true,
      color: theme.primary || '2563EB',
    });
    addSmallText(slide, keyword.label, {
      x: x + 0.12,
      y: keywordBox.y + 0.34,
      w: keywordBox.w - 0.24,
      h: 0.24,
      fontSize: 12,
      bold: true,
      color: theme.text || '111827',
      align: 'center',
    });
    addSmallText(slide, keyword.reason || '근거 자료 기반 키워드', {
      x: x + 0.12,
      y: keywordBox.y + 0.67,
      w: keywordBox.w - 0.24,
      h: 0.15,
      fontSize: 6.5,
      color: theme.mutedText || '4B5563',
      align: 'center',
    });
  });
}

function addDetailA4Experience(slide, experience, region, template) {
  const theme = template.theme || {};
  const block = template.components.experienceBlock;
  const baseX = region.x;
  const baseY = region.y;

  slide.addShape('line', {
    x: baseX,
    y: baseY - 0.15,
    w: region.w,
    h: 0,
    line: { color: theme.line || 'D8E2F5', width: 1 },
  });

  addSmallText(slide, `경험 ${experience.rank}`, {
    x: baseX + block.label.xOffset,
    y: baseY + block.label.yOffset,
    w: block.label.w,
    h: block.label.h,
    fontSize: block.label.fontSize,
    bold: true,
    color: theme.primary || '2563EB',
  });
  addSmallText(slide, experience.projectName, {
    x: baseX + block.projectName.xOffset,
    y: baseY + block.projectName.yOffset,
    w: block.projectName.w,
    h: block.projectName.h,
    fontSize: block.projectName.fontSize,
    bold: true,
    color: theme.text || '111827',
  });
  addSmallText(slide, experience.summary, {
    x: baseX + block.summary.xOffset,
    y: baseY + block.summary.yOffset,
    w: block.summary.w,
    h: block.summary.h,
    fontSize: block.summary.fontSize,
    color: theme.mutedText || '4B5563',
  });

  const cards = block.cards;
  cards.types.forEach((card, index) => {
    const x = baseX + cards.startXOffset + index * (cards.w + cards.gap);
    const y = baseY + cards.yOffset;
    const lines = normalizeList(experience[card.key], cards.maxBullets);
    slide.addShape('roundRect', {
      x,
      y,
      w: cards.w,
      h: cards.h,
      rectRadius: 0.09,
      fill: { color: theme.cardFill || 'EAF4FF' },
      line: { color: theme.cardLine || 'AFC8E8', width: 1 },
    });
    addSmallText(slide, card.title, {
      x: x + 0.12,
      y: y + 0.18,
      w: cards.w - 0.24,
      h: 0.18,
      fontSize: cards.titleFontSize,
      bold: true,
      color: theme.text || '111827',
      align: 'center',
    });
    addSmallText(slide, `(${card.subtitle})`, {
      x: x + 0.12,
      y: y + 0.42,
      w: cards.w - 0.24,
      h: 0.14,
      fontSize: cards.labelFontSize,
      bold: true,
      color: theme.text || '111827',
      align: 'center',
    });
    const bulletText = lines.length
      ? lines.map((line) => ({ text: line, options: { bullet: { type: 'bullet' } } }))
      : [{ text: '내용 보완 필요', options: { bullet: { type: 'bullet' } } }];
    slide.addText(bulletText, {
      x: x + 0.18,
      y: y + 0.78,
      w: cards.w - 0.32,
      h: cards.h - 0.95,
      fontFace: 'Malgun Gothic',
      fontSize: cards.bodyFontSize,
      color: theme.text || '111827',
      fit: 'shrink',
      margin: 0,
      breakLine: false,
      paraSpaceAfterPt: 2,
    });

    if (index < cards.types.length - 1) {
      const arrowX = x + cards.w + cards.gap / 2 - 0.06;
      addSmallText(slide, block.arrows.text || '>', {
        x: arrowX,
        y: y + cards.h / 2 - 0.12,
        w: 0.16,
        h: 0.18,
        fontSize: block.arrows.fontSize,
        bold: true,
        color: block.arrows.color || '6B7280',
        align: 'center',
      });
    }
  });

  addSmallText(slide, experience.growth, {
    x: baseX + block.growth.xOffset,
    y: baseY + block.growth.yOffset,
    w: block.growth.w,
    h: block.growth.h,
    fontSize: block.growth.fontSize,
    bold: true,
    color: theme.primary || '2563EB',
    align: block.growth.align || 'center',
  });
}

function addDetailA4PageBackground(slide, template, pageNumber) {
  const theme = template.theme || {};
  slide.background = { color: theme.background || 'FFFFFF' };
  addSmallText(slide, `Myfitfolio Detail Portfolio · ${String(pageNumber).padStart(2, '0')}`, {
    x: 0.45,
    y: 11.28,
    w: 7.35,
    h: 0.14,
    fontSize: 6.5,
    color: '9CA3AF',
    align: 'right',
  });
}

function addDetailA4Slides(pptx, portfolio) {
  const template = loadDetailA4Template();
  const data = buildDetailA4Data(portfolio);
  const layout = template?.page || { widthIn: 8.27, heightIn: 11.69 };
  pptx.defineLayout({ name: 'A4_PORTRAIT', width: layout.widthIn || 8.27, height: layout.heightIn || 11.69 });
  pptx.layout = 'A4_PORTRAIT';

  const safeTemplate = template || {
    theme: {},
    layout: {
      topHalf: { x: 0.45, y: 0.45, w: 7.37, h: 5.1 },
      bottomHalf: { x: 0.45, y: 6.0, w: 7.37, h: 5.1 },
    },
    components: {
      profileBlock: {
        photo: { x: 0.7, y: 0.85, w: 1.55, h: 1.85, placeholderText: 'PROFILE' },
        name: { x: 2.55, y: 0.82, w: 4.9, h: 0.42, fontSize: 22 },
        metaGrid: { x: 2.55, y: 1.42, w: 4.9, h: 1.35, fontSize: 9.5 },
        keywordCards: { x: 0.7, y: 3.35, w: 2.15, h: 0.95, gap: 0.28 },
      },
      experienceBlock: {
        label: { xOffset: 0.2, yOffset: 0.15, w: 0.9, h: 0.25, fontSize: 9 },
        projectName: { xOffset: 1.05, yOffset: 0.12, w: 5.7, h: 0.3, fontSize: 13 },
        summary: { xOffset: 0.2, yOffset: 0.56, w: 6.95, h: 0.32, fontSize: 8.5 },
        cards: {
          yOffset: 1.25,
          w: 1.86,
          h: 2.45,
          gap: 0.42,
          startXOffset: 0.2,
          titleFontSize: 10,
          labelFontSize: 6.5,
          bodyFontSize: 7.2,
          maxBullets: 3,
          types: [
            { key: 'process', title: '과정', subtitle: 'PROCESS' },
            { key: 'contribution', title: '기여도', subtitle: 'CONTRIBUTION' },
            { key: 'result', title: '결과', subtitle: 'RESULT' },
          ],
        },
        arrows: { text: '>', fontSize: 14, color: '6B7280' },
        growth: { xOffset: 0.35, yOffset: 4.05, w: 6.65, h: 0.35, fontSize: 8.5, align: 'center' },
      },
    },
  };

  const first = pptx.addSlide();
  addDetailA4PageBackground(first, safeTemplate, 1);
  addDetailA4Profile(first, data.profile, safeTemplate);
  addDetailA4Experience(first, data.experiences[0], safeTemplate.layout.bottomHalf, safeTemplate);

  const second = pptx.addSlide();
  addDetailA4PageBackground(second, safeTemplate, 2);
  addDetailA4Experience(second, data.experiences[1], safeTemplate.layout.topHalf, safeTemplate);
  addDetailA4Experience(second, data.experiences[2], safeTemplate.layout.bottomHalf, safeTemplate);
}

export async function POST(request) {
  try {
    const portfolio = await request.json();
    if (!portfolio || typeof portfolio !== 'object') {
      return Response.json({ message: '포트폴리오 데이터가 필요합니다.' }, { status: 400 });
    }

    const pptx = new pptxgen();
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

    if (isDetailA4Portfolio(portfolio)) {
      addDetailA4Slides(pptx, portfolio);
    } else {
      const blocks = normalizeBlocks(portfolio);
      pptx.layout = 'LAYOUT_WIDE';
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

