import { LocalAnalysisRepository } from '../../../../lib/analysis/repository.mjs';
import { analyzeSingleFile } from '../../../../lib/analysis/service.mjs';
import { SUPPORTED_EXTENSIONS } from '../../../../lib/analysis/extractor.mjs';
import { PROJECT_SUBFOLDER_MAP } from '../../../../lib/analysis/subfolder-config.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const projectType = String(formData.get('projectType') || 'personal');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ ok: false, error: '파일을 첨부해주세요.' }, { status: 400 });
    }

    if (!Object.prototype.hasOwnProperty.call(PROJECT_SUBFOLDER_MAP, projectType)) {
      return Response.json({ ok: false, error: `알 수 없는 프로젝트 유형입니다: ${projectType}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return Response.json({ ok: false, error: '빈 파일은 분석할 수 없습니다.' }, { status: 400 });
    }

    const repository = new LocalAnalysisRepository();
    const output = await analyzeSingleFile({
      originalFileName: file.name || 'unnamed',
      buffer,
      mimeType: file.type || 'application/octet-stream',
      projectType,
      repository,
    });

    if (!output.ok) {
      return Response.json(
        {
          ok: false,
          stage: output.stage,
          fileId: output.fileId,
          analysisId: output.analysisId,
          errors: output.errors,
          supportedExtensions: SUPPORTED_EXTENSIONS,
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      provider: output.provider,
      fileId: output.fileId,
      analysisId: output.analysisId,
      metadata: output.metadata,
      analysisResult: output.analysisResult,
      summaryMarkdown: output.summaryMarkdown,
      indexDraft: output.indexDraft,
      logMarkdown: output.logMarkdown,
    });
  } catch (error) {
    console.error('single-file analysis error:', error);
    return Response.json({ ok: false, error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
