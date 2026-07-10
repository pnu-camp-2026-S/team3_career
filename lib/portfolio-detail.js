const INFO_MISSING = '제공된 정보 부족';

const stringArray = {
  type: 'ARRAY',
  items: { type: 'STRING' },
};

const detailedTemplateValuesSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    target_role: { type: 'STRING' },
    phone: { type: 'STRING' },
    email: { type: 'STRING' },
    portfolio_link: { type: 'STRING' },
    profile_image: { type: 'STRING' },
    one_line_intro: { type: 'STRING' },
    core_competency_1: { type: 'STRING' },
    core_competency_2: { type: 'STRING' },
    core_competency_3: { type: 'STRING' },
    core_competency_4: { type: 'STRING' },
    project_label: { type: 'STRING' },
    project_one_line_description: { type: 'STRING' },
    project_period: { type: 'STRING' },
    team_size: { type: 'STRING' },
    project_role: { type: 'STRING' },
    tech_stack: { type: 'STRING' },
    service_context: { type: 'STRING' },
    target_user: { type: 'STRING' },
    user_problem_before: { type: 'STRING' },
    user_need: { type: 'STRING' },
    core_goal: { type: 'STRING' },
    expected_change: { type: 'STRING' },
    deliverable_type: { type: 'STRING' },
    overview_image: { type: 'STRING' },
    problem_design: { type: 'STRING' },
    requirement_analysis: { type: 'STRING' },
    feature_implementation: { type: 'STRING' },
    test_iteration: { type: 'STRING' },
    process_summary: { type: 'STRING' },
    process_detail: { type: 'STRING' },
    owned_scope: { type: 'STRING' },
    responsibility_decision: { type: 'STRING' },
    implemented_feature_1: { type: 'STRING' },
    implemented_feature_2: { type: 'STRING' },
    collaboration_method: { type: 'STRING' },
    communication_method: { type: 'STRING' },
    problem_solving_summary: { type: 'STRING' },
    challenge_problem: { type: 'STRING' },
    decision_basis: { type: 'STRING' },
    solution_change: { type: 'STRING' },
    process_image: { type: 'STRING' },
    result_summary: { type: 'STRING' },
    result_retrospective_flow: { type: 'STRING' },
    final_result: { type: 'STRING' },
    core_output: { type: 'STRING' },
    user_value: { type: 'STRING' },
    experience_improvement: { type: 'STRING' },
    limitation: { type: 'STRING' },
    confirmed_constraint: { type: 'STRING' },
    next_improvement: { type: 'STRING' },
    technical_or_planning_refinement: { type: 'STRING' },
    lesson_learned: { type: 'STRING' },
    project_conclusion: { type: 'STRING' },
    result_image: { type: 'STRING' },
    missing_fields: stringArray,
  },
  required: [
    'name',
    'target_role',
    'phone',
    'email',
    'portfolio_link',
    'profile_image',
    'one_line_intro',
    'core_competency_1',
    'core_competency_2',
    'core_competency_3',
    'core_competency_4',
    'project_label',
    'project_one_line_description',
    'project_period',
    'team_size',
    'project_role',
    'tech_stack',
    'service_context',
    'target_user',
    'user_problem_before',
    'user_need',
    'core_goal',
    'expected_change',
    'deliverable_type',
    'overview_image',
    'problem_design',
    'requirement_analysis',
    'feature_implementation',
    'test_iteration',
    'process_summary',
    'process_detail',
    'owned_scope',
    'responsibility_decision',
    'implemented_feature_1',
    'implemented_feature_2',
    'collaboration_method',
    'communication_method',
    'problem_solving_summary',
    'challenge_problem',
    'decision_basis',
    'solution_change',
    'process_image',
    'result_summary',
    'result_retrospective_flow',
    'final_result',
    'core_output',
    'user_value',
    'experience_improvement',
    'limitation',
    'confirmed_constraint',
    'next_improvement',
    'technical_or_planning_refinement',
    'lesson_learned',
    'project_conclusion',
    'result_image',
    'missing_fields',
  ],
};

export const portfolioDetailSchema = {
  type: 'OBJECT',
  properties: {
    template_values: detailedTemplateValuesSchema,
    validation_notes: stringArray,
  },
  required: ['template_values', 'validation_notes'],
};

function clean(value, fallback = INFO_MISSING) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function optional(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength, fallback = INFO_MISSING) {
  const text = clean(value, fallback);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function truncateOptional(value, maxLength) {
  const text = optional(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function firstArrayItem(items) {
  return Array.isArray(items) && items.length ? items[0] : {};
}

function getEducation(myPageInfo = {}) {
  return firstArrayItem(myPageInfo.educations);
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
      || myPageInfo.preferences?.detail_job
      || myPageInfo.preferences?.targetRole
      || jobs
  );
}

function projectEvidenceId(project, index) {
  return clean(project?.projectId || project?.id || `PRJ-${String(index + 1).padStart(3, '0')}`, `PRJ-${index + 1}`);
}

function normalizeProject(project, index) {
  return {
    evidence_id: projectEvidenceId(project, index),
    folder_name: clean(project?.projectName || project?.headline || `프로젝트 ${index + 1}`),
    headline: optional(project?.headline),
    description: optional(project?.description),
    summary: optional(project?.summaryMd),
    keywords: Array.isArray(project?.summaryKeywords) ? project.summaryKeywords.slice(0, 12) : [],
  };
}

function buildDetailInput(context) {
  const education = getEducation(context.myPageInfo);
  const projects = (Array.isArray(context.experienceProjects) ? context.experienceProjects : [])
    .map(normalizeProject);

  return {
    target_role: getTargetRole(context.myPageInfo),
    major: clean(context.major || education.major),
    profile: {
      name: clean(context.myPageInfo?.name),
      email: clean(context.myPageInfo?.email),
      phone: clean(context.myPageInfo?.phone),
      portfolio_link: optional(context.myPageInfo?.portfolioLink || context.myPageInfo?.portfolio_link || context.myPageInfo?.github || context.myPageInfo?.notion),
      profile_image: optional(context.myPageInfo?.profileImagePath || context.myPageInfo?.profile_image || context.myPageInfo?.photo),
    },
    education_profile: {
      school_name: optional(education.schoolName || education.school || context.myPageInfo?.school),
      major: clean(education.major || context.major),
      minor: optional(education.minor),
    },
    selected_keywords: Array.isArray(context.keywords) ? context.keywords.slice(0, 12) : [],
    selected_projects: projects,
  };
}

export function buildPortfolioDetailPrompt() {
  return `
[역할]
너는 취업 준비생의 프로젝트 자료를 바탕으로 상세기술형 포트폴리오 PPT 내용을 작성하는 포트폴리오 편집 전문가다.

[목표]
사용자가 선택한 프로젝트 폴더의 summary, 선택 키워드, 마이페이지 정보, 희망근무조건 정보를 바탕으로 detailed_technical_template.pptxgen.json의 플레이스홀더를 채울 JSON을 생성한다.

[중요 원칙]
1. summary 파일, 마이페이지 정보, 선택 키워드, 희망근무조건에 없는 경험, 성과, 수치, 역할, 기술은 절대 만들어내지 않는다.
2. 불확실한 내용은 과장하지 말고 확인 가능한 표현으로 작성한다.
3. 모든 문구는 한국어로 작성한다.
4. PPT에 바로 들어갈 짧은 문장으로 작성한다.
5. 줄바꿈이 필요한 항목은 "\\n"을 사용한다.
6. 값이 없거나 근거가 부족하면 빈 문자열 ""로 둔다.
7. JSON 외의 설명, 마크다운, 코드블록은 출력하지 않는다.

[작성 기준]
- name, phone, email은 profile 입력값만 사용한다.
- target_role은 희망근무조건의 세부직무만 사용한다.
- project_label은 가장 추천도가 높은 selected_projects[0]의 folder_name을 사용한다.
- project_role은 해당 프로젝트에서 사용자가 맡은 역할을 한 줄로 쓴다. 근거가 부족하면 ""로 둔다.
- core_competency_1부터 core_competency_4까지는 선택 키워드와 summary 근거에서 뽑은 한 단어 또는 짧은 명사구로 쓴다.
- tech_stack은 사용 기술, 프레임워크, 도구를 최대 3줄로 쓴다. 각 줄은 "• 기술명: 사용 목적" 형식으로 쓴다.
- process_detail은 작업 흐름을 최대 3줄로 쓴다.
- 이미지 placeholder(profile_image, overview_image, process_image, result_image)는 입력에 경로가 있을 때만 넣고, 없으면 ""로 둔다.
- result 항목은 정량 성과를 만들지 말고, summary에 확인되는 산출물과 사용자 가치 중심으로 쓴다.

[출력 형식]
반드시 아래 구조의 JSON 객체만 출력한다.
{
  "template_values": {
    "name": "",
    "target_role": "",
    "phone": "",
    "email": "",
    "portfolio_link": "",
    "profile_image": "",
    "one_line_intro": "",
    "core_competency_1": "",
    "core_competency_2": "",
    "core_competency_3": "",
    "core_competency_4": "",
    "project_label": "",
    "project_one_line_description": "",
    "project_period": "",
    "team_size": "",
    "project_role": "",
    "tech_stack": "",
    "service_context": "",
    "target_user": "",
    "user_problem_before": "",
    "user_need": "",
    "core_goal": "",
    "expected_change": "",
    "deliverable_type": "",
    "overview_image": "",
    "problem_design": "",
    "requirement_analysis": "",
    "feature_implementation": "",
    "test_iteration": "",
    "process_summary": "",
    "process_detail": "",
    "owned_scope": "",
    "responsibility_decision": "",
    "implemented_feature_1": "",
    "implemented_feature_2": "",
    "collaboration_method": "",
    "communication_method": "",
    "problem_solving_summary": "",
    "challenge_problem": "",
    "decision_basis": "",
    "solution_change": "",
    "process_image": "",
    "result_summary": "",
    "result_retrospective_flow": "",
    "final_result": "",
    "core_output": "",
    "user_value": "",
    "experience_improvement": "",
    "limitation": "",
    "confirmed_constraint": "",
    "next_improvement": "",
    "technical_or_planning_refinement": "",
    "lesson_learned": "",
    "project_conclusion": "",
    "result_image": "",
    "missing_fields": []
  },
  "validation_notes": []
}
`;
}

export function buildPortfolioDetailUserPrompt(context) {
  return `
아래 입력값을 바탕으로 상세기술형 포트폴리오 PPTX 템플릿 치환 JSON을 생성하세요.

[입력 데이터]
${JSON.stringify(buildDetailInput(context), null, 2)}

[작성 지침]
- selected_projects는 사용자가 선택한 프로젝트 폴더와 summary입니다.
- target_role, major, selected_keywords와의 관련성을 기준으로 가장 적합한 프로젝트 하나를 상세기술형 대표 프로젝트로 선택하세요.
- 모든 내용은 선택한 대표 프로젝트 summary에 근거해야 합니다.
- 없는 정보는 추측하지 말고 "" 또는 missing_fields에 기록하세요.
`;
}

function pickProject(context) {
  return firstArrayItem(context.experienceProjects);
}

function splitLines(value, limit = 3) {
  return String(value || '')
    .split(/\n|,|•|ㆍ|- /)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeTemplateValues(data, context) {
  const values = data.template_values || data.replacements || {};
  const project = pickProject(context);
  const education = getEducation(context.myPageInfo);
  const keywords = Array.isArray(context.keywords) ? context.keywords : [];
  const projectName = project?.projectName || project?.headline || '';
  const projectText = [project?.headline, project?.description, project?.summaryMd].filter(Boolean).join(' ');
  const competencies = [
    values.core_competency_1,
    values.core_competency_2,
    values.core_competency_3,
    values.core_competency_4,
    ...keywords,
  ].map((item) => truncateOptional(item, 12)).filter(Boolean);
  while (competencies.length < 4) competencies.push(INFO_MISSING);

  const techStack = splitLines(values.tech_stack || keywords.join(', '), 3)
    .map((item) => item.startsWith('•') ? item : `• ${item}`)
    .join('\n');

  return {
    name: truncate(values.name || context.myPageInfo?.name, 24),
    target_role: truncate(values.target_role || getTargetRole(context.myPageInfo), 34),
    phone: truncate(values.phone || context.myPageInfo?.phone, 24),
    email: truncate(values.email || context.myPageInfo?.email, 34),
    portfolio_link: truncateOptional(values.portfolio_link || context.myPageInfo?.portfolioLink || context.myPageInfo?.github || context.myPageInfo?.notion, 80),
    profile_image: truncateOptional(values.profile_image || context.myPageInfo?.profileImagePath || context.myPageInfo?.photo, 240),
    one_line_intro: truncate(values.one_line_intro || `${getTargetRole(context.myPageInfo)} 목표에 맞춰 프로젝트 문제 해결 과정을 정리했습니다.`, 72),
    core_competency_1: competencies[0],
    core_competency_2: competencies[1],
    core_competency_3: competencies[2],
    core_competency_4: competencies[3],
    project_label: truncate(values.project_label || projectName, 28),
    project_one_line_description: truncate(values.project_one_line_description || project?.description || project?.headline, 82),
    project_period: truncateOptional(values.project_period, 24),
    team_size: truncateOptional(values.team_size, 18),
    project_role: truncateOptional(values.project_role || project?.headline, 42),
    tech_stack: truncateOptional(techStack, 120),
    service_context: truncate(values.service_context || project?.description || projectText, 110),
    target_user: truncateOptional(values.target_user, 36),
    user_problem_before: truncateOptional(values.user_problem_before || project?.headline, 54),
    user_need: truncateOptional(values.user_need, 54),
    core_goal: truncateOptional(values.core_goal || project?.headline, 54),
    expected_change: truncateOptional(values.expected_change, 54),
    deliverable_type: truncateOptional(values.deliverable_type, 28),
    overview_image: truncateOptional(values.overview_image, 240),
    problem_design: truncateOptional(values.problem_design || project?.headline, 70),
    requirement_analysis: truncateOptional(values.requirement_analysis, 70),
    feature_implementation: truncateOptional(values.feature_implementation || project?.description, 70),
    test_iteration: truncateOptional(values.test_iteration, 70),
    process_summary: truncateOptional(values.process_summary || project?.headline, 86),
    process_detail: truncateOptional(values.process_detail, 130),
    owned_scope: truncateOptional(values.owned_scope || values.project_role || project?.headline, 46),
    responsibility_decision: truncateOptional(values.responsibility_decision, 46),
    implemented_feature_1: truncateOptional(values.implemented_feature_1, 46),
    implemented_feature_2: truncateOptional(values.implemented_feature_2, 46),
    collaboration_method: truncateOptional(values.collaboration_method, 46),
    communication_method: truncateOptional(values.communication_method, 46),
    problem_solving_summary: truncateOptional(values.problem_solving_summary || project?.description, 72),
    challenge_problem: truncateOptional(values.challenge_problem || project?.headline, 36),
    decision_basis: truncateOptional(values.decision_basis, 48),
    solution_change: truncateOptional(values.solution_change, 64),
    process_image: truncateOptional(values.process_image, 240),
    result_summary: truncateOptional(values.result_summary || project?.description || projectName, 42),
    result_retrospective_flow: truncateOptional(values.result_retrospective_flow || values.project_conclusion, 86),
    final_result: truncateOptional(values.final_result || project?.description, 46),
    core_output: truncateOptional(values.core_output || values.deliverable_type, 46),
    user_value: truncateOptional(values.user_value, 46),
    experience_improvement: truncateOptional(values.experience_improvement, 46),
    limitation: truncateOptional(values.limitation, 46),
    confirmed_constraint: truncateOptional(values.confirmed_constraint, 46),
    next_improvement: truncateOptional(values.next_improvement, 46),
    technical_or_planning_refinement: truncateOptional(values.technical_or_planning_refinement, 46),
    lesson_learned: truncateOptional(values.lesson_learned || `${education.major || context.major || '전공'} 경험을 포트폴리오 근거로 구조화했습니다.`, 100),
    project_conclusion: truncateOptional(values.project_conclusion || values.result_summary, 86),
    result_image: truncateOptional(values.result_image, 240),
    missing_fields: Array.isArray(values.missing_fields) ? values.missing_fields : [],
  };
}

export function normalizePortfolioDetail(data, context) {
  const templateValues = normalizeTemplateValues(data, context);
  const blocks = [
    {
      title: '프로젝트 개요',
      body: [templateValues.project_one_line_description, templateValues.service_context, templateValues.tech_stack].filter(Boolean).join('\n'),
    },
    {
      title: '문제 해결 과정',
      body: [templateValues.problem_design, templateValues.requirement_analysis, templateValues.feature_implementation, templateValues.process_detail].filter(Boolean).join('\n'),
    },
    {
      title: '나의 기여',
      body: [templateValues.owned_scope, templateValues.responsibility_decision, templateValues.implemented_feature_1, templateValues.implemented_feature_2].filter(Boolean).join('\n'),
    },
    {
      title: '결과 및 회고',
      body: [templateValues.final_result, templateValues.user_value, templateValues.limitation, templateValues.next_improvement, templateValues.lesson_learned].filter(Boolean).join('\n'),
    },
  ].filter((block) => block.body);

  return {
    title: truncate(`${templateValues.project_label} 상세 기술 포트폴리오`, 48),
    summary: truncate(templateValues.one_line_intro || templateValues.project_one_line_description, 120),
    blocks,
    slides: blocks,
    competencies: [
      templateValues.core_competency_1,
      templateValues.core_competency_2,
      templateValues.core_competency_3,
      templateValues.core_competency_4,
    ].filter(Boolean),
    applicationSentences: [templateValues.project_conclusion].filter(Boolean),
    raw: {
      ...data,
      template_values: templateValues,
      project_title: templateValues.project_label,
      selection_reason: templateValues.one_line_intro,
    },
  };
}

export function buildMockPortfolioDetailData(context) {
  const input = buildDetailInput(context);
  const project = input.selected_projects[0] || {};
  const keywords = input.selected_keywords.length ? input.selected_keywords : ['문제정의', '구현', '협업', '개선'];

  return {
    template_values: {
      name: input.profile.name,
      target_role: input.target_role,
      phone: input.profile.phone,
      email: input.profile.email,
      portfolio_link: input.profile.portfolio_link,
      profile_image: input.profile.profile_image,
      one_line_intro: `${input.target_role} 목표에 맞춰 프로젝트 문제 해결 과정을 정리했습니다.`,
      core_competency_1: keywords[0] || INFO_MISSING,
      core_competency_2: keywords[1] || INFO_MISSING,
      core_competency_3: keywords[2] || INFO_MISSING,
      core_competency_4: keywords[3] || INFO_MISSING,
      project_label: project.folder_name || INFO_MISSING,
      project_one_line_description: project.description || project.headline || INFO_MISSING,
      project_period: '',
      team_size: '',
      project_role: project.headline || '',
      tech_stack: keywords.slice(0, 3).map((keyword) => `• ${keyword}: 프로젝트 근거 키워드`).join('\n'),
      service_context: project.description || project.summary || INFO_MISSING,
      target_user: '',
      user_problem_before: project.headline || '',
      user_need: '',
      core_goal: project.headline || '',
      expected_change: '',
      deliverable_type: '',
      overview_image: '',
      problem_design: project.headline || '',
      requirement_analysis: '',
      feature_implementation: project.description || '',
      test_iteration: '',
      process_summary: project.headline || '',
      process_detail: '1. 프로젝트 summary 확인\n2. 핵심 문제와 역할 정리\n3. 결과와 회고 구조화',
      owned_scope: project.headline || '',
      responsibility_decision: '',
      implemented_feature_1: '',
      implemented_feature_2: '',
      collaboration_method: '',
      communication_method: '',
      problem_solving_summary: project.description || '',
      challenge_problem: project.headline || '',
      decision_basis: '',
      solution_change: '',
      process_image: '',
      result_summary: project.description || project.folder_name || INFO_MISSING,
      result_retrospective_flow: '결과와 한계를 함께 정리해 다음 개선 방향으로 연결했습니다.',
      final_result: project.description || '',
      core_output: '',
      user_value: '',
      experience_improvement: '',
      limitation: '',
      confirmed_constraint: '',
      next_improvement: '',
      technical_or_planning_refinement: '',
      lesson_learned: '근거가 있는 경험만 선별해 직무 맞춤 포트폴리오로 구조화했습니다.',
      project_conclusion: project.description || '',
      result_image: '',
      missing_fields: [],
    },
    validation_notes: [],
  };
}
