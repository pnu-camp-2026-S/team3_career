const INFO_MISSING = '제공된 정보 부족';

const evidenceIds = {
  type: 'ARRAY',
  items: { type: 'STRING' },
};

const labelValueSchema = {
  type: 'OBJECT',
  properties: {
    label: { type: 'STRING' },
    value: { type: 'STRING' },
  },
  required: ['label', 'value'],
};

export const portfolioOnePageSchema = {
  type: 'OBJECT',
  properties: {
    meta: {
      type: 'OBJECT',
      properties: {
        template_version: { type: 'STRING' },
        language: { type: 'STRING' },
        tone: { type: 'STRING' },
      },
      required: ['template_version', 'language', 'tone'],
    },
    profile: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        gender: { type: 'STRING' },
        birth: { type: 'STRING' },
        email: { type: 'STRING' },
        phone: { type: 'STRING' },
        address: { type: 'STRING' },
        school_type: { type: 'STRING' },
        school_name: { type: 'STRING' },
        enrollment_period: { type: 'STRING' },
        major: { type: 'STRING' },
        minor: { type: 'STRING' },
        profile_image_path: { type: 'STRING' },
      },
      required: [
        'name',
        'gender',
        'birth',
        'email',
        'phone',
        'address',
        'school_type',
        'school_name',
        'enrollment_period',
        'major',
        'minor',
        'profile_image_path',
      ],
    },
    headline: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        one_line_intro: { type: 'STRING' },
        self_intro: { type: 'STRING' },
        fit_label: { type: 'STRING' },
      },
      required: ['title', 'one_line_intro', 'self_intro', 'fit_label'],
    },
    target_fit: {
      type: 'OBJECT',
      properties: {
        role: labelValueSchema,
        industry: labelValueSchema,
        company: labelValueSchema,
      },
      required: ['role', 'industry', 'company'],
    },
    core_competencies: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          evidence_ids: evidenceIds,
        },
        required: ['text', 'evidence_ids'],
      },
    },
    representative_experiences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          summary: { type: 'STRING' },
          fit_point: { type: 'STRING' },
          evidence_ids: evidenceIds,
        },
        required: ['title', 'summary', 'fit_point', 'evidence_ids'],
      },
    },
    skill_keywords: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          evidence_ids: evidenceIds,
        },
        required: ['text', 'evidence_ids'],
      },
    },
    license_awards_education: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          evidence_ids: evidenceIds,
        },
        required: ['text', 'evidence_ids'],
      },
    },
    differentiator: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING' },
        evidence_ids: evidenceIds,
      },
      required: ['text', 'evidence_ids'],
    },
    validation_notes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'meta',
    'profile',
    'headline',
    'target_fit',
    'core_competencies',
    'representative_experiences',
    'skill_keywords',
    'license_awards_education',
    'differentiator',
    'validation_notes',
  ],
};

function clean(value, fallback = INFO_MISSING) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function truncate(value, maxLength, fallback = INFO_MISSING) {
  const text = clean(value, fallback);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getEducation(myPageInfo = {}) {
  const educations = Array.isArray(myPageInfo.educations) ? myPageInfo.educations : [];
  return educations[0] || {};
}

function getTargetRole(myPageInfo = {}) {
  const chips = myPageInfo.chips || {};
  const jobs = Array.isArray(chips.jobs) ? chips.jobs.filter(Boolean).join(', ') : '';
  return clean(
    myPageInfo.desiredRole
      || myPageInfo.targetRole
      || myPageInfo.job
      || myPageInfo.jobTitle
      || myPageInfo.preferences?.detailJob
      || jobs,
    INFO_MISSING
  );
}

function getIndustry(myPageInfo = {}) {
  const chips = myPageInfo.chips || {};
  const industries = Array.isArray(myPageInfo.interestIndustries)
    ? myPageInfo.interestIndustries
    : myPageInfo.interestIndustry || chips.industries || myPageInfo.preferences?.workIndustry;
  return clean(Array.isArray(industries) ? industries.filter(Boolean).join(', ') : industries, INFO_MISSING);
}

function getCompany(myPageInfo = {}) {
  const chips = myPageInfo.chips || {};
  const companies = Array.isArray(myPageInfo.interestCompanies)
    ? myPageInfo.interestCompanies
    : myPageInfo.interestCompany || chips.companies;
  return clean(Array.isArray(companies) ? companies.filter(Boolean).join(', ') : companies, INFO_MISSING);
}

function projectEvidenceId(project, index) {
  return clean(project.projectId || project.id || `PRJ-${String(index + 1).padStart(3, '0')}`, `PRJ-${index + 1}`);
}

function buildApprovedActivities(context) {
  const projects = Array.isArray(context.experienceProjects) ? context.experienceProjects : [];
  const projectActivities = projects.map((project, index) => ({
    evidence_id: projectEvidenceId(project, index),
    approved: true,
    title: clean(project.projectName || project.headline || `프로젝트 ${index + 1}`),
    summary: clean(project.description || project.summaryMd || project.headline),
    skills: Array.isArray(project.summaryKeywords) ? project.summaryKeywords.slice(0, 8) : [],
  }));

  const education = getEducation(context.myPageInfo);
  const educationActivities = [
    education.major && {
      evidence_id: 'EDU-001',
      approved: true,
      title: `${education.major} 전공 정보`,
      summary: `마이페이지 학력 정보에 ${education.major} 전공이 입력되어 있음`,
      skills: [education.major],
    },
    education.minor && {
      evidence_id: 'EDU-002',
      approved: true,
      title: `${education.minor} 부전공/연계전공 정보`,
      summary: `마이페이지 학력 정보에 ${education.minor} 부전공/연계전공이 입력되어 있음`,
      skills: [education.minor],
    },
  ].filter(Boolean);

  return [...projectActivities, ...educationActivities];
}

function buildKeyProjects(context) {
  return (Array.isArray(context.experienceProjects) ? context.experienceProjects : []).map((project, index) => ({
    evidence_id: projectEvidenceId(project, index),
    approved: true,
    title: clean(project.projectName || project.headline || `프로젝트 ${index + 1}`),
    role: clean(project.headline || '자료 분석 및 포트폴리오 근거 정리'),
    result: clean(project.description || project.summaryMd),
  }));
}

function buildSkills(context) {
  const keywords = Array.isArray(context.keywords) ? context.keywords : [];
  return keywords.slice(0, 8).map((keyword, index) => ({
    evidence_id: `SKL-${String(index + 1).padStart(3, '0')}`,
    approved: true,
    name: clean(keyword),
  }));
}

function buildEducationItems(context) {
  const education = getEducation(context.myPageInfo);
  return [
    education.major && { evidence_id: 'EDU-001', approved: true, title: `${education.major} 전공` },
    education.minor && { evidence_id: 'EDU-002', approved: true, title: `${education.minor} 부전공/연계전공` },
  ].filter(Boolean);
}

export function buildPortfolioOnePagePrompt() {
  return `
[역할]
당신은 Myfitfolio의 취업 포트폴리오 1페이지 요약본 생성기입니다.
사용자가 승인한 활동 요약, 프로젝트, 기술, 수상/자격/교육 정보와 마이페이지 기본 정보만 사용해 세로형 1페이지 포트폴리오 JSON을 생성합니다.

[절대 규칙]
1. 입력에 없는 경험, 성과, 수치, 역할, 기술, 기업명, 자격증, 수상 이력을 만들지 마세요.
2. approved가 true인 항목만 사용하세요.
3. 대표 경험에는 반드시 evidence_ids를 포함하세요.
4. evidence_id가 없는 활동은 대표 경험으로 선택하지 마세요.
5. 정보가 부족하면 추측하지 말고 정확히 '${INFO_MISSING}'이라고 작성하세요.
6. 개인정보는 profile 입력값에서만 가져오고 임의 생성하지 마세요.
7. 프로필 이미지가 없으면 profile_image_path는 빈 문자열로 두세요.
8. 1페이지에 들어가야 하므로 모든 문장을 짧게 작성하세요.
9. 목표 직무와 관련도가 높은 경험과 역량을 먼저 배치하세요.
10. 한국어로 자연스럽고 취업 포트폴리오에 어울리는 문체를 사용하세요.
11. 과장 표현을 피하고, 근거가 있는 강점만 표현하세요.

[고정 길이 제한]
- headline.title: 22자 이내
- headline.one_line_intro: 38자 이내
- headline.self_intro: 95자 이내
- headline.fit_label: 34자 이내
- target_fit.role/industry/company.value: 각 34자 이내
- core_competencies: 최대 3개, 각 34자 이내
- representative_experiences: 최대 3개
- representative_experiences.title: 각 21자 이내
- representative_experiences.summary: 각 46자 이내
- representative_experiences.fit_point: 각 30자 이내
- skill_keywords: 최대 8개, 각 8자 이내
- license_awards_education: 최대 4개, 각 28자 이내
- differentiator.text: 62자 이내
`;
}

export function buildPortfolioOnePageInput(context) {
  const education = getEducation(context.myPageInfo);
  const approvedActivities = buildApprovedActivities(context);
  return {
    target_role: getTargetRole(context.myPageInfo),
    major: clean(
      [
        context.major || education.major,
        education.minor && `부전공/연계전공: ${education.minor}`,
      ].filter(Boolean).join(', '),
      INFO_MISSING
    ),
    industry: getIndustry(context.myPageInfo),
    company: getCompany(context.myPageInfo),
    tone_and_manner: '단정하고 신뢰감 있는 취업 포트폴리오 문체',
    profile: {
      name: clean(context.myPageInfo?.name, INFO_MISSING),
      gender: clean(context.myPageInfo?.gender, INFO_MISSING),
      birth: clean(context.myPageInfo?.birth || context.myPageInfo?.birthDate, INFO_MISSING),
      email: clean(context.myPageInfo?.email, INFO_MISSING),
      phone: clean(context.myPageInfo?.phone, INFO_MISSING),
      address: clean(context.myPageInfo?.address, INFO_MISSING),
      profile_image_path: clean(context.myPageInfo?.profileImagePath || context.myPageInfo?.photo, ''),
    },
    education_profile: {
      school_type: clean(education.schoolType, INFO_MISSING),
      school_name: clean(education.schoolName || education.school || context.myPageInfo?.school, INFO_MISSING),
      enrollment_period: clean([education.startDate || education.periodStart, education.endDate || education.periodEnd].filter(Boolean).join(' ~ '), INFO_MISSING),
      major: clean(education.major || context.major, INFO_MISSING),
      minor: clean(education.minor, INFO_MISSING),
    },
    approved_activity_summaries: approvedActivities,
    key_projects: buildKeyProjects(context),
    skills: buildSkills(context),
    license_awards_education: buildEducationItems(context),
  };
}

export function buildPortfolioOnePageUserPrompt(context) {
  const input = buildPortfolioOnePageInput(context);
  return `
아래 입력값을 바탕으로 Myfitfolio 세로형 1페이지 포트폴리오 요약본 JSON을 생성하세요.

[목표 직무]
${input.target_role}

[전공/부전공/연계전공]
${input.major}

[관심 산업]
${input.industry}

[관심 기업]
${input.company}

[포트폴리오 전체 톤앤매너]
${input.tone_and_manner}

[마이페이지 기본 정보]
${JSON.stringify(input.profile, null, 2)}

[학력 정보]
${JSON.stringify(input.education_profile, null, 2)}

[사용자가 승인한 활동 요약]
${JSON.stringify(input.approved_activity_summaries, null, 2)}

[핵심 프로젝트/경험 목록]
${JSON.stringify(input.key_projects, null, 2)}

[보유 기술/역량]
${JSON.stringify(input.skills, null, 2)}

[수상/자격증/교육 이력]
${JSON.stringify(input.license_awards_education, null, 2)}

작성 지침:
- approved가 true인 정보만 사용하세요.
- evidence_id가 있는 정보만 대표 경험과 상세 근거로 사용하세요.
- 정보가 없으면 '${INFO_MISSING}'이라고 쓰세요.
- 설명 문장이나 마크다운 없이 JSON 객체만 반환하세요.
`;
}

export function normalizePortfolioOnePage(data, context) {
  const profile = data.profile || {};
  const headline = data.headline || {};
  const targetFit = data.target_fit || {};
  const competencies = Array.isArray(data.core_competencies) ? data.core_competencies : [];
  const experiences = Array.isArray(data.representative_experiences) ? data.representative_experiences : [];
  const skills = Array.isArray(data.skill_keywords) ? data.skill_keywords : [];
  const educationItems = Array.isArray(data.license_awards_education) ? data.license_awards_education : [];
  const differentiator = data.differentiator || {};

  const blocks = [
    {
      title: '헤드라인',
      body: stringifyLines([
        headline.title,
        headline.one_line_intro,
        headline.self_intro,
        headline.fit_label,
      ]),
    },
    {
      title: 'ABOUT ME',
      body: stringifyLines([
        `이름: ${profile.name || INFO_MISSING}`,
        `성별: ${profile.gender || INFO_MISSING}`,
        `생년월일: ${profile.birth || INFO_MISSING}`,
        `이메일: ${profile.email || INFO_MISSING}`,
        `휴대폰: ${profile.phone || INFO_MISSING}`,
        `주소: ${profile.address || INFO_MISSING}`,
        `학교: ${profile.school_name || INFO_MISSING}`,
        `전공: ${profile.major || context.major || INFO_MISSING}`,
        `부전공: ${profile.minor || INFO_MISSING}`,
      ]),
    },
    {
      title: 'TARGET FIT',
      body: stringifyLines([
        `ROLE: ${targetFit.role?.value || INFO_MISSING}`,
        `INDUSTRY: ${targetFit.industry?.value || INFO_MISSING}`,
        `COMPANY: ${targetFit.company?.value || INFO_MISSING}`,
      ]),
    },
    {
      title: 'CORE COMPETENCIES',
      body: stringifyLines(competencies.map((item) => item.text)),
    },
    {
      title: 'REPRESENTATIVE EXPERIENCES',
      body: stringifyLines(experiences.map((item) => `${item.title}: ${item.summary} (${item.fit_point})`)),
    },
    {
      title: 'SKILL KEYWORDS',
      body: stringifyLines(skills.map((item) => item.text)),
    },
    {
      title: 'LICENSE · AWARDS · EDUCATION',
      body: stringifyLines(educationItems.map((item) => item.text)),
    },
    {
      title: 'DIFFERENTIATOR',
      body: differentiator.text || INFO_MISSING,
    },
  ].filter((block) => block.body);

  return {
    title: truncate(headline.title || `${context.major || 'Myfitfolio'} 1P 요약`, 40),
    summary: truncate(headline.one_line_intro || headline.self_intro || '', 120, `${context.purpose}용 1페이지 요약본입니다.`),
    blocks,
    slides: blocks,
    competencies: competencies.map((item) => item.text).filter(Boolean),
    applicationSentences: [differentiator.text].filter(Boolean),
    raw: {
      ...data,
      meta: {
        template_version: 'portfolio_1page_vertical_v2',
        language: 'ko',
        tone: '단정하고 신뢰감 있는 취업 포트폴리오 문체',
        ...(data.meta || {}),
      },
    },
  };
}

function stringifyLines(items) {
  return (items || []).map((item) => clean(item, '')).filter(Boolean).join('\n');
}

export function buildMockPortfolioOnePageData(context) {
  const input = buildPortfolioOnePageInput(context);
  const activities = input.approved_activity_summaries;
  const firstActivity = activities[0];
  const secondActivity = activities[1];
  const role = input.target_role;
  const industry = input.industry;
  const company = input.company;
  const skillItems = input.skills.length
    ? input.skills
    : input.approved_activity_summaries.flatMap((item) => item.skills || []).slice(0, 8).map((name, index) => ({
      evidence_id: `SKL-${String(index + 1).padStart(3, '0')}`,
      approved: true,
      name,
    }));

  return {
    meta: {
      template_version: 'portfolio_1page_vertical_v2',
      language: 'ko',
      tone: '단정하고 신뢰감 있는 취업 포트폴리오 문체',
    },
    profile: {
      ...input.profile,
      school_type: input.education_profile.school_type,
      school_name: input.education_profile.school_name,
      enrollment_period: input.education_profile.enrollment_period,
      major: input.education_profile.major,
      minor: input.education_profile.minor,
    },
    headline: {
      title: truncate(role !== INFO_MISSING ? `${role} 포트폴리오` : `${input.education_profile.major} 1P 요약`, 22),
      one_line_intro: truncate(role !== INFO_MISSING ? `${role} 목표에 맞춘 근거 기반 초안입니다.` : '학력과 승인 자료 기반 초안입니다.', 38),
      self_intro: truncate(firstActivity?.summary || '승인된 활동 자료를 추가하면 대표 경험과 직무 적합도가 더 구체화됩니다.', 95),
      fit_label: truncate(role !== INFO_MISSING ? `${role} 맞춤 요약` : '학력 기반 요약', 34),
    },
    target_fit: {
      role: { label: 'ROLE', value: truncate(role, 34) },
      industry: { label: 'INDUSTRY', value: truncate(industry, 34) },
      company: { label: 'COMPANY', value: truncate(company, 34) },
    },
    core_competencies: [
      firstActivity && {
        text: truncate(`${firstActivity.title} 기반 역량`, 34),
        evidence_ids: [firstActivity.evidence_id],
      },
      secondActivity && {
        text: truncate(`${secondActivity.title} 기반 역량`, 34),
        evidence_ids: [secondActivity.evidence_id],
      },
      !firstActivity && {
        text: '목표 직무 입력 필요',
        evidence_ids: [],
      },
    ].filter(Boolean).slice(0, 3),
    representative_experiences: activities.slice(0, 3).map((item) => ({
      title: truncate(item.title, 21),
      summary: truncate(item.summary, 46),
      fit_point: truncate(`${item.title} 근거`, 30),
      evidence_ids: [item.evidence_id],
    })),
    skill_keywords: skillItems.slice(0, 8).map((item) => ({
      text: truncate(item.name, 8),
      evidence_ids: [item.evidence_id],
    })),
    license_awards_education: (input.license_awards_education.length ? input.license_awards_education : [{ evidence_id: 'NO-DATA', title: INFO_MISSING }])
      .slice(0, 4)
      .map((item) => ({
        text: truncate(item.title, 28),
        evidence_ids: [item.evidence_id].filter(Boolean),
      })),
    differentiator: {
      text: truncate(role !== INFO_MISSING
        ? `${role} 목표에 맞춰 승인된 근거를 한 장으로 압축했습니다.`
        : '직무·산업·승인 활동 입력 시 완성도가 높아집니다.', 62),
      evidence_ids: activities.slice(0, 2).map((item) => item.evidence_id),
    },
    validation_notes: activities.length ? [] : ['대표 경험으로 사용할 승인 활동이 부족합니다.'],
  };
}
