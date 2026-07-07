import { LocalAnalysisRepository } from '../../../../lib/analysis/repository.mjs';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  try {
    const { analysisId } = await params;

    if (!/^analysis_[a-z0-9_]+$/i.test(analysisId || '')) {
      return Response.json({ ok: false, error: '올바르지 않은 analysisId입니다.' }, { status: 400 });
    }

    const repository = new LocalAnalysisRepository();
    const bundle = await repository.getAnalysisBundle(analysisId);

    if (!bundle) {
      return Response.json({ ok: false, error: '분석 결과를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ ok: true, ...bundle });
  } catch (error) {
    console.error('analysis bundle error:', error);
    return Response.json({ ok: false, error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
