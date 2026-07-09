// 파일 단위 AI 분석 라우트.
// POST: 방금 업로드된 파일들(activityFileIds)의 summary.md를 자동 생성한다(비동기 호출용).
//       이미 완료·수정된 파일은 건너뛴다(수정본 보존).
// PATCH: 파일 summary.md를 사용자가 직접 수정해 저장한다.

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../../lib/supabase-server';
import { resolveProvider } from '../../../../ai_analysis/ai-client.mjs';
import { analyzeActivityFileRows } from '../../../../ai_analysis/analyze-activity-files.mjs';
import { DbAnalysisRepository } from '../../../../ai_analysis/db-repository.mjs';
import { PROJECT_TYPE_LABELS } from '../../../../ai_analysis/subfolder-config.mjs';

export const maxDuration = 300;

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

function normalizeProjectType(projectType) {
  return Object.prototype.hasOwnProperty.call(PROJECT_TYPE_LABELS, projectType)
    ? projectType
    : 'other';
}

function projectNameFromRow(row) {
  const parts = String(row.folder_label || '').split(' / ');
  return parts[0] || row.project_id || row.folder_id || '';
}

function isAnalysisCurrent(fileRow, analysisRow) {
  if (!analysisRow || analysisRow.status !== 'completed') return false;
  const fileUpdatedAt = fileRow.updated_at ? new Date(fileRow.updated_at).getTime() : 0;
  const analysisUpdatedAt = analysisRow.updated_at ? new Date(analysisRow.updated_at).getTime() : 0;
  return analysisUpdatedAt >= fileUpdatedAt;
}

function includesMockText(value) {
  return String(value || '').toLowerCase().includes('mock')
    || String(value || '').includes('모의');
}

function isMockAnalysisRow(row) {
  const result = row?.analysis_result || {};
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  return row?.provider === 'mock'
    || result.provider === 'mock'
    || warnings.some(includesMockText)
    || includesMockText(result.fileSummary?.oneLine)
    || includesMockText(result.fileSummary?.detailed);
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const activityFileIds = Array.isArray(body.activityFileIds)
      ? body.activityFileIds.map((id) => String(id)).filter(Boolean)
      : [];

    if (!activityFileIds.length) {
      return Response.json({ message: 'activityFileIds is required' }, { status: 400 });
    }

    const { data: fileRows, error: filesError } = await supabase
      .from('activity_files')
      .select('id, project_id, folder_id, folder_type, folder_label, file_name, mime_type, storage_bucket, storage_path, updated_at')
      .eq('user_id', user.id)
      .in('id', activityFileIds);
    if (filesError) return Response.json({ message: filesError.message }, { status: 500 });

    if (!fileRows?.length) {
      return Response.json({ ok: true, analyzedCount: 0, failedCount: 0, skippedCount: 0, files: [] });
    }

    // 이미 완료·수정된 분석은 건너뛴다(수정본 보존).
    const { data: analysisRows, error: analysisError } = await supabase
      .from('file_analyses')
      .select('activity_file_id, status, updated_at, provider, analysis_result')
      .eq('user_id', user.id)
      .in('activity_file_id', activityFileIds);
    if (analysisError) return Response.json({ message: analysisError.message }, { status: 500 });

    const analysisByFileId = new Map((analysisRows || []).map((row) => [row.activity_file_id, row]));
    const currentProvider = resolveProvider();
    const pendingFiles = fileRows.filter((row) => {
      const analysisRow = analysisByFileId.get(row.id);
      if (currentProvider !== 'mock' && isMockAnalysisRow(analysisRow)) return true;
      return !isAnalysisCurrent(row, analysisRow);
    });

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId: null });
    const storage = (createSupabaseAdminClient() || supabase).storage;

    const { analyzedCount, failedCount, fileResults } = await analyzeActivityFileRows({
      storage,
      repository,
      rows: pendingFiles,
      resolveProject: (row) => ({
        projectType: normalizeProjectType(row.folder_type),
        projectName: projectNameFromRow(row),
        projectId: row.project_id || row.folder_id,
      }),
    });

    return Response.json({
      ok: true,
      analyzedCount,
      failedCount,
      skippedCount: Math.max(fileRows.length - pendingFiles.length, 0),
      files: fileResults,
    });
  } catch (error) {
    return Response.json({ message: error.message || '파일 분석에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const activityFileId = String(body.activityFileId || '').trim();
    const summaryMd = String(body.summaryMd ?? '');

    if (!activityFileId) {
      return Response.json({ message: 'activityFileId is required' }, { status: 400 });
    }

    const { data: existing, error: readError } = await supabase
      .from('file_analyses')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('activity_file_id', activityFileId)
      .maybeSingle();
    if (readError) return Response.json({ message: readError.message }, { status: 500 });
    if (!existing) {
      return Response.json({ message: '저장된 요약이 없습니다. 먼저 요약을 생성해주세요.' }, { status: 404 });
    }

    const metadata = {
      ...(existing.metadata || {}),
      summaryReviewStatus: 'user_edited',
      summaryEditedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('file_analyses')
      .update({ summary_md: summaryMd, metadata, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('activity_file_id', activityFileId);
    if (updateError) return Response.json({ message: updateError.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error.message || '요약을 수정하지 못했습니다.' }, { status: 500 });
  }
}
