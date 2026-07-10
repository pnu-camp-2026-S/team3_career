const INFO_MISSING = '보완 필요';
const TEMPLATE_ID = 'coverletter_ppt_v2';
const FORMAT_LABEL = '자기소개서형 포트폴리오';

const stringArray = {
  type: 'ARRAY',
  items: { type: 'STRING' },
};

const applicantSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    targetRole: { type: 'STRING' },
    email: { type: 'STRING' },
    phone: { type: 'STRING' },
    schoolMajor: { type: 'STRING' },
  },
  required: ['name', 'targetRole', 'email', 'phone', 'schoolMajor'],
};

const strengthSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    evidence: { type: 'STRING' },
  },
  required: ['name', 'description', 'evidence'],
};

const competencyEvidenceSchema = {
  type: 'OBJECT',
  properties: {
    competency: { type: 'STRING' },
    experience: { type: 'STRING' },
    outcome: { type: 'STRING' },
    question: { type: 'STRING' },
  },
  required: ['competency', 'experience', 'outcome', 'question'],
};

const contributionPlanSchema = {
  type: 'OBJECT',
  properties: {
    period: { type: 'STRING' },
    title: { type: 'STRING' },
    plan: { type: 'STRING' },
  },
  required: ['period', 'title', 'plan'],
};

export const portfolioCoverLetterV2Schema = {
  type: 'OBJECT',
  properties: {
    templateId: { type: 'STRING' },
    format: { type: 'STRING' },
    applicant: applicantSchema,
    cover: {
      type: 'OBJECT',
      properties: {
        applicantLine: { type: 'STRING' },
        contactBlock: { type: 'STRING' },
        tags: stringArray,
        headline: { type: 'STRING' },
      },
      required: ['applicantLine', 'contactBlock', 'tags', 'headline'],
    },
    positioning: {
      type: 'OBJECT',
      properties: {
        statement: { type: 'STRING' },
        jobInterest: { type: 'STRING' },
        coreExperience: { type: 'STRING' },
        contributionDirection: { type: 'STRING' },
      },
      required: ['statement', 'jobInterest', 'coreExperience', 'contributionDirection'],
    },
    motivation: {
      type: 'OBJECT',
      properties: {
        companyUnderstanding: { type: 'STRING' },
        roleUnderstanding: { type: 'STRING' },
        personalConnection: { type: 'STRING' },
        finalSentence: { type: 'STRING' },
      },
      required: ['companyUnderstanding', 'roleUnderstanding', 'personalConnection', 'finalSentence'],
    },
    strengths: {
      type: 'ARRAY',
      items: strengthSchema,
    },
    experiences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          meta: { type: 'STRING' },
          keywordsText: { type: 'STRING' },
          summary: { type: 'STRING' },
          star: {
            type: 'OBJECT',
            properties: {
              situation: { type: 'STRING' },
              task: { type: 'STRING' },
              action: { type: 'STRING' },
              result: { type: 'STRING' },
            },
          },
          process: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                answer: { type: 'STRING' },
              },
              required: ['answer'],
            },
          },
          resultSentence: { type: 'STRING' },
        },
      },
    },
    competencyEvidence: {
      type: 'ARRAY',
      items: competencyEvidenceSchema,
    },
    contributionPlan: {
      type: 'ARRAY',
      items: contributionPlanSchema,
    },
    closingSentence: { type: 'STRING' },
    missingFields: stringArray,
    missing_fields: stringArray,
  },
  required: [
    'templateId',
    'format',
    'applicant',
    'cover',
    'positioning',
    'motivation',
    'strengths',
    'experiences',
    'competencyEvidence',
    'contributionPlan',
    'closingSentence',
  ],
};

function clean(value, fallback = INFO_MISSING) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function cleanMultiline(value, fallback = INFO_MISSING) {
  const text = String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  return text || fallback;
}

function truncate(value, maxLength, fallback = INFO_MISSING) {
  const text = cleanMultiline(value, fallback);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…` : text;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function firstTruthy(...values) {
  return values.find((value) => clean(value, '') !== '') || '';
}

function limitArray(items, length, factory) {
  const next = asArray(items).slice(0, length);
  while (next.length < length) {
    next.push(factory(next.length));
  }
  return next;
}

function getEducation(myPageInfo = {}) {
  const educations = asArray(myPageInfo.educations);
  return educations[0] || {};
}

function getMajor(context = {}) {
  const education = getEducation(context.myPageInfo);
  return clean(
    firstTruthy(context.major, education.major, context.myPageInfo?.major, context.myPageInfo?.schoolMajor),
    '전공 미입력'
  );
}

function getTargetRole(context = {}) {
  const chips = context.myPageInfo?.chips || {};
  const jobs = asArray(chips.jobs).join(', ');
  return clean(
    firstTruthy(
      context.purpose,
      context.myPageInfo?.desiredRole,
      context.myPageInfo?.targetRole,
      context.myPageInfo?.preferences?.detailJob,
      jobs
    ),
    '지원 직무 미입력'
  );
}

function getApplicant(context = {}) {
  const myPageInfo = context.myPageInfo || {};
  const education = getEducation(myPageInfo);
  const name = clean(firstTruthy(myPageInfo.name, myPageInfo.fullName), '지원자 정보 미입력');
  const major = getMajor(context);
  const schoolName = clean(firstTruthy(education.schoolName, education.school, myPageInfo.school), '');
  const schoolMajor = [schoolName, major].filter(Boolean).join(' / ') || major;
  return {
    name,
    targetRole: getTargetRole(context),
    email: clean(firstTruthy(myPageInfo.email), ''),
    phone: clean(firstTruthy(myPageInfo.phone, myPageInfo.mobile), ''),
    schoolMajor,
  };
}

function getEvidenceItems(context = {}) {
  const projects = asArray(context.experienceProjects).map((project, index) => ({
    id: clean(project.projectId || project.id || `EXP-${index + 1}`, `EXP-${index + 1}`),
    title: clean(project.projectName || project.name || project.headline || `경험 ${index + 1}`),
    summary: clean(project.description || project.summaryMd || project.summary || project.headline, ''),
    keywords: asArray(project.summaryKeywords || project.keywords).slice(0, 8),
  }));

  const folders = asArray(context.folderFileSummaries).map((folder, index) => ({
    id: clean(folder.projectId || folder.id || `FILE-${index + 1}`, `FILE-${index + 1}`),
    title: clean(folder.label || folder.projectName || folder.name || `업로드 자료 ${index + 1}`),
    summary: asArray(folder.files)
      .map((file) => clean([file.name, file.summary, file.textPreview].filter(Boolean).join(': '), ''))
      .filter(Boolean)
      .join(' / '),
    keywords: asArray(folder.keywords).slice(0, 8),
  }));

  return [...projects, ...folders].filter((item) => item.title || item.summary);
}

function buildInput(context = {}) {
  const applicant = getApplicant(context);
  return {
    templateId: TEMPLATE_ID,
    format: FORMAT_LABEL,
    purpose: context.purpose || '',
    selectedMajor: getMajor(context),
    selectedExperienceNames: asArray(context.experiences),
    selectedKeywords: asArray(context.keywords),
    applicant,
    myPageInfo: context.myPageInfo || {},
    evidenceItems: getEvidenceItems(context),
  };
}

function compactJson(value, maxLength = 9000) {
  const text = JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function buildPortfolioCoverLetterV2Prompt() {
  return `
[역할]
당신은 Myfitfolio의 자기소개서형 포트폴리오 작성 전문가입니다.
사용자의 마이페이지 정보, 선택한 경험 데이터, 업로드 파일 요약, 학과 정보만 근거로 8장짜리 PPT 템플릿에 들어갈 JSON 값을 작성합니다.

[중요 원칙]
1. templateId는 반드시 "${TEMPLATE_ID}"로 작성합니다.
2. format은 반드시 "${FORMAT_LABEL}"로 작성합니다.
3. 출력은 JSON 객체 하나만 반환합니다.
4. 제공되지 않은 성과, 수치, 회사명, 역할, 수상 이력, 자격 취득 여부는 만들지 않습니다.
5. 정보가 부족하면 빈칸을 꾸미지 말고 "보완 필요"처럼 표시하고 missingFields에 적습니다.
6. 문장은 PPT 카드 안에 들어가야 하므로 짧고 구체적으로 작성합니다.
7. 같은 경험이라도 자기소개서 흐름에 맞게 지원동기, 강점, STAR 경험, 기여계획으로 역할을 나누어 씁니다.

[필드별 작성 지시]
- {{cover.applicantLine}}: 지원자 이름과 희망 직무를 "이름 | 직무" 형식으로 42자 이내 작성
- {{applicant.name}}: 마이페이지 또는 로그인 정보의 지원자 이름
- {{cover.contactBlock}}: 이메일, 전화번호, 학교/전공, 지원 직무를 줄바꿈으로 90자 이내 작성
- {{cover.tags.0}}: 전공 또는 직무와 가장 직접 연결되는 핵심 태그
- {{cover.tags.1}}: 선택 경험에서 확인되는 핵심 역량 태그
- {{cover.tags.2}}: 지원 방향을 보여주는 핵심 태그
- {{cover.headline}}: 지원자를 한 문장으로 소개하는 헤드라인. 경험과 직무 연결이 보여야 함
- {{positioning.statement}}: 지원자의 직무 포지셔닝을 한 문장으로 정리
- {{positioning.jobInterest}}: 왜 이 직무에 관심이 있는지 경험 근거로 요약
- {{positioning.coreExperience}}: 포트폴리오에서 가장 강하게 밀 경험 1개를 요약
- {{positioning.contributionDirection}}: 이 경험을 바탕으로 어떤 방식으로 기여할지 요약
- {{motivation.companyUnderstanding}}: 회사/기관명이 없으면 직무나 산업 이해 중심으로 작성
- {{motivation.roleUnderstanding}}: 희망 직무가 요구하는 일과 역량을 구체적으로 설명
- {{motivation.personalConnection}}: 선택 경험이 직무 관심으로 이어진 지점을 설명
- {{motivation.finalSentence}}: 지원동기 전체를 마무리하는 자연스러운 문장
- {{strengths.0.name}}: 첫 번째 강점명. 12자 이내
- {{strengths.0.description}}: 첫 번째 강점의 의미와 직무 연결 설명
- {{strengths.0.evidence}}: 첫 번째 강점을 증명하는 경험 근거
- {{strengths.1.name}}: 두 번째 강점명. 12자 이내
- {{strengths.1.description}}: 두 번째 강점의 의미와 직무 연결 설명
- {{strengths.1.evidence}}: 두 번째 강점을 증명하는 경험 근거
- {{strengths.2.name}}: 세 번째 강점명. 12자 이내
- {{strengths.2.description}}: 세 번째 강점의 의미와 직무 연결 설명
- {{strengths.2.evidence}}: 세 번째 강점을 증명하는 경험 근거
- {{experiences.0.title}}: 대표 경험 제목
- {{experiences.0.meta}}: 기간, 역할, 활동 유형을 확인 가능한 범위에서 작성
- {{experiences.0.keywordsText}}: 대표 경험 키워드 2~4개를 "#키워드" 형식으로 작성
- {{experiences.0.summary}}: 대표 경험이 왜 중요한지 한 문장으로 요약
- {{experiences.0.star.situation}}: 대표 경험의 상황
- {{experiences.0.star.task}}: 대표 경험에서 맡은 과제
- {{experiences.0.star.action}}: 본인이 실제로 한 행동
- {{experiences.0.star.result}}: 확인 가능한 결과나 배운 점
- {{experiences.1.process.0.answer}}: 협업/실행 경험에서 문제를 발견한 내용
- {{experiences.1.process.1.answer}}: 역할 분담이나 의사소통 방식
- {{experiences.1.process.2.answer}}: 실행 과정에서 조정하거나 개선한 내용
- {{experiences.1.process.3.answer}}: 결과를 정리하고 다음 행동으로 연결한 내용
- {{experiences.1.resultSentence}}: 협업/실행 경험을 직무 강점으로 마무리하는 문장
- {{competencyEvidence.0.competency}}: 역량 1개. 12자 이내
- {{competencyEvidence.0.experience}}: 해당 역량을 보여주는 경험명
- {{competencyEvidence.0.outcome}}: 확인 가능한 성과, 결과, 배운 점
- {{competencyEvidence.0.question}}: 연결 가능한 자소서 문항 유형
- {{competencyEvidence.1.competency}}: 역량 1개. 12자 이내
- {{competencyEvidence.1.experience}}: 해당 역량을 보여주는 경험명
- {{competencyEvidence.1.outcome}}: 확인 가능한 성과, 결과, 배운 점
- {{competencyEvidence.1.question}}: 연결 가능한 자소서 문항 유형
- {{competencyEvidence.2.competency}}: 역량 1개. 12자 이내
- {{competencyEvidence.2.experience}}: 해당 역량을 보여주는 경험명
- {{competencyEvidence.2.outcome}}: 확인 가능한 성과, 결과, 배운 점
- {{competencyEvidence.2.question}}: 연결 가능한 자소서 문항 유형
- {{competencyEvidence.3.competency}}: 역량 1개. 12자 이내
- {{competencyEvidence.3.experience}}: 해당 역량을 보여주는 경험명
- {{competencyEvidence.3.outcome}}: 확인 가능한 성과, 결과, 배운 점
- {{competencyEvidence.3.question}}: 연결 가능한 자소서 문항 유형
- {{contributionPlan.0.period}}: 초기 기여 시점. 예: 30일
- {{contributionPlan.0.title}}: 초기 기여 제목. 10자 이내
- {{contributionPlan.0.plan}}: 초기 학습과 적응 계획
- {{contributionPlan.1.period}}: 중기 기여 시점. 예: 90일
- {{contributionPlan.1.title}}: 중기 기여 제목. 10자 이내
- {{contributionPlan.1.plan}}: 실무 기여와 개선 계획
- {{contributionPlan.2.period}}: 장기 기여 시점. 예: 180일
- {{contributionPlan.2.title}}: 장기 기여 제목. 10자 이내
- {{contributionPlan.2.plan}}: 장기 성장과 확장 계획
- {{closingSentence}}: 자기소개서형 포트폴리오를 닫는 최종 문장
`;
}

export function buildPortfolioCoverLetterV2UserPrompt(context) {
  return `
아래 입력값을 바탕으로 Myfitfolio 자기소개서형 PPT 템플릿 JSON을 생성하세요.

[입력 데이터]
${compactJson(buildInput(context))}

[작성 방식]
- evidenceItems에 있는 경험과 파일 요약을 우선 근거로 사용하세요.
- selectedKeywords가 있으면 cover.tags, strengths, competencyEvidence에 자연스럽게 반영하세요.
- selectedMajor와 applicant.schoolMajor를 직무 적합성 설명에 반영하세요.
- 정보가 부족한 필드는 거짓으로 채우지 말고 보완 필요로 표시하세요.
`;
}

function normalizeTags(tags, context) {
  const input = buildInput(context);
  return limitArray(
    [...asArray(tags), input.selectedMajor, ...input.selectedKeywords],
    3,
    (index) => ['직무 이해', '문제 해결', '협업 실행'][index]
  ).map((tag) => truncate(tag, 12));
}

function normalizeStrengths(items, context) {
  const evidence = getEvidenceItems(context);
  const keywords = asArray(context.keywords);
  return limitArray(items, 3, (index) => ({
    name: keywords[index] || ['문제 해결', '학습 실행', '소통 협업'][index],
    description: `${keywords[index] || ['문제 해결', '학습 실행', '소통 협업'][index]} 역량을 경험 근거로 설명합니다.`,
    evidence: evidence[index]?.title || INFO_MISSING,
  })).map((item) => ({
    name: truncate(item?.name, 12),
    description: truncate(item?.description, 52),
    evidence: truncate(item?.evidence, 34),
  }));
}

function normalizeExperiences(items, context) {
  const evidence = getEvidenceItems(context);
  const first = items?.[0] || {};
  const second = items?.[1] || {};
  const primary = evidence[0] || {};
  const keywords = asArray(first.keywordsText ? String(first.keywordsText).split(/\s+/) : context.keywords);
  const processItems = limitArray(second.process, 4, (index) => ({
    answer: [
      '문제 상황을 파악하고 학습자 또는 사용자 관점에서 원인을 정리했습니다.',
      '역할을 나누고 필요한 자료와 설명 방식을 조정했습니다.',
      '실행 과정에서 이해도와 반응을 확인하며 내용을 개선했습니다.',
      '결과를 정리하고 다음 활동에 적용할 개선점을 도출했습니다.',
    ][index],
  }));

  return [
    {
      title: truncate(first.title || primary.title || '대표 경험', 32),
      meta: truncate(first.meta || '기간/역할 보완 필요', 45),
      keywordsText: truncate(first.keywordsText || keywords.slice(0, 4).map((keyword) => `#${keyword}`).join(' '), 40),
      summary: truncate(first.summary || primary.summary || '대표 경험 요약 보완 필요', 75),
      star: {
        situation: truncate(first.star?.situation || '상황 보완 필요', 65),
        task: truncate(first.star?.task || '과제 보완 필요', 65),
        action: truncate(first.star?.action || '행동 보완 필요', 65),
        result: truncate(first.star?.result || '결과 보완 필요', 65),
      },
    },
    {
      process: processItems.map((item) => ({ answer: truncate(item.answer, 48) })),
      resultSentence: truncate(second.resultSentence || '경험을 통해 직무에 필요한 실행력과 소통 방식을 확인했습니다.', 95),
    },
  ];
}

function normalizeCompetencyEvidence(items, context) {
  const evidence = getEvidenceItems(context);
  const keywords = asArray(context.keywords);
  return limitArray(items, 4, (index) => ({
    competency: keywords[index] || ['문제 해결', '기술 이해', '소통 협업', '성장 태도'][index],
    experience: evidence[index % Math.max(evidence.length, 1)]?.title || INFO_MISSING,
    outcome: evidence[index % Math.max(evidence.length, 1)]?.summary || '결과 보완 필요',
    question: ['지원동기', '직무역량', '협업경험', '성장과정'][index],
  })).map((item) => ({
    competency: truncate(item?.competency, 12),
    experience: truncate(item?.experience, 22),
    outcome: truncate(item?.outcome, 28),
    question: truncate(item?.question, 16),
  }));
}

function normalizeContributionPlan(items) {
  return limitArray(items, 3, (index) => ({
    period: ['30일', '90일', '180일'][index],
    title: ['직무 이해', '실무 기여', '확장 성장'][index],
    plan: [
      '업무와 서비스 구조를 빠르게 학습하고 필요한 지식을 정리합니다.',
      '경험에서 검증한 문제 해결 방식을 실무 개선에 연결합니다.',
      '사용자와 팀에 도움이 되는 개선안을 제안하며 성장합니다.',
    ][index],
  })).map((item) => ({
    period: truncate(item?.period, 8),
    title: truncate(item?.title, 10),
    plan: truncate(item?.plan, 42),
  }));
}

export function normalizePortfolioCoverLetterV2(data = {}, context = {}) {
  const applicant = {
    ...getApplicant(context),
    ...(data.applicant || {}),
  };
  const contactBlock = [
    applicant.email,
    applicant.phone,
    applicant.schoolMajor,
    applicant.targetRole,
  ].filter(Boolean).join('\n');

  const raw = {
    templateId: TEMPLATE_ID,
    format: FORMAT_LABEL,
    applicant: {
      name: truncate(applicant.name, 24),
      targetRole: truncate(applicant.targetRole, 30),
      email: truncate(applicant.email, 42, ''),
      phone: truncate(applicant.phone, 24, ''),
      schoolMajor: truncate(applicant.schoolMajor, 42),
    },
    cover: {
      applicantLine: truncate(data.cover?.applicantLine || `${applicant.name} | ${applicant.targetRole}`, 42),
      contactBlock: truncate(data.cover?.contactBlock || contactBlock, 90, ''),
      tags: normalizeTags(data.cover?.tags, context),
      headline: truncate(data.cover?.headline || data.headline || `${applicant.targetRole}에 연결되는 경험 기반 지원자입니다.`, 95),
    },
    positioning: {
      statement: truncate(data.positioning?.statement || '경험을 직무 문제 해결력으로 연결하는 지원자입니다.', 105),
      jobInterest: truncate(data.positioning?.jobInterest || '선택 경험을 통해 직무 관심과 학습 방향을 구체화했습니다.', 95),
      coreExperience: truncate(data.positioning?.coreExperience || '대표 경험 보완 필요', 95),
      contributionDirection: truncate(data.positioning?.contributionDirection || '경험에서 확인한 실행 방식을 실무 기여로 연결합니다.', 95),
    },
    motivation: {
      companyUnderstanding: truncate(data.motivation?.companyUnderstanding || '지원 회사 또는 산업 이해 보완 필요', 95),
      roleUnderstanding: truncate(data.motivation?.roleUnderstanding || '희망 직무가 요구하는 역량과 업무 이해를 정리했습니다.', 95),
      personalConnection: truncate(data.motivation?.personalConnection || '선택 경험이 직무 관심으로 이어진 지점을 설명합니다.', 95),
      finalSentence: truncate(data.motivation?.finalSentence || '이 경험을 바탕으로 직무에서 필요한 문제 해결에 기여하고 싶습니다.', 110),
    },
    strengths: normalizeStrengths(data.strengths, context),
    experiences: normalizeExperiences(data.experiences, context),
    competencyEvidence: normalizeCompetencyEvidence(data.competencyEvidence, context),
    contributionPlan: normalizeContributionPlan(data.contributionPlan),
    closingSentence: truncate(data.closingSentence || '근거 있는 경험을 바탕으로 직무에 필요한 가치를 만들어가겠습니다.', 90),
    missingFields: asArray(data.missingFields || data.missing_fields).map((item) => truncate(item, 40)),
  };

  const blocks = [
    {
      title: '지원자 포지셔닝',
      body: [raw.positioning.statement, raw.positioning.jobInterest, raw.positioning.contributionDirection].join('\n'),
    },
    {
      title: '지원동기',
      body: Object.values(raw.motivation).join('\n'),
    },
    {
      title: '직무 적합 강점',
      body: raw.strengths.map((item) => `${item.name}: ${item.description} (${item.evidence})`).join('\n'),
    },
    {
      title: raw.experiences[0].title,
      body: [
        raw.experiences[0].summary,
        `S: ${raw.experiences[0].star.situation}`,
        `T: ${raw.experiences[0].star.task}`,
        `A: ${raw.experiences[0].star.action}`,
        `R: ${raw.experiences[0].star.result}`,
      ].join('\n'),
    },
    {
      title: '역량 근거',
      body: raw.competencyEvidence.map((item) => `${item.competency}: ${item.experience} - ${item.outcome}`).join('\n'),
    },
    {
      title: '기여 계획',
      body: raw.contributionPlan.map((item) => `${item.period} ${item.title}: ${item.plan}`).join('\n'),
    },
  ];

  return {
    title: raw.cover.applicantLine,
    summary: raw.cover.headline,
    blocks,
    slides: blocks,
    competencies: raw.strengths.map((item) => item.name),
    applicationSentences: [raw.motivation.finalSentence, raw.closingSentence],
    raw,
  };
}

export function buildMockCoverLetterV2Data(context = {}) {
  const input = buildInput(context);
  const evidence = input.evidenceItems;
  const mainExperience = evidence[0]?.title || input.selectedExperienceNames[0] || '대표 경험';
  const secondExperience = evidence[1]?.title || mainExperience;
  const keyword = input.selectedKeywords[0] || '문제 해결';

  return {
    templateId: TEMPLATE_ID,
    format: FORMAT_LABEL,
    applicant: input.applicant,
    cover: {
      applicantLine: `${input.applicant.name} | ${input.applicant.targetRole}`,
      contactBlock: [input.applicant.email, input.applicant.phone, input.applicant.schoolMajor, input.applicant.targetRole].filter(Boolean).join('\n'),
      tags: normalizeTags([input.selectedMajor, keyword, mainExperience], context),
      headline: `${mainExperience}을 바탕으로 ${keyword} 역량을 설명하는 지원자입니다.`,
    },
    positioning: {
      statement: `${input.selectedMajor} 기반 경험을 ${input.applicant.targetRole} 문제 해결력으로 연결합니다.`,
      jobInterest: `${mainExperience}을 통해 직무에서 필요한 사용자 이해와 실행 흐름을 배웠습니다.`,
      coreExperience: `${mainExperience}에서 문제를 정리하고 필요한 실행 방식을 설계했습니다.`,
      contributionDirection: `경험에서 얻은 ${keyword} 방식을 실무 개선에 적용하겠습니다.`,
    },
    motivation: {
      companyUnderstanding: '지원 조직의 서비스와 사용자가 겪는 문제를 함께 이해하는 태도가 중요하다고 보았습니다.',
      roleUnderstanding: `${input.applicant.targetRole}은 문제를 구조화하고 실행 가능한 해결 흐름을 만드는 역할입니다.`,
      personalConnection: `${mainExperience}을 통해 기술이나 활동을 사람의 이해 수준에 맞게 연결하는 경험을 했습니다.`,
      finalSentence: '이 경험을 바탕으로 사용자의 문제를 구체적으로 해결하는 일에 기여하고 싶습니다.',
    },
    strengths: [
      { name: keyword, description: '문제를 정의하고 필요한 해결 흐름을 차분히 정리합니다.', evidence: mainExperience },
      { name: '설명력', description: '상대의 이해 수준에 맞춰 내용을 재구성합니다.', evidence: secondExperience },
      { name: '학습력', description: '새로운 도구와 개념을 빠르게 익혀 실행에 적용합니다.', evidence: mainExperience },
    ],
    experiences: [
      {
        title: mainExperience,
        meta: '기간/역할 보완 필요',
        keywordsText: normalizeTags([keyword, input.selectedMajor, '실행'], context).map((item) => `#${item}`).join(' '),
        summary: `${mainExperience}은 직무 관심과 강점을 함께 보여주는 대표 경험입니다.`,
        star: {
          situation: '참여자나 사용자가 내용을 이해하기 어려운 상황이 있었습니다.',
          task: '내용을 쉽게 전달하고 실행 가능한 흐름으로 바꾸는 역할이 필요했습니다.',
          action: '자료를 정리하고 설명 순서를 조정해 이해하기 쉬운 방식으로 전달했습니다.',
          result: '경험을 통해 사용자 관점에서 문제를 풀어가는 태도를 배웠습니다.',
        },
      },
      {
        process: [
          { answer: '문제의 원인과 대상자의 이해 수준을 먼저 파악했습니다.' },
          { answer: '필요한 역할을 나누고 설명 자료와 실행 방식을 조정했습니다.' },
          { answer: '반응을 확인하며 설명 순서와 난이도를 계속 개선했습니다.' },
          { answer: '결과를 정리해 다음 활동에서 보완할 지점을 남겼습니다.' },
        ],
        resultSentence: '협업과 실행 과정을 통해 직무에 필요한 문제 해결 흐름을 익혔습니다.',
      },
    ],
    competencyEvidence: [
      { competency: keyword, experience: mainExperience, outcome: '문제 구조화 경험', question: '직무역량' },
      { competency: '설명력', experience: secondExperience, outcome: '이해 수준 맞춤', question: '협업경험' },
      { competency: '실행력', experience: mainExperience, outcome: '활동 흐름 개선', question: '성장과정' },
      { competency: '학습력', experience: secondExperience, outcome: '새 개념 적용', question: '지원동기' },
    ],
    contributionPlan: [
      { period: '30일', title: '직무 이해', plan: '업무 구조와 사용자 문제를 빠르게 학습하고 정리합니다.' },
      { period: '90일', title: '실무 기여', plan: '경험에서 익힌 문제 해결 방식을 실무 개선에 적용합니다.' },
      { period: '180일', title: '확장 성장', plan: '팀과 사용자에게 도움이 되는 개선안을 제안합니다.' },
    ],
    closingSentence: '경험을 근거로 배우고 실행하며 직무에 필요한 가치를 만들겠습니다.',
    missingFields: [],
  };
}
