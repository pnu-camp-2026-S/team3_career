import dotenv from 'dotenv';
import path from 'path';
import { POST as exportPortfolioPptx } from '../export-pptx/route';

const envPath = path.join(process.cwd(), 'key.env');
dotenv.config({ path: envPath, override: false, quiet: true });

export const runtime = 'nodejs';
export const maxDuration = 60;

const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const PDF_MIME_TYPE = 'application/pdf';
const DEFAULT_TIMEOUT_MS = 45_000;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function safeFileName(value) {
  return normalizeText(value || 'myfitfolio-portfolio')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 90) || 'myfitfolio-portfolio';
}

function getConverterUrl() {
  const rawUrl = normalizeText(process.env.PORTFOLIO_CONVERTER_URL);
  if (!rawUrl) return '';

  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PORTFOLIO_CONVERTER_URL must be an HTTP(S) URL.');
  }
  return url.toString();
}

function getConverterTimeoutMs() {
  const value = Number(process.env.PORTFOLIO_CONVERTER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

async function createPptxBuffer(portfolio, requestUrl) {
  const exportResponse = await exportPortfolioPptx(new Request(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(portfolio),
  }));

  if (!exportResponse.ok) {
    const payload = await exportResponse.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || 'PPTX 생성에 실패했습니다.');
  }

  return exportResponse.arrayBuffer();
}

function createConverterFormData(portfolio, pptxBuffer) {
  const title = safeFileName(portfolio.title || portfolio.format);
  const formData = new FormData();
  formData.append('file', new Blob([pptxBuffer], { type: PPTX_MIME_TYPE }), `${title}.pptx`);
  formData.append('source', 'myfitfolio');
  formData.append('title', normalizeText(portfolio.title));
  formData.append('format', normalizeText(portfolio.format));
  return formData;
}

async function resolveConverterResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    const pdfUrl = normalizeText(payload.pdfUrl || payload.url);
    if (!pdfUrl) throw new Error(payload.message || '변환 워커가 PDF URL을 반환하지 않았습니다.');
    return Response.json({
      pdfUrl,
      expiresAt: payload.expiresAt || null,
    });
  }

  const pdfBuffer = await response.arrayBuffer();
  const pdfHeader = new Uint8Array(pdfBuffer.slice(0, 4));
  const isPdf = pdfHeader.length === 4
    && pdfHeader[0] === 0x25
    && pdfHeader[1] === 0x50
    && pdfHeader[2] === 0x44
    && pdfHeader[3] === 0x46;
  if (!contentType.toLowerCase().includes(PDF_MIME_TYPE) || !isPdf) {
    throw new Error('변환 워커가 유효한 PDF를 반환하지 않았습니다.');
  }

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': PDF_MIME_TYPE,
      'Content-Disposition': 'inline; filename="myfitfolio-portfolio.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request) {
  let timeoutId;
  let requestAbortHandler;

  try {
    const converterUrl = getConverterUrl();
    if (!converterUrl) {
      return Response.json({
        message: 'PORTFOLIO_CONVERTER_URL 환경변수가 설정되지 않았습니다.',
      }, { status: 503 });
    }

    const portfolio = await request.json();
    if (!portfolio || typeof portfolio !== 'object') {
      return Response.json({ message: '포트폴리오 데이터가 필요합니다.' }, { status: 400 });
    }

    const pptxBuffer = await createPptxBuffer(portfolio, request.url);
    const formData = createConverterFormData(portfolio, pptxBuffer);
    const controller = new AbortController();
    requestAbortHandler = () => controller.abort();
    if (request.signal.aborted) {
      controller.abort();
    } else {
      request.signal.addEventListener('abort', requestAbortHandler, { once: true });
    }
    timeoutId = setTimeout(() => controller.abort(), getConverterTimeoutMs());

    const headers = {};
    if (process.env.PORTFOLIO_CONVERTER_TOKEN) {
      headers.Authorization = `Bearer ${process.env.PORTFOLIO_CONVERTER_TOKEN}`;
    }

    const response = await fetch(converterUrl, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return Response.json({
        message: payload.message || `PDF 변환 워커 요청에 실패했습니다. (${response.status})`,
      }, { status: 502 });
    }

    return resolveConverterResponse(response);
  } catch (error) {
    console.error('Portfolio PDF render error:', error);
    const isTimeout = error.name === 'AbortError';
    return Response.json({
      message: isTimeout
        ? 'PDF 변환 시간이 초과되었습니다.'
        : error.message || 'PDF 미리보기 생성 중 오류가 발생했습니다.',
    }, { status: isTimeout ? 504 : 500 });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (requestAbortHandler) request.signal.removeEventListener('abort', requestAbortHandler);
  }
}
