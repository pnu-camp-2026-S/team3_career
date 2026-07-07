import { LocalAnalysisRepository } from '../../../../lib/analysis/repository.mjs';
import { aggregateAnalyses } from '../../../../lib/analysis/aggregate.mjs';

export const runtime = 'nodejs';

// 저장된 모든 단일 파일 분석 결과를 종합해 메인 키워드 개요와
// 포트폴리오 강조 키워드를 생성한다.
export async function POST() {
  try {
    const repository = new LocalAnalysisRepository();
    const output = await aggregateAnalyses({ repository });

    if (!output.ok) {
      const status = output.reason === 'no_data' ? 200 : 502;
      return Response.json(
        { ok: false, reason: output.reason, errors: output.errors || [] },
        { status }
      );
    }

    return Response.json({ ok: true, provider: output.provider, result: output.result });
  } catch (error) {
    console.error('aggregate analysis error:', error);
    return Response.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}

// 마지막 종합 결과 조회 (화면 새로고침 시 복원용)
export async function GET() {
  try {
    const repository = new LocalAnalysisRepository();
    const result = await repository.getAggregateResult();
    if (!result) {
      return Response.json({ ok: false, reason: 'no_data' });
    }
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error('aggregate lookup error:', error);
    return Response.json({ ok: false, reason: 'server_error' }, { status: 500 });
  }
}
