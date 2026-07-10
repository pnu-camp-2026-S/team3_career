import fs from 'fs';
import path from 'path';
import pptxgen from 'pptxgenjs';

const COVERLETTER_FORMAT = '자기소개서 연결형';
const COVERLETTER_TEMPLATE_PATH = path.join(
  process.cwd(),
  'portfolio_design',
  'portfolio-coverletter',
  'coverletter_ppt_template_v2.json'
);
const coverletterTemplate = JSON.parse(fs.readFileSync(COVERLETTER_TEMPLATE_PATH, 'utf8'));

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

function getBinding(data, binding) {
  if (!binding) return undefined;
  return String(binding)
    .split('.')
    .reduce((source, key) => (source && source[key] !== undefined ? source[key] : undefined), data);
}

function normalizeTemplateText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTemplateText(item)).filter(Boolean).join(' · ');
  }
  if (value && typeof value === 'object') {
    return Object.values(value).map((item) => normalizeTemplateText(item)).filter(Boolean).join(' · ');
  }
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function maxRuleForBinding(template, binding) {
  const rules = template.generationContract?.maxTextRules || {};
  if (!binding) return undefined;
  if (rules[binding]) return rules[binding];

  const bindingParts = String(binding).split('.');
  for (const [pattern, value] of Object.entries(rules)) {
    const patternParts = pattern.split('.');
    if (patternParts.length !== bindingParts.length) continue;
    const matches = patternParts.every((part, index) => part === '*' || part === bindingParts[index]);
    if (matches) return value;
  }
  return undefined;
}

function clipTemplateText(value, maxLength) {
  const text = normalizeTemplateText(value);
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function colorValue(value) {
  return String(value || '').replace(/^#/, '');
}

function toShapeOptions(element, style = {}) {
  const options = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
  };

  if (style.rectRadius !== undefined) options.rectRadius = style.rectRadius;
  if (style.fill) options.fill = { color: colorValue(style.fill) };
  if (style.line) {
    options.line = typeof style.line === 'string'
      ? { color: colorValue(style.line) }
      : { ...style.line, color: colorValue(style.line.color) };
  }
  return options;
}

function toTextOptions(element, style = {}) {
  const options = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    margin: style.margin ?? 0,
    fit: style.fit || 'shrink',
  };

  [
    'fontFace',
    'fontSize',
    'bold',
    'italic',
    'align',
    'valign',
    'breakLine',
    'paraSpaceAfterPt',
  ].forEach((key) => {
    if (style[key] !== undefined) options[key] = style[key];
  });

  if (style.color) options.color = colorValue(style.color);
  return options;
}

function resolveStyle(template, element) {
  return {
    ...(template.componentStyles?.[element.styleRef] || {}),
    ...(element.style || {}),
  };
}

function addTemplateMaster(slide, template, pageNumber) {
  const master = template.masters?.default || {};
  [master.background, master.topRule].filter(Boolean).forEach((element) => {
    slide.addShape(element.shape || 'rect', toShapeOptions(element, element.style || {}));
  });

  if (master.footer) {
    slide.addText(master.footer.text || '', toTextOptions(master.footer, master.footer.style || {}));
  }

  slide.addText(String(pageNumber).padStart(2, '0'), {
    x: 11.95,
    y: 7.12,
    w: 0.72,
    h: 0.2,
    fontFace: template.theme?.fontFace || 'Malgun Gothic',
    fontSize: 7.5,
    color: '98A2B3',
    align: 'right',
    margin: 0,
  });
}

function addTemplateText(slide, template, element, data) {
  const rawText = element.binding
    ? getBinding(data, element.binding)
    : element.text ?? element.defaultText ?? '';
  const maxLength = element.maxLength || maxRuleForBinding(template, element.binding);
  const text = clipTemplateText(rawText, maxLength);
  slide.addText(text || ' ', toTextOptions(element, resolveStyle(template, element)));
}

function addTemplateShape(slide, element) {
  slide.addShape(element.shape || 'rect', toShapeOptions(element, element.style || {}));
}

function addTemplateChipGroup(slide, template, element, data) {
  const chips = Array.isArray(getBinding(data, element.binding)) ? getBinding(data, element.binding) : [];
  const gap = element.gap ?? 0.1;
  const itemWidth = element.itemWidth ?? 1.3;
  const itemHeight = Math.min(element.h || 0.34, 0.36);
  chips.slice(0, Math.floor((element.w + gap) / (itemWidth + gap))).forEach((chip, index) => {
    const x = element.x + index * (itemWidth + gap);
    slide.addShape('roundRect', {
      x,
      y: element.y,
      w: itemWidth,
      h: itemHeight,
      rectRadius: 0.08,
      fill: { color: colorValue(element.style?.fill || 'FFFFFF') },
      line: { color: colorValue(element.style?.line || 'D8E2F5') },
    });
    slide.addText(normalizeText(chip), {
      x: x + 0.1,
      y: element.y + 0.08,
      w: itemWidth - 0.2,
      h: itemHeight - 0.12,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 8.2,
      bold: true,
      color: colorValue(element.style?.textColor || '3442C8'),
      align: 'center',
      margin: 0,
      fit: 'shrink',
    });
  });
}

function addTemplateRepeatCard(slide, template, element, data) {
  const items = Array.isArray(getBinding(data, element.binding)) ? getBinding(data, element.binding) : [];
  const maxItems = element.maxItems || 3;
  const gapX = element.gapX ?? 0;
  const gapY = element.gapY ?? 0;

  items.slice(0, maxItems).forEach((item, index) => {
    const x = element.x + (gapX ? index * (element.w + gapX) : 0);
    const y = element.y + (gapY ? index * (element.h + gapY) : 0);
    slide.addShape('roundRect', {
      x,
      y,
      w: element.w,
      h: element.h,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'D8E2F5', width: 1 },
    });
    slide.addText(normalizeText(item?.[element.titleKey] || `항목 ${index + 1}`), {
      x: x + 0.18,
      y: y + 0.18,
      w: element.w - 0.36,
      h: 0.24,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 11,
      bold: true,
      color: '101828',
      margin: 0,
      fit: 'shrink',
    });
    slide.addText(normalizeText(item?.[element.bodyKey] || ''), {
      x: x + 0.18,
      y: y + 0.52,
      w: element.w - 0.36,
      h: element.footerKey ? element.h - 0.95 : element.h - 0.68,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 9.2,
      color: '475467',
      margin: 0,
      fit: 'shrink',
      breakLine: false,
    });
    if (element.footerKey && item?.[element.footerKey]) {
      slide.addText(normalizeText(item[element.footerKey]), {
        x: x + 0.18,
        y: y + element.h - 0.34,
        w: element.w - 0.36,
        h: 0.18,
        fontFace: template.theme?.fontFace || 'Malgun Gothic',
        fontSize: 8.5,
        bold: true,
        color: '5965E8',
        margin: 0,
        fit: 'shrink',
      });
    }
  });
}

function addTemplateTimeline(slide, template, element, data) {
  const items = Array.isArray(getBinding(data, element.binding)) ? getBinding(data, element.binding) : [];
  const maxItems = element.maxItems || 4;
  const itemHeight = element.h / maxItems - 0.08;

  items.slice(0, maxItems).forEach((item, index) => {
    const y = element.y + index * (itemHeight + 0.11);
    slide.addShape('ellipse', {
      x: element.x,
      y: y + 0.03,
      w: 0.32,
      h: 0.32,
      fill: { color: '5965E8' },
      line: { color: '5965E8' },
    });
    slide.addText(String(index + 1), {
      x: element.x,
      y: y + 0.1,
      w: 0.32,
      h: 0.12,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 7.5,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      margin: 0,
    });
    slide.addText(normalizeText(item?.label || ''), {
      x: element.x + 0.48,
      y,
      w: element.w - 0.55,
      h: 0.2,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 10.5,
      bold: true,
      color: '101828',
      margin: 0,
      fit: 'shrink',
    });
    slide.addText(normalizeText(item?.text || ''), {
      x: element.x + 0.48,
      y: y + 0.28,
      w: element.w - 0.55,
      h: itemHeight - 0.26,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 9,
      color: '475467',
      margin: 0,
      fit: 'shrink',
    });
  });
}

function addTemplateTable(slide, template, element, data) {
  const rows = Array.isArray(getBinding(data, element.binding)) ? getBinding(data, element.binding) : [];
  const columns = Array.isArray(element.columns) ? element.columns : [];
  const headerHeight = 0.36;
  const rowHeight = (element.h - headerHeight) / Math.max(element.maxRows || 1, 1);
  let currentX = element.x;

  columns.forEach((column) => {
    slide.addShape('rect', {
      x: currentX,
      y: element.y,
      w: column.w,
      h: headerHeight,
      fill: { color: '5965E8' },
      line: { color: '5965E8' },
    });
    slide.addText(column.label, {
      x: currentX + 0.08,
      y: element.y + 0.1,
      w: column.w - 0.16,
      h: 0.12,
      fontFace: template.theme?.fontFace || 'Malgun Gothic',
      fontSize: 8.5,
      bold: true,
      color: 'FFFFFF',
      margin: 0,
      fit: 'shrink',
    });
    currentX += column.w;
  });

  rows.slice(0, element.maxRows || 4).forEach((row, rowIndex) => {
    let rowX = element.x;
    columns.forEach((column) => {
      const y = element.y + headerHeight + rowIndex * rowHeight;
      slide.addShape('rect', {
        x: rowX,
        y,
        w: column.w,
        h: rowHeight,
        fill: { color: rowIndex % 2 ? 'F8FAFC' : 'FFFFFF' },
        line: { color: 'E7ECF6' },
      });
      slide.addText(normalizeText(row?.[column.key] || ''), {
        x: rowX + 0.08,
        y: y + 0.08,
        w: column.w - 0.16,
        h: rowHeight - 0.12,
        fontFace: template.theme?.fontFace || 'Malgun Gothic',
        fontSize: 8.3,
        color: '344054',
        margin: 0,
        fit: 'shrink',
      });
      rowX += column.w;
    });
  });
}

function addTemplateListCard(slide, template, element, data) {
  const items = Array.isArray(getBinding(data, element.binding)) ? getBinding(data, element.binding) : [];
  slide.addShape('roundRect', {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'D8E2F5' },
  });
  slide.addText(element.title || '목록', {
    x: element.x + 0.2,
    y: element.y + 0.22,
    w: element.w - 0.4,
    h: 0.25,
    fontFace: template.theme?.fontFace || 'Malgun Gothic',
    fontSize: 12,
    bold: true,
    color: '101828',
    margin: 0,
  });

  const lines = items.length ? items : [element.emptyText || '내용 없음'];
  slide.addText(lines.slice(0, 8).map((line) => ({
    text: normalizeText(line),
    options: { bullet: { type: 'bullet' } },
  })), {
    x: element.x + 0.28,
    y: element.y + 0.72,
    w: element.w - 0.55,
    h: element.h - 0.9,
    fontFace: template.theme?.fontFace || 'Malgun Gothic',
    fontSize: 9,
    color: '475467',
    breakLine: false,
    margin: 0,
    fit: 'shrink',
    paraSpaceAfterPt: 4,
  });
}

function addTemplateElement(slide, template, element, data) {
  switch (element.type) {
    case 'text':
      addTemplateText(slide, template, element, data);
      break;
    case 'shape':
      addTemplateShape(slide, element);
      break;
    case 'chipGroup':
      addTemplateChipGroup(slide, template, element, data);
      break;
    case 'repeatCard':
      addTemplateRepeatCard(slide, template, element, data);
      break;
    case 'timeline':
      addTemplateTimeline(slide, template, element, data);
      break;
    case 'table':
      addTemplateTable(slide, template, element, data);
      break;
    case 'listCard':
      addTemplateListCard(slide, template, element, data);
      break;
    default:
      break;
  }
}

function isCoverLetterPortfolio(portfolio) {
  const format = normalizeText(portfolio?.format);
  return (
    format === COVERLETTER_FORMAT
    || format.includes('자기소개')
    || portfolio?.raw?.templateId === coverletterTemplate.templateId
    || Boolean(portfolio?.raw?.cover)
    || Boolean(portfolio?.raw?.positioning)
    || Boolean(portfolio?.raw?.competencyEvidence)
    || Boolean(portfolio?.raw?.motivation)
    || Boolean(portfolio?.raw?.representativeExperience)
  );
}

function fallbackCoverLetterData(portfolio) {
  const name = normalizeText(portfolio.raw?.applicant?.name || portfolio.raw?.name || portfolio.myPageInfo?.name || '');
  const targetRole = normalizeText(portfolio.raw?.applicant?.targetRole || portfolio.purpose || '지원 직무');
  const keywords = Array.isArray(portfolio.keywords) ? portfolio.keywords : [];
  const experiences = Array.isArray(portfolio.experiences) ? portfolio.experiences : [];
  const blocks = normalizeBlocks(portfolio);

  return {
    templateId: coverletterTemplate.templateId,
    format: COVERLETTER_FORMAT,
    title: portfolio.title || `${name || '지원자'} | ${targetRole}`,
    headline: portfolio.summary || blocks[0]?.body || '경험을 자기소개서 흐름으로 정리한 포트폴리오입니다.',
    applicant: {
      name: name || '지원자',
      initials: (name || '지').slice(0, 1),
      major: portfolio.major || '',
      targetRole,
      email: '',
      phone: '',
      contactLine: '',
    },
    coverChips: [portfolio.major, ...keywords, `${experiences.length}개 경험`].filter(Boolean).slice(0, 5),
    coverSummary: portfolio.summary || blocks[0]?.body || '선택 경험을 바탕으로 지원 동기와 직무 적합성을 정리했습니다.',
    motivation: {
      subtitle: '선택 경험을 기반으로 한 지원 방향',
      narrative: blocks[1]?.body || portfolio.summary || '지원 동기 보완이 필요합니다.',
      evidence: experiences.slice(0, 3).map((experience) => ({ label: '근거 경험', text: experience })),
    },
    competencies: keywords.slice(0, 3).map((keyword) => ({
      name: keyword,
      evidence: `${keyword}와 연결되는 경험을 포트폴리오 근거로 사용했습니다.`,
      lesson: '구체 근거 보완 필요',
    })),
    representativeExperience: {
      title: experiences[0] || '대표 경험',
      narrative: blocks[2]?.body || '대표 경험 서술 보완이 필요합니다.',
      star: [
        { label: '문제', text: '상황과 문제 정의 보완 필요' },
        { label: '행동', text: '본인의 행동 보완 필요' },
        { label: '결과', text: '결과와 배운 점 보완 필요' },
      ],
    },
    workStyle: {
      process: [
        { label: '문제 이해', text: '경험 자료에서 해결할 문제를 파악했습니다.' },
        { label: '근거 정리', text: '선택 자료를 바탕으로 지원 논리를 구성했습니다.' },
      ],
      collaboration: [
        { label: '보완 필요', text: '협업 방식은 추가 정보가 필요합니다.' },
      ],
    },
    contributionPlan: [
      { period: '30일', plan: '직무와 서비스 이해', evidence: '전공 및 경험 기반' },
      { period: '60일', plan: '실무 기여 방향 구체화', evidence: '선택 경험 활용' },
      { period: '90일', plan: '개선 과제 제안', evidence: '데이터와 사용자 관점' },
    ],
    questionMap: [
      { question: '지원 동기', experience: experiences[0] || '대표 경험', answerPoint: '직무 관심 계기' },
    ],
    missingFields: ['구체 성과', '지원 회사/직무명'],
  };
}

function normalizeCoverLetterData(portfolio) {
  return {
    ...fallbackCoverLetterData(portfolio),
    ...(portfolio.raw || {}),
    templateId: coverletterTemplate.templateId,
  };
}

const COVERLETTER_SLIDE = {
  width: 13.333,
  height: 7.5,
  cardX: 0.22,
  cardY: 0.18,
  cardW: 12.9,
  cardH: 7.12,
};

const COVERLETTER_COLORS = {
  bg: 'F3F6FB',
  white: 'FFFFFF',
  navy: '0F1E3A',
  text: '14213D',
  muted: '5D6B82',
  lightText: '7B8798',
  accent: '3F5AEF',
  accentDark: '2546D8',
  accentSoft: 'EEF3FF',
  line: 'D9E2F3',
  card: 'F8FAFE',
};

function safeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function looksBrokenText(text) {
  return /[�]/.test(text) || /[吏諛쒖먭뚭컻]/.test(text) || text.includes('??');
}

function coverText(value, fallback = '') {
  const text = normalizeText(value);
  if (!text || looksBrokenText(text)) {
    return fallback;
  }
  return text;
}

function clipText(value, maxLength, fallback = '') {
  const text = coverText(value, fallback);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function multilineText(value, maxCharsPerLine, maxLines, fallback = '') {
  const text = coverText(value, fallback);
  if (!text) {
    return '';
  }

  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    if (!line) {
      line = word;
      return;
    }
    if ((line + word).length + 1 <= maxCharsPerLine) {
      line = `${line} ${word}`;
      return;
    }
    lines.push(line);
    line = word;
  });

  if (line) {
    lines.push(line);
  }

  const normalizedLines = lines.flatMap((item) => {
    if (item.length <= maxCharsPerLine) {
      return [item];
    }
    const chunks = [];
    for (let i = 0; i < item.length; i += maxCharsPerLine) {
      chunks.push(item.slice(i, i + maxCharsPerLine));
    }
    return chunks;
  });

  const selected = normalizedLines.slice(0, maxLines);
  if (normalizedLines.length > maxLines && selected.length) {
    selected[selected.length - 1] = `${selected[selected.length - 1].slice(0, -1)}…`;
  }
  return selected.join('\n');
}

function applicantFromData(data) {
  const applicant = data.applicant || {};
  const name = coverText(applicant.name, '지원자');
  const targetRole = coverText(applicant.targetRole, '지원 직무');
  const major = coverText(applicant.major, '');
  const initials = coverText(applicant.initials, name.slice(0, 1) || '나');
  return {
    name,
    targetRole,
    major,
    initials,
    email: coverText(applicant.email, ''),
    phone: coverText(applicant.phone, ''),
    contactLine: coverText(applicant.contactLine, ''),
  };
}

function splitCoverTitle(data) {
  const applicant = applicantFromData(data);
  const title = coverText(data.title, `${applicant.name} | ${applicant.targetRole}`);
  const parts = title.split('|').map((part) => coverText(part));
  return {
    name: parts[0] || applicant.name,
    role: parts[1] || applicant.targetRole,
  };
}

function coverChipsFromData(data) {
  const applicant = applicantFromData(data);
  const chips = [
    applicant.major,
    ...safeList(data.coverChips),
  ].map((chip) => clipText(chip, 12)).filter(Boolean);
  return [...new Set(chips)].slice(0, 6);
}

function addCoverletterBase(slide, pageNumber) {
  slide.background = { color: COVERLETTER_COLORS.bg };
  slide.addShape('roundRect', {
    x: COVERLETTER_SLIDE.cardX,
    y: COVERLETTER_SLIDE.cardY,
    w: COVERLETTER_SLIDE.cardW,
    h: COVERLETTER_SLIDE.cardH,
    rectRadius: 0.08,
    fill: { color: COVERLETTER_COLORS.white },
    line: { color: COVERLETTER_COLORS.line, width: 0.8 },
  });
  slide.addShape('rect', {
    x: 0.48,
    y: 0.42,
    w: 12.36,
    h: 0.04,
    fill: { color: COVERLETTER_COLORS.accent },
    line: { color: COVERLETTER_COLORS.accent },
  });
  slide.addText(String(pageNumber).padStart(2, '0'), {
    x: 12.2,
    y: 0.54,
    w: 0.45,
    h: 0.22,
    fontFace: 'Malgun Gothic',
    fontSize: 11,
    bold: true,
    color: COVERLETTER_COLORS.lightText,
    margin: 0,
    align: 'right',
  });
  slide.addShape('line', {
    x: 0.55,
    y: 6.83,
    w: 12.15,
    h: 0,
    line: { color: 'E5EAF4', width: 0.8 },
  });
  slide.addText('Myfitfolio', {
    x: 0.62,
    y: 6.99,
    w: 0.92,
    h: 0.18,
    fontFace: 'Malgun Gothic',
    fontSize: 8.5,
    bold: true,
    color: COVERLETTER_COLORS.accent,
    margin: 0,
  });
  slide.addText('자기소개서형 포트폴리오', {
    x: 1.45,
    y: 6.99,
    w: 1.8,
    h: 0.18,
    fontFace: 'Malgun Gothic',
    fontSize: 8,
    color: COVERLETTER_COLORS.lightText,
    margin: 0,
  });
  slide.addText(String(pageNumber).padStart(2, '0'), {
    x: 12.25,
    y: 6.98,
    w: 0.38,
    h: 0.18,
    fontFace: 'Malgun Gothic',
    fontSize: 8,
    bold: true,
    color: COVERLETTER_COLORS.accent,
    margin: 0,
    align: 'right',
  });
}

function addCoverletterPageTitle(slide, title, y = 0.92) {
  slide.addText(title, {
    x: 0.75,
    y,
    w: 11.4,
    h: 0.55,
    fontFace: 'Malgun Gothic',
    fontSize: 25,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
    fit: 'shrink',
  });
}

function addCoverletterChip(slide, text, x, y, w = 1.25) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.08,
    fill: { color: 'F5F8FF' },
    line: { color: 'BFD0FF', width: 0.8 },
  });
  slide.addText(clipText(text, 12), {
    x: x + 0.1,
    y: y + 0.08,
    w: w - 0.2,
    h: 0.14,
    fontFace: 'Malgun Gothic',
    fontSize: 8.5,
    bold: true,
    color: COVERLETTER_COLORS.accent,
    margin: 0,
    align: 'center',
    fit: 'shrink',
  });
}

function addCoverletterTextCard(slide, text, x, y, w, h, options = {}) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: options.fill || COVERLETTER_COLORS.card },
    line: { color: options.line || COVERLETTER_COLORS.line, width: 0.8 },
  });
  slide.addText(text, {
    x: x + 0.22,
    y: y + 0.18,
    w: w - 0.44,
    h: h - 0.34,
    fontFace: 'Malgun Gothic',
    fontSize: options.fontSize || 11,
    bold: Boolean(options.bold),
    color: options.color || COVERLETTER_COLORS.text,
    breakLine: false,
    fit: 'shrink',
    margin: 0,
    valign: options.valign || 'mid',
  });
}

function addCoverletterEvidenceCard(slide, item, x, y, w, h, symbol = '') {
  const label = clipText(item?.label || item?.name || '근거', 18);
  const body = multilineText(item?.text || item?.evidence || item?.lesson || '', 16, 3, '선택한 경험을 근거로 정리');
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: COVERLETTER_COLORS.white },
    line: { color: COVERLETTER_COLORS.line, width: 0.8 },
  });
  slide.addShape('ellipse', {
    x: x + 0.3,
    y: y + 0.33,
    w: 0.64,
    h: 0.64,
    fill: { color: 'F0F3FF' },
    line: { color: 'F0F3FF' },
  });
  slide.addText(symbol || label.slice(0, 1), {
    x: x + 0.47,
    y: y + 0.52,
    w: 0.3,
    h: 0.18,
    fontFace: 'Malgun Gothic',
    fontSize: 12,
    bold: true,
    color: COVERLETTER_COLORS.accentDark,
    align: 'center',
    margin: 0,
  });
  slide.addText(label, {
    x: x + 1.15,
    y: y + 0.32,
    w: w - 1.45,
    h: 0.25,
    fontFace: 'Malgun Gothic',
    fontSize: 10.5,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
    fit: 'shrink',
  });
  slide.addText(body, {
    x: x + 1.15,
    y: y + 0.72,
    w: w - 1.45,
    h: h - 0.92,
    fontFace: 'Malgun Gothic',
    fontSize: 9.4,
    color: COVERLETTER_COLORS.text,
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
}

function addCompetencyCard(slide, item, index, x, y, w, h) {
  const name = clipText(item?.name || item?.label || `역량 ${index + 1}`, 16);
  const evidence = multilineText(item?.evidence || item?.text || '', 18, 2, '경험에서 확인된 강점');
  const lesson = multilineText(item?.lesson || '', 18, 2, '직무 연결 포인트');
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: COVERLETTER_COLORS.white },
    line: { color: COVERLETTER_COLORS.line, width: 0.8 },
  });
  slide.addShape('ellipse', {
    x: x + 0.28,
    y: y + 0.28,
    w: 0.45,
    h: 0.45,
    fill: { color: COVERLETTER_COLORS.accent },
    line: { color: COVERLETTER_COLORS.accent },
  });
  slide.addText(String(index + 1).padStart(2, '0'), {
    x: x + 0.36,
    y: y + 0.42,
    w: 0.3,
    h: 0.13,
    fontFace: 'Malgun Gothic',
    fontSize: 8.5,
    bold: true,
    color: COVERLETTER_COLORS.white,
    margin: 0,
    align: 'center',
  });
  slide.addShape('ellipse', {
    x: x + 1.05,
    y: y + 0.82,
    w: 1.05,
    h: 1.05,
    fill: { color: 'F0F3FF' },
    line: { color: 'F0F3FF' },
  });
  slide.addText(name.slice(0, 1), {
    x: x + 1.42,
    y: y + 1.14,
    w: 0.3,
    h: 0.2,
    fontFace: 'Malgun Gothic',
    fontSize: 15,
    bold: true,
    color: COVERLETTER_COLORS.accentDark,
    margin: 0,
    align: 'center',
  });
  slide.addText(name, {
    x: x + 0.55,
    y: y + 2.22,
    w: w - 1.1,
    h: 0.28,
    fontFace: 'Malgun Gothic',
    fontSize: 13,
    bold: true,
    color: COVERLETTER_COLORS.accentDark,
    margin: 0,
    align: 'center',
    fit: 'shrink',
  });
  slide.addText([evidence, lesson].filter(Boolean).join('\n'), {
    x: x + 0.42,
    y: y + 2.75,
    w: w - 0.84,
    h: 0.78,
    fontFace: 'Malgun Gothic',
    fontSize: 9.2,
    color: COVERLETTER_COLORS.text,
    margin: 0,
    align: 'center',
    breakLine: false,
    fit: 'shrink',
  });
}

function renderCoverLetterCoverSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const applicant = applicantFromData(data);
  const title = splitCoverTitle(data);
  const headline = multilineText(data.headline, 24, 2, '선택한 경험을 직무 언어로 정리한 지원자');
  addCoverletterBase(slide, pageNumber);
  slide.addText(title.name, {
    x: 0.78,
    y: 1.7,
    w: 2.15,
    h: 0.56,
    fontFace: 'Malgun Gothic',
    fontSize: 27,
    bold: true,
    color: COVERLETTER_COLORS.accentDark,
    margin: 0,
    fit: 'shrink',
  });
  slide.addShape('line', {
    x: 3.02,
    y: 1.7,
    w: 0,
    h: 0.48,
    line: { color: 'C8D2E5', width: 1.2 },
  });
  slide.addText(title.role, {
    x: 3.28,
    y: 1.78,
    w: 5.6,
    h: 0.38,
    fontFace: 'Malgun Gothic',
    fontSize: 16,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
    fit: 'shrink',
  });
  slide.addShape('rect', {
    x: 0.8,
    y: 2.54,
    w: 0.62,
    h: 0.03,
    fill: { color: COVERLETTER_COLORS.accent },
    line: { color: COVERLETTER_COLORS.accent },
  });
  slide.addText(headline, {
    x: 0.8,
    y: 2.9,
    w: 7.45,
    h: 0.72,
    fontFace: 'Malgun Gothic',
    fontSize: 15.5,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
  let chipX = 0.8;
  coverChipsFromData(data).forEach((chip) => {
    const width = Math.min(1.45, Math.max(0.9, chip.length * 0.11 + 0.55));
    addCoverletterChip(slide, chip, chipX, 4.02, width);
    chipX += width + 0.18;
  });
  slide.addShape('roundRect', {
    x: 9.55,
    y: 1.18,
    w: 2.75,
    h: 4.32,
    rectRadius: 0.08,
    fill: { color: 'FBFCFF' },
    line: { color: COVERLETTER_COLORS.line, width: 0.8 },
  });
  slide.addShape('ellipse', {
    x: 10.18,
    y: 1.58,
    w: 1.35,
    h: 1.35,
    fill: { color: COVERLETTER_COLORS.accent },
    line: { color: COVERLETTER_COLORS.accent },
  });
  slide.addText(applicant.initials, {
    x: 10.43,
    y: 1.93,
    w: 0.85,
    h: 0.42,
    fontFace: 'Malgun Gothic',
    fontSize: 28,
    bold: true,
    color: COVERLETTER_COLORS.white,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  });
  slide.addText(applicant.name, {
    x: 10.02,
    y: 3.18,
    w: 1.7,
    h: 0.26,
    fontFace: 'Malgun Gothic',
    fontSize: 12,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  });
  slide.addText([applicant.major, applicant.targetRole].filter(Boolean).join('\n'), {
    x: 9.92,
    y: 3.52,
    w: 1.9,
    h: 0.44,
    fontFace: 'Malgun Gothic',
    fontSize: 8.5,
    color: COVERLETTER_COLORS.muted,
    align: 'center',
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
  const contacts = [applicant.email, applicant.phone, applicant.contactLine].filter(Boolean).slice(0, 3);
  contacts.forEach((contact, index) => {
    slide.addText(clipText(contact, 26), {
      x: 10.02,
      y: 4.2 + index * 0.28,
      w: 1.9,
      h: 0.16,
      fontFace: 'Malgun Gothic',
      fontSize: 7.5,
      color: COVERLETTER_COLORS.muted,
      margin: 0,
      fit: 'shrink',
    });
  });
}

function renderCoverLetterMotivationSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const motivation = data.motivation || {};
  const evidence = safeList(motivation.evidence).slice(0, 3);
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '지원 동기');
  addCoverletterTextCard(
    slide,
    multilineText(motivation.narrative || data.coverSummary, 72, 3, '선택한 경험을 바탕으로 지원 동기를 정리합니다.'),
    0.85,
    1.9,
    11.7,
    1.3,
    { fontSize: 11.4, fill: 'F8FAFF' }
  );
  const cards = evidence.length ? evidence : coverChipsFromData(data).slice(0, 3).map((chip) => ({ label: chip, text: '지원 방향과 연결되는 경험 근거' }));
  [0.85, 4.45, 8.05].forEach((x, index) => {
    addCoverletterEvidenceCard(slide, cards[index] || { label: '근거', text: '추가 정보 필요' }, x, 4.0, 3.25, 1.55, index + 1);
  });
}

function renderCoverLetterCompetencySlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const competencies = safeList(data.competencies).slice(0, 3);
  const fallbackCompetencies = coverChipsFromData(data).slice(0, 3).map((chip) => ({
    name: chip,
    evidence: '선택한 경험에서 확인된 직무 관련 강점',
    lesson: '직무에 적용 가능한 역량으로 정리',
  }));
  const cards = competencies.length ? competencies : fallbackCompetencies;
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '직무 적합 역량');
  [0.85, 4.45, 8.05].forEach((x, index) => {
    addCompetencyCard(slide, cards[index] || fallbackCompetencies[index] || {}, index, x, 2.02, 3.25, 3.85);
  });
}

function renderCoverLetterExperienceSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const representative = data.representativeExperience || {};
  const star = safeList(representative.star).slice(0, 3);
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '대표 경험 서술');
  slide.addText(clipText(representative.title, 36, '대표 경험'), {
    x: 0.78,
    y: 1.65,
    w: 10.8,
    h: 0.28,
    fontFace: 'Malgun Gothic',
    fontSize: 13.5,
    bold: true,
    color: COVERLETTER_COLORS.accentDark,
    margin: 0,
    fit: 'shrink',
  });
  addCoverletterTextCard(
    slide,
    multilineText(representative.narrative, 76, 3, '대표 경험의 문제, 행동, 결과를 자기소개서 흐름에 맞게 정리합니다.'),
    0.85,
    2.05,
    11.7,
    1.26,
    { fontSize: 10.8, fill: 'F8FAFF' }
  );
  const fallbackStar = [
    { label: '문제', text: '상황과 해결해야 할 과제' },
    { label: '행동', text: '본인이 실제로 수행한 역할' },
    { label: '결과', text: '성과와 배운 점' },
  ];
  [0.85, 4.45, 8.05].forEach((x, index) => {
    addCoverletterEvidenceCard(slide, star[index] || fallbackStar[index], x, 4.28, 3.25, 1.34, fallbackStar[index].label.slice(0, 1));
  });
}

function renderCoverLetterWorkStyleSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const workStyle = data.workStyle || {};
  const process = safeList(workStyle.process).slice(0, 3);
  const collaboration = safeList(workStyle.collaboration).slice(0, 3);
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '문제 해결 및 협업 방식');
  slide.addText('문제 해결 흐름', {
    x: 0.9,
    y: 1.78,
    w: 5.2,
    h: 0.24,
    fontFace: 'Malgun Gothic',
    fontSize: 12.5,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
  });
  slide.addText('협업 방식', {
    x: 7.0,
    y: 1.78,
    w: 5.2,
    h: 0.24,
    fontFace: 'Malgun Gothic',
    fontSize: 12.5,
    bold: true,
    color: COVERLETTER_COLORS.navy,
    margin: 0,
  });
  const left = process.length ? process : [{ label: '문제 파악', text: '자료와 경험을 근거로 문제를 정의' }];
  const right = collaboration.length ? collaboration : [{ label: '협업 보완', text: '역할과 소통 방식을 추가 정리 필요' }];
  left.forEach((item, index) => addCoverletterTextCard(slide, `${clipText(item.label, 18)}\n${multilineText(item.text, 32, 2)}`, 0.9, 2.25 + index * 1.15, 5.55, 0.85, { fontSize: 10.2 }));
  right.forEach((item, index) => addCoverletterTextCard(slide, `${clipText(item.label, 18)}\n${multilineText(item.text, 32, 2)}`, 6.95, 2.25 + index * 1.15, 5.55, 0.85, { fontSize: 10.2 }));
}

function renderCoverLetterPlanSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const plans = safeList(data.contributionPlan).slice(0, 3);
  const fallbackPlans = [
    { period: '30일', plan: '직무와 서비스 이해', evidence: '전공 및 경험 기반' },
    { period: '60일', plan: '실무 기여 방향 구체화', evidence: '선택 경험 활용' },
    { period: '90일', plan: '개선 과제 제안', evidence: '데이터와 사용자 관점' },
  ];
  const cards = plans.length ? plans : fallbackPlans;
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '입사 후 기여 계획');
  [0.85, 4.45, 8.05].forEach((x, index) => {
    const item = cards[index] || fallbackPlans[index];
    addCoverletterTextCard(
      slide,
      `${clipText(item.period, 12)}\n${multilineText(item.plan, 18, 2)}\n${multilineText(item.evidence, 18, 2)}`,
      x,
      2.18,
      3.25,
      3.25,
      { fontSize: 11, bold: index === 0 }
    );
  });
}

function renderCoverLetterQuestionMapSlide(pptx, data, pageNumber) {
  const slide = pptx.addSlide();
  const questionMap = safeList(data.questionMap).slice(0, 4);
  const missingFields = safeList(data.missingFields || data.missing_fields).slice(0, 4);
  addCoverletterBase(slide, pageNumber);
  addCoverletterPageTitle(slide, '자기소개서 문항 연결');
  const rows = questionMap.length ? questionMap : [
    { question: '지원 동기', experience: '대표 경험', answerPoint: '직무와 연결되는 이유' },
    { question: '직무 역량', experience: '선택 경험', answerPoint: '역량의 근거' },
  ];
  rows.forEach((row, index) => {
    const y = 1.85 + index * 0.82;
    addCoverletterTextCard(
      slide,
      `${clipText(row.question, 20)} | ${clipText(row.experience, 22)}\n${multilineText(row.answerPoint, 58, 1, '답변 포인트')}`,
      0.85,
      y,
      11.7,
      0.62,
      { fontSize: 9.6, fill: index % 2 ? 'FFFFFF' : 'F8FAFF' }
    );
  });
  if (missingFields.length) {
    slide.addText('보완 필요 정보', {
      x: 0.9,
      y: 5.55,
      w: 2.2,
      h: 0.2,
      fontFace: 'Malgun Gothic',
      fontSize: 11,
      bold: true,
      color: COVERLETTER_COLORS.navy,
      margin: 0,
    });
    let x = 2.55;
    missingFields.forEach((field) => {
      const width = Math.min(1.7, Math.max(1.0, field.length * 0.1 + 0.52));
      addCoverletterChip(slide, field, x, 5.48, width);
      x += width + 0.15;
    });
  }
}

function renderCoverLetterTemplatePptx(pptx, portfolio) {
  const data = normalizeCoverLetterData(portfolio);
  [
    renderCoverLetterCoverSlide,
    renderCoverLetterMotivationSlide,
    renderCoverLetterCompetencySlide,
    renderCoverLetterExperienceSlide,
    renderCoverLetterWorkStyleSlide,
    renderCoverLetterPlanSlide,
    renderCoverLetterQuestionMapSlide,
  ].forEach((renderSlide, index) => {
    renderSlide(pptx, data, index + 1);
  });
}

function firstCoverLetterText(...values) {
  return values.find((value) => normalizeTemplateText(value)) || '';
}

function padCoverLetterItems(items, length, factory) {
  const next = Array.isArray(items) ? items.filter(Boolean).slice(0, length) : [];
  while (next.length < length) {
    next.push(factory(next.length));
  }
  return next;
}

function normalizeCoverLetterTemplateV2Data(portfolio) {
  const raw = portfolio.raw || {};
  const legacy = normalizeCoverLetterData(portfolio);
  const applicantSource = {
    ...(legacy.applicant || {}),
    ...(raw.applicant || {}),
  };
  const name = firstCoverLetterText(applicantSource.name, raw.name, portfolio.myPageInfo?.name, '지원자');
  const targetRole = firstCoverLetterText(
    applicantSource.targetRole,
    portfolio.purpose,
    portfolio.myPageInfo?.desiredRole,
    portfolio.myPageInfo?.preferences?.detailJob,
    '희망 직무'
  );
  const schoolMajor = firstCoverLetterText(
    applicantSource.schoolMajor,
    applicantSource.major,
    portfolio.major,
    portfolio.myPageInfo?.major,
    '전공 미입력'
  );
  const contactBlock = [
    firstCoverLetterText(applicantSource.email, portfolio.myPageInfo?.email),
    firstCoverLetterText(applicantSource.phone, portfolio.myPageInfo?.phone),
    schoolMajor,
    targetRole,
  ].filter(Boolean).join('\n');
  const keywords = Array.isArray(portfolio.keywords) ? portfolio.keywords : [];
  const experiences = Array.isArray(portfolio.experiences) ? portfolio.experiences : [];
  const tags = padCoverLetterItems(
    raw.cover?.tags || raw.coverChips || legacy.coverChips || [schoolMajor, ...keywords],
    3,
    (index) => ['직무 이해', '문제 해결', '협업 실행'][index]
  ).map((item) => clipTemplateText(item, 12));
  const legacyCompetencies = safeList(raw.competencies || legacy.competencies).map((item) => ({
    name: item.name,
    description: item.evidence,
    evidence: item.lesson || item.evidence,
  }));
  const strengths = padCoverLetterItems(raw.strengths?.length ? raw.strengths : legacyCompetencies, 3, (index) => ({
    name: keywords[index] || ['문제 해결', '기술 이해', '소통 협업'][index],
    description: `${keywords[index] || ['문제 해결', '기술 이해', '소통 협업'][index]} 역량을 경험 근거로 설명합니다.`,
    evidence: experiences[index] || legacy.representativeExperience?.title || '경험 보완 필요',
  })).map((item) => ({
    name: clipTemplateText(item.name, 12),
    description: clipTemplateText(item.description, 52),
    evidence: clipTemplateText(item.evidence, 34),
  }));
  const representativeExperience = raw.representativeExperience || legacy.representativeExperience || {};
  const firstExperience = raw.experiences?.[0] || {};
  const secondExperience = raw.experiences?.[1] || {};
  const processSource = secondExperience.process
    || safeList(legacy.workStyle?.process).concat(safeList(legacy.workStyle?.collaboration)).map((item) => ({ answer: `${item.label}: ${item.text}` }));
  const contributionSource = raw.contributionPlan?.length ? raw.contributionPlan : legacy.contributionPlan;

  return {
    templateId: coverletterTemplate.templateId,
    format: raw.format || '자기소개서형 포트폴리오',
    applicant: {
      name: clipTemplateText(name, 24),
      targetRole: clipTemplateText(targetRole, 30),
      email: clipTemplateText(firstCoverLetterText(applicantSource.email, portfolio.myPageInfo?.email), 42),
      phone: clipTemplateText(firstCoverLetterText(applicantSource.phone, portfolio.myPageInfo?.phone), 24),
      schoolMajor: clipTemplateText(schoolMajor, 42),
    },
    cover: {
      applicantLine: clipTemplateText(raw.cover?.applicantLine || raw.title || legacy.title || `${name} | ${targetRole}`, 42),
      contactBlock: clipTemplateText(raw.cover?.contactBlock || contactBlock, 90),
      tags,
      headline: clipTemplateText(raw.cover?.headline || raw.headline || legacy.headline || portfolio.summary, 95),
    },
    positioning: {
      statement: clipTemplateText(raw.positioning?.statement || raw.coverSummary || legacy.coverSummary || portfolio.summary, 105),
      jobInterest: clipTemplateText(raw.positioning?.jobInterest || legacy.motivation?.subtitle || '직무 관심 보완 필요', 95),
      coreExperience: clipTemplateText(raw.positioning?.coreExperience || representativeExperience.title || experiences[0] || '대표 경험 보완 필요', 95),
      contributionDirection: clipTemplateText(raw.positioning?.contributionDirection || '선택 경험을 실무 기여 방향으로 연결합니다.', 95),
    },
    motivation: {
      companyUnderstanding: clipTemplateText(raw.motivation?.companyUnderstanding || legacy.motivation?.subtitle || '지원 회사 또는 산업 이해 보완 필요', 95),
      roleUnderstanding: clipTemplateText(raw.motivation?.roleUnderstanding || `${targetRole}에 필요한 역할과 역량을 경험 근거로 정리합니다.`, 95),
      personalConnection: clipTemplateText(raw.motivation?.personalConnection || legacy.motivation?.narrative || '경험과 직무 관심의 연결 보완 필요', 95),
      finalSentence: clipTemplateText(raw.motivation?.finalSentence || legacy.motivation?.narrative || '이 경험을 바탕으로 직무에 필요한 문제 해결에 기여하겠습니다.', 110),
    },
    strengths,
    experiences: [
      {
        title: clipTemplateText(firstExperience.title || representativeExperience.title || experiences[0] || '대표 경험', 32),
        meta: clipTemplateText(firstExperience.meta || '기간/역할/활동 유형 보완 필요', 45),
        keywordsText: clipTemplateText(firstExperience.keywordsText || tags.map((item) => `#${item}`).join(' '), 40),
        summary: clipTemplateText(firstExperience.summary || representativeExperience.narrative || portfolio.summary, 75),
        star: {
          situation: clipTemplateText(firstExperience.star?.situation || representativeExperience.star?.[0]?.text || '상황 보완 필요', 65),
          task: clipTemplateText(firstExperience.star?.task || representativeExperience.star?.[1]?.text || '과제 보완 필요', 65),
          action: clipTemplateText(firstExperience.star?.action || representativeExperience.star?.[2]?.text || '행동 보완 필요', 65),
          result: clipTemplateText(firstExperience.star?.result || representativeExperience.star?.[3]?.text || '결과 보완 필요', 65),
        },
      },
      {
        process: padCoverLetterItems(processSource, 4, (index) => ({
          answer: ['문제 발견 보완 필요', '역할 분담 보완 필요', '실행 과정 보완 필요', '결과 정리 보완 필요'][index],
        })).map((item) => ({ answer: clipTemplateText(item.answer || item.text, 48) })),
        resultSentence: clipTemplateText(secondExperience.resultSentence || '협업과 실행 과정을 통해 직무에 필요한 역량을 확인했습니다.', 95),
      },
    ],
    competencyEvidence: padCoverLetterItems(raw.competencyEvidence, 4, (index) => ({
      competency: strengths[index % strengths.length]?.name || ['문제 해결', '기술 이해', '소통 협업', '성장 태도'][index],
      experience: experiences[index] || representativeExperience.title || '경험 보완 필요',
      outcome: strengths[index % strengths.length]?.evidence || '성과 보완 필요',
      question: ['지원동기', '직무역량', '협업경험', '성장과정'][index],
    })).map((item) => ({
      competency: clipTemplateText(item.competency, 12),
      experience: clipTemplateText(item.experience, 22),
      outcome: clipTemplateText(item.outcome, 28),
      question: clipTemplateText(item.question, 16),
    })),
    contributionPlan: padCoverLetterItems(contributionSource, 3, (index) => ({
      period: ['30일', '90일', '180일'][index],
      title: ['직무 이해', '실무 기여', '확장 성장'][index],
      plan: ['업무와 서비스 구조를 빠르게 학습합니다.', '경험 기반 문제 해결을 실무에 적용합니다.', '장기적으로 개선안을 제안하며 성장합니다.'][index],
    })).map((item, index) => ({
      period: clipTemplateText(item.period, 8),
      title: clipTemplateText(item.title || ['직무 이해', '실무 기여', '확장 성장'][index], 10),
      plan: clipTemplateText(item.plan || item.evidence, 42),
    })),
    closingSentence: clipTemplateText(raw.closingSentence || '근거 있는 경험을 바탕으로 직무에 필요한 가치를 만들어가겠습니다.', 90),
    missingFields: safeList(raw.missingFields || raw.missing_fields || legacy.missingFields),
  };
}

function renderCoverLetterTemplateV2Pptx(pptx, portfolio) {
  const data = normalizeCoverLetterTemplateV2Data(portfolio);
  coverletterTemplate.slides.forEach((templateSlide) => {
    const slide = pptx.addSlide();
    slide.background = { color: coverletterTemplate.theme?.colors?.background || 'FFFEFA' };
    templateSlide.elements.forEach((element) => addTemplateElement(slide, coverletterTemplate, element, data));
  });
}

function configurePptx(pptx, portfolio, template = null) {
  pptx.layout = template?.pptx?.layout || 'LAYOUT_WIDE';
  pptx.author = 'Myfitfolio';
  pptx.subject = normalizeText(portfolio.purpose || '포트폴리오 생성');
  pptx.title = normalizeText(portfolio.title || portfolio.format || 'Myfitfolio Portfolio');
  pptx.company = 'Myfitfolio';
  pptx.lang = 'ko-KR';
  pptx.theme = {
    headFontFace: template?.theme?.fontFace || 'Malgun Gothic',
    bodyFontFace: template?.theme?.fontFace || 'Malgun Gothic',
    lang: 'ko-KR',
  };
}

export async function POST(request) {
  try {
    const portfolio = await request.json();
    if (!portfolio || typeof portfolio !== 'object') {
      return Response.json({ message: '포트폴리오 데이터가 필요합니다.' }, { status: 400 });
    }

    const pptx = new pptxgen();
    const isCoverLetter = isCoverLetterPortfolio(portfolio);
    const isOnePageSummary = portfolio.format === '1페이지 요약본';

    if (isOnePageSummary) {
      pptx.defineLayout({ name: 'MYFIT_A4_PORTRAIT_SAFE', width: 7.5, height: 10.6 });
    }

    configurePptx(
      pptx,
      portfolio,
      isCoverLetter
        ? coverletterTemplate
        : isOnePageSummary
          ? { pptx: { layout: 'MYFIT_A4_PORTRAIT_SAFE' } }
          : null
    );

    if (isCoverLetter) {
      renderCoverLetterTemplateV2Pptx(pptx, portfolio);
    } else if (isOnePageSummary) {
      addOnePageSummarySlide(pptx, portfolio);
    } else {
      const blocks = normalizeBlocks(portfolio);
      addOverviewSlide(pptx, portfolio, blocks);
      addDetailSlides(pptx, portfolio, blocks.slice(0, 5));
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    const fileName = isCoverLetter
      ? 'myfitfolio-coverletter-portfolio.pptx'
      : 'myfitfolio-portfolio.pptx';

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return Response.json({ message: error.message || 'PPTX 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
