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

function buildSummaryKeywords(result) {
  const portfolioKeywords = normalizeKeywordList(result?.portfolioKeywords);
  return portfolioKeywords.length
    ? portfolioKeywords
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
    if (!user) return { myPageInfo: {}, experienceProjects: [] };

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
    };
  } catch (error) {
    console.warn('포트폴리오 생성용 서버 데이터 로드 실패:', error.message);
    return { myPageInfo: {}, experienceProjects: [] };
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
