const fallbackActivities = [
  {
    id: 1,
    icon: '📊',
    title: '데이터 분석 실무 공모전',
    type: '공모전',
    industry: 'IT',
    level: '중',
    deadline: 'D-14',
    match: '93%',
    difficulty: '중간',
    reason:
      '장미지님은 데이터 분석 경험이 부족하지만, 최근 진행한 프로젝트에서 시각화와 정리 능력을 보여주셨습니다. 이 공모전은 실무형 문제를 풀어보며 경험을 빠르게 쌓기에 적합합니다.',
    connection:
      '기존에 진행한 동아리 프로젝트의 데이터 정리와 발표 경험이 이번 공모전의 문제 해결 과정과 자연스럽게 연결됩니다.',
    readiness: '높음',
    readinessReason:
      '마감까지 14일 남았고, 지금까지 쌓아둔 분석 경험이 있어 준비 기간을 효율적으로 활용할 수 있습니다.',
    portfolio: '“데이터 분석 공모전 참여를 통해 실무형 문제 해결 역량을 키웠습니다.”'
  },
  {
    id: 2,
    icon: '🤝',
    title: 'AI 서비스 기획 대외활동',
    type: '대외활동',
    industry: 'IT',
    level: '하',
    deadline: 'D-21',
    match: '89%',
    difficulty: '쉬움',
    reason:
      '직무 적합도가 높고, 기획 경험이 적은 분에게도 접근성이 좋은 활동입니다. 서비스 기획 흐름을 익히며 포트폴리오로 연결하기 좋습니다.',
    connection:
      '기존에 참여했던 스터디와 발표 경험이 사용자 관점의 문제 정의와 기획 의사결정에 도움이 됩니다.',
    readiness: '중간',
    readinessReason:
      '지원서 작성과 발표 자료를 조금 더 준비하면 충분히 경쟁력을 확보할 수 있는 일정입니다.',
    portfolio: '“서비스 기획 과정에서 사용자 시나리오를 설계하고 문제 해결안을 제안했습니다.”'
  },
  {
    id: 3,
    icon: '🎓',
    title: 'SQL 자격증 취득 로드맵',
    type: '자격증',
    industry: 'IT',
    level: '중',
    deadline: 'D-30',
    match: '86%',
    difficulty: '중간',
    reason:
      '데이터 분석 직무 지원 시 자격증은 경쟁력을 높이는 데 유용합니다. 특히 SQL 기반의 데이터 처리 이해도를 보여줄 수 있습니다.',
    connection:
      '이전 프로젝트에서 데이터 정리와 리포트 작성 경험이 있어 자격증 학습 흐름과 잘 연결됩니다.',
    readiness: '높음',
    readinessReason:
      '기존 경험이 있어 학습 난이도를 낮게 가져갈 수 있고, 일정도 여유롭습니다.',
    portfolio: '“SQL 자격증을 통해 데이터 기반 의사결정 역량을 입증할 수 있는 경험을 쌓았습니다.”'
  },
  {
    id: 4,
    icon: '🧠',
    title: 'UX 리서치 교육 수강',
    type: '교육',
    industry: '디자인',
    level: '하',
    deadline: 'D-9',
    match: '82%',
    difficulty: '쉬움',
    reason:
      '사용자 중심 사고를 익히고 싶다면 가장 빠르게 시작할 수 있는 교육입니다. 포트폴리오에 넣기 쉬운 결과물도 만들 수 있습니다.',
    connection:
      '이전 디자인 관련 프로젝트와 연결해, 실제 사용자 인터뷰와 피드백 분석까지 확장할 수 있습니다.',
    readiness: '중간',
    readinessReason:
      '교육 일정이 짧고 부담이 적어서 빠르게 시작할 수 있지만, 결과물을 정리해야 합니다.',
    portfolio: '“UX 리서치 교육을 통해 사용자 관점의 문제 해결 방법을 익혔습니다.”'
  },
  {
    id: 5,
    icon: '💻',
    title: '웹 프론트엔드 포트폴리오 챌린지',
    type: '대외활동',
    industry: 'IT',
    level: '중',
    deadline: 'D-18',
    match: '90%',
    difficulty: '중간',
    reason:
      '프론트엔드 포트폴리오를 강화하고 싶다면 실습 중심 챌린지가 가장 빠른 방법입니다. UI/UX 구현 역량을 보여줄 수 있습니다.',
    connection:
      '기존 디자인 경험과 코드 구현 경험을 결합해 실무형 케이스를 완성할 수 있습니다.',
    readiness: '높음',
    readinessReason:
      '기존 프로젝트 경험으로 빠르게 템플릿을 구성하고 결과물을 만들 수 있습니다.',
    portfolio: '“웹 프론트엔드 챌린지를 통해 UI/UX 개선 사례를 정리했습니다.”'
  },
  {
    id: 6,
    icon: '🧪',
    title: 'AI 데이터 분석 해커톤',
    type: '공모전',
    industry: 'IT',
    level: '상',
    deadline: 'D-8',
    match: '88%',
    difficulty: '어려움',
    reason:
      '짧은 기간 안에 실무형 데이터를 다루며 분석 결과를 도출하는 경험을 쌓기 좋습니다. 경쟁력 있는 경험을 빠르게 축적할 수 있습니다.',
    connection:
      '과거 프로젝트에서 데이터 수집 및 정리 경험이 있어 분석 파이프라인을 빠르게 구성할 수 있습니다.',
    readiness: '중간',
    readinessReason:
      '마감이 가까워 준비 시간이 짧지만, 현재 보유 역량으로 빠르게 적응할 수 있습니다.',
    portfolio: '“AI 데이터 해커톤 참가로 문제 해결 과정과 인사이트 도출 능력을 증명했습니다.”'
  },
  {
    id: 7,
    icon: '📚',
    title: '디지털 마케팅 캠페인 교육',
    type: '교육',
    industry: '마케팅',
    level: '하',
    deadline: 'D-24',
    match: '78%',
    difficulty: '쉬움',
    reason:
      '마케팅 직무를 목표로 한다면 디지털 캠페인 기획 역량을 빠르게 익히는 데 도움이 됩니다.',
    connection:
      '이전 분석 역량과 콘텐츠 기획 경험이 캠페인 전략을 설계하는 데 강점이 됩니다.',
    readiness: '높음',
    readinessReason:
      '교육 기간이 여유로우며, 기본 개념부터 실습까지 차근차근 준비할 수 있습니다.',
    portfolio: '“디지털 마케팅 교육을 통해 캠페인 성과 분석 역량을 강화했습니다.”'
  },
  {
    id: 8,
    icon: '🏅',
    title: '현장 실습형 자격증 준비반',
    type: '자격증',
    industry: 'IT',
    level: '중',
    deadline: 'D-26',
    match: '84%',
    difficulty: '중간',
    reason:
      '실무 중심 자격증 준비 반은 단기간에 실습과 이론을 함께 다룰 수 있는 좋은 기회입니다.',
    connection:
      '프로젝트 기반 학습 경험이 준비 속도를 높이고, 실무 역량을 보다 분명하게 보여줍니다.',
    readiness: '높음',
    readinessReason:
      '현재 일정과 조화를 이루고 있어 자격증 준비에 충분한 시간이 확보됩니다.',
    portfolio: '“실습 중심 자격증 과정을 통해 실무형 기술 역량을 증명했습니다.”'
  },
  {
    id: 9,
    icon: '🚀',
    title: '클라우드 서비스 기획 공모전',
    type: '공모전',
    industry: 'IT',
    level: '중',
    deadline: 'D-90',
    match: '87%',
    difficulty: '중간',
    reason:
      '90일 뒤 마감되는 활동이라 지금부터 서비스 기획과 기술 이해를 함께 준비하기 좋습니다. 장기 일정으로 포트폴리오 결과물을 안정적으로 만들 수 있습니다.',
    connection:
      '기존 웹 프로젝트 경험을 클라우드 기반 서비스 아이디어로 확장해 기획서와 프로토타입으로 연결할 수 있습니다.',
    readiness: '높음',
    readinessReason:
      '준비 기간이 충분해 시장 조사, 기능 정의, 발표 자료 제작까지 단계적으로 진행할 수 있습니다.',
    portfolio: '“클라우드 서비스 기획 공모전을 통해 장기 프로젝트 관리와 서비스 설계 역량을 강화했습니다.”'
  },
  {
    id: 10,
    icon: '🤖',
    title: '협업형 클라우드 아이디어톤',
    type: '대외활동',
    industry: 'IT',
    level: '하',
    deadline: 'D-90',
    match: '85%',
    difficulty: '쉬움',
    reason:
      '클라우드 서비스 기획 공모전과 같은 일정에 열리는 협업형 활동입니다. 팀 기반 아이디어 도출과 발표 경험을 함께 쌓기 좋습니다.',
    connection:
      '기존 프로젝트 경험을 바탕으로 역할 분담, 서비스 아이디어 검증, 간단한 프로토타입 제작 흐름을 보여줄 수 있습니다.',
    readiness: '높음',
    readinessReason:
      '마감까지 90일이 남아 팀 구성과 아이디어 구체화에 충분한 시간이 있습니다.',
    portfolio: '“협업형 클라우드 아이디어톤을 통해 팀 기반 서비스 기획과 발표 역량을 강화했습니다.”'
  }
];
function getMatchScore(item) {
  return Number.parseInt(item.match, 10) || 0;
}

function getRecommendationScore(item) {
  if (!item.preferenceSignals) return getMatchScore(item);

  const signals = item.preferenceSignals;
  return Math.round(
    signals.majorFit * 0.35 +
      signals.skillFit * 0.25 +
      signals.portfolioValue * 0.2 +
      signals.careerRelevance * 0.2 -
      signals.noisePenalty * 0.3
  );
}

function getScoreBandCounts(total) {
  const highCount = Math.round(total / 3.5);
  const middleCount = Math.round((total / 3.5) * 1.5);

  return {
    high: highCount,
    middle: middleCount,
    low: total - highCount - middleCount
  };
}

function interpolateScore(max, min, index, count) {
  if (count <= 1) return max;
  return Math.round(max - ((max - min) * index) / (count - 1));
}

function getDistributedMatchScore(index, total) {
  const bands = getScoreBandCounts(total);

  if (index < bands.high) {
    return interpolateScore(96, 85, index, bands.high);
  }

  if (index < bands.high + bands.middle) {
    return interpolateScore(84, 65, index - bands.high, bands.middle);
  }

  return interpolateScore(64, 35, index - bands.high - bands.middle, bands.low);
}

function formatDateFromDeadlineDays(deadlineDays) {
  const date = new Date(2026, 6, 7 + Number(deadlineDays || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getActivityIcon(item) {
  if (item.category === 'arts-adjacent') return '🎨';
  if (item.category === 'low-value-noise') return '⚠️';

  return {
    공모전: '📊',
    대외활동: '🤝',
    교육: '📚',
    자격증: '🏅',
    해커톤: '🧪'
  }[item.type] || '✨';
}

function getActivityIndustry(item) {
  if (item.category === 'arts-adjacent') return item.skills.includes('브랜딩') ? '마케팅' : '디자인';
  if (item.category === 'low-value-noise') return '기타';
  return item.primaryDepartment === '화공생명공학과' ? '화공' : 'IT';
}
const activityList = document.getElementById('activity-list');
const activityPagination = document.getElementById('activityPagination');
const detailPanel = document.getElementById('activity-detail');
const scheduleList = document.getElementById('schedule-list');
const tabs = Array.from(document.querySelectorAll('.tab'));
const keywordInput = document.getElementById('keyword-search');
const industryFilter = document.getElementById('industry-filter');
const levelFilter = document.getElementById('level-filter');
const calendarMonthLabel = document.getElementById('calendarMonth');
const calendarDays = document.getElementById('calendarDays');
const prevCalendarMonth = document.getElementById('prevCalendarMonth');
const nextCalendarMonth = document.getElementById('nextCalendarMonth');

let activeTab = 'all';
let selectedActivityId = null;
let activeDetailElement = null;
let currentActivityPage = 1;
let visibleCalendarYear = 2026;
let visibleCalendarMonth = 6;
let focusedScheduleDate = null;
const activitiesPerPage = 20;
const visibleScheduleLimit = 5;
const savedSchedules = [];

function clearExpandedDetail() {
  if (activeDetailElement) {
    activeDetailElement.remove();
    activeDetailElement = null;
  }

  document.querySelectorAll('.activity-card').forEach((card) => {
    card.classList.remove('detail-open');
  });

  if (detailPanel) {
    detailPanel.classList.add('hidden');
    detailPanel.classList.remove('show');
    detailPanel.innerHTML = '';
  }
}

function getFilteredActivities() {
  const keyword = keywordInput.value.trim().toLowerCase();
  const industry = industryFilter.value;
  const level = levelFilter.value;

  return getSortedRecommendedActivities().filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.reason.toLowerCase().includes(keyword);
    const matchesIndustry = industry === 'all' || item.industry === industry;
    const matchesLevel = level === 'all' || item.level === level;

    return matchesTab && matchesKeyword && matchesIndustry && matchesLevel;
  });
}

function isActivitySaved(id) {
  return savedSchedules.some((event) => event.id === id);
}

function renderActivities() {
  const filtered = getFilteredActivities();
  const pageCount = getActivityPageCount(filtered);
  currentActivityPage = Math.min(currentActivityPage, pageCount);

  if (!filtered.length) {
    clearExpandedDetail();
    selectedActivityId = null;
    activityList.innerHTML = '<div class="activity-card"><p>조건에 맞는 활동이 없습니다.</p></div>';
    renderActivityPagination(0);
    return;
  }

  clearExpandedDetail();
  selectedActivityId = null;

  const startIndex = (currentActivityPage - 1) * activitiesPerPage;
  const visibleActivities = filtered.slice(startIndex, startIndex + activitiesPerPage);

  activityList.innerHTML = visibleActivities
    .map(
      (item) => `
        <article class="activity-card ${isActivitySaved(item.id) ? 'is-saved' : ''}" data-id="${item.id}">
          <div class="card-top">
            <span class="card-chip">${item.icon} ${item.industry}</span>
            <button class="deadline-tag" type="button" data-id="${item.id}" aria-label="${item.title} 일정 저장">
              ${getActivityDeadline(item.id)}
            </button>
          </div>
          <h3 class="activity-title">${item.title}</h3>
          <p class="activity-meta">${item.type} · 준비 난이도 ${item.level}</p>
          <div class="metric-row">
            <span class="metric">일치도 ${item.match}</span>
            <span class="metric">난이도 ${item.difficulty}</span>
            <span class="metric">추천 포인트 ${item.match}</span>
          </div>
        </article>
      `
    )
    .join('');

  renderActivityPagination(filtered.length);
  updateSelectedCard();
}

const scheduleDates = {
  1: '2026-07-12',
  2: '2026-07-12',
  3: '2026-08-05',
  4: '2026-08-12',
  5: '2026-08-19',
  6: '2026-08-26',
  7: '2026-09-09',
  8: '2026-09-23',
  9: '2026-10-04',
  10: '2026-10-04'
};
function normalizeActivityDataset(dataset) {
  const rankedItems = [...dataset].sort(
    (a, b) =>
      getRecommendationScore(b) - getRecommendationScore(a) ||
      a.id - b.id
  );

  return rankedItems.map((item, index) => {
    const score = getDistributedMatchScore(index, rankedItems.length);

    if (!scheduleDates[item.id]) {
      scheduleDates[item.id] = formatDateFromDeadlineDays(item.deadlineDays);
    }

    return {
      ...item,
      icon: getActivityIcon(item),
      industry: getActivityIndustry(item),
      level: item.difficulty,
      match: `${score}%`,
      difficulty: item.difficulty === '상' ? '어려움' : item.difficulty === '하' ? '쉬움' : '중간'
    };
  });
}

const activities = Array.isArray(window.activityRecommendationDataset)
  ? normalizeActivityDataset(window.activityRecommendationDataset)
  : fallbackActivities;

function getSortedRecommendedActivities() {
  return [...activities].sort(
    (a, b) =>
      getRecommendationScore(b) - getRecommendationScore(a) ||
      getMatchScore(b) - getMatchScore(a) ||
      a.id - b.id
  );
}

function getActivityPageCount(items) {
  return Math.max(1, Math.ceil(items.length / activitiesPerPage));
}

function renderActivityPagination(totalItems) {
  if (!activityPagination) return;

  const pageCount = getActivityPageCount({ length: totalItems });

  if (pageCount <= 1) {
    activityPagination.innerHTML = '';
    return;
  }

  activityPagination.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return `
      <button class="pagination-button ${page === currentActivityPage ? 'active' : ''}" type="button" data-page="${page}" aria-current="${page === currentActivityPage ? 'page' : 'false'}">
        ${page}페이지
      </button>
    `;
  }).join('');
}
function getTodayDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseDateValue(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function calculateDeadline(scheduleDate, today = getTodayDate()) {
  if (!scheduleDate) return 'D-?';

  const targetDate = parseDateValue(scheduleDate);
  const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'D-Day';
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

function getActivityDeadline(id) {
  return calculateDeadline(scheduleDates[id]);
}

function getReadinessScheduleText(id, readinessReason) {
  const scheduleDate = scheduleDates[id];
  if (!scheduleDate) return readinessReason;

  const targetDate = parseDateValue(scheduleDate);
  const diffDays = Math.ceil((targetDate - getTodayDate()) / (1000 * 60 * 60 * 24));
  const cleanReason = readinessReason
    .replace(/마감까지\s*\d+일(?:이)?\s*남았고,\s*/, '')
    .replace(/마감까지\s*\d+일(?:이)?\s*남아\s*/, '')
    .replace(/\d+일\s*뒤\s*마감되는\s*활동이라\s*/, '')
    .trim();

  if (diffDays === 0) return `오늘 마감이라 ${cleanReason}`;
  if (diffDays > 0) return `마감까지 ${diffDays}일 남아, ${cleanReason}`;
  return `마감일이 ${Math.abs(diffDays)}일 지났지만, ${cleanReason}`;
}


function parseScheduleDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return year * 10000 + month * 100 + day;
}

function formatScheduleDate(date) {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSortedSavedSchedules() {
  return savedSchedules
    .map((event, index) => ({ ...event, savedIndex: index }))
    .sort((a, b) => parseScheduleDate(a.date) - parseScheduleDate(b.date) || a.savedIndex - b.savedIndex);
}

function updateSaveButton(item) {
    const isSaved = savedSchedules.some((event) => event.id === item.id);

  document
    .querySelectorAll(`.activity-card[data-id="${item.id}"]`)
    .forEach((card) => card.classList.toggle('is-saved', isSaved));
  
  if (!activeDetailElement) return;

  const saveButton = activeDetailElement.querySelector('#save-calendar');
  if (!saveButton) return;

  
  saveButton.disabled = false;
  saveButton.textContent = isSaved ? '저장 취소' : '저장하기';
  saveButton.classList.toggle('is-danger', isSaved);

}

function animateCalendarTurn(direction) {
  if (!calendarDays || !direction) return;

  calendarDays.classList.remove('calendar-turn-next', 'calendar-turn-prev');
  void calendarDays.offsetWidth;
  calendarDays.classList.add(`calendar-turn-${direction}`);

  window.setTimeout(() => {
    calendarDays.classList.remove('calendar-turn-next', 'calendar-turn-prev');
  }, 280);
}

function showActivityMonth(item) {
  const activityDate = scheduleDates[item.id];
  if (!activityDate) return;

  const [year, month] = activityDate.split('-').map(Number);
  const currentMonthIndex = visibleCalendarYear * 12 + visibleCalendarMonth;
  const targetMonthIndex = year * 12 + month - 1;
  const direction = targetMonthIndex > currentMonthIndex ? 'next' : 'prev';

  visibleCalendarYear = year;
  visibleCalendarMonth = month - 1;
  renderCalendarMonth();

  if (targetMonthIndex !== currentMonthIndex) {
    animateCalendarTurn(direction);
  }
}

function confirmDuplicateDateSave(item, itemDate) {
  const hasDuplicateDate = savedSchedules.some((event) => event.id !== item.id && event.date === itemDate);
  return !hasDuplicateDate || window.confirm('이미 활동이 존재합니다. 추가하시겠습니까?');
}

function openDetail(id, cardElement) {
  const item = activities.find((activity) => activity.id === Number(id));
  if (!item) return;

  if (selectedActivityId === item.id && activeDetailElement) {
    clearExpandedDetail();
    selectedActivityId = null;
    updateSelectedCard();
    renderCalendarHighlight();
    return;
  }

  selectedActivityId = item.id;
  focusedScheduleDate = null;
  showActivityMonth(item);
  clearExpandedDetail();

  const detail = document.createElement('div');
  detail.className = 'activity-detail show';
  detail.innerHTML = `
    <h3>${item.title}</h3>
    <div class="detail-meta">
      <span>${item.type}</span>
      <span>${item.industry}</span>
      <span>${getActivityDeadline(item.id)}</span>
      <span>난이도 ${item.level}</span>
    </div>
    <section>
      <h4>추천 이유</h4>
      <p>${item.reason}</p>
    </section>
    <section>
      <h4>내 경험과 연결</h4>
      <p>${item.connection}</p>
    </section>
    <section>
      <h4>준비 가능성</h4>
      <p>${item.readiness} · ${getReadinessScheduleText(item.id, item.readinessReason)}</p>
    </section>
    <section>
      <h4>포트폴리오 활용 예시</h4>
      <p>${item.portfolio}</p>
    </section>
    <div class="detail-actions">
      <button type="button" class="button primary" id="save-calendar">
        저장하기
      </button>
      <a class="button secondary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">활동 신청 사이트로 이동하기</a>
    </div>
  `;

  const saveButton = detail.querySelector('#save-calendar');
  saveButton.addEventListener('click', () => toggleSaveToCalendar(item));

  document.querySelectorAll('.activity-card').forEach((card) => {
    card.classList.remove('detail-open');
  });
  cardElement.classList.add('detail-open');
  cardElement.insertAdjacentElement('afterend', detail);
  activeDetailElement = detail;
  updateSelectedCard();
  updateSaveButton(item);
  renderCalendarHighlight();

  setTimeout(() => {
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 0);
}

function updateSelectedCard() {
  document.querySelectorAll('.activity-card').forEach((card) => {
    card.classList.toggle('selected', Number(card.dataset.id) === selectedActivityId);
  });
}

function renderCalendarHighlight() {
  document.querySelectorAll('.calendar-grid .day').forEach((dayBtn) => {
    const dateKey = dayBtn.dataset.date;
    const selectedDate = selectedActivityId ? scheduleDates[selectedActivityId] : null;
    const isSelectedDay = selectedDate === dateKey || focusedScheduleDate === dateKey;
    const hasEvent = savedSchedules.some((event) => event.date === dateKey);

    dayBtn.classList.toggle('event', hasEvent || isSelectedDay);
    dayBtn.classList.toggle('active', isSelectedDay);
  });
}

function showScheduleDate(date) {
  if (!date) return;

  const [year, month] = date.split('-').map(Number);
  const currentMonthIndex = visibleCalendarYear * 12 + visibleCalendarMonth;
  const targetMonthIndex = year * 12 + month - 1;
  const direction = targetMonthIndex > currentMonthIndex ? 'next' : 'prev';

  selectedActivityId = null;
  focusedScheduleDate = date;
  visibleCalendarYear = year;
  visibleCalendarMonth = month - 1;
  renderCalendarMonth();
  updateSelectedCard();

  if (targetMonthIndex !== currentMonthIndex) {
    animateCalendarTurn(direction);
  }
}

function renderCalendarMonth() {
  if (!calendarMonthLabel || !calendarDays) return;

  calendarMonthLabel.textContent = `${visibleCalendarYear}.${String(visibleCalendarMonth + 1).padStart(2, '0')}`;
  calendarDays.innerHTML = '';

  const firstDay = new Date(visibleCalendarYear, visibleCalendarMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(visibleCalendarYear, visibleCalendarMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(visibleCalendarYear, visibleCalendarMonth, index - startOffset + 1);
    const dayButton = document.createElement('button');
    dayButton.className = 'day';
    dayButton.type = 'button';
    dayButton.textContent = date.getDate();
    dayButton.dataset.date = getDateKey(date);

    if (date.getMonth() !== visibleCalendarMonth) {
      dayButton.classList.add('muted');
    }

    calendarDays.appendChild(dayButton);
  }

  renderCalendarHighlight();
}

function moveCalendarMonth(offset) {
  const nextMonth = new Date(visibleCalendarYear, visibleCalendarMonth + offset, 1);
  visibleCalendarYear = nextMonth.getFullYear();
  visibleCalendarMonth = nextMonth.getMonth();
  renderCalendarMonth();
  animateCalendarTurn(offset > 0 ? 'next' : 'prev');
}

function toggleSaveToCalendar(item) {
  const existingIndex = savedSchedules.findIndex((event) => event.id === item.id);
  const itemDate = scheduleDates[item.id] || '2026-07-21';

  if (existingIndex === -1) {
    if (!confirmDuplicateDateSave(item, itemDate)) return;

    savedSchedules.push({
      id: item.id,
      title: item.title,
      note: `${item.type} · ${item.industry}`,
      date: itemDate
    });
  } else {
    savedSchedules.splice(existingIndex, 1);
  }

  renderSchedule();
  renderCalendarHighlight();
  updateSaveButton(item);
}

function toggleBookmarkSave(id) {
  const item = activities.find((activity) => activity.id === Number(id));
  if (!item) return;

  toggleSaveToCalendar(item);
}

function renderSchedule() {
  if (!savedSchedules.length) {
    scheduleList.innerHTML = `
      <div class="schedule-item">
        <div class="schedule-date">-</div>
        <div>
          <strong>저장된 일정이 없습니다.</strong>
          <p>활동을 선택하고 저장하면 여기에 추가됩니다.</p>
        </div>
        <button class="text-button" type="button">대기</button>
      </div>
    `;
    document.querySelectorAll('.calendar-grid .day').forEach((dayBtn) => {
      dayBtn.classList.remove('event');
    });
    return;
  }

  const sortedSchedules = getSortedSavedSchedules();
  const visibleSchedules = sortedSchedules.slice(0, visibleScheduleLimit);
  const moreScheduleLink =
    savedSchedules.length > visibleScheduleLimit
      ? `
        <a class="schedule-more" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer">
          더보기
        </a>
      `
      : '';

  scheduleList.innerHTML = `${visibleSchedules
    .map(
      (event) => `
        <div class="schedule-item">
          <div class="schedule-date">${formatScheduleDate(event.date)}</div>
          <div>
            <strong>${event.title}</strong>
            <p>${event.note}</p>
          </div>
          <button class="text-button schedule-view" type="button" data-date="${event.date}">보기</button>
        </div>
      `
    )
    .join('')}${moreScheduleLink}`;

  renderCalendarHighlight();
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((button) => button.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.filter;
    currentActivityPage = 1;
    renderActivities();
    updateSelectedCard();
  });
});

[keywordInput, industryFilter, levelFilter].forEach((control) => {
  control.addEventListener('input', () => {
    currentActivityPage = 1;
    renderActivities();
    updateSelectedCard();
  });
  control.addEventListener('change', () => {
    currentActivityPage = 1;
    renderActivities();
    updateSelectedCard();
  });
});

activityList.addEventListener('click', (event) => {
  const bookmarkButton = event.target.closest('.deadline-tag');
  if (bookmarkButton) {
    event.stopPropagation();
    toggleBookmarkSave(bookmarkButton.dataset.id);
    return;
  }

  const card = event.target.closest('.activity-card');
  if (card) openDetail(card.dataset.id, card);
});
activityPagination?.addEventListener('click', (event) => {
  const pageButton = event.target.closest('[data-page]');
  if (!pageButton) return;

  currentActivityPage = Number(pageButton.dataset.page);
  renderActivities();
  activityList.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
scheduleList.addEventListener('click', (event) => {
  const viewButton = event.target.closest('.schedule-view');
  if (!viewButton) return;

  showScheduleDate(viewButton.dataset.date);
});

prevCalendarMonth.addEventListener('click', () => moveCalendarMonth(-1));
nextCalendarMonth.addEventListener('click', () => moveCalendarMonth(1));

renderCalendarMonth();
renderSchedule();
renderActivities();
