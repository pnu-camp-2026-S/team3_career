// 종합 분석 오케스트레이션(2단계).
// - aggregateProjectAnalyses: 한 프로젝트의 파일 요약들을 모아 프로젝트 summary.md/index.json/log.md 생성.
// - aggregateMainOverview: 모든 프로젝트 종합을 모아 메인 개요 + 포트폴리오 키워드 생성.
// 저장은 repository 인터페이스만 사용하므로 DB 전환 시 수정하지 않는다.

import { isExplicitMockMode, runProjectAnalysis, runAggregateAnalysis } from './ai-client.mjs';
import { validateProjectAnalysisResult, validateAggregateResult } from './validator.mjs';
import {
  buildProjectIndexJson,
  buildProjectSummaryMarkdown,
  buildProjectLogHeader,
  buildProjectLogEntry,
} from './templates.mjs';
import { PROJECT_TYPE_LABELS } from './subfolder-config.mjs';

function nowIso() {
  return new Date().toISOString();
}

function includesMockText(value) {
  return String(value || '').toLowerCase().includes('mock')
    || String(value || '').includes('모의');
}

function isMockAnalysisBundle(bundle) {
  const result = bundle.analysisResult || {};
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  return bundle.provider === 'mock'
    || result.provider === 'mock'
    || warnings.some(includesMockText)
    || includesMockText(result.fileSummary?.oneLine)
    || includesMockText(result.fileSummary?.detailed);
}

function isMockProjectAggregate(item) {
  const warnings = Array.isArray(item?.warnings) ? item.warnings : [];
  return item?.provider === 'mock'
    || warnings.some(includesMockText)
    || includesMockText(item?.headline)
    || includesMockText(item?.description)
    || includesMockText(item?.summaryMd);
}

// index.json에 넣을 세부 폴더/파일 목록을 결정적으로 만든다.
function buildIndexInputs(fileEntries, bundles) {
  const bundleByFileId = new Map(bundles.map((bundle) => [bundle.activityFileId, bundle]));

  if (Array.isArray(fileEntries) && fileEntries.length) {
    const subfolderMap = new Map();
    const files = fileEntries.map((entry) => {
      const bundle = bundleByFileId.get(entry.activityFileId);
      const result = bundle?.analysisResult || {};
      if (!subfolderMap.has(entry.folderId)) {
        subfolderMap.set(entry.folderId, {
          id: entry.folderId,
          label: entry.folderLabel || '',
          fileCount: 0,
        });
      }
      subfolderMap.get(entry.folderId).fileCount += 1;
      return {
        fileId: bundle?.metadata?.fileId || entry.activityFileId,
        fileName: entry.fileName,
        folderId: entry.folderId,
        oneLine: result.fileSummary?.oneLine || '',
        keywords: result.fileSummary?.keywords || [],
        priority: result.recommendedPriority?.value ?? null,
        reviewStatus: bundle?.metadata?.reviewStatus || 'pending_review',
      };
    });
    return { subfolders: [...subfolderMap.values()], files };
  }

  // fileEntries가 없으면(로컬/테스트) 번들 메타데이터만으로 구성한다.
  const files = bundles.map((bundle) => {
    const result = bundle.analysisResult || {};
    return {
      fileId: bundle.metadata?.fileId || '',
      fileName: bundle.metadata?.originalFileName || '',
      folderId: '',
      oneLine: result.fileSummary?.oneLine || '',
      keywords: result.fileSummary?.keywords || [],
      priority: result.recommendedPriority?.value ?? null,
      reviewStatus: bundle.metadata?.reviewStatus || 'pending_review',
    };
  });
  return { subfolders: [], files };
}

// AI 종합에 넣을 파일 요약 목록(세부 폴더 · 파일명 · 요약).
function buildFileSummaries(fileEntries, bundles) {
  const labelByFileId = new Map(
    (Array.isArray(fileEntries) ? fileEntries : []).map((entry) => [entry.activityFileId, entry.folderLabel || ''])
  );
  return bundles.map((bundle) => ({
    folderLabel: labelByFileId.get(bundle.activityFileId) || '',
    fileName: bundle.metadata?.originalFileName || '',
    summary: bundle.summaryMarkdown || bundle.analysisResult?.fileSummary?.oneLine || '',
  }));
}

// L2: 한 프로젝트 종합.
export async function aggregateProjectAnalyses({ repository, project, fileEntries = null }) {
  const bundles = await repository.listAnalysisBundles();
  const completed = bundles.filter(
    (bundle) => bundle.analysisResult && bundle.metadata?.analysisStatus === 'completed'
  );
  const analyzed = isExplicitMockMode()
    ? completed
    : completed.filter((bundle) => !isMockAnalysisBundle(bundle));

  if (analyzed.length === 0) {
    return {
      ok: false,
      reason: completed.length > 0 ? 'mock_data' : 'no_data',
    };
  }

  const existing = (await repository.getAggregateResult()) || {};
  const edited = {
    summary: Boolean(existing.edited?.summary),
    index: Boolean(existing.edited?.index),
    log: Boolean(existing.edited?.log),
  };

  let provider = 'unknown';
  let ai;
  try {
    const response = await runProjectAnalysis({
      project: { projectName: project.projectName, projectType: project.projectType },
      fileSummaries: buildFileSummaries(fileEntries, analyzed),
    });
    provider = response.provider;
    ai = response.result;
  } catch (error) {
    return { ok: false, reason: 'ai_error', errors: [error.message] };
  }

  const validation = validateProjectAnalysisResult(ai);
  if (!validation.ok) {
    return { ok: false, reason: 'validation', errors: validation.errors };
  }

  const generatedAt = nowIso();
  const summaryMd = edited.summary && existing.summaryMd
    ? existing.summaryMd
    : await buildProjectSummaryMarkdown({ project, ai, documentCount: analyzed.length, generatedAt });

  const { subfolders, files } = buildIndexInputs(fileEntries, analyzed);
  const indexJson = edited.index && existing.indexJson
    ? existing.indexJson
    : await buildProjectIndexJson({
      project: { projectId: project.projectId, projectName: project.projectName, projectType: project.projectType },
      subfolders,
      files,
      generatedAt,
    });

  // log.md는 실행 이력을 남기기 위해 항상 append한다. 기존 사용자 수정 내용도 앞부분에 유지된다.
  const logBase = existing.logMd || buildProjectLogHeader();
  const logMd = `${logBase}\n${buildProjectLogEntry({
    timestamp: generatedAt,
    documentCount: analyzed.length,
    provider,
    headline: ai.headline,
  })}`;

  const stored = {
    schemaVersion: '2.0.0',
    scope: 'project',
    projectId: project.projectId,
    projectName: project.projectName,
    projectType: project.projectType,
    generatedAt,
    provider,
    basedOnCount: analyzed.length,
    headline: ai.headline,
    description: ai.description,
    subfolderHighlights: ai.subfolderHighlights || [],
    activityKeywords: ai.activityKeywords,
    portfolioKeywords: ai.portfolioKeywords,
    warnings: ai.warnings || [],
    summaryMd,
    indexJson,
    logMd,
    edited,
  };

  await repository.saveAggregateResult(stored);
  return { ok: true, provider, result: stored };
}

// L3: 모든 프로젝트 → 메인 개요.
export async function aggregateMainOverview({ repository, projectIds = null }) {
  const projectAggregates = await repository.listProjectAggregates();
  const projectIdSet = Array.isArray(projectIds) && projectIds.length
    ? new Set(projectIds.map((id) => String(id)))
    : null;
  const completed = (projectAggregates || []).filter((item) => (
    item
      && item.headline
      && (!projectIdSet || projectIdSet.has(String(item.projectId || '')))
  ));
  const usable = isExplicitMockMode()
    ? completed
    : completed.filter((item) => !isMockProjectAggregate(item));

  if (usable.length === 0) {
    return {
      ok: false,
      reason: completed.length > 0 ? 'mock_data' : 'no_data',
    };
  }

  const projects = usable.map((item) => ({
    name: item.projectName || '프로젝트',
    projectType: item.projectType || 'other',
    projectTypeLabel: PROJECT_TYPE_LABELS[item.projectType] || item.projectType || '기타',
    headline: item.headline,
    description: item.description,
    summaryMd: item.summaryMd || '',
    activityKeywords: item.activityKeywords || [],
    portfolioKeywords: item.portfolioKeywords || [],
  }));

  let provider = 'unknown';
  let result;
  try {
    const response = await runAggregateAnalysis({ projects });
    provider = response.provider;
    result = response.result;
  } catch (error) {
    return { ok: false, reason: 'ai_error', errors: [error.message] };
  }

  const validation = validateAggregateResult(result);
  if (!validation.ok) {
    return { ok: false, reason: 'validation', errors: validation.errors };
  }

  const stored = {
    schemaVersion: '2.0.0',
    scope: 'user',
    generatedAt: nowIso(),
    provider,
    basedOnCount: usable.length,
    ...result,
  };
  await repository.saveAggregateResult(stored);
  return { ok: true, provider, result: stored };
}
