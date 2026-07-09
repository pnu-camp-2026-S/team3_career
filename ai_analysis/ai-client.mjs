// AI 분석 클라이언트. prompts/*.md를 로드해 플레이스홀더를 치환하고
// 제공자(OpenAI → Gemini → mock 순서, ANALYSIS_PROVIDER로 지정 가능)를 골라 구조화 JSON을 받아온다.
// 키 값은 어떤 경우에도 로그나 산출물에 남기지 않는다.

import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PROJECT_TYPE_LABELS } from './subfolder-config.mjs';

dotenv.config({ path: 'key.env' });
dotenv.config({ path: 'gemini_key.env' });

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'single-file-analysis.md');
const PROJECT_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'project-analysis.md');
const AGGREGATE_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'aggregate-analysis.md');
const MAIN_ACTIVITY_OVERVIEW_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'main-activity-overview.md');

export function isExplicitMockMode() {
  return process.env.ANALYSIS_MOCK === '1'
    || (process.env.ANALYSIS_PROVIDER || '').toLowerCase() === 'mock';
}

export function resolveProvider() {
  if (isExplicitMockMode()) return 'mock';
  // ANALYSIS_PROVIDER(openai|gemini|mock)로 명시할 수 있고,
  // 기본값은 key.env의 OpenAI 키를 우선 사용한다.
  const explicit = (process.env.ANALYSIS_PROVIDER || '').toLowerCase();
  if (explicit === 'mock') return 'mock';
  if (explicit === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (explicit === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'mock';
}

function assertRealProviderAvailable(provider) {
  if (provider !== 'mock') return;
  throw new Error('실제 AI API 키가 없어 분석을 실행할 수 없습니다. key.env의 OPENAI_API_KEY를 확인하거나, 테스트가 필요할 때만 ANALYSIS_MOCK=1을 사용하세요.');
}

function fillPlaceholders(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
}

export async function buildPrompt({ fileId, analysisId, projectType, fileMetadata, extractedContent }) {
  const template = await fs.readFile(PROMPT_PATH, 'utf8');

  return fillPlaceholders(template, {
    fileId,
    analysisId,
    projectType,
    projectTypeLabel: PROJECT_TYPE_LABELS[projectType] || projectType,
    fileMetadata: JSON.stringify(fileMetadata, null, 2),
    extractedContent: JSON.stringify(
      {
        contentPreview: extractedContent.contentPreview,
        contentStats: extractedContent.contentStats,
        contentText: extractedContent.contentText,
      },
      null,
      2
    ),
  });
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
  if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다.');
  return text;
}

export function supportsCustomTemperature(model) {
  const normalized = String(model || '').trim().toLowerCase();
  return !/^(gpt-5|o[1-9])(?:[.-]|$)/.test(normalized);
}

async function callOpenAI(prompt) {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const request = {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  };

  if (supportsCustomTemperature(model)) {
    request.temperature = 0.2;
  }

  const completion = await openai.chat.completions.create(request);
  const text = completion.choices[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
  return text;
}

async function callProvider(provider, prompt) {
  return provider === 'gemini' ? callGemini(prompt) : callOpenAI(prompt);
}

// 키 없이도 파이프라인을 검증할 수 있는 고정 응답(단일 파일).
function buildMockResult({ fileId, analysisId, extractedContent }) {
  const characterCount = extractedContent?.contentStats?.characterCount || 0;
  return {
    schemaVersion: '1.0.0',
    fileId,
    analysisId,
    analysisStatus: 'completed',
    reviewStatus: 'pending_review',
    fileSummary: {
      title: '모의 분석 제목',
      oneLine: '모의 모드에서 생성된 한 줄 요약입니다.',
      detailed: `모의 모드 상세 요약입니다. 추출된 본문 ${characterCount}자를 기준으로 생성되었습니다.`,
      keyPoints: ['모의 핵심 포인트 1', '모의 핵심 포인트 2'],
      keywords: ['모의', '분석'],
    },
    portfolioSignals: {
      roles: [
        {
          name: '자료 정리',
          confidence: 0.5,
          evidence: [{ location: '본문 전체', summary: '모의 근거 요약' }],
        },
      ],
      skills: [],
      impact: [],
    },
    recommendedPriority: { value: 1, reason: '모의 모드 기본 우선순위' },
    warnings: ['모의(mock) 모드 결과입니다. 실제 AI 분석이 아닙니다.'],
    requiresUserConfirmation: true,
  };
}

function parseJsonResponse(raw) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(trimmed);
}

export async function runAiAnalysis(context) {
  const provider = resolveProvider();

  if (provider === 'mock') {
    if (!isExplicitMockMode()) assertRealProviderAvailable(provider);
    return { provider, result: buildMockResult(context) };
  }

  const prompt = await buildPrompt(context);
  const raw = await callProvider(provider, prompt);
  return { provider, result: parseJsonResponse(raw) };
}

// 프로젝트 종합(한 프로젝트).
function buildMockProjectResult(project, fileSummaries) {
  const labels = [...new Set(fileSummaries.map((item) => item.folderLabel).filter(Boolean))];
  return {
    headline: `모의 종합: ${project.projectName} 프로젝트의 활동이 정리되었습니다.`,
    description: `모의 모드에서 ${fileSummaries.length}개 자료 요약을 기준으로 생성된 프로젝트 종합입니다. 실제 AI 분석이 아닙니다.`,
    subfolderHighlights: labels.map((label) => ({ folderLabel: label, highlight: '모의 세부 폴더 요약입니다.' })),
    activityKeywords: ['자료 정리', '문서화', '실행력', '협업'],
    portfolioKeywords: ['체계적인 자료 구조화 역량', '기록 기반 커뮤니케이션', '꾸준한 실행 습관', '문서화 및 공유 역량', '자기주도적 정리 역량'],
    warnings: ['모의(mock) 모드 결과입니다. 실제 AI 분석이 아닙니다.'],
  };
}

export async function runProjectAnalysis({ project, fileSummaries }) {
  const provider = resolveProvider();

  if (provider === 'mock') {
    if (!isExplicitMockMode()) assertRealProviderAvailable(provider);
    return { provider, result: buildMockProjectResult(project, fileSummaries) };
  }

  const template = await fs.readFile(PROJECT_PROMPT_PATH, 'utf8');
  const prompt = fillPlaceholders(template, {
    projectName: project.projectName,
    projectType: project.projectType,
    projectTypeLabel: PROJECT_TYPE_LABELS[project.projectType] || project.projectType,
    documentCount: fileSummaries.length,
    fileSummaries: JSON.stringify(fileSummaries, null, 2),
  });

  const raw = await callProvider(provider, prompt);
  return { provider, result: parseJsonResponse(raw) };
}

// 메인 종합(모든 프로젝트).
function incrementCount(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topCountItems(map, limit) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function buildAggregateActivityStats(projects) {
  const types = new Map();
  const activityKeywords = new Map();
  const portfolioKeywords = new Map();

  projects.forEach((project) => {
    const typeLabel = project.projectTypeLabel
      || PROJECT_TYPE_LABELS[project.projectType]
      || project.projectType
      || '기타';
    incrementCount(types, typeLabel);
    (project.activityKeywords || []).forEach((keyword) => incrementCount(activityKeywords, keyword));
    (project.portfolioKeywords || []).forEach((keyword) => incrementCount(portfolioKeywords, keyword));
  });

  return {
    activityCountBasis: '프로젝트 종합 1건을 활동 1건으로 계산합니다.',
    totalProjects: projects.length,
    typeCounts: topCountItems(types, 10).map(({ name, count }) => ({ label: name, count })),
    frequentActivityKeywords: topCountItems(activityKeywords, 8),
    frequentPortfolioKeywords: topCountItems(portfolioKeywords, 8),
  };
}

function buildMockAggregateResult(projects) {
  return {
    headline: '모의 종합 분석: 자료 정리 습관이 드러나요',
    description: `모의 모드에서 ${projects.length}개 프로젝트를 기준으로 생성된 종합 결과입니다. 실제 AI 분석이 아닙니다.`,
    activityOverview: `당신은 분석된 프로젝트 ${projects.length}개를 바탕으로 자료 정리와 문서화 흐름을 만들어가고 있어요. 반복해서 드러난 기록 기반 정리 역량을 중심으로 포트폴리오 강점을 확장할 수 있습니다.`,
    projects: projects.map((project) => ({
      name: project.name || '프로젝트',
      highlight: project.headline || '모의 프로젝트 하이라이트입니다.',
    })),
    activityKeywords: ['자료 정리', '문서화', '꾸준함', '실행력'],
    portfolioKeywords: ['체계적인 자료 구조화 역량', '기록 기반 커뮤니케이션', '꾸준한 실행 습관', '문서화 및 공유 역량', '자기주도적 정리 역량'],
    basedOnCount: projects.length,
    warnings: ['모의(mock) 모드 결과입니다. 실제 AI 분석이 아닙니다.'],
  };
}

export async function runAggregateAnalysis({ projects }) {
  const provider = resolveProvider();

  if (provider === 'mock') {
    if (!isExplicitMockMode()) assertRealProviderAvailable(provider);
    return { provider, result: buildMockAggregateResult(projects) };
  }

  const [template, activityOverviewGuide] = await Promise.all([
    fs.readFile(AGGREGATE_PROMPT_PATH, 'utf8'),
    fs.readFile(MAIN_ACTIVITY_OVERVIEW_PROMPT_PATH, 'utf8'),
  ]);
  const prompt = fillPlaceholders(template, {
    projectCount: projects.length,
    activityOverviewGuide: activityOverviewGuide.trim(),
    activityStats: JSON.stringify(buildAggregateActivityStats(projects), null, 2),
    projectSummaries: JSON.stringify(projects, null, 2),
  });

  const raw = await callProvider(provider, prompt);
  return { provider, result: parseJsonResponse(raw) };
}
