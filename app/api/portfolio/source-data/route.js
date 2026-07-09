import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { isAnalysisMockEnabled } from '../../../../lib/openai-portfolio';

const FOLDER_COLUMNS = 'id, group_key, type_key, label, created_at';
const PROJECT_ANALYSIS_COLUMNS = 'project_id, result, provider, based_on_count, updated_at';

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

function normalizeKeywordList(items) {
  return [...new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item || '')
      .replace(/^[\s\-*•\d.)]+/, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim())
    .filter((item) => item && item !== '-' && item.length <= 80))]
    .slice(0, 12);
}

function extractMarkdownListSection(markdown, headingMatchers) {
  const lines = String(markdown || '').split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    if (!/^##\s+/.test(line)) return false;
    return headingMatchers.some((matcher) => matcher.test(line));
  });

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
  if (portfolioSummaryKeywords.length) {
    return { keywords: portfolioSummaryKeywords, source: 'summary_portfolio' };
  }

  const activitySummaryKeywords = extractMarkdownListSection(summaryMd, [
    /강점.*키워드/,
    /activity.*keyword/i,
  ]);
  if (activitySummaryKeywords.length) {
    return { keywords: activitySummaryKeywords, source: 'summary_activity' };
  }

  const portfolioKeywords = normalizeKeywordList(result?.portfolioKeywords);
  if (portfolioKeywords.length) {
    return { keywords: portfolioKeywords, source: 'portfolioKeywords' };
  }

  const activityKeywords = normalizeKeywordList(result?.activityKeywords);
  if (activityKeywords.length) {
    return { keywords: activityKeywords, source: 'activityKeywords' };
  }

  return { keywords: [], source: 'none' };
}

function projectIdFromFileRow(row) {
  const projectId = String(row.project_id || '').trim();
  if (projectId) return projectId;
  return String(row.folder_id || '').split('::')[0] || '';
}

function countFilesByProject(files) {
  const counts = new Map();
  (files || []).forEach((file) => {
    const projectId = projectIdFromFileRow(file);
    if (!projectId) return;
    counts.set(projectId, (counts.get(projectId) || 0) + 1);
  });
  return counts;
}

function mapProjectAnalysis(row, folder) {
  if (!row?.result) return null;

  const result = row.result || {};
  const summary = buildSummaryKeywords(result);

  return {
    projectId: row.project_id || folder.id,
    projectName: result.projectName || folder.label,
    headline: result.headline || '',
    description: result.description || '',
    summaryMd: result.summaryMd || '',
    summaryKeywords: summary.keywords,
    summaryKeywordSource: summary.source,
    activityKeywords: normalizeKeywordList(result.activityKeywords),
    portfolioKeywords: normalizeKeywordList(result.portfolioKeywords),
    basedOnCount: row.based_on_count ?? result.basedOnCount ?? 0,
    provider: row.provider || result.provider || null,
    updatedAt: row.updated_at || result.generatedAt || null,
  };
}

function mapFolder(row, fileCounts, analysisByProjectId) {
  const analysisRow = analysisByProjectId.get(row.id) || null;
  const projectAnalysis = mapProjectAnalysis(analysisRow, row);

  return {
    id: row.id,
    label: row.label,
    group: row.group_key,
    type: row.type_key,
    fileCount: fileCounts.get(row.id) || 0,
    analysisStatus: projectAnalysis ? 'completed' : 'missing',
    projectAnalysis,
  };
}

function buildMockPortfolioSourceFolders() {
  return [
    {
      id: 'mock-electric-portfolio',
      label: '전기기사 자격 자료 정리',
      group: 'completed',
      type: '공모전',
      fileCount: 3,
      analysisStatus: 'completed',
      projectAnalysis: {
        projectId: 'mock-electric-portfolio',
        projectName: '전기기사 자격 자료 정리',
        headline: '전기공학 기반 학업 성취와 자격 자료를 공모전 제출용으로 정리',
        description: '학업 성취 지표, 전기기사 자격 관련 자료, 개인 역량 자료를 1페이지 요약 포트폴리오 근거로 정리했습니다.',
        summaryMd: [
          '## 포트폴리오 키워드',
          '- 전기공학',
          '- 머신러닝',
          '- 반도체',
          '- 자격 자료 정리',
          '- 공모전 제출',
        ].join('\n'),
        summaryKeywords: ['전기공학', '머신러닝', '반도체', '자격 자료 정리', '공모전 제출'],
        summaryKeywordSource: 'mock',
        activityKeywords: ['학업 성취', '자격증', '자료 정리'],
        portfolioKeywords: ['전기공학', '머신러닝', '반도체', '공모전'],
        basedOnCount: 3,
        provider: 'mock',
        updatedAt: new Date().toISOString(),
      },
    },
  ];
}

export async function GET() {
  try {
    if (isAnalysisMockEnabled()) {
      return Response.json({ folders: buildMockPortfolioSourceFolders(), provider: 'mock' });
    }

    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const [
      { data: folders, error: foldersError },
      { data: files, error: filesError },
      { data: analyses, error: analysesError },
    ] = await Promise.all([
      supabase
        .from('activity_folders')
        .select(FOLDER_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('activity_files')
        .select('project_id, folder_id')
        .eq('user_id', user.id),
      supabase
        .from('project_analyses')
        .select(PROJECT_ANALYSIS_COLUMNS)
        .eq('user_id', user.id)
        .eq('scope', 'project'),
    ]);

    if (foldersError) return Response.json({ message: foldersError.message }, { status: 500 });
    if (filesError) return Response.json({ message: filesError.message }, { status: 500 });
    if (analysesError) return Response.json({ message: analysesError.message }, { status: 500 });

    const fileCounts = countFilesByProject(files || []);
    const analysisByProjectId = new Map((analyses || []).map((row) => [row.project_id, row]));

    return Response.json({
      folders: (folders || []).map((folder) => mapFolder(folder, fileCounts, analysisByProjectId)),
    });
  } catch (error) {
    return Response.json(
      { message: error.message || 'Unable to load portfolio source data' },
      { status: 500 }
    );
  }
}
