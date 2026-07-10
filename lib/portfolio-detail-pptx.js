import fs from 'fs';
import path from 'path';

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'portfolio_design',
  'portfolio-detail',
  'detailed_technical_template.pptxgen.json'
);

const DEFAULT_TEXT = '제공된 정보 부족';

function normalizeText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeMultiline(value, fallback = '') {
  const text = String(value || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return text || fallback;
}

function normalizeColor(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^#/, '').toUpperCase();
}

function normalizeAlign(value) {
  if (typeof value !== 'string') return value;
  const align = value.toLowerCase();
  if (align.startsWith('left')) return 'left';
  if (align.startsWith('center')) return 'center';
  if (align.startsWith('right')) return 'right';
  if (align.startsWith('justify')) return 'justify';
  return value;
}

function normalizeOptions(options = {}) {
  const normalized = { ...options };
  if (normalized.align) normalized.align = normalizeAlign(normalized.align);
  if (normalized.color) normalized.color = normalizeColor(normalized.color);
  if (normalized.fill?.color) normalized.fill = { ...normalized.fill, color: normalizeColor(normalized.fill.color) };
  if (normalized.line?.color) normalized.line = { ...normalized.line, color: normalizeColor(normalized.line.color) };
  return normalized;
}

function shapeType(pptx, value) {
  if (!value) return pptx.ShapeType.rect;
  return pptx.ShapeType[value] ?? value;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getPortfolioDetailTemplateValues(portfolio = {}) {
  return portfolio.templateValues
    || portfolio.raw?.template_values
    || portfolio.raw?.replacements
    || safeObject(portfolio.raw)
    || {};
}

function buildReplacementMap(portfolio = {}) {
  const values = getPortfolioDetailTemplateValues(portfolio);
  const replacements = {};

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value) || (value && typeof value === 'object')) continue;
    replacements[key] = value;
    replacements[`{{${key}}}`] = value;
  }

  return replacements;
}

function replaceText(text, replacements) {
  let nextText = String(text || '');
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = key.startsWith('{{') ? key : `{{${key}}}`;
    nextText = nextText.replaceAll(placeholder, normalizeMultiline(value));
  }

  return nextText.replace(/\{\{[^}]+\}\}/g, DEFAULT_TEXT);
}

function addTextElement(slide, element, replacements) {
  slide.addText(replaceText(element.text, replacements), {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    ...normalizeOptions(element.options || {}),
  });
}

function addShapeElement(pptx, slide, element) {
  if (element.type === 'line') {
    slide.addShape(pptx.ShapeType.line, {
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h ?? 0,
      line: normalizeOptions({ line: element.line || {} }).line,
    });
    return;
  }

  slide.addShape(shapeType(pptx, element.shape), {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    fill: element.fill ? { ...element.fill, color: normalizeColor(element.fill.color) } : undefined,
    line: element.line ? { ...element.line, color: normalizeColor(element.line.color) } : undefined,
  });
}

function normalizeImagePath(value) {
  const imagePath = normalizeText(value);
  if (!imagePath || /^https?:\/\//i.test(imagePath)) return '';
  return fs.existsSync(imagePath) ? imagePath : '';
}

function addImageElement(slide, element, replacements) {
  const imagePath = normalizeImagePath(replacements[element.placeholder] || replacements[element.placeholder?.replace(/[{}]/g, '')]);
  if (!imagePath) return;

  slide.addImage({
    path: imagePath,
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    sizing: { type: element.fit === 'cover' ? 'cover' : 'contain', x: element.x, y: element.y, w: element.w, h: element.h },
  });
}

export function renderPortfolioDetailTemplate(pptx, portfolio = {}) {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  const layoutName = template.pptx?.layout || 'LAYOUT_WIDE';
  const replacements = buildReplacementMap(portfolio);

  if (template.pptx?.width && template.pptx?.height) {
    pptx.defineLayout({
      name: layoutName,
      width: template.pptx.width,
      height: template.pptx.height,
    });
  }
  pptx.layout = layoutName;

  for (const slideSpec of template.slides || []) {
    const slide = pptx.addSlide();
    slide.background = { color: template.theme?.colors?.canvas || 'FFFFFF' };

    for (const element of slideSpec.elements || []) {
      if (element.type === 'text') {
        addTextElement(slide, element, replacements);
      } else if (element.type === 'shape' || element.type === 'line') {
        addShapeElement(pptx, slide, element);
      } else if (element.type === 'imagePlaceholder') {
        addImageElement(slide, element, replacements);
      }
    }
  }
}

