import {
  buildMockPortfolioResponse,
  buildPortfolioPrompt,
  generateOpenAiJson,
  getPortfolioSchema,
  isAnalysisMockEnabled,
  normalizePortfolioResponse,
} from '../../../../lib/openai-portfolio';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

const PROFILE_COLUMNS = 'name, gender, birth_date, email, phone, address, educations, preferences, chips, updated_at';
const FOLDER_COLUMNS = 'id, label';
const PROJECT_ANALYSIS_COLUMNS = 'project_id, result, provider, based_on_count, updated_at';

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toClientProfile(row) {
  if (!row) return {};

  return {
    name: row.name || '',
    gender: row.gender || '',
    birthDate: row.birth_date || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    educations: normalizeArray(row.educations),
    preferences: normalizeObject(row.preferences),
    chips: normalizeObject(row.chips),
    updatedAt: row.updated_at || null,
  };
}

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

function normalizeKeywordList(items) {
  return [...new Set(normalizeArray(items)
    .map((item) => String(item || '').replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter(Boolean))]
    .slice(0, 12);
}

function extractMarkdownListSection(markdown, headingMatchers) {
  const lines = String(markdown || '').split(/\r?\n/);
  const startIndex = lines.findIndex((line) => (
    /^##\s+/.test(line) && headingMatchers.some((matcher) => matcher.test(line))
  ));

  if (startIndex < 0) return [];

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line)) break;
    sectionLines.push(line);
  }

  return normalizeKeywordList(
    sectionLines
      .map((line) => line.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1] || '')
      .filter(Boolean)
  );
}

function buildSummaryKeywords(result) {
  const summaryMd = result?.summaryMd || '';
  const portfolioSummaryKeywords = extractMarkdownListSection(summaryMd, [
    /포트폴리오.*키워드/,
    /portfolio.*keyword/i,
  ]);
  if (portfolioSummaryKeywords.length) return portfolioSummaryKeywords;

  const activitySummaryKeywords = extractMarkdownListSection(summaryMd, [
    /강점.*키워드/,
    /activity.*keyword/i,
  ]);
  if (activitySummaryKeywords.length) return activitySummaryKeywords;

  return normalizeKeywordList(result?.portfolioKeywords).length
    ? normalizeKeywordList(result?.portfolioKeywords)
    : normalizeKeywordList(result?.activityKeywords);
}

function mapProjectAnalysis(row, folderById) {
  const result = normalizeObject(row?.result);
  const projectId = String(row?.project_id || '');
  const folder = folderById.get(projectId) || {};

  return {
    projectId,
    projectName: result.projectName || folder.label || projectId,
    headline: result.headline || '',
    description: result.description || '',
    summaryMd: result.summaryMd || '',
    summaryKeywords: buildSummaryKeywords(result),
    activityKeywords: normalizeKeywordList(result.activityKeywords),
    portfolioKeywords: normalizeKeywordList(result.portfolioKeywords),
    basedOnCount: row?.based_on_count ?? result.basedOnCount ?? 0,
    provider: row?.provider || result.provider || null,
    updatedAt: row?.updated_at || result.generatedAt || null,
  };
}

async function loadServerPortfolioContext(projectIds) {
  const ids = [...new Set((Array.isArray(projectIds) ? projectIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];

  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return { myPageInfo: {}, experienceProjects: [], folderFileSummaries: [] };

    const profilePromise = supabase
      .from('user_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', user.id)
      .maybeSingle();

    const foldersPromise = ids.length
      ? supabase
        .from('activity_folders')
        .select(FOLDER_COLUMNS)
        .eq('user_id', user.id)
        .in('id', ids)
      : Promise.resolve({ data: [], error: null });

    const analysesPromise = ids.length
      ? supabase
        .from('project_analyses')
        .select(PROJECT_ANALYSIS_COLUMNS)
        .eq('user_id', user.id)
        .eq('scope', 'project')
        .in('project_id', ids)
      : Promise.resolve({ data: [], error: null });

    const [
      { data: profile, error: profileError },
      { data: folders, error: foldersError },
      { data: analyses, error: analysesError },
    ] = await Promise.all([profilePromise, foldersPromise, analysesPromise]);

    if (profileError) console.warn('마이페이지 DB 정보 로드 실패:', profileError.message);
    if (foldersError) console.warn('선택 프로젝트 폴더 로드 실패:', foldersError.message);
    if (analysesError) console.warn('선택 프로젝트 summary 로드 실패:', analysesError.message);

    const folderById = new Map((folders || []).map((folder) => [folder.id, folder]));
    const analysisById = new Map((analyses || []).map((row) => [row.project_id, row]));
    const experienceProjects = ids
      .map((projectId) => analysisById.get(projectId))
      .filter(Boolean)
      .map((row) => mapProjectAnalysis(row, folderById));

    return {
      myPageInfo: profileError ? {} : toClientProfile(profile),
      experienceProjects,
      folderFileSummaries: await loadFolderFileSummariesForUser(supabase, user.id, ids),
    };
  } catch (error) {
    console.warn('포트폴리오 생성용 서버 데이터 로드 실패:', error.message);
    return { myPageInfo: {}, experienceProjects: [], folderFileSummaries: [] };
  }
}

// 선택한 프로젝트 폴더의 파일별 요약(file_analyses.summary_md)을 조회한다.
// 인증 실패/데이터 없음/예외 시에는 빈 배열을 반환해 기존 생성 흐름을 유지한다.
async function loadFolderFileSummariesForUser(supabase, userId, ids) {
  if (!ids.length) return [];

  try {
    const [
      { data: files, error: filesError },
      { data: analyses, error: analysesError },
    ] = await Promise.all([
      supabase
        .from('activity_files')
        .select('id, project_id, file_name, folder_label')
        .eq('user_id', userId)
        .in('project_id', ids),
      supabase
        .from('file_analyses')
        .select('activity_file_id, project_id, summary_md')
        .eq('user_id', userId)
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

function mergeByProjectId(primary, fallback) {
  const byId = new Map();
  normalizeArray(fallback).forEach((project) => {
    const id = String(project?.projectId || '').trim();
    if (id) byId.set(id, project);
  });
  normalizeArray(primary).forEach((project) => {
    const id = String(project?.projectId || '').trim();
    if (id) byId.set(id, { ...(byId.get(id) || {}), ...project });
  });
  return [...byId.values()];
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

    const serverContext = await loadServerPortfolioContext(projectIds);
    const context = {
      format,
      purpose,
      major,
      experiences,
      experienceProjects: mergeByProjectId(serverContext.experienceProjects, experienceProjects),
      folderFileSummaries: serverContext.folderFileSummaries,
      keywords,
      myPageInfo: {
        ...myPageInfo,
        ...serverContext.myPageInfo,
      },
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
