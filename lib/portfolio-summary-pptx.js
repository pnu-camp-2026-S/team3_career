import fs from 'fs';
import path from 'path';

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'portfolio_design',
  'portfolio-summary',
  'portfolio_summary_template.pptxgen.v2.json'
);

const DEFAULT_TEXT = '제공된 정보 부족';

function normalizeText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
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

function normalizeColor(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^#/, '').toUpperCase();
}

function normalizeOptions(options = {}) {
  const normalized = { ...options };

  if (normalized.align) normalized.align = normalizeAlign(normalized.align);
  if (normalized.color) normalized.color = normalizeColor(normalized.color);
  if (normalized.fill?.color) {
    normalized.fill = { ...normalized.fill, color: normalizeColor(normalized.fill.color) };
  }
  if (normalized.line?.color) {
    normalized.line = { ...normalized.line, color: normalizeColor(normalized.line.color) };
  }

  return normalized;
}

function getShapeType(pptx, shapeType) {
  if (!shapeType) return pptx.ShapeType.rect;
  return pptx.ShapeType[shapeType] ?? shapeType;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeList(value, maxItems = 3) {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n|,|•|ㆍ/)
      .map((item) => item.trim());

  return source
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function readList(...values) {
  for (const value of values) {
    const items = normalizeList(value);
    if (items.length) return items;
  }
  return [];
}

// 전용 template_values 컬럼이 생기기 전, coverLines에 우회 저장했던 구버전 데이터 호환용.
// 신규 저장분은 portfolio.templateValues/portfolio.raw.template_values로 바로 들어오므로 이 경로를 타지 않는다.
function parseCoverLineTemplateValues(portfolio = {}) {
  const coverLines = safeArray(portfolio.coverLines);
  const jsonLine = coverLines.find((line) => String(line || '').startsWith('template_values:'));
  if (!jsonLine) return null;

  try {
    return JSON.parse(String(jsonLine).replace(/^template_values:\s*/, ''));
  } catch {
    return null;
  }
}

function fallbackTemplateValues(portfolio = {}) {
  const raw = portfolio.raw || {};
  const profile = raw.profile || {};
  const targetFit = raw.target_fit || {};
  const experiences = safeArray(raw.representative_experiences);
  const keywords = safeArray(portfolio.keywords);
  const skills = [
    ...safeArray(raw.skill_keywords).map((item) => item?.text || item),
    ...keywords,
  ].filter(Boolean);

  return {
    name: profile.name || DEFAULT_TEXT,
    target_role: targetFit.role?.value || DEFAULT_TEXT,
    phone: profile.phone || DEFAULT_TEXT,
    email: profile.email || DEFAULT_TEXT,
    experiences: [0, 1, 2].map((index) => ({
      project_or_activity: experiences[index]?.title || portfolio.experiences?.[index] || DEFAULT_TEXT,
      role: experiences[index]?.fit_point || '역할 정보 보완 필요',
      impact: experiences[index]?.summary || DEFAULT_TEXT,
    })),
    verified_skills: skills.slice(0, 6),
    tools: {
      technologies: [],
      collaboration_tools: [],
      design_tools: [],
      education_or_certificates: [],
    },
    strength_from_experience: skills[0] || '강점',
    job_or_problem: skills[1] || '문제',
  };
}

export function getPortfolioSummaryTemplateValues(portfolio = {}) {
  return portfolio.templateValues
    || portfolio.raw?.template_values
    || parseCoverLineTemplateValues(portfolio)
    || fallbackTemplateValues(portfolio);
}

function replaceSequentialExperience(text, values, counters) {
  if (!/\{\{(?:project_or_activity|role|impact)\}\}/.test(text)) return text;

  const field = text.includes('{{project_or_activity}}')
    ? 'project_or_activity'
    : text.includes('{{role}}')
      ? 'role'
      : 'impact';
  const index = counters[field] || 0;
  counters[field] = index + 1;
  const experience = safeArray(values.experiences)[index] || {};
  return text.replaceAll(`{{${field}}}`, normalizeText(experience[field], DEFAULT_TEXT));
}

function buildPlaceholderMap(values) {
  const experiences = safeArray(values.experiences);
  const skills = safeArray(values.verified_skills).map((skill) => normalizeText(skill)).filter(Boolean);
  const tools = safeObject(values.tools);
  const technologies = readList(
    tools.technologies,
    [tools.technology_1, tools.technology_2, tools.technology_3],
    [tools.technology_or_framework, tools.ai_api_understanding]
  );
  const collaborationTools = readList(
    tools.collaboration_tools,
    [tools.collaboration_tool_1, tools.collaboration_tool_2, tools.collaboration_tool_3]
  );
  const designTools = readList(
    tools.design_tools,
    [tools.design_tool_1, tools.design_tool_2, tools.design_tool_3],
    [tools.design_tool, tools.document_presentation_tool]
  );
  const educationOrCertificates = readList(
    tools.education_or_certificates,
    [tools.education_or_certificate_1, tools.education_or_certificate_2, tools.education_or_certificate_3],
    [tools.education, tools.certificate_or_completion]
  );

  const replacements = {
    name: values.name,
    target_role: values.target_role,
    phone: values.phone,
    email: values.email,
    strength_from_experience: values.strength_from_experience,
    job_or_problem: values.job_or_problem,
  };

  for (let index = 0; index < 3; index += 1) {
    const experience = experiences[index] || {};
    const number = index + 1;
    replacements[`project_or_activity_${number}`] = experience.project_or_activity || DEFAULT_TEXT;
    replacements[`role_${number}`] = experience.role || '역할 정보 보완 필요';
    replacements[`impact_${number}`] = experience.impact || DEFAULT_TEXT;
    replacements[`technology_${number}`] = technologies[index] || '';
    replacements[`collaboration_tool_${number}`] = collaborationTools[index] || '';
    replacements[`design_tool_${number}`] = designTools[index] || '';
    replacements[`education_or_certificate_${number}`] = educationOrCertificates[index] || '';
  }

  for (let index = 0; index < 6; index += 1) {
    replacements[`skill_${index + 1}`] = skills[index] || DEFAULT_TEXT;
  }

  return replacements;
}

function replaceTemplateText(element, text, values, counters) {
  let nextText = replaceSequentialExperience(text, values, counters);
  const replacements = buildPlaceholderMap(values);
  const legacyTools = safeObject(values.tools);
  const legacyReplacements = {
    verified_skill: replacements.skill_6,
    technology_or_framework: legacyTools.technology_or_framework || replacements.technology_1,
    ai_api_understanding: legacyTools.ai_api_understanding || replacements.technology_2,
    collaboration_tool_1: replacements.collaboration_tool_1,
    collaboration_tool_2: replacements.collaboration_tool_2,
    design_tool: legacyTools.design_tool || replacements.design_tool_1,
    document_presentation_tool: legacyTools.document_presentation_tool || replacements.design_tool_2,
    education: legacyTools.education || replacements.education_or_certificate_1,
    certificate_or_completion: legacyTools.certificate_or_completion || replacements.education_or_certificate_2,
  };

  for (const [key, value] of Object.entries({ ...replacements, ...legacyReplacements })) {
    nextText = nextText.replaceAll(`{{${key}}}`, normalizeText(value));
  }

  return nextText
    .split('\n')
    .filter((line) => !/^•\s*$/.test(line.trim()))
    .join('\n')
    .replace(/\{\{[^}]+\}\}/g, DEFAULT_TEXT);
}

export function renderPortfolioSummaryTemplate(pptx, portfolio = {}) {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  const values = getPortfolioSummaryTemplateValues(portfolio);
  const layoutName = template.presentation?.layout || 'LAYOUT_WIDE';

  if (template.presentation?.width && template.presentation?.height) {
    pptx.defineLayout({
      name: layoutName,
      width: template.presentation.width,
      height: template.presentation.height,
    });
  }
  pptx.layout = layoutName;

  for (const slideSpec of template.slides || []) {
    const slide = pptx.addSlide();
    const counters = { project_or_activity: 0, role: 0, impact: 0 };

    for (const element of slideSpec.elements || []) {
      const options = normalizeOptions(element.options || {});

      if (element.method === 'addText') {
        slide.addText(replaceTemplateText(element, element.text || '', values, counters), options);
      } else if (element.method === 'addShape') {
        slide.addShape(getShapeType(pptx, element.shapeType), options);
      } else if (element.method === 'addImage') {
        slide.addImage(normalizeOptions({ ...element.options, path: element.path ?? element.options?.path }));
      }
    }
  }
}
