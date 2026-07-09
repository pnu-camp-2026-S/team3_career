// AI 분석 결과 검증기. 잘못된 응답은 저장하지 않고 analysisStatus를 failed로 처리한다.

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value, min, max) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => isNonEmptyString(item))
  );
}

// 메인 종합(모든 프로젝트) 결과 검증
export function validateAggregateResult(result) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['종합 분석 결과가 객체가 아닙니다.'] };
  }

  if (!isNonEmptyString(result.headline)) errors.push('headline이 비어 있습니다.');
  if (!isNonEmptyString(result.description)) errors.push('description이 비어 있습니다.');
  if (!isNonEmptyString(result.activityOverview)) errors.push('activityOverview가 비어 있습니다.');
  if (!isStringArray(result.activityKeywords, 1, 8)) {
    errors.push('activityKeywords는 1~8개의 문자열 배열이어야 합니다.');
  }
  if (!isStringArray(result.portfolioKeywords, 1, 12)) {
    errors.push('portfolioKeywords는 1~12개의 문자열 배열이어야 합니다.');
  }
  if (result.projects !== undefined && !Array.isArray(result.projects)) {
    errors.push('projects는 배열이어야 합니다.');
  }
  if (!Array.isArray(result.warnings)) errors.push('warnings는 배열이어야 합니다.');

  return { ok: errors.length === 0, errors };
}

// 프로젝트 종합(한 프로젝트) 결과 검증
export function validateProjectAnalysisResult(result) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['프로젝트 종합 결과가 객체가 아닙니다.'] };
  }

  if (!isNonEmptyString(result.headline)) errors.push('headline이 비어 있습니다.');
  if (!isNonEmptyString(result.description)) errors.push('description이 비어 있습니다.');
  if (result.subfolderHighlights !== undefined && !Array.isArray(result.subfolderHighlights)) {
    errors.push('subfolderHighlights는 배열이어야 합니다.');
  }
  if (!isStringArray(result.activityKeywords, 1, 8)) {
    errors.push('activityKeywords는 1~8개의 문자열 배열이어야 합니다.');
  }
  if (!isStringArray(result.portfolioKeywords, 1, 12)) {
    errors.push('portfolioKeywords는 1~12개의 문자열 배열이어야 합니다.');
  }
  if (!Array.isArray(result.warnings)) errors.push('warnings는 배열이어야 합니다.');

  return { ok: errors.length === 0, errors };
}

// 파일 단위 분석 결과 검증
export function validateAnalysisResult(result, { fileId, analysisId }) {
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

  const priority = result.recommendedPriority;
  if (!priority || typeof priority.value !== 'number') {
    errors.push('recommendedPriority.value가 숫자가 아닙니다.');
  }

  if (!Array.isArray(result.warnings)) errors.push('warnings는 배열이어야 합니다.');

  return { ok: errors.length === 0, errors };
}
