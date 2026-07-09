// summary.md / index.json / log.md 렌더러.
// 규칙은 prompts/template-writing-guide.md를 따르고, 템플릿 원본은 templates/에 있다.
// AI를 쓰지 않는 결정적 렌더링이므로 DB 전환 후에도 그대로 재사용한다.

import fs from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_TYPE_LABELS } from './subfolder-config.mjs';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

async function loadTemplate(name) {
  return fs.readFile(path.join(TEMPLATES_DIR, name), 'utf8');
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
}

// JSON 템플릿의 문자열 자리에는 따옴표·개행이 깨지지 않게 이스케이프해서 넣는다.
function jsonEscape(value) {
  return JSON.stringify(String(value ?? '')).slice(1, -1);
}

function markdownList(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) return '- 없음';
  return items.map((item) => `- ${formatter(item)}`).join('\n');
}

function evidenceSuffix(evidence) {
  const first = Array.isArray(evidence) ? evidence[0] : null;
  if (!first) return '';
  return `: ${first.summary} (${first.location})`;
}

// ── 파일 단위 산출물 ─────────────────────────────────────────────

export async function buildSummaryMarkdown({ metadata, result, projectType }) {
  const template = await loadTemplate('summary.md');
  const summary = result.fileSummary || {};
  const signals = result.portfolioSignals || {};

  return fill(template, {
    originalFileName: metadata.originalFileName,
    extension: metadata.extension,
    projectTypeLabel: PROJECT_TYPE_LABELS[projectType] || projectType,
    analysisStatus: result.analysisStatus,
    reviewStatus: result.reviewStatus,
    oneLine: summary.oneLine || '',
    detailed: summary.detailed || '',
    keyPointsList: markdownList(summary.keyPoints, (point) => point),
    rolesList: markdownList(signals.roles, (role) => `${role.name}${evidenceSuffix(role.evidence)}`),
    skillsList: markdownList(signals.skills, (skill) => `${skill.name}${evidenceSuffix(skill.evidence)}`),
    impactList: markdownList(signals.impact, (impact) => `${impact.claim}${evidenceSuffix(impact.evidence)}`),
    warningsList: markdownList(result.warnings, (warning) => warning),
  });
}

export async function buildLogEntry({ timestamp, eventId, action, fileId, analysisId, extra = {} }) {
  const template = await loadTemplate('log-entry.md');
  const extraLines = Object.entries(extra)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  return fill(template, {
    timestamp,
    eventId,
    action,
    fileId,
    analysisId,
    extraLines,
  }).replace(/\n+$/, '\n');
}

// ── 프로젝트 단위 산출물 ─────────────────────────────────────────

// index.json: 실제 세부 폴더/파일 구조를 결정적으로 채운다(AI 추천 없음).
export async function buildProjectIndexJson({ project, subfolders, files, generatedAt }) {
  const template = await loadTemplate('index.json');

  const rendered = fill(template, {
    projectId: jsonEscape(project.projectId),
    projectName: jsonEscape(project.projectName),
    projectType: jsonEscape(project.projectType),
    subfoldersJson: JSON.stringify(subfolders || []),
    filesJson: JSON.stringify(files || []),
    generatedAt: jsonEscape(generatedAt),
  });

  // 치환 결과가 유효한 JSON인지 반드시 확인한다 (template-writing-guide 규칙).
  return JSON.parse(rendered);
}

// summary.md: 프로젝트 종합 프롬프트 출력 + 결정적 목록을 조합한다.
export async function buildProjectSummaryMarkdown({ project, ai, documentCount, generatedAt }) {
  const template = await loadTemplate('project-summary.md');
  const highlights = Array.isArray(ai.subfolderHighlights) ? ai.subfolderHighlights : [];

  return fill(template, {
    projectName: project.projectName,
    projectTypeLabel: PROJECT_TYPE_LABELS[project.projectType] || project.projectType,
    documentCount,
    generatedAt,
    headline: ai.headline || '',
    description: ai.description || '',
    subfolderHighlightsList: markdownList(highlights, (item) => `${item.folderLabel}: ${item.highlight}`),
    activityKeywordsList: markdownList(ai.activityKeywords, (keyword) => keyword),
    portfolioKeywordsList: markdownList(ai.portfolioKeywords, (keyword) => keyword),
    warningsList: markdownList(ai.warnings, (warning) => warning),
  });
}

// log.md: 분석 실행마다 아래 블록을 시간 순서로 append 한다.
export function buildProjectLogHeader() {
  return '# 프로젝트 분석 로그\n';
}

export function buildProjectLogEntry({ timestamp, documentCount, provider, headline }) {
  return [
    `## ${timestamp}`,
    '',
    '- action: project_analysis',
    `- 분석 자료 수: ${documentCount}개`,
    `- provider: ${provider}`,
    `- headline: ${headline || ''}`,
    '',
  ].join('\n');
}
