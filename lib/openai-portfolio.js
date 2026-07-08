import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';

const envPath = path.join(process.cwd(), 'key.env');
const envLoadResult = dotenv.config({ path: envPath });

if (envLoadResult.error) {
  console.warn('환경변수 파일 로드 실패:', envPath, envLoadResult.error.message);
} else {
  console.log('환경변수 파일 로드:', envPath);
}

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function maskSecret(value) {
  if (!value) return 'undefined';
  if (value.length <= 10) return `${value.slice(0, 2)}***(${value.length})`;
  return `${value.slice(0, 6)}...${value.slice(-4)} (${value.length})`;
}

const openaiApiKey = cleanEnvValue(process.env.OPENAI_API_KEY);
process.env.OPENAI_API_KEY = openaiApiKey;
console.log('OpenAI 키 값:', maskSecret(openaiApiKey));

const stringArray = {
  type: 'ARRAY',
  items: { type: 'STRING' },
};

const textBlockSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    body: { type: 'STRING' },
  },
  required: ['title', 'body'],
};

const onePageSchema = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    basic_info: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        birth_date: { type: 'STRING' },
        school: { type: 'STRING' },
        major: { type: 'STRING' },
        minor: { type: 'STRING' },
        grade: { type: 'STRING' },
        phone: { type: 'STRING' },
        email: { type: 'STRING' },
        address: { type: 'STRING' },
      },
    },
    core_competencies: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
      },
    },
    experiences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          project: { type: 'STRING' },
          role: { type: 'STRING' },
          highlight: { type: 'STRING' },
        },
      },
    },
    skills: stringArray,
    licenses_and_awards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          year: { type: 'STRING' },
          title: { type: 'STRING' },
        },
      },
    },
    missing_fields: stringArray,
  },
};

const detailSchema = {
  type: 'OBJECT',
  properties: {
    project_title: { type: 'STRING' },
    selection_reason: { type: 'STRING' },
    headline: { type: 'STRING' },
    problem_definition: {
      type: 'OBJECT',
      properties: {
        background: { type: 'STRING' },
        goal: { type: 'STRING' },
      },
    },
    design_process: {
      type: 'OBJECT',
      properties: {
        approach_steps: stringArray,
        design_decisions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              decision: { type: 'STRING' },
              reason: { type: 'STRING' },
            },
          },
        },
      },
    },
    implementation: {
      type: 'OBJECT',
      properties: {
        my_contribution: stringArray,
        team_context: { type: 'STRING' },
        tools_used: stringArray,
      },
    },
    result: {
      type: 'OBJECT',
      properties: {
        quantitative_result: { type: 'STRING' },
        qualitative_result: { type: 'STRING' },
      },
    },
    reflection: {
      type: 'OBJECT',
      properties: {
        learned: { type: 'STRING' },
      },
    },
    keywords: stringArray,
    missing_fields: stringArray,
  },
};

const pptSchema = {
  type: 'OBJECT',
  properties: {
    format: { type: 'STRING' },
    cover: {
      type: 'OBJECT',
      properties: {
        headline: { type: 'STRING' },
        name: { type: 'STRING' },
        phone: { type: 'STRING' },
        email: { type: 'STRING' },
      },
    },
    contents: stringArray,
    self_intro: {
      type: 'OBJECT',
      properties: {
        greeting: { type: 'STRING' },
        photo_placeholder: { type: 'BOOLEAN' },
      },
    },
    career: {
      type: 'OBJECT',
      properties: {
        timeline: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              period: { type: 'STRING' },
              title: { type: 'STRING' },
              description: { type: 'STRING' },
            },
          },
        },
        education: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              period: { type: 'STRING' },
              school: { type: 'STRING' },
              major: { type: 'STRING' },
              status: { type: 'STRING' },
            },
          },
        },
        licenses: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              year: { type: 'STRING' },
              name: { type: 'STRING' },
            },
          },
        },
        awards: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              year: { type: 'STRING' },
              name: { type: 'STRING' },
            },
          },
        },
        skill_summary: stringArray,
      },
    },
    skills: {
      type: 'OBJECT',
      properties: {
        categories: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              category_name: { type: 'STRING' },
              items: stringArray,
            },
          },
        },
      },
    },
    project_list: {
      type: 'OBJECT',
      properties: {
        rows: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              project_name: { type: 'STRING' },
              period: { type: 'STRING' },
              description: { type: 'STRING' },
              role: { type: 'STRING' },
            },
          },
        },
      },
    },
    portfolio_highlights: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          project_name: { type: 'STRING' },
          basic_info: {
            type: 'OBJECT',
            properties: {
              period: { type: 'STRING' },
              team_size: { type: 'STRING' },
              role_summary: { type: 'STRING' },
              my_role: { type: 'STRING' },
            },
          },
          tech_stack: stringArray,
          description: { type: 'STRING' },
          diagram_summary: stringArray,
        },
      },
    },
    missing_fields: stringArray,
  },
};

const coverLetterSchema = {
  type: 'OBJECT',
  properties: {
    name_title: { type: 'STRING' },
    core_summary: {
      type: 'OBJECT',
      properties: {
        competency: { type: 'STRING' },
        experience: { type: 'STRING' },
        skill: { type: 'STRING' },
      },
    },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question_title: { type: 'STRING' },
          question_reason: { type: 'STRING' },
          answer: { type: 'STRING' },
        },
      },
    },
    missing_fields: stringArray,
  },
};

const formatPrompts = {
  '1페이지 요약본': {
    schema: onePageSchema,
    prompt: `
[역할 부여]
당신은 지원자의 강점을 돋보이게 압축하는 전문 포트폴리오 컨설턴트입니다.
제공된 [사용자 데이터]를 분석하여, 세로형 1페이지 이력서(Resume) 화면에 들어갈 텍스트를 JSON 스키마 형태로 작성해 주세요.

[작성 방향]
- 프로필 요약, 핵심 활동, 주요 스킬, 성과/수상 내역을 빠르게 읽히게 구성하세요.
- 서술형 문장보다 짧고 간결한 키워드와 명사형 종결을 우선하세요.
- 채용 담당자가 한눈에 직무 적합성을 파악할 수 있도록 압축적으로 작성하세요.

[Hallucination 금지]
- 사용자가 제공하지 않은 수상 내역, 성과 수치, 기술 사용 경험, 직책은 만들지 마세요.
- 정보가 부족한 필드는 빈 문자열 또는 빈 배열로 두고 missing_fields에 필드명을 추가하세요.
- 생년월일과 주소는 원본 형식을 그대로 매핑하세요.
`,
    normalize: normalizeOnePage,
  },
  '상세 기술 포트폴리오': {
    schema: detailSchema,
    prompt: `
[역할 부여]
당신은 지원자의 프로젝트 경험을 채용 담당자 관점에서 설득력 있게 재구성하는 전문 포트폴리오 컨설턴트입니다.
제공된 프로젝트 경험을 바탕으로 과정과 기여도, 결과를 깊게 다루는 상세 기술 포트폴리오(Case Study)를 작성해 주세요.

[작성 방향]
- 이 형식은 긴 보고서가 아니라, 하나의 큰 프로젝트를 빠르게 훑어보는 요약형 선택지입니다.
- 구성은 [문제 정의] -> [설계 과정] -> [구현 및 기여도] -> [결과 및 성과] 흐름을 따르되 각 항목은 짧게 작성하세요.
- background, goal, headline, selection_reason은 각각 1문장으로만 작성하세요.
- approach_steps는 최대 3개, my_contribution은 최대 3개, tools_used는 최대 5개만 작성하세요.
- 각 배열 항목은 35자 안팎의 짧은 구 또는 한 문장으로 작성하세요.
- 본인의 기여도와 산출물의 가치를 핵심만 강조하되, 제공되지 않은 수치와 역할은 만들지 마세요.
- 여러 프로젝트가 있으면 희망 직무와의 연관성, 기여도의 구체성, 결과의 명확성을 기준으로 가장 설득력 있는 프로젝트 1개만 선정하세요.
`,
    normalize: normalizeDetail,
  },
  'PPT 발표 스펙': {
    schema: pptSchema,
    prompt: `
[역할 부여]
당신은 취업 준비생을 위한 포트폴리오 PPT 컨설턴트입니다.
제공된 프로젝트 내용을 바탕으로 실제 PPT 발표 흐름에 맞춘 슬라이드 프리뷰 콘텐츠를 JSON으로 작성해 주세요.

[작성 방향]
- 슬라이드별 핵심 헤드라인과 2~3개의 서브 불릿 포인트 형태로 작성하세요.
- 프로젝트 개요, 진행 과정, 성과 요약이 발표 흐름에 맞게 드러나야 합니다.
- 실제 이미지, 색상 값, 존재하지 않는 회사명/성과 수치는 만들지 마세요.
- 텍스트와 다이어그램 구조만 생성하세요.
`,
    normalize: normalizePpt,
  },
  '자기소개서 연결형': {
    schema: coverLetterSchema,
    prompt: `
[역할 부여]
당신은 지원자의 프로젝트 데이터를 분석하여 채용 담당자가 실제로 물어볼 법한 자기소개서 문항을 설계하고, 그 문항에 대한 답변까지 작성하는 전문 자소서 컨설턴트입니다.

[작성 방향]
- 제공된 경험 데이터로 강점을 드러낼 수 있는 자소서 문항 3~4개를 생성하세요.
- 답변은 경험 -> 문제 인식 -> 해결 과정 -> 결과 흐름의 스토리텔링 구조로 작성하세요.
- 사용자의 생각과 행동 이유가 드러나는 자연스러운 산문체로 작성하세요.
- 없는 경험, 수치, 성과, 감정, 계기는 만들지 마세요.
- 각 답변은 400~600자 내외를 목표로 하되, 근거가 짧으면 억지로 늘리지 마세요.
`,
    normalize: normalizeCoverLetter,
  },
};

function stringifyList(items) {
  return (items || []).filter(Boolean).join('\n');
}

function normalizeOnePage(data, context) {
  const info = data.basic_info || {};
  const basicInfo = [
    info.name && `이름: ${info.name}`,
    info.birth_date && `생년월일: ${info.birth_date}`,
    info.school && `학교: ${info.school}`,
    info.major && `전공: ${info.major}`,
    info.minor && `부전공/연계전공: ${info.minor}`,
    info.grade && `학년: ${info.grade}`,
    info.phone && `전화번호: ${info.phone}`,
    info.email && `이메일: ${info.email}`,
    info.address && `주소: ${info.address}`,
  ].filter(Boolean);

  const blocks = [
    { title: '프로필 요약', body: data.headline || `${context.major} 기반 ${context.purpose} 포트폴리오` },
    { title: '기본 정보', body: stringifyList(basicInfo) },
    {
      title: '핵심 역량',
      body: stringifyList((data.core_competencies || []).map((item) => `${item.title}: ${item.description}`)),
    },
    {
      title: '핵심 활동',
      body: stringifyList((data.experiences || []).map((item) => `${item.project} / ${item.role} / ${item.highlight}`)),
    },
    { title: '주요 스킬', body: stringifyList(data.skills) },
    {
      title: '성과/수상 내역',
      body: stringifyList((data.licenses_and_awards || []).map((item) => `${item.year} ${item.title}`)),
    },
  ].filter((block) => block.body);

  return buildNormalized(data.headline || '1페이지 요약본', data.headline || '', blocks, blocks, data);
}

function normalizeDetail(data) {
  const blocks = [
    { title: data.project_title || '선정 프로젝트', body: data.headline || data.selection_reason || '' },
    {
      title: '문제 정의',
      body: stringifyList([
        data.problem_definition?.background && `배경: ${data.problem_definition.background}`,
        data.problem_definition?.goal && `목표: ${data.problem_definition.goal}`,
      ]),
    },
    {
      title: '설계 과정',
      body: stringifyList([
        ...(data.design_process?.approach_steps || []),
        ...(data.design_process?.design_decisions || []).map((item) => `${item.decision}: ${item.reason}`),
      ]),
    },
    {
      title: '구현 및 기여도',
      body: stringifyList([
        ...(data.implementation?.my_contribution || []),
        data.implementation?.team_context && `팀 맥락: ${data.implementation.team_context}`,
        data.implementation?.tools_used?.length && `사용 도구: ${data.implementation.tools_used.join(', ')}`,
      ]),
    },
    {
      title: '결과 및 성과',
      body: stringifyList([
        data.result?.quantitative_result && `정량 결과: ${data.result.quantitative_result}`,
        data.result?.qualitative_result && `정성 결과: ${data.result.qualitative_result}`,
      ]),
    },
    { title: '회고', body: data.reflection?.learned || '' },
  ].filter((block) => block.body);

  return buildNormalized(data.project_title || '상세 기술 포트폴리오', data.selection_reason || data.headline || '', blocks, blocks, data);
}

function normalizePpt(data) {
  const slides = [
    data.cover && {
      title: data.cover.headline || '프로젝트 개요',
      body: stringifyList([data.cover.name, data.cover.phone, data.cover.email]),
    },
    data.contents?.length && {
      title: '목차',
      body: stringifyList(data.contents),
    },
    data.self_intro && {
      title: '자기소개',
      body: data.self_intro.greeting || '',
    },
    data.career && {
      title: '경력 및 활동',
      body: stringifyList([
        ...(data.career.timeline || []).map((item) => `${item.period} ${item.title}: ${item.description}`),
        ...(data.career.skill_summary || []),
      ]),
    },
    data.skills?.categories?.length && {
      title: '기술 보유',
      body: stringifyList(data.skills.categories.map((item) => `${item.category_name}: ${(item.items || []).join(', ')}`)),
    },
    data.project_list?.rows?.length && {
      title: '참여 프로젝트 목록',
      body: stringifyList(data.project_list.rows.map((item) => `${item.project_name}: ${item.description} (${item.role})`)),
    },
    ...(data.portfolio_highlights || []).map((item) => ({
      title: item.project_name || '주요 포트폴리오',
      body: stringifyList([
        item.basic_info?.period && `기간: ${item.basic_info.period}`,
        item.basic_info?.my_role && `담당: ${item.basic_info.my_role}`,
        item.tech_stack?.length && `기술: ${item.tech_stack.join(', ')}`,
        item.description,
        item.diagram_summary?.length && `흐름: ${item.diagram_summary.join(' -> ')}`,
      ]),
    })),
  ].filter(Boolean);

  return buildNormalized(data.cover?.headline || 'PPT 발표 스펙', 'PPT 발표 흐름에 맞춰 구성한 초안입니다.', slides, slides, data);
}

function normalizeCoverLetter(data) {
  const blocks = [
    {
      title: data.name_title || '자기소개서 연결형',
      body: stringifyList([
        data.core_summary?.competency && `역량: ${data.core_summary.competency}`,
        data.core_summary?.experience && `경험: ${data.core_summary.experience}`,
        data.core_summary?.skill && `기술: ${data.core_summary.skill}`,
      ]),
    },
    ...(data.items || []).map((item) => ({
      title: item.question_title || '자기소개서 문항',
      body: stringifyList([
        item.question_reason && `선정 이유: ${item.question_reason}`,
        item.answer,
      ]),
    })),
  ].filter((block) => block.body);

  return buildNormalized(data.name_title || '자기소개서 연결형', '자기소개서 문항과 답변으로 확장한 초안입니다.', blocks, blocks, data);
}

function buildNormalized(title, summary, blocks, slides, raw) {
  return {
    title,
    summary,
    blocks: blocks.length ? blocks : [{ title, body: summary }],
    slides: slides.length ? slides : [{ title, body: summary }],
    competencies: raw.keywords || raw.skills || [],
    applicationSentences: raw.applicationSentences || [],
    raw,
  };
}

export function getPortfolioTemplate(format) {
  return formatPrompts[format] || formatPrompts['상세 기술 포트폴리오'];
}

export function buildPortfolioPrompt({ format, purpose, major, experiences, keywords, myPageInfo }) {
  const template = getPortfolioTemplate(format);

  return `
${template.prompt}

[출력 형식 강제]
1. 반드시 지정된 JSON 스키마로만 응답하세요.
2. 코드블록 표시, 설명 문장, 전/후 텍스트를 절대 포함하지 마세요.
3. 순수 JSON 객체만 반환하세요.

[사용자 데이터]
- 포트폴리오 형식: ${format}
- 사용 목적: ${purpose}
- 선택 전공: ${major}
- 선택 경험: ${experiences.join(', ') || '선택한 경험 없음'}
- 강조 키워드: ${keywords.join(', ') || '강조 키워드 없음'}
- 마이페이지 정보 JSON: ${JSON.stringify(myPageInfo)}
`;
}

export function normalizePortfolioResponse(format, data, context) {
  return getPortfolioTemplate(format).normalize(data, context);
}

export function getPortfolioSchema(format) {
  return getPortfolioTemplate(format).schema;
}

export const portfolioReviseSchema = {
  type: 'OBJECT',
  properties: {
    assistantMessage: { type: 'STRING' },
    blocks: {
      type: 'ARRAY',
      items: textBlockSchema,
    },
    slides: {
      type: 'ARRAY',
      items: textBlockSchema,
    },
  },
};

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

function normalizeJsonSchema(schema) {
  if (Array.isArray(schema)) return schema.map(normalizeJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;

  const nextSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string') {
      nextSchema[key] = value.toLowerCase();
    } else {
      nextSchema[key] = normalizeJsonSchema(value);
    }
  }
  return nextSchema;
}

export async function generateOpenAiJson(prompt, responseSchema) {
  if (!openaiApiKey) {
    const error = new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    error.statusCode = 503;
    throw error;
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: [
          '너는 Myfitfolio의 포트폴리오 생성 도우미다.',
          '사용자가 제공하지 않은 경험, 성과, 수치, 역할은 만들지 않는다.',
          '반드시 한국어로 작성하고, 요청된 JSON 스키마만 반환한다.',
        ].join(' '),
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'myfitfolio_portfolio_response',
        schema: normalizeJsonSchema(responseSchema),
        strict: false,
      },
    },
  });

  const text = completion.choices[0]?.message?.content || '{}';
  return parseOpenAiJson(text);
}
