// 단일 파일 분석 서비스. docs/single-file-ai-analysis-mvp.md §3의 [1]~[15] 흐름을 오케스트레이션한다.
// 저장은 repository 인터페이스만 사용하므로 DB 전환 시 이 파일은 거의 수정하지 않는다.

import crypto from 'node:crypto';
import path from 'node:path';
import { createFileId, createAnalysisId, createEventId } from './ids.mjs';
import { extractContent } from './extractor.mjs';
import { runAiAnalysis } from './ai-client.mjs';
import { validateAnalysisResult } from './validator.mjs';
import { buildSummaryMarkdown, buildLogEntry } from './templates.mjs';

const DEFAULT_PROJECT_ID = 'single-file-session';
const DEFAULT_PROJECT_NAME = '임시 단일 파일 분석';

function nowIso() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .replace('Z', `${sign}${hh}:${mm}`);
}

export async function analyzeSingleFile({
  originalFileName,
  buffer,
  mimeType = 'application/octet-stream',
  projectType = 'personal',
  projectId = DEFAULT_PROJECT_ID,
  projectName = DEFAULT_PROJECT_NAME,
  repository,
}) {
  const fileId = createFileId();
  const analysisId = createAnalysisId();
  const extension = path.extname(originalFileName).toLowerCase().replace(/^\./, '');
  const safeFileName = `${fileId}${extension ? `.${extension}` : ''}`;
  let eventSequence = 0;

  async function logEvent(action, extra = {}) {
    eventSequence += 1;
    const entry = await buildLogEntry({
      timestamp: nowIso(),
      eventId: createEventId(eventSequence),
      action,
      fileId,
      analysisId,
      extra,
    });
    await repository.appendLog(analysisId, entry);
  }

  // [2]~[3] 원본 저장
  const { storagePath } = await repository.saveOriginalFile({ fileId, safeFileName, buffer });

  // [4]~[5] 메타데이터 생성 + pending 기록
  const metadata = {
    schemaVersion: '1.0.0',
    fileId,
    analysisId,
    projectId,
    projectType,
    originalFileName,
    safeFileName,
    extension,
    mimeType,
    sizeBytes: buffer.length,
    checksumSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    storagePath,
    uploadedAt: nowIso(),
    uploadStatus: 'uploaded',
    analysisStatus: 'pending',
    reviewStatus: 'pending_review',
  };
  await repository.saveMetadata(metadata);
  await logEvent('file_uploaded', {
    fileName: originalFileName,
    uploadStatus: 'uploaded',
    analysisStatus: 'pending',
  });

  // [6] 텍스트 추출
  await logEvent('extraction_started');
  const extracted = await extractContent({ fileId, analysisId, extension, buffer });

  if (extracted.extractionStatus !== 'completed') {
    metadata.analysisStatus = 'failed';
    await repository.saveMetadata(metadata);
    await logEvent('extraction_failed', { warnings: extracted.warnings.join(' / ') });
    return {
      ok: false,
      stage: 'extraction',
      fileId,
      analysisId,
      metadata,
      errors: extracted.warnings,
    };
  }

  await repository.saveExtractedText(fileId, extracted.contentText);
  await logEvent('extraction_completed');

  // [7]~[9] AI 분석 + 검증
  metadata.analysisStatus = 'analyzing';
  await repository.saveMetadata(metadata);
  await logEvent('ai_analysis_started');

  let provider = 'unknown';
  let result;
  try {
    const response = await runAiAnalysis({
      fileId,
      analysisId,
      projectType,
      fileMetadata: metadata,
      extractedContent: extracted,
    });
    provider = response.provider;
    result = response.result;
  } catch (error) {
    metadata.analysisStatus = 'failed';
    await repository.saveMetadata(metadata);
    await logEvent('ai_analysis_failed', { error: error.message });
    return { ok: false, stage: 'ai', fileId, analysisId, metadata, errors: [error.message] };
  }

  const validation = validateAnalysisResult(result, {
    fileId,
    analysisId,
  });

  if (!validation.ok) {
    metadata.analysisStatus = 'failed';
    await repository.saveMetadata(metadata);
    await logEvent('ai_analysis_failed', { error: validation.errors.join(' / ') });
    return { ok: false, stage: 'validation', fileId, analysisId, metadata, errors: validation.errors };
  }

  // [10]~[14] 결과 저장 + 산출물 생성
  metadata.analysisStatus = 'completed';
  await repository.saveMetadata(metadata);
  await repository.saveAnalysisResult(result, provider);

  const summaryMarkdown = await buildSummaryMarkdown({ metadata, result, projectType });
  await repository.saveSummaryMarkdown(analysisId, summaryMarkdown);

  await logEvent('ai_analysis_completed', {
    provider,
    reviewStatus: result.reviewStatus,
  });

  const bundle = await repository.getAnalysisBundle(analysisId);

  // [15] 결과 반환
  return {
    ok: true,
    provider,
    fileId,
    analysisId,
    metadata,
    analysisResult: result,
    summaryMarkdown,
    logMarkdown: bundle?.logMarkdown || '',
  };
}
