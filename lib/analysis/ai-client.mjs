// AI 분석 클라이언트. prompts/single-file-analysis.md를 로드해 플레이스홀더를 치환하고
// 제공자(Gemini → OpenAI → mock 순서)를 골라 구조화 JSON을 받아온다.
// 키 값은 어떤 경우에도 로그나 산출물에 남기지 않는다.

import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PROJECT_TYPE_LABELS, getSubfoldersForProjectType } from './subfolder-config.mjs';

dotenv.config({ path: 'key.env' });
dotenv.config({ path: 'gemini_key.env' });

const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'single-file-analysis.md');
const AGGREGATE_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'aggregate-analysis.md');

export function resolveProvider() {
  if (process.env.ANALYSIS_MOCK === '1') return 'mock';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

function fillPlaceholders(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
}

export async function buildPrompt({ fileId, analysisId, projectType, fileMetadata, extractedContent }) {
  const template = await fs.readFile(PROMPT_PATH, 'utf8');
  const subfolders = getSubfoldersForProjectType(projectType);
  const allowedSubfolders = subfolders
    .map((folder) => `- ${folder.folderId}: ${folder.folderName}`)
    .join('\n');

  return fillPlaceholders(template, {
    fileId,
    analysisId,
    projectType,
    projectTypeLabel: PROJECT_TYPE_LABELS[projectType] || projectType,
    allowedSubfolders,
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

async function callOpenAI(prompt) {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const text = completion.choices[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
  return text;
}

// 키 없이도 파이프라인을 검증할 수 있는 고정 응답.
function buildMockResult({ fileId, analysisId, projectType, extractedContent }) {
  const subfolders = getSubfoldersForProjectType(projectType);
  const primary = subfolders[0];
  const alternative = subfolders[1] || primary;

  return {
    schemaVersion: '1.0.0',
    fileId,
    analysisId,
    analysisStatus: 'completed',
    reviewStatus: 'pending_review',
    fileSummary: {
      title: '모의 분석 제목',
      oneLine: '모의 모드에서 생성된 한 줄 요약입니다.',
      detailed: `모의 모드 상세 요약입니다. 추출된 본문 ${extractedContent.contentStats.characterCount}자를 기준으로 생성되었습니다.`,
      keyPoints: ['모의 핵심 포인트 1', '모의 핵심 포인트 2'],
      keywords: ['모의', '분석'],
    },
    classification: {
      recommendedFolderId: primary.folderId,
      recommendedFolderName: primary.folderName,
      confidence: 0.5,
      reason: '모의 모드에서는 프로젝트 유형의 첫 번째 하위 폴더를 추천합니다.',
      alternatives: [
        {
          folderId: alternative.folderId,
          folderName: alternative.folderName,
          confidence: 0.3,
          reason: '모의 대안 추천입니다.',
        },
      ],
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
    return { provider, result: buildMockResult(context) };
  }

  const prompt = await buildPrompt(context);
  const raw = provider === 'gemini' ? await callGemini(prompt) : await callOpenAI(prompt);
  return { provider, result: parseJsonResponse(raw) };
}

// 종합(aggregate) 분석: 여러 분석 번들 요약을 모아 메인 키워드 개요와
// 포트폴리오 강조 키워드를 생성한다.
function summarizeBundleForAggregate(bundle) {
  const result = bundle.analysisResult || {};
  const summary = result.fileSummary || {};
  const signals = result.portfolioSignals || {};
  return {
    fileName: bundle.metadata?.originalFileName || '',
    projectType: bundle.metadata?.projectType || '',
    oneLine: summary.oneLine || '',
    keyPoints: summary.keyPoints || [],
    keywords: summary.keywords || [],
    roles: (signals.roles || []).map((role) => role.name),
    skills: (signals.skills || []).map((skill) => skill.name),
    impact: (signals.impact || []).map((impact) => impact.claim),
  };
}

function buildMockAggregateResult(count) {
  return {
    headline: '모의 종합 분석: 자료 정리 습관이 드러나요',
    description: `모의 모드에서 ${count}개 자료를 기준으로 생성된 종합 결과입니다. 실제 AI 분석이 아닙니다.`,
    activityKeywords: ['자료 정리', '문서화', '꾸준함', '실행력'],
    portfolioKeywords: ['체계적인 자료 구조화 역량', '기록 기반 커뮤니케이션', '꾸준한 실행 습관', '문서화 및 공유 역량', '자기주도적 정리 역량'],
    basedOnCount: count,
    warnings: ['모의(mock) 모드 결과입니다. 실제 AI 분석이 아닙니다.'],
  };
}

export async function runAggregateAnalysis({ bundles }) {
  const provider = resolveProvider();

  if (provider === 'mock') {
    return { provider, result: buildMockAggregateResult(bundles.length) };
  }

  const template = await fs.readFile(AGGREGATE_PROMPT_PATH, 'utf8');
  const prompt = fillPlaceholders(template, {
    documentCount: bundles.length,
    analysisSummaries: JSON.stringify(bundles.map(summarizeBundleForAggregate), null, 2),
  });

  const raw = provider === 'gemini' ? await callGemini(prompt) : await callOpenAI(prompt);
  return { provider, result: parseJsonResponse(raw) };
}
