import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';

const envPath = path.join(process.cwd(), 'key.env');
dotenv.config({ path: envPath });

const DEFAULT_KEYWORDS = [
  '근거 기반 문제 해결',
  '전공 지식 적용',
  '데이터 기반 의사결정',
  '문서화 및 커뮤니케이션',
];

const MAJOR_KEYWORDS = {
  industrial: ['프로세스 최적화', 'SCM/물류 분석', '품질경영', '운영관리', '데이터 기반 의사결정'],
  chemical: ['공정 안전성', '실험 데이터 해석', '화학분석', '품질관리', '바이오공정 이해'],
  electrical: ['회로 분석', '전력 시스템 이해', '제어 시스템 설계', '임베디드 구현', '센서 데이터 해석'],
  computer: ['소프트웨어 구현', '알고리즘 문제 해결', 'API 설계', '데이터 구조화', 'AI 모델 활용'],
};

const EXPERIENCE_RULES = [
  { pattern: /자격|기사|산업기사|기능사|cert|license|sqld|adsp|컴활|정보처리|전기기사|화공기사|위험물|품질경영/i, keywords: ['직무 기초 지식 검증', '전문성 학습 이력', '자격 기반 실무 이해'] },
  { pattern: /공모|대회|경진|수상|contest|award/i, keywords: ['문제 정의와 해결안 도출', '성과 중심 실행력', '제안서 구조화'] },
  { pattern: /봉사|멘토|서포터|대외|volunteer|supporter/i, keywords: ['사용자 이해', '책임감 있는 실행', '대외 커뮤니케이션'] },
  { pattern: /팀|협업|회의|발표|presentation|team/i, keywords: ['협업 조율', '발표 커뮤니케이션', '기록 기반 공유'] },
  { pattern: /개발|코드|github|프로그래밍|테스트|app|web|api/i, keywords: ['서비스 구현', '테스트 기반 개선', '시스템 설계'] },
  { pattern: /데이터|분석|ai|인공지능|모델|추천/i, keywords: ['데이터 분석', 'AI 활용', '추천 로직 설계'] },
  { pattern: /실험|공정|화학|바이오|품질|안전/i, keywords: ['실험 설계', '공정 이해', '품질 안전'] },
  { pattern: /전기|회로|전력|임베디드|제어|센서/i, keywords: ['회로 이해', '제어 설계', '문제 진단'] },
];

const keywordSchema = {
  type: 'object',
  properties: {
    keywords: {
      type: 'array',
      items: { type: 'string', maxLength: 14 },
    },
    rationale: { type: 'string' },
  },
  required: ['keywords'],
  additionalProperties: false,
};

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getMajorKey(major) {
  const normalized = String(major || '').trim();
  if (/화공|화학|생명|바이오/.test(normalized)) return 'chemical';
  if (/전기|전자|전력|제어/.test(normalized)) return 'electrical';
  if (/컴퓨터|소프트웨어|정보|전산/.test(normalized)) return 'computer';
  return 'industrial';
}

function normalizeExperiences(experiences) {
  if (!Array.isArray(experiences)) return [];
  return experiences.slice(0, 8).map((item) => {
    if (typeof item === 'string') return { name: item };
    return {
      id: item?.id || '',
      name: item?.name || '',
      folderGroup: item?.folderGroup || '',
      folderType: item?.folderType || '',
      folderLabel: item?.folderLabel || '',
      analysisStatus: item?.analysisStatus || '',
      analysisSummary: item?.analysisSummary || '',
      analysisIndex: item?.analysisIndex || null,
    };
  });
}

function collectExperienceText(experiences) {
  return experiences
    .map((item) => [
      item.name,
      item.folderGroup,
      item.folderType,
      item.folderLabel,
      item.analysisSummary,
      JSON.stringify(item.analysisIndex || {}),
    ].filter(Boolean).join(' '))
    .join(' ');
}

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

function hasBlockedKeywordText(item) {
  return /\uC870\uC0AC/.test(String(item || ''));
}

function stripTrailingPostposition(text) {
  return String(text || '')
    .replace(/(\S+\s+\S+)(?:과|와|은|는|이|가|을|를|의|에|로|으로|도|만|까지|부터|처럼|보다|에게|께|한테|랑|이랑|하고)$/u, '$1')
    .trim();
}

function compactKeyword(item) {
  const text = stripTrailingPostposition(String(item || '')
    .replace(/[·ㆍ,;/|+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
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

function uniqueKeywords(items) {
  return [...new Set((items || [])
    .map(compactKeyword)
    .filter((item) => item && !hasBlockedKeywordText(item)))]
    .slice(0, 12);
}

function buildFallbackKeywords({ major, experiences, fallbackKeywords }) {
  const majorKeywords = MAJOR_KEYWORDS[getMajorKey(major)] || MAJOR_KEYWORDS.industrial;
  const experienceText = collectExperienceText(experiences);
  const ruleKeywords = EXPERIENCE_RULES
    .filter((rule) => rule.pattern.test(experienceText))
    .flatMap((rule) => rule.keywords);

  return uniqueKeywords([
    ...ruleKeywords,
    ...majorKeywords,
    ...fallbackKeywords,
    ...DEFAULT_KEYWORDS,
  ]);
}

function buildKeywordPrompt({ major, experiences, fallbackKeywords }) {
  const hasCertificateLikeFile = /자격|기사|산업기사|기능사|cert|license|sqld|adsp|컴활|정보처리|전기기사|화공기사|위험물|품질경영/i
    .test(collectExperienceText(experiences));

  return [
    'Myfitfolio 포트폴리오 생성 화면의 "강조할 AI 역량 키워드"를 추천한다.',
    '사용자가 선택한 경험 파일 정보와 마이페이지 전공을 종합해, 포트폴리오에 바로 넣을 수 있는 짧은 한국어 역량 키워드 6~10개를 추천한다.',
    '각 키워드는 반드시 공백 기준 2단어 이내로 작성한다. 예: "문제 정의", "데이터 분석", "공정 최적화", "협업 조율".',
    '긴 문장형 표현은 금지한다. 예: "정량 자료 기반 문제 규모 분석"처럼 긴 표현 대신 "정량 분석"처럼 줄인다.',
    '파일이 자격증/기사/시험 자료처럼 보이면 웹 검색으로 해당 자격증의 일반적인 평가 범위나 직무 의미를 확인하고, 그 자격증명과 전공 적합성을 반영한다.',
    '근거가 없는 성과, 역할, 수치, 자격 취득 여부는 만들지 않는다.',
    '너무 포괄적인 "문제 해결", "협업"만 반복하지 말고 전공과 경험에 맞는 구체 키워드를 우선한다.',
    `자격증형 파일 감지 여부: ${hasCertificateLikeFile ? '예' : '아니오'}`,
    `전공: ${major || '미입력'}`,
    `기존 fallback 키워드: ${fallbackKeywords.join(', ') || '없음'}`,
    `선택 경험 JSON: ${JSON.stringify(experiences)}`,
    '응답은 JSON 객체만 반환한다. 형식: {"keywords":["..."],"rationale":"..."}',
  ].join('\n');
}

function parseOpenAiJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw error;
    return JSON.parse(jsonMatch[0]);
  }
}

async function generateWebAwareKeywords(context) {
  const apiKey = cleanEnvValue(process.env.OPENAI_API_KEY);
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_KEYWORD_MODEL || 'gpt-5-mini';
  const response = await openai.responses.create({
    model,
    tools: [{ type: 'web_search_preview' }],
    tool_choice: 'required',
    input: [
      {
        role: 'system',
        content: '너는 취업 포트폴리오 역량 키워드 추천 도우미다. 확인 가능한 경험과 검색 근거만 사용하고 한국어 JSON만 반환한다.',
      },
      {
        role: 'user',
        content: buildKeywordPrompt(context),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'portfolio_keyword_recommendations',
        schema: keywordSchema,
        strict: false,
      },
    },
  });

  return parseOpenAiJson(response.output_text || '{}');
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const major = String(payload.major || '');
    const experiences = normalizeExperiences(payload.experiences);
    const fallbackKeywords = uniqueKeywords(payload.fallbackKeywords);
    const localKeywords = buildFallbackKeywords({ major, experiences, fallbackKeywords });

    if (!experiences.length) {
      return Response.json({ keywords: localKeywords, source: 'local' });
    }

    try {
      const aiResult = await generateWebAwareKeywords({ major, experiences, fallbackKeywords: localKeywords });
      const aiKeywords = uniqueKeywords(aiResult?.keywords);
      if (aiKeywords.length) {
        return Response.json({
          keywords: aiKeywords,
          rationale: aiResult?.rationale || '',
          source: 'web_search',
        });
      }
    } catch (error) {
      console.warn('Portfolio keyword web-aware recommendation failed:', error.message);
    }

    return Response.json({ keywords: localKeywords, source: 'local' });
  } catch (error) {
    return Response.json(
      { message: error.message || 'Unable to recommend portfolio keywords' },
      { status: 500 }
    );
  }
}
