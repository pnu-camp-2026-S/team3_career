// 프로젝트 단위 AI 분석 라우트.
// POST: 프로젝트의 미분석 파일만 파일별 요약(L1)을 보강하고, 프로젝트 종합(L2)으로
//       summary.md/index.json/log.md 3종 산출물을 각각 생성해 project_analyses(scope='project')에 저장.
//       마지막 L2 이후 새로 생성·수정된 L1이 없으면 재분석 없이 기존 산출물을 반환한다(unchanged: true).
// GET: 저장된 프로젝트 종합(3종 + 수정 플래그)과 파일별 분석 상태를 반환한다(화면 복원용).
// PATCH: 프로젝트 산출물(summary|index|log) 한 개만 수정하고 수정 플래그를 세운다(개별 수정·수정본 보존).

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../../lib/supabase-server';
import { resolveProvider } from '../../../../ai_analysis/ai-client.mjs';
import { aggregateProjectAnalyses } from '../../../../ai_analysis/aggregate.mjs';
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

// folder_label('프로젝트 / 세부폴더')에서 세부 폴더 라벨만 뽑아낸다.
function subfolderLabelFromRow(row) {
  const label = String(row.folder_label || '');
  const parts = label.split(' / ');
  return parts.length > 1 ? parts.slice(1).join(' / ') : label;
}

// project_id 컬럼과 레거시 folder_id('프로젝트id' 또는 '프로젝트id::sub번호') 모두 매칭한다.
function projectFilesQuery(supabase, userId, projectId) {
  return supabase
    .from('activity_files')
    .select('id, project_id, folder_id, folder_label, file_name, mime_type, storage_bucket, storage_path, updated_at')
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

    // 완료·수정된 분석은 건너뛰고(수정본 보존), 신규/수정 파일만 새로 요약한다.
    // 단, 실제 provider 사용 중 기존 결과가 mock이면 stale로 보고 재분석한다.
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

    // 변경 감지(#268): 새로 요약할 파일이 없고, 마지막 프로젝트 종합(L2) 이후 수정된
    // 파일 요약(L1)도 없으면 기존 L2 산출물을 그대로 유지하고 AI 재분석을 건너뛴다.
    if (pendingFiles.length === 0) {
      const { data: aggregateRow, error: aggregateError } = await supabase
        .from('project_analyses')
        .select('result, updated_at')
        .eq('user_id', user.id)
        .eq('scope', 'project')
        .eq('project_id', projectId)
        .maybeSingle();
      if (aggregateError) return Response.json({ message: aggregateError.message }, { status: 500 });

      const latestFileAnalysisAt = (analysisRows || []).reduce((latest, row) => {
        const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
        return Math.max(latest, updatedAt);
      }, 0);
      const aggregateUpdatedAt = aggregateRow?.updated_at
        ? new Date(aggregateRow.updated_at).getTime()
        : 0;
      const aggregateIsStaleMock =
        currentProvider !== 'mock' && aggregateRow?.result?.provider === 'mock';
      const unchanged = Boolean(aggregateRow?.result)
        && !aggregateIsStaleMock
        && aggregateUpdatedAt >= latestFileAnalysisAt;

      if (unchanged) {
        return Response.json({
          ok: true,
          unchanged: true,
          analyzedCount: 0,
          failedCount: 0,
          skippedCount: projectFiles.length,
          files: [],
          project: aggregateRow.result,
          projectReason: null,
          errors: [],
        });
      }
    }

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId });
    const storage = (createSupabaseAdminClient() || supabase).storage;

    const { analyzedCount, failedCount, fileResults } = await analyzeActivityFileRows({
      storage,
      repository,
      rows: pendingFiles,
      resolveProject: () => ({ projectType, projectName, projectId }),
    });

    // index.json에 넣을 파일 구조(세부 폴더 · 파일명 · 파일 id).
    const fileEntries = projectFiles.map((row) => ({
      activityFileId: row.id,
      fileName: row.file_name,
      folderId: row.folder_id,
      folderLabel: subfolderLabelFromRow(row),
    }));

    // 기존 완료 분석 + 이번에 성공한 분석을 모두 입력으로 프로젝트 종합을 갱신한다.
    const aggregateOutcome = await aggregateProjectAnalyses({
      repository,
      project: { projectId, projectName, projectType },
      fileEntries,
    });

    return Response.json({
      ok: true,
      analyzedCount,
      failedCount,
      skippedCount: Math.max(projectFiles.length - pendingFiles.length, 0),
      files: fileResults,
      project: aggregateOutcome.ok ? aggregateOutcome.result : null,
      projectReason: aggregateOutcome.ok ? null : aggregateOutcome.reason,
      errors: aggregateOutcome.errors || [],
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
    const project = await repository.getAggregateResult();

    const { data: statuses, error } = await supabase
      .from('file_analyses')
      .select('activity_file_id, status')
      .eq('user_id', user.id)
      .eq('project_id', projectId);
    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({
      project,
      files: (statuses || []).map((row) => ({
        activityFileId: row.activity_file_id,
        status: row.status,
      })),
    });
  } catch (error) {
    return Response.json({ message: error.message || '분석 결과를 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const projectId = String(body.projectId || '').trim();
    const artifact = String(body.artifact || '').trim();

    if (!projectId || !['summary', 'index', 'log'].includes(artifact)) {
      return Response.json({ message: 'projectId and valid artifact are required' }, { status: 400 });
    }

    // index.json은 유효한 JSON이어야 저장한다(객체/문자열 모두 허용).
    let content = body.content;
    if (artifact === 'index') {
      try {
        content = typeof content === 'string' ? JSON.parse(content) : content;
      } catch (parseError) {
        return Response.json({ message: 'index.json이 유효한 JSON이 아닙니다.' }, { status: 400 });
      }
    } else {
      content = String(content ?? '');
    }

    const repository = new DbAnalysisRepository({ supabase, userId: user.id, projectId });
    const existing = await repository.getAggregateResult();
    if (!existing) {
      return Response.json({ message: '저장된 프로젝트 종합이 없습니다. 먼저 분석하기를 실행해주세요.' }, { status: 404 });
    }

    const updated = await repository.saveProjectArtifact({ artifact, content });
    return Response.json({ ok: true, project: updated });
  } catch (error) {
    return Response.json({ message: error.message || '프로젝트 산출물을 수정하지 못했습니다.' }, { status: 500 });
  }
}
