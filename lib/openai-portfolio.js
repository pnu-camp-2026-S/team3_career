import dotenv from 'dotenv';
import fs from 'fs';
import { OpenAI } from 'openai';
import path from 'path';
import {
  buildMockPortfolioOnePageData,
  buildPortfolioOnePagePrompt,
  buildPortfolioOnePageUserPrompt,
  normalizePortfolioOnePage,
  portfolioOnePageSchema,
} from './portfolio-onepage.js';
import {
  buildMockPortfolioDetailData,
  buildPortfolioDetailPrompt,
  buildPortfolioDetailUserPrompt,
  normalizePortfolioDetail,
  portfolioDetailSchema,
} from './portfolio-detail.js';

const envPath = path.join(process.cwd(), 'key.env');
const envLoadResult = dotenv.config({ path: envPath });

if (envLoadResult.error) {
  console.warn('환경변수 파일 로드 실패:', envPath, envLoadResult.error.message);
}

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

const openaiApiKey = cleanEnvValue(process.env.OPENAI_API_KEY);
process.env.OPENAI_API_KEY = openaiApiKey;

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
    schema: portfolioOnePageSchema,
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
    normalize: normalizePortfolioOnePage,
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

// 형식별 프롬프트를 portfolio_design/<폴더>의 md 파일에서 불러온다.
// 각 폴더의 design.md(작성 기준)와 *_template.md(출력 골격)를 모두 결합해 사용하고,
// 읽기에 실패하면 위에 정의한 인라인 프롬프트를 fallback으로 유지한다.
const DESIGN_DIR = path.join(process.cwd(), 'portfolio_design');
const DESIGN_FOLDERS = {
  '1페이지 요약본': 'portfolio-summary',
  '상세 기술 포트폴리오': 'portfolio-detail',
  'PPT 발표 스펙': 'portfolio-presentation',
  '자기소개서 연결형': 'portfolio-coverletter',
};

function loadDesignPrompt(format, fallback) {
  const folder = DESIGN_FOLDERS[format];
  if (!folder) return fallback;

  const dir = path.join(DESIGN_DIR, folder);
  try {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .sort((a, b) => (a === 'design.md' ? -1 : b === 'design.md' ? 1 : a.localeCompare(b)));

    if (!files.length) return fallback;

    const sections = files.map(
      (name) => `### [참고 파일] ${name}\n\n${fs.readFileSync(path.join(dir, name), 'utf8').trim()}`
    );
    return sections.join('\n\n---\n\n');
  } catch (error) {
    console.warn('portfolio_design 로드 실패:', folder, error.message);
    return fallback;
  }
}

for (const [format, template] of Object.entries(formatPrompts)) {
  template.prompt = loadDesignPrompt(format, template.prompt);
}
formatPrompts['1페이지 요약본'].prompt = buildPortfolioOnePagePrompt();
formatPrompts['상세 기술 포트폴리오'] = {
  schema: portfolioDetailSchema,
  prompt: buildPortfolioDetailPrompt(),
  normalize: normalizePortfolioDetail,
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

function compactPromptText(value, maxLength = 2400) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeExperienceProjects(projects) {
  return (Array.isArray(projects) ? projects : [])
    .slice(0, 6)
    .map((project) => ({
      projectId: String(project?.projectId || ''),
      projectName: String(project?.projectName || ''),
      headline: String(project?.headline || ''),
      description: String(project?.description || ''),
      summaryKeywords: Array.isArray(project?.summaryKeywords) ? project.summaryKeywords.slice(0, 12) : [],
      summaryMd: compactPromptText(project?.summaryMd || ''),
    }))
    .filter((project) => project.projectId || project.projectName || project.summaryMd);
}

function buildExperienceProjectPrompt(projects) {
  const normalizedProjects = normalizeExperienceProjects(projects);
  if (!normalizedProjects.length) return '선택한 프로젝트 분석 summary 없음';
  return JSON.stringify(normalizedProjects);
}

export function buildPortfolioPrompt({
  format,
  purpose,
  major,
  experiences,
  experienceProjects = [],
  keywords,
  myPageInfo,
}) {
  const template = getPortfolioTemplate(format);

  return `
${template.prompt}

${format === '1페이지 요약본' ? buildPortfolioOnePageUserPrompt({
    format,
    purpose,
    major,
    experiences,
    experienceProjects,
    keywords,
    myPageInfo,
  }) : ''}

${format === '상세 기술 포트폴리오' ? buildPortfolioDetailUserPrompt({
    format,
    purpose,
    major,
    experiences,
    experienceProjects,
    keywords,
    myPageInfo,
  }) : ''}

[출력 형식 강제]
1. 반드시 지정된 JSON 스키마로만 응답하세요.
2. 코드블록 표시, 설명 문장, 전/후 텍스트를 절대 포함하지 마세요.
3. 순수 JSON 객체만 반환하세요.
4. 위 참고 파일(디자인 기준·템플릿)은 내용과 구성 참고용입니다. 마크다운 문서가 아니라 지정된 JSON 스키마로만 출력하세요.

[사용자 데이터]
- 포트폴리오 형식: ${format}
- 사용 목적: ${purpose}
- 선택 전공: ${major}
- 선택 경험: ${experiences.join(', ') || '선택한 경험 없음'}
- 강조 키워드: ${keywords.join(', ') || '강조 키워드 없음'}
- 선택 프로젝트 분석 summary JSON: ${buildExperienceProjectPrompt(experienceProjects)}
- 마이페이지 정보 JSON: ${JSON.stringify(myPageInfo)}

[근거 사용 규칙]
1. 선택 프로젝트 분석 summary JSON을 가장 우선 근거로 사용하세요.
2. 위 요약에 없는 역할, 성과, 수치, 기술 사용 경험은 새로 만들지 마세요.
3. 정보가 부족하면 missing_fields에 보완할 정보를 적으세요.
`;
}

export function normalizePortfolioResponse(format, data, context) {
  return getPortfolioTemplate(format).normalize(data, context);
}

export function getPortfolioSchema(format) {
  return getPortfolioTemplate(format).schema;
}

function firstValue(items, fallback) {
  return (items || []).find(Boolean) || fallback;
}

function firstExperienceName(context, fallback) {
  return firstValue(
    context.experiences,
    context.experienceProjects?.[0]?.projectName || fallback
  );
}

function buildMockOnePageData(context) {
  const mainExperience = firstExperienceName(context, '파일관리 기반 프로젝트 경험');
  const mainKeyword = firstValue(context.keywords, '문제 해결');

  return {
    headline: `${context.major} 기반 ${mainKeyword} 포트폴리오`,
    basic_info: {
      name: context.myPageInfo?.name || '목데이터 사용자',
      school: context.myPageInfo?.school || '부산대학교',
      major: context.major,
      email: context.myPageInfo?.email || 'user@univ.ac.kr',
    },
    core_competencies: [
      { title: mainKeyword, description: `${mainExperience}에서 핵심 문제를 정의하고 개선 방향을 정리했습니다.` },
      { title: '자료 구조화', description: '업로드 자료를 경험 단위로 묶어 포트폴리오 근거로 활용했습니다.' },
      { title: 'AI 활용', description: '선택한 경험과 키워드를 바탕으로 초안 구성을 빠르게 검증했습니다.' },
    ],
    experiences: [
      { project: mainExperience, role: '자료 정리 및 문제 분석', highlight: `${mainKeyword} 역량을 보여주는 대표 경험` },
      { project: 'AI 요약 검증', role: '결과 확인 및 보완점 도출', highlight: '생성 결과의 활용 가능성과 한계를 점검' },
    ],
    skills: context.keywords?.length ? context.keywords : ['문제 해결', '협업', '문서화'],
    licenses_and_awards: [],
    missing_fields: ['정량 성과', '수상 내역'],
  };
}

function buildMockDetailData(context) {
  const mainExperience = firstExperienceName(context, '대표 프로젝트 경험');
  const mainKeyword = firstValue(context.keywords, '문제 해결');

  return {
    project_title: `${mainExperience} 개선 프로젝트`,
    selection_reason: `${context.major} 전공과 ${mainKeyword} 역량이 가장 잘 드러나는 경험입니다.`,
    headline: '자료 기반으로 문제를 정의하고 실행 흐름을 정리한 상세 기술 포트폴리오 초안입니다.',
    problem_definition: {
      background: '업로드 자료가 여러 파일에 흩어져 있어 핵심 경험을 빠르게 파악하기 어려웠습니다.',
      goal: '선택한 경험을 문제, 과정, 기여도, 결과 중심으로 재구성하는 것을 목표로 했습니다.',
    },
    design_process: {
      approach_steps: ['자료 범위 확인', '핵심 키워드 선별', '포트폴리오 흐름 재배치'],
      design_decisions: [
        { decision: '경험 중심 구성', reason: '채용 담당자가 역할과 결과를 빠르게 볼 수 있도록 하기 위해서입니다.' },
        { decision: '키워드 우선 반영', reason: '사용자가 강조하고 싶은 역량이 초안에 직접 드러나도록 하기 위해서입니다.' },
      ],
    },
    implementation: {
      my_contribution: ['업로드 자료를 경험 단위로 정리', 'AI 요약 결과 확인', '부족한 설명 포인트 도출'],
      team_context: '목데이터 검증용으로 생성된 예시입니다.',
      tools_used: ['Myfitfolio', 'AI 요약', '포트폴리오 생성'],
    },
    result: {
      quantitative_result: '정량 성과는 사용자 확인 후 입력이 필요합니다.',
      qualitative_result: '선택 경험의 문제 해결 흐름과 핵심 역량이 한 화면에 정리되었습니다.',
    },
    reflection: {
      learned: '근거 자료와 선택 키워드가 명확할수록 포트폴리오 초안 품질이 높아집니다.',
    },
    keywords: context.keywords || [],
    missing_fields: ['구체적 수치', '사용 기술 상세'],
  };
}

function buildMockPptData(context) {
  const mainExperience = firstExperienceName(context, '대표 프로젝트 경험');
  const keywords = context.keywords?.length ? context.keywords : ['문제 해결', '협업', 'AI 활용'];

  return {
    format: context.format,
    cover: {
      headline: `${context.major} 포트폴리오 발표 초안`,
      name: context.myPageInfo?.name || '목데이터 사용자',
      phone: context.myPageInfo?.phone || '',
      email: context.myPageInfo?.email || '',
    },
    contents: ['프로젝트 개요', '진행 과정', '핵심 역량', '성과 및 보완점'],
    self_intro: {
      greeting: `${mainExperience}를 중심으로 ${keywords.slice(0, 2).join(', ')} 역량을 설명합니다.`,
      photo_placeholder: true,
    },
    career: {
      timeline: [
        { period: '2026', title: mainExperience, description: '자료 정리와 AI 요약 기반 포트폴리오 초안 검증' },
      ],
      education: [
        { period: '재학 중', school: context.myPageInfo?.school || '부산대학교', major: context.major, status: '재학' },
      ],
      licenses: [],
      awards: [],
      skill_summary: keywords,
    },
    skills: {
      categories: [
        { category_name: '핵심 역량', items: keywords },
        { category_name: '업무 방식', items: ['자료 구조화', '결과 검증', '문서화'] },
      ],
    },
    project_list: {
      rows: [
        { project_name: mainExperience, period: '2026', description: '선택 경험 기반 포트폴리오 생성 검증', role: '자료 정리 및 검토' },
      ],
    },
    portfolio_highlights: [
      {
        project_name: mainExperience,
        basic_info: { period: '2026', team_size: '개인/팀', role_summary: '자료 분석', my_role: '핵심 경험 정리' },
        tech_stack: keywords,
        description: '목데이터 기반으로 발표용 흐름을 검증하기 위한 예시입니다.',
        diagram_summary: ['자료 선택', '키워드 선택', 'AI 초안 생성', '사용자 수정'],
      },
    ],
    missing_fields: ['정량 성과', '발표 이미지'],
  };
}

function buildMockCoverLetterData(context) {
  const mainExperience = firstExperienceName(context, '대표 경험');
  const mainKeyword = firstValue(context.keywords, '문제 해결');

  return {
    name_title: `${mainKeyword} 중심 자기소개서 연결 초안`,
    core_summary: {
      competency: `${mainKeyword} 역량`,
      experience: mainExperience,
      skill: `${context.major} 전공 기반의 자료 해석과 문서화`,
    },
    items: [
      {
        question_title: '선택한 경험을 통해 보여줄 수 있는 강점은 무엇인가요?',
        question_reason: '포트폴리오 경험을 자기소개서 문항으로 확장하기 위해서입니다.',
        answer: `${mainExperience}를 수행하며 자료를 정리하고 문제의 우선순위를 판단했습니다. 이 과정에서 ${mainKeyword} 역량을 활용해 결과를 구조화했고, 이후 포트폴리오 초안으로 확장할 수 있는 근거를 마련했습니다.`,
      },
      {
        question_title: '입사 후 어떻게 기여할 수 있나요?',
        question_reason: '전공과 경험을 직무 기여로 연결하기 위해서입니다.',
        answer: `${context.major}에서 쌓은 기본 지식과 선택 경험을 바탕으로 문제를 빠르게 이해하고, 팀이 활용할 수 있는 형태로 결과를 정리하는 구성원이 되겠습니다.`,
      },
    ],
    missing_fields: ['지원 회사명', '직무명', '정량 성과'],
  };
}

export function buildMockPortfolioResponse(format, context) {
  let rawData = buildMockDetailData(context);
  if (format.includes('1페이지')) rawData = buildMockPortfolioOnePageData(context);
  if (format === '상세 기술 포트폴리오') rawData = buildMockPortfolioDetailData(context);
  if (format.includes('PPT')) rawData = buildMockPptData(context);
  if (format.includes('자기소개')) rawData = buildMockCoverLetterData(context);

  const normalized = normalizePortfolioResponse(format, rawData, context);
  return {
    ...normalized,
    sourceLabel: '목데이터 생성',
    raw: {
      ...normalized.raw,
      mock: true,
    },
  };
}

export function isAnalysisMockEnabled() {
  return process.env.ANALYSIS_MOCK === '1';
}

function normalizeMockRevisionBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((block, index) => ({
      title: block?.title || `${index + 1}. 포트폴리오 섹션`,
      body: block?.body || block?.description || '',
    }))
    .filter((block) => block.title || block.body);
}

export function buildMockPortfolioRevision(currentDraft, revisionRequest) {
  const sourceBlocks = normalizeMockRevisionBlocks(currentDraft?.blocks || currentDraft?.slides);
  const blocks = sourceBlocks.length
    ? sourceBlocks
    : [{ title: '수정 반영 초안', body: currentDraft?.summary || 'mock 포트폴리오 초안입니다.' }];

  blocks[0] = {
    title: blocks[0].title,
    body: `${blocks[0].body}\n\n[수정 요청 반영 mock] ${revisionRequest}`,
  };

  return {
    assistantMessage: 'ANALYSIS_MOCK=1 설정으로 실제 AI 호출 없이 수정 요청을 mock 데이터에 반영했습니다.',
    blocks,
    slides: blocks,
  };
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
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';

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
