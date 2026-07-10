import { createSupabaseServerClient } from '../../../../lib/supabase-server';

const FOLDER_COLUMNS = 'id, group_key, type_key, label, created_at';
const PROJECT_ANALYSIS_COLUMNS = 'project_id, result, provider, based_on_count, updated_at';

const KEYWORD_COMPACT_RULES = [
  { pattern: /환경\s*문제\s*리서치|환경\s*문제\s*조사|환경.*리서치|환경.*조사/, keyword: '환경 리서치' },
  { pattern: /비교\s*분석/, keyword: '비교 분석' },
  { pattern: /문제\s*정의/, keyword: '문제 정의' },
  { pattern: /문제\s*규모\s*분석|규모\s*분석/, keyword: '규모 분석' },
  { pattern: /한계\s*분석/, keyword: '한계 분석' },
  { pattern: /영향\s*정리/, keyword: '영향 정리' },
  { pattern: /항목\s*구조화|구조화/, keyword: '항목 구조화' },
  { pattern: /가정\s*설정/, keyword: '가정 설정' },
  { pattern: /주제\s*기획/, keyword: '주제 기획' },
  { pattern: /소재\s*제안/, keyword: '소재 제안' },
  { pattern: /아이디어\s*도출/, keyword: '아이디어 도출' },
  { pattern: /자료\s*분석|데이터\s*분석/, keyword: '데이터 분석' },
  { pattern: /공정\s*최적화/, keyword: '공정 최적화' },
  { pattern: /문제\s*해결/, keyword: '문제 해결' },
];

const KEYWORD_STOP_WORDS = new Set([
  '기반',
  '관점',
  '관점의',
  '방식',
  '방식의',
  '기존',
  '사용',
  '활용',
  '대한',
  '관련',
  '중심',
  '위한',
  '통한',
]);

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

function hasBlockedKeywordText(item) {
  return /\uC870\uC0AC/.test(String(item || ''));
}

function compactKeyword(item) {
  const text = String(item || '')
    .replace(/[·ㆍ,;/|+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (hasBlockedKeywordText(text)) return '';

  const matchedRule = KEYWORD_COMPACT_RULES.find((rule) => rule.pattern.test(text));
  if (matchedRule) return hasBlockedKeywordText(matchedRule.keyword) ? '' : matchedRule.keyword;

  const words = text.split(' ')
    .map((word) => word.replace(/의$/, ''))
    .filter((word) => word && !KEYWORD_STOP_WORDS.has(word));
  const compacted = words.slice(0, 2).join(' ');
  return compacted.length > 14 ? compacted.slice(0, 14).trim() : compacted;
}

function normalizeKeywordList(items) {
  return [...new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item || '')
      .replace(/^[\s\-*•\d.)]+/, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim())
    .map(compactKeyword)
    .filter((item) => item && item !== '-' && !hasBlockedKeywordText(item)))]
    .slice(0, 12);
}

function buildSummaryKeywords(result) {
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

function mapFolder(row, analysisByProjectId) {
  const analysisRow = analysisByProjectId.get(row.id) || null;
  const projectAnalysis = mapProjectAnalysis(analysisRow, row);

  return {
    id: row.id,
    label: row.label,
    group: row.group_key,
    type: row.type_key,
    analysisStatus: projectAnalysis ? 'completed' : 'missing',
    projectAnalysis,
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const [
      { data: folders, error: foldersError },
      { data: analyses, error: analysesError },
    ] = await Promise.all([
      supabase
        .from('activity_folders')
        .select(FOLDER_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('project_analyses')
        .select(PROJECT_ANALYSIS_COLUMNS)
        .eq('user_id', user.id)
        .eq('scope', 'project'),
    ]);

    if (foldersError) return Response.json({ message: foldersError.message }, { status: 500 });
    if (analysesError) return Response.json({ message: analysesError.message }, { status: 500 });

    const analysisByProjectId = new Map((analyses || []).map((row) => [row.project_id, row]));

    return Response.json({
      folders: (folders || []).map((folder) => mapFolder(folder, analysisByProjectId)),
    });
  } catch (error) {
    return Response.json(
      { message: error.message || 'Unable to load portfolio source data' },
      { status: 500 }
    );
  }
}
