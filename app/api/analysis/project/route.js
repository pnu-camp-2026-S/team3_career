// 프로젝트 단위 AI 분석 라우트.
// POST: 프로젝트의 신규/변경 파일만 단일 파일 분석을 실행하고, 기존 결과와 합쳐
//       프로젝트 종합(project_analyses, scope='project')을 갱신한다.
// GET: 저장된 프로젝트 종합 결과와 파일별 분석 상태를 반환한다(화면 복원용).

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../../lib/supabase-server';
import { resolveProvider } from '../../../../ai_analysis/ai-client.mjs';
import { analyzeSingleFile } from '../../../../ai_analysis/service.mjs';
import { aggregateAnalyses } from '../../../../ai_analysis/aggregate.mjs';
import { DbAnalysisRepository } from '../../../../ai_analysis/db-repository.mjs';
import { PROJECT_TYPE_LABELS } from '../../../../ai_analysis/subfolder-config.mjs';

export const maxDuration = 300;

const ACTIVITY_FILE_BUCKET = 'activity-files';

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

// project_id 컬럼과 레거시 folder_id('프로젝트id' 또는 '프로젝트id::sub번호') 모두 매칭한다.
function projectFilesQuery(supabase, userId, projectId) {
  return supabase
    .from('activity_files')
    .select('id, project_id, folder_id, file_name, mime_type, storage_bucket, storage_path, updated_at')
    .eq('user_id', userId)
    .or(`project_id.eq.${projectId},folder_id.eq.${projectId},folder_id.like.${projectId}::*`)
    .order('created_at', { ascending: true });
}

function isAnalysisCurrent(fileRow, analysisRow) {
  if (!analysisRow) return false;
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
    const projectId = String(body.projectId || '').trim();
    const projectType = normalizeProjectType(String(body.projectType || ''));
    const projectName = String(body.projectName || projectId);

    if (!projectId) {
      return Response.json({ message: 'projectId is required' }, { status: 400 });
    }

    const { data: projectFiles, error: filesError } = await projectFilesQuery(
      supabase,
      user.id,
      projectId
    );
    if (filesError) return Response.json({ message: filesError.message }, { status: 500 });

    if (!projectFiles?.length) {
      return Response.json({ ok: false, reason: 'no_data' });
    }

    // 변경되지 않은 완료 분석은 건너뛰고, 신규/수정 파일만 새로 분석한다.
    const { data: analysisRows, error: completedError } = await supabase
      .from('file_analyses')
      .select('activity_file_id, updated_at, provider, analysis_result')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('status', 'completed');
    if (completedError) return Response.json({ message: completedError.message }, { status: 500 });

    const analysisByFileId = new Map((analysisRows || []).map((row) => [row.activity_file_id, row]));
    const currentProvider = resolveProvider();
    const pendingFiles = projectFiles.filter((row) => {
      const analysisRow = analysisByFileId.get(row.id);
      if (currentProvider !== 'mock' && isMockAnalysisRow(analysisRow)) return true;
      return !isAnalysisCurrent(row, analysisRow);
    });

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId });
    const storage = (createSupabaseAdminClient() || supabase).storage;

    const fileResults = [];
    let analyzedCount = 0;
    let failedCount = 0;

    for (const row of pendingFiles) {
      const fileRepository = repository.forActivityFile(row);
      try {
        const { data: blob, error: downloadError } = await storage
          .from(row.storage_bucket || ACTIVITY_FILE_BUCKET)
          .download(row.storage_path);
        if (downloadError) throw new Error(`원본 파일을 내려받지 못했습니다: ${downloadError.message}`);

        const buffer = Buffer.from(await blob.arrayBuffer());
        const outcome = await analyzeSingleFile({
          originalFileName: row.file_name,
          buffer,
          mimeType: row.mime_type || 'application/octet-stream',
          projectType,
          projectId,
          projectName,
          repository: fileRepository,
        });

        if (outcome.ok) {
          analyzedCount += 1;
          fileResults.push({ activityFileId: row.id, name: row.file_name, ok: true, errors: [] });
        } else {
          failedCount += 1;
          await fileRepository
            .saveFailureDetails({ stage: outcome.stage, errors: outcome.errors })
            .catch(() => {});
          fileResults.push({
            activityFileId: row.id,
            name: row.file_name,
            ok: false,
            errors: outcome.errors || [],
          });
        }
      } catch (error) {
        failedCount += 1;
        await fileRepository
          .saveFailureDetails({ stage: 'pipeline', errors: [error.message] })
          .catch(() => {});
        fileResults.push({
          activityFileId: row.id,
          name: row.file_name,
          ok: false,
          errors: [error.message],
        });
      }
    }

    // 기존 완료 분석 + 이번에 성공한 분석을 모두 입력으로 프로젝트 종합을 갱신한다.
    const aggregateOutcome = await aggregateAnalyses({ repository });

    return Response.json({
      ok: true,
      analyzedCount,
      failedCount,
      skippedCount: Math.max(projectFiles.length - pendingFiles.length, 0),
      files: fileResults,
      aggregate: aggregateOutcome.ok ? aggregateOutcome.result : null,
      aggregateReason: aggregateOutcome.ok ? null : aggregateOutcome.reason,
    });
  } catch (error) {
    return Response.json({ message: error.message || '프로젝트 분석에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) {
      return Response.json({ message: 'projectId is required' }, { status: 400 });
    }

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId });
    const aggregate = await repository.getAggregateResult();

    const { data: statuses, error } = await supabase
      .from('file_analyses')
      .select('activity_file_id, status')
      .eq('user_id', user.id)
      .eq('project_id', projectId);
    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({
      aggregate,
      files: (statuses || []).map((row) => ({
        activityFileId: row.activity_file_id,
        status: row.status,
      })),
    });
  } catch (error) {
    return Response.json({ message: error.message || '분석 결과를 불러오지 못했습니다.' }, { status: 500 });
  }
}
