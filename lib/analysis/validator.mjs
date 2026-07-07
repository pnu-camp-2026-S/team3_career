// AI 분석 결과 검증기. docs/single-file-ai-analysis-mvp.md §17 6단계 기준.
// 잘못된 응답은 저장하지 않고 analysisStatus를 failed로 처리한다.

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isConfidence(value) {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isStringArray(value, min, max) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => isNonEmptyString(item))
  );
}

// 종합(aggregate) 분석 결과 검증
export function validateAggregateResult(result) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['종합 분석 결과가 객체가 아닙니다.'] };
  }

  if (!isNonEmptyString(result.headline)) errors.push('headline이 비어 있습니다.');
  if (!isNonEmptyString(result.description)) errors.push('description이 비어 있습니다.');
  if (!isStringArray(result.activityKeywords, 1, 8)) {
    errors.push('activityKeywords는 1~8개의 문자열 배열이어야 합니다.');
  }
  if (!isStringArray(result.portfolioKeywords, 1, 12)) {
    errors.push('portfolioKeywords는 1~12개의 문자열 배열이어야 합니다.');
  }
  if (!Array.isArray(result.warnings)) errors.push('warnings는 배열이어야 합니다.');

  return { ok: errors.length === 0, errors };
}

export function validateAnalysisResult(result, { fileId, analysisId, allowedFolderIds }) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['분석 결과가 객체가 아닙니다.'] };
  }

  if (result.fileId !== fileId) errors.push(`fileId가 일치하지 않습니다: ${result.fileId}`);
  if (result.analysisId !== analysisId) errors.push(`analysisId가 일치하지 않습니다: ${result.analysisId}`);
  if (result.requiresUserConfirmation !== true) errors.push('requiresUserConfirmation은 true여야 합니다.');

  const summary = result.fileSummary;
  if (!summary || typeof summary !== 'object') {
    errors.push('fileSummary가 없습니다.');
  } else {
    if (!isNonEmptyString(summary.oneLine)) errors.push('fileSummary.oneLine이 비어 있습니다.');
    if (!isNonEmptyString(summary.detailed)) errors.push('fileSummary.detailed가 비어 있습니다.');
    if (!Array.isArray(summary.keyPoints)) errors.push('fileSummary.keyPoints는 배열이어야 합니다.');
  }

  const classification = result.classification;
  if (!classification || typeof classification !== 'object') {
    errors.push('classification이 없습니다.');
  } else {
    if (!allowedFolderIds.includes(classification.recommendedFolderId)) {
      errors.push(`recommendedFolderId가 허용 목록에 없습니다: ${classification.recommendedFolderId}`);
    }
    if (!isConfidence(classification.confidence)) {
      errors.push(`classification.confidence가 0~1 범위가 아닙니다: ${classification.confidence}`);
    }
    if (!isNonEmptyString(classification.reason)) errors.push('classification.reason이 비어 있습니다.');
  }

  const priority = result.recommendedPriority;
  if (!priority || typeof priority.value !== 'number') {
    errors.push('recommendedPriority.value가 숫자가 아닙니다.');
  }

  if (!Array.isArray(result.warnings)) errors.push('warnings는 배열이어야 합니다.');

  return { ok: errors.length === 0, errors };
}
