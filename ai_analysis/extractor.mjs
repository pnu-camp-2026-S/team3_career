// 파일 유형별 텍스트 추출기. docs/single-file-ai-analysis-mvp.md §7 기준.
// 1차 지원: md, txt, csv, pdf, docx. (pptx·이미지는 미지원 → warnings)
// 추출 실패는 업로드 실패가 아니며, 분석 상태만 failed로 처리한다.

const MAX_CONTENT_CHARS = 24000;
const PREVIEW_CHARS = 300;

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function truncate(text) {
  if (text.length <= MAX_CONTENT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_CONTENT_CHARS), truncated: true };
}

function baseStats(text) {
  return {
    characterCount: text.length,
    wordCount: countWords(text),
    pageCount: null,
    slideCount: null,
    rowCount: null,
  };
}

async function extractPlainText(buffer) {
  const text = buffer.toString('utf8');
  return { text, stats: baseStats(text) };
}

async function extractCsv(buffer) {
  const raw = buffer.toString('utf8');
  const lines = raw.split(/\r?\n/);
  const header = lines[0] || '';
  const preview = lines.slice(0, 50).join('\n');
  const text = `컬럼 구조: ${header}\n\n앞부분 데이터:\n${preview}`;
  const stats = baseStats(text);
  stats.rowCount = Math.max(lines.filter(Boolean).length - 1, 0);
  return { text, stats };
}

async function extractPdf(buffer) {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const stats = baseStats(result.text || '');
    stats.pageCount = result.total ?? result.pages?.length ?? null;
    return { text: result.text || '', stats };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer) {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value || '', stats: baseStats(result.value || '') };
}

const EXTRACTORS = {
  txt: extractPlainText,
  md: extractPlainText,
  csv: extractCsv,
  pdf: extractPdf,
  docx: extractDocx,
};

export const SUPPORTED_EXTENSIONS = Object.keys(EXTRACTORS);

export async function extractContent({ fileId, analysisId, extension, buffer }) {
  const normalized = String(extension || '').toLowerCase().replace(/^\./, '');
  const extractor = EXTRACTORS[normalized];

  const base = {
    fileId,
    analysisId,
    extractionStatus: 'failed',
    contentText: '',
    contentPreview: '',
    contentStats: baseStats(''),
    warnings: [],
  };

  if (!extractor) {
    base.warnings.push(`지원하지 않는 파일 형식입니다: .${normalized} (지원: ${SUPPORTED_EXTENSIONS.join(', ')})`);
    return base;
  }

  try {
    const { text, stats } = await extractor(buffer);
    const trimmed = text.trim();
    if (!trimmed) {
      base.warnings.push('추출된 텍스트가 비어 있습니다.');
      return base;
    }

    const { text: bounded, truncated } = truncate(trimmed);
    if (truncated) {
      base.warnings.push(`본문이 길어 앞 ${MAX_CONTENT_CHARS}자만 분석에 사용합니다.`);
    }

    return {
      ...base,
      extractionStatus: 'completed',
      contentText: bounded,
      contentPreview: bounded.slice(0, PREVIEW_CHARS),
      contentStats: stats,
    };
  } catch (error) {
    base.warnings.push(`텍스트 추출 중 오류가 발생했습니다: ${error.message}`);
    return base;
  }
}
