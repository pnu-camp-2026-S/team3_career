const departmentProfiles = {
  컴퓨터공학과: {
    jobs: ['백엔드 개발자', '프론트엔드 개발자', 'AI 엔지니어', '데이터 엔지니어', '보안 엔지니어'],
    skills: ['Python', 'JavaScript', 'SQL', '알고리즘', '클라우드', '머신러닝']
  },
  전기공학과: {
    jobs: ['전력 시스템 엔지니어', '임베디드 개발자', '반도체 공정 엔지니어', '제어 엔지니어', '회로 설계 엔지니어'],
    skills: ['회로이론', '전력공학', 'MATLAB', '임베디드', '제어공학', '센서']
  },
  화공생명공학과: {
    jobs: ['공정 엔지니어', '품질관리 엔지니어', '바이오 공정 연구원', '환경 안전 담당자', '소재 개발 연구원'],
    skills: ['공정설계', '화학분석', '품질관리', '바이오공정', '환경안전', '소재실험']
  },
  산업공학과: {
    jobs: ['생산관리 담당자', '물류 데이터 분석가', '품질 혁신 컨설턴트', '서비스 기획자', '프로세스 개선 담당자'],
    skills: ['최적화', '통계분석', '품질관리', '물류관리', '프로세스 분석', '데이터 시각화']
  }
};

const coreActivityTemplates = [
  {
    type: '공모전',
    suffix: '실무 문제 해결 공모전',
    difficulty: '중',
    baseScore: 91,
    value: '실무형 문제를 해결하며 전공 지식을 결과물로 보여줄 수 있습니다.'
  },
  {
    type: '대외활동',
    suffix: '산학협력 프로젝트',
    difficulty: '중',
    baseScore: 88,
    value: '팀 기반 협업과 역할 수행 경험을 포트폴리오에 남기기 좋습니다.'
  },
  {
    type: '교육',
    suffix: '직무 부트캠프',
    difficulty: '하',
    baseScore: 84,
    value: '부족한 기본기를 짧은 기간에 보완하고 결과물을 만들 수 있습니다.'
  },
  {
    type: '자격증',
    suffix: '자격증 집중 로드맵',
    difficulty: '중',
    baseScore: 80,
    value: '직무 지원 시 기초 역량을 객관적으로 보여주는 보조 지표가 됩니다.'
  },
  {
    type: '해커톤',
    suffix: '48시간 해커톤',
    difficulty: '상',
    baseScore: 86,
    value: '짧은 시간 안에 문제 정의, 구현, 발표까지 경험할 수 있습니다.'
  }
];

const departmentActivityTopics = {
  컴퓨터공학과: [
    ['웹 서비스 API', ['REST API', 'Node.js', '데이터베이스']],
    ['AI 모델 활용 서비스', ['Python', '머신러닝', '프롬프트 설계']],
    ['클라우드 배포 자동화', ['Docker', '클라우드', 'CI/CD']],
    ['알고리즘 문제 해결', ['알고리즘', '자료구조', '문제해결']],
    ['정보보안 취약점 분석', ['보안', '네트워크', '로그분석']],
    ['데이터 파이프라인', ['SQL', 'ETL', '데이터 엔지니어링']]
  ],
  전기공학과: [
    ['스마트그리드 전력 분석', ['전력공학', 'MATLAB', '데이터 분석']],
    ['임베디드 센서 제어', ['임베디드', 'C언어', '센서']],
    ['반도체 공정 이해', ['반도체', '공정제어', '품질분석']],
    ['회로 설계 검증', ['회로이론', '시뮬레이션', 'PCB']],
    ['전기차 충전 인프라', ['전력변환', '제어공학', '에너지']],
    ['IoT 전력 모니터링', ['IoT', '센서', '데이터 수집']]
  ],
  화공생명공학과: [
    ['친환경 공정 설계', ['공정설계', '환경안전', '에너지 절감']],
    ['바이오 배양 공정', ['바이오공정', '품질관리', '실험설계']],
    ['화학 소재 분석', ['화학분석', '소재실험', '분광분석']],
    ['공정 안전 개선', ['공정안전', '위험성 평가', '환경안전']],
    ['품질 데이터 관리', ['품질관리', '통계분석', '실험데이터']],
    ['이차전지 소재 실험', ['전기화학', '소재개발', '실험설계']]
  ],
  산업공학과: [
    ['물류 최적화 분석', ['최적화', '물류관리', 'Python']],
    ['생산 공정 개선', ['프로세스 분석', '품질관리', 'Lean']],
    ['서비스 운영 데이터', ['통계분석', '데이터 시각화', '서비스 기획']],
    ['수요 예측 모델링', ['예측모델', '통계분석', 'Excel']],
    ['품질 혁신 프로젝트', ['Six Sigma', '품질관리', '문제해결']],
    ['스마트팩토리 운영', ['생산관리', 'IoT', '공정 데이터']]
  ]
};

const artsActivities = [
  ['브랜드 포스터 디자인 공모전', ['디자인', '브랜딩', '시각표현']],
  ['영상 콘텐츠 제작 챌린지', ['영상편집', '스토리텔링', '촬영']],
  ['공연 기획 서포터즈', ['공연기획', '홍보', '현장운영']],
  ['일러스트 굿즈 제작 프로젝트', ['일러스트', '상품기획', '디자인']],
  ['음악 페스티벌 운영 스태프', ['음악', '현장운영', '커뮤니케이션']]
];

const noiseActivities = [
  ['하루 만에 부자 되는 투자 세미나', ['투기', '광고', '검증부족']],
  ['무작위 경품 응모 이벤트', ['경품', '단순응모', '직무무관']],
  ['익명 댓글 홍보단', ['댓글작성', '홍보', '신뢰낮음']],
  ['출처 불명 자격증 특강', ['민간자격', '검증부족', '직무무관']],
  ['단순 출석 인증 캠페인', ['출석체크', '단순참여', '성과낮음']]
];

const departmentNames = Object.keys(departmentProfiles);

function makeFitScores(primaryDepartment, secondaryDepartment, baseScore, penalty = 24) {
  return Object.fromEntries(
    departmentNames.map((department) => {
      if (department === primaryDepartment) return [department, baseScore];
      if (department === secondaryDepartment) return [department, Math.max(55, baseScore - 12)];
      return [department, Math.max(20, baseScore - penalty)];
    })
  );
}

function makeRelevantActivities() {
  const activities = [];
  let id = 1;
  const departmentLimits = {
    컴퓨터공학과: 23,
    전기공학과: 23,
    화공생명공학과: 22,
    산업공학과: 22
  };

  departmentNames.forEach((department, departmentIndex) => {
    const topics = departmentActivityTopics[department];
    let departmentCount = 0;

    topics.forEach(([topic, skills], topicIndex) => {
      coreActivityTemplates.forEach((template, templateIndex) => {
        if (departmentCount >= departmentLimits[department]) return;

        const secondaryDepartment = departmentNames[(departmentIndex + topicIndex + 1) % departmentNames.length];
        const score = template.baseScore - (topicIndex % 3) * 3 - templateIndex;
        const deadlineDays = 12 + ((id * 7) % 95);
        const job = departmentProfiles[department].jobs[(topicIndex + templateIndex) % departmentProfiles[department].jobs.length];

        activities.push({
          id,
          title: `${topic} ${template.suffix}`,
          type: template.type,
          category: 'major-relevant',
          primaryDepartment: department,
          secondaryDepartments: [secondaryDepartment],
          targetJobs: [job],
          skills,
          difficulty: template.difficulty,
          deadlineDays,
          preferenceSignals: {
            majorFit: score,
            skillFit: score - 4,
            portfolioValue: score - 2,
            careerRelevance: score,
            noisePenalty: 0
          },
          departmentFit: makeFitScores(department, secondaryDepartment, score),
          reason: `${department} 전공자가 ${job} 직무로 확장할 때 ${skills[0]} 역량을 보여주기 좋은 활동입니다.`,
          connection: `전공 수업이나 프로젝트에서 다룬 ${skills[1]} 경험을 활동 결과물과 연결해 설명할 수 있습니다.`,
          readiness: score >= 88 ? '높음' : score >= 80 ? '중간' : '보완 필요',
          readinessReason: `마감까지 ${deadlineDays}일 남아 ${skills[2]} 중심으로 준비 계획을 세우기 좋습니다.`,
          portfolio: `“${topic} 활동을 통해 ${skills.join(', ')} 역량을 실무형 결과물로 정리했습니다.”`
        });
        id += 1;
        departmentCount += 1;
      });
    });
  });

  return activities;
}

function makeArtsActivities(startId) {
  return artsActivities.map(([title, skills], index) => ({
    id: startId + index,
    title,
    type: index % 2 === 0 ? '공모전' : '대외활동',
    category: 'arts-adjacent',
    primaryDepartment: '예체능',
    secondaryDepartments: ['산업공학과'],
    targetJobs: ['콘텐츠 기획자', '브랜드 마케터'],
    skills,
    difficulty: index < 2 ? '중' : '하',
    deadlineDays: 20 + index * 9,
    preferenceSignals: {
      majorFit: 44,
      skillFit: 48,
      portfolioValue: 58,
      careerRelevance: 42,
      noisePenalty: 12
    },
    departmentFit: {
      컴퓨터공학과: 28,
      전기공학과: 22,
      화공생명공학과: 24,
      산업공학과: 45
    },
    reason: '전공 직접 연관성은 낮지만 기획, 발표, 시각화 경험이 필요한 경우 보조 활동으로 활용할 수 있습니다.',
    connection: '기술 프로젝트를 설명하는 자료 제작이나 사용자 설득 과정에 일부 연결할 수 있습니다.',
    readiness: '보조 추천',
    readinessReason: '전공 핵심 역량보다 표현력과 커뮤니케이션 역량 보완에 적합합니다.',
    portfolio: `“${title} 참여 경험으로 기술 내용을 더 명확하게 전달하는 표현 역량을 보완했습니다.”`
  }));
}

function makeNoiseActivities(startId) {
  return noiseActivities.map(([title, skills], index) => ({
    id: startId + index,
    title,
    type: '기타',
    category: 'low-value-noise',
    primaryDepartment: '무관',
    secondaryDepartments: [],
    targetJobs: [],
    skills,
    difficulty: '하',
    deadlineDays: 5 + index,
    preferenceSignals: {
      majorFit: 8,
      skillFit: 5,
      portfolioValue: 6,
      careerRelevance: 4,
      noisePenalty: 80
    },
    departmentFit: {
      컴퓨터공학과: 5,
      전기공학과: 5,
      화공생명공학과: 5,
      산업공학과: 5
    },
    reason: '전공, 직무, 포트폴리오 가치와의 연결성이 낮아 추천 우선순위에서 제외하는 데이터입니다.',
    connection: '직무 역량 증명에 활용하기 어렵고 결과물의 신뢰도도 낮습니다.',
    readiness: '비추천',
    readinessReason: '준비 난이도와 무관하게 커리어 가치가 낮아 추천하지 않습니다.',
    portfolio: '포트폴리오에 넣기보다 제외하는 것이 적합합니다.'
  }));
}

const activityRecommendationDataset = [
  ...makeRelevantActivities(),
  ...makeArtsActivities(91),
  ...makeNoiseActivities(96)
];

if (typeof window !== 'undefined') {
  window.activityRecommendationDataset = activityRecommendationDataset;
}
