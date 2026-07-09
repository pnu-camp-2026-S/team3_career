// 종합 분석 오케스트레이션.
// 저장된 모든 단일 파일 분석 번들을 모아 AI로 종합하고,
// 메인 키워드 개요 + 포트폴리오 강조 키워드를 생성해 저장한다.
// 저장은 repository 인터페이스만 사용하므로 DB 전환 시 수정하지 않는다.

import { isExplicitMockMode, runAggregateAnalysis } from './ai-client.mjs';
import { validateAggregateResult } from './validator.mjs';

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

export async function aggregateAnalyses({ repository }) {
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

  let provider = 'unknown';
  let result;
  try {
    const response = await runAggregateAnalysis({ bundles: analyzed });
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
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    provider,
    basedOnCount: analyzed.length,
    ...result,
  };
  await repository.saveAggregateResult(stored);

  return { ok: true, provider, result: stored };
}
