import {
  buildMockPortfolioResponse,
  buildPortfolioPrompt,
  generateOpenAiJson,
  getPortfolioSchema,
  isAnalysisMockEnabled,
  normalizePortfolioResponse,
} from '../../../../lib/openai-portfolio';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

// 선택한 프로젝트 폴더의 파일별 요약(file_analyses.summary_md)을 조회한다.
// 인증 실패/데이터 없음/예외 시에는 빈 배열을 반환해 기존 생성 흐름을 유지한다.
async function loadFolderFileSummaries(projectIds) {
  const ids = [...new Set((Array.isArray(projectIds) ? projectIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
  if (!ids.length) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const [
      { data: files, error: filesError },
      { data: analyses, error: analysesError },
    ] = await Promise.all([
      supabase
        .from('activity_files')
        .select('id, project_id, file_name, folder_label')
        .eq('user_id', user.id)
        .in('project_id', ids),
      supabase
        .from('file_analyses')
        .select('activity_file_id, project_id, summary_md')
        .eq('user_id', user.id)
        .in('project_id', ids),
    ]);

    if (filesError || analysesError) return [];

    const summaryByFileId = new Map(
      (analyses || [])
        .filter((row) => row.summary_md)
        .map((row) => [row.activity_file_id, row.summary_md])
    );

    const byProject = new Map();
    (files || []).forEach((file) => {
      const summary = summaryByFileId.get(file.id);
      if (!summary) return;

      const projectId = String(file.project_id || '');
      if (!byProject.has(projectId)) {
        byProject.set(projectId, {
          projectId,
          label: file.folder_label || projectId,
          files: [],
        });
      }
      byProject.get(projectId).files.push({
        name: file.file_name || '이름 없는 파일',
        summary,
      });
    });

    return [...byProject.values()].filter((project) => project.files.length);
  } catch (error) {
    console.warn('폴더 파일 요약 로드 실패:', error.message);
    return [];
  }
}

export async function POST(request) {
  try {
    const {
      format,
      purpose,
      major,
      experiences = [],
      experienceProjects = [],
      projectIds = [],
      keywords = [],
      myPageInfo = {},
    } = await request.json();

    if (!format || !purpose || !major) {
      return Response.json(
        { success: false, error: '포트폴리오 형식, 목적, 전공 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const folderFileSummaries = await loadFolderFileSummaries(projectIds);
    const context = {
      format,
      purpose,
      major,
      experiences,
      experienceProjects,
      folderFileSummaries,
      keywords,
      myPageInfo,
    };
    if (isAnalysisMockEnabled()) {
      return Response.json({
        success: true,
        data: buildMockPortfolioResponse(format, context),
        provider: 'mock',
      });
    }

    const prompt = buildPortfolioPrompt(context);
    const rawData = await generateOpenAiJson(prompt, getPortfolioSchema(format));
    const data = normalizePortfolioResponse(format, rawData, context);

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('OpenAI portfolio generate error:', error);
    return Response.json(
      { success: false, error: error.message || '포트폴리오 생성 중 오류가 발생했습니다.' },
      { status: error.statusCode || 500 }
    );
  }
}
