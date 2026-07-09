// 사용자 전체 종합 분석 라우트(메인 키워드 개요 + 포트폴리오 강조 키워드).
// POST: 사용자의 프로젝트 종합을 모아 전체 개요를 만들고 project_analyses(scope='user')에 저장.
// GET: 저장된 마지막 종합 결과 조회(메인 새로고침 복원용).

import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { aggregateMainOverview } from '../../../../ai_analysis/aggregate.mjs';
import { DbAnalysisRepository } from '../../../../ai_analysis/db-repository.mjs';

export const maxDuration = 120;

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const projectIds = Array.isArray(body.projectIds)
      ? body.projectIds.map((id) => String(id)).filter(Boolean)
      : null;
    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId: null });
    const outcome = await aggregateMainOverview({ repository, projectIds });

    if (!outcome.ok) {
      return Response.json({ ok: false, reason: outcome.reason, errors: outcome.errors || [] });
    }

    return Response.json({ ok: true, result: outcome.result });
  } catch (error) {
    return Response.json({ message: error.message || '종합 분석에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId: null });
    const result = await repository.getAggregateResult();

    return Response.json({ result });
  } catch (error) {
    return Response.json({ message: error.message || '종합 결과를 불러오지 못했습니다.' }, { status: 500 });
  }
}
