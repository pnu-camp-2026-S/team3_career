// fileId / analysisId 생성기.
// DB가 생기면 auto increment 또는 UUID 컬럼으로 교체될 수 있으므로
// 형식 자체에 의존하는 코드를 만들지 않는다.

function datePart(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function randomPart() {
  return Math.random().toString(16).slice(2, 8);
}

export function createFileId(now = new Date()) {
  return `file_${datePart(now)}_${randomPart()}`;
}

export function createAnalysisId(now = new Date()) {
  return `analysis_${datePart(now)}_${randomPart()}`;
}

export function createEventId(sequence) {
  return `event_${String(sequence).padStart(3, '0')}`;
}
