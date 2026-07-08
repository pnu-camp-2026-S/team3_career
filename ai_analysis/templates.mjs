// summary.md / index.json / log.md 렌더러.
// 규칙은 prompts/template-writing-guide.md를 따르고, 템플릿 원본은 templates/에 있다.
// AI를 쓰지 않는 결정적 렌더링이므로 DB 전환 후에도 그대로 재사용한다.

import fs from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_TYPE_LABELS, getSubfoldersForProjectType } from './subfolder-config.mjs';

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

export async function buildSummaryMarkdown({ metadata, result, projectType }) {
  const template = await loadTemplate('summary.md');
  const summary = result.fileSummary || {};
  const classification = result.classification || {};
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
    recommendedFolderName: classification.recommendedFolderName || '',
    confidence: classification.confidence ?? '',
    classificationReason: classification.reason || '',
    rolesList: markdownList(signals.roles, (role) => `${role.name}${evidenceSuffix(role.evidence)}`),
    skillsList: markdownList(signals.skills, (skill) => `${skill.name}${evidenceSuffix(skill.evidence)}`),
    impactList: markdownList(signals.impact, (impact) => `${impact.claim}${evidenceSuffix(impact.evidence)}`),
    warningsList: markdownList(result.warnings, (warning) => warning),
  });
}

export async function buildIndexDraft({ metadata, result, projectType, projectId, projectName }) {
  const template = await loadTemplate('index.json');
  const classification = result.classification || {};

  const rendered = fill(template, {
    projectId: jsonEscape(projectId),
    projectName: jsonEscape(projectName),
    projectType: jsonEscape(projectType),
    foldersJson: JSON.stringify(getSubfoldersForProjectType(projectType)),
    fileId: jsonEscape(metadata.fileId),
    analysisId: jsonEscape(metadata.analysisId),
    originalFileName: jsonEscape(metadata.originalFileName),
    extension: jsonEscape(metadata.extension),
    uploadStatus: jsonEscape(metadata.uploadStatus),
    analysisStatus: jsonEscape(result.analysisStatus),
    reviewStatus: jsonEscape(result.reviewStatus),
    recommendedFolderId: jsonEscape(classification.recommendedFolderId),
    recommendedFolderName: jsonEscape(classification.recommendedFolderName),
    confidence: Number(classification.confidence) || 0,
    recommendedPriority: Number(result.recommendedPriority?.value) || 1,
    recommendedSummary: jsonEscape(result.fileSummary?.oneLine || ''),
  });

  // 치환 결과가 유효한 JSON인지 반드시 확인한다 (template-writing-guide 규칙).
  return JSON.parse(rendered);
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
