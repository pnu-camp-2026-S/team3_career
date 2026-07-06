const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const htmlDir = path.join(rootDir, 'html');

const linkedHtmlFiles = [
  'contest.html',
  'create.html',
  'login.html',
  'mypage.html',
  'portfolio_create.html',
  'portfolio_manage.html',
  'signup.html',
];

for (const file of linkedHtmlFiles) {
  assert.ok(
    fs.existsSync(path.join(htmlDir, file)),
    `${file} should live in the html directory`
  );
  assert.ok(
    !fs.existsSync(path.join(rootDir, file)),
    `${file} should not remain at the project root`
  );
}

assert.ok(
  fs.existsSync(path.join(htmlDir, 'fitfolio.css')),
  'shared Fitfolio stylesheet should live in the html directory'
);

const fitfolioCss = fs.readFileSync(path.join(htmlDir, 'fitfolio.css'), 'utf8');
assert.match(
  fitfolioCss,
  /\.auth-tab\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s,
  'auth tabs should center their text'
);
assert.match(
  fitfolioCss,
  /\.social-stack\s+\.social-button\s*\{[^}]*justify-content:\s*center;/s,
  'social login buttons should center the logo and label group'
);
assert.match(
  fitfolioCss,
  /\.social-stack\s+\.social-icon\s*\{[^}]*line-height:\s*1;[^}]*text-align:\s*center;/s,
  'social login logo letters should be centered inside their icon box'
);

for (const file of ['index.html', 'main.html']) {
  assert.ok(
    fs.existsSync(path.join(rootDir, file)),
    `${file} should exist at the project root as a GitHub Pages fallback redirect`
  );
  assert.ok(
    fs.existsSync(path.join(htmlDir, file)),
    `${file} should also live in the html directory`
  );
}

const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
assert.match(
  serverJs,
  /express\.static\(path\.join\(__dirname,\s*['"]html['"]\)\)/,
  'server should serve active pages from the html directory'
);

const mainHtml = fs.readFileSync(path.join(htmlDir, 'main.html'), 'utf8');
assert.match(
  mainHtml,
  /id="sidebarToggle"/,
  'main sidebar should have a collapse toggle button'
);
assert.match(
  mainHtml,
  /id="deleteModeBtn"/,
  'main sidebar should have a delete mode button'
);
assert.match(
  mainHtml,
  /id="fileInput"[^>]*type="file"[^>]*multiple/,
  'main sidebar should have a multi-file input'
);
assert.match(
  mainHtml,
  /function\s+addFilesToFolder/,
  'main sidebar should add dropped files to folders'
);
assert.match(
  mainHtml,
  /function\s+deleteFile/,
  'main sidebar should delete uploaded files'
);
assert.match(
  mainHtml,
  /dragover/,
  'main sidebar folders should support drag-over uploads'
);
assert.match(
  mainHtml,
  /create\.html\?folder=\$\{encodeURIComponent\(folderId\)\}/,
  'main sidebar folders should navigate to file management with the selected folder'
);
assert.match(
  mainHtml,
  /href="create\.html">활동기록 먼저 정리하기<\/a>/,
  'main dashboard should send activity organization to file management'
);

for (const folderLabel of ['개인 프로젝트', '팀 프로젝트', '공모전', '자격증', '교육', '봉사']) {
  assert.ok(
    mainHtml.includes(`label: '${folderLabel}'`),
    `main sidebar should include the ${folderLabel} folder`
  );
}

for (const statLabel of ['개인 프로젝트', '팀 프로젝트', '공모전', '자격증', '수상 경력']) {
  assert.ok(
    mainHtml.includes(`class="stat-label">${statLabel}</div>`),
    `main dashboard should show ${statLabel} count`
  );
}

for (const statId of ['personalTotal', 'teamTotal', 'contestTotal', 'certificateTotal', 'awardTotal']) {
  assert.ok(
    mainHtml.includes(`id="${statId}"`),
    `main dashboard should update ${statId}`
  );
}
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'portfolio.html')),
  'old portfolio.html should be renamed to portfolio_create.html'
);

const contestHtml = fs.readFileSync(path.join(htmlDir, 'contest.html'), 'utf8');
assert.match(
  contestHtml,
  /id="activity-list"/,
  'contest page should render the activity recommendation list'
);

const createHtml = fs.readFileSync(path.join(htmlDir, 'create.html'), 'utf8');
assert.match(
  createHtml,
  /<header class="top-nav">/,
  'file management should use the shared top navigation'
);
assert.match(
  createHtml,
  /href="create\.html"[^>]*>파일 관리<\/a>/,
  'file management should keep the shared file management nav link'
);
for (const text of ['파일 관리', '폴더 목록', '자료 추가', '미리보기', 'AI 요약', '분석하기', 'GitHub 동기화']) {
  assert.ok(
    createHtml.includes(text),
    `file management page should include ${text}`
  );
}
assert.match(
  createHtml,
  /new URLSearchParams\(window\.location\.search\)\.get\('folder'\)/,
  'file management should read the selected folder from the URL'
);
assert.match(
  createHtml,
  /data-folder-id="\$\{folderId\}"/,
  'file management folder buttons should expose folder ids'
);
assert.match(
  fitfolioCss,
  /\.file-manager-page/,
  'shared stylesheet should include file management page styles'
);
assert.match(
  contestHtml,
  /id="keyword-search"/,
  'contest page should include keyword search for activity recommendations'
);
assert.ok(
  !contestHtml.includes('class="stats-grid"'),
  'contest page should remove the top recommendation summary cards'
);
assert.match(
  contestHtml,
  /<h1>[\s\S]*<span class="recommend-count">추천 활동 10개<\/span>[\s\S]*<\/h1>/,
  'contest page should show the recommendation count next to the title'
);
assert.match(
  contestHtml,
  /<div class="filter-controls">[\s\S]*<select id="industry-filter"[\s\S]*<select id="level-filter"[\s\S]*<label class="search-box" for="keyword-search">[\s\S]*<input id="keyword-search"/,
  'contest keyword search should sit at the far right after the job and difficulty filters'
);
assert.match(
  contestHtml,
  /href="contest\.css"/,
  'contest page should use the recommendation-specific stylesheet'
);
assert.match(
  contestHtml,
  /href="fitfolio\.css"/,
  'contest page should load the shared Fitfolio stylesheet for the top navigation'
);
assert.match(
  contestHtml,
  /src="contest\.js"/,
  'contest page should use the recommendation-specific script'
);
assert.match(
  contestHtml,
  /<header class="top-nav">/,
  'contest page should use the shared top navigation'
);
assert.match(
  contestHtml,
  /<a class="brand-word" href="main\.html">Myfit<span>folio<\/span><\/a>/,
  'contest page should show the shared Myfitfolio brand link'
);
assert.ok(
  !contestHtml.includes('<aside class="sidebar"'),
  'contest page should not render the old recommendation sidebar'
);
assert.ok(
  !contestHtml.includes('<header class="topbar"'),
  'contest page should not use the standalone recommendation topbar'
);
assert.match(
  contestHtml,
  /id="prevCalendarMonth"/,
  'contest calendar should include a previous month button'
);
assert.match(
  contestHtml,
  /id="nextCalendarMonth"/,
  'contest calendar should include a next month button'
);
assert.match(
  contestHtml,
  /id="calendarDays"/,
  'contest calendar should render its days dynamically'
);

assert.ok(
  fs.existsSync(path.join(htmlDir, 'contest.css')),
  'contest recommendation stylesheet should live in the html directory'
);
assert.ok(
  fs.existsSync(path.join(htmlDir, 'contest.js')),
  'contest recommendation script should live in the html directory'
);

const contestJs = fs.readFileSync(path.join(htmlDir, 'contest.js'), 'utf8');
const contestCss = fs.readFileSync(path.join(htmlDir, 'contest.css'), 'utf8');
assert.ok(
  !contestJs.includes('savedCount'),
  'contest schedule count should not depend on removed summary cards'
);
assert.match(
  contestJs,
  /function\s+parseScheduleDate/,
  'contest schedule should parse saved dates for chronological sorting'
);
assert.match(
  contestJs,
  /function\s+getSortedSavedSchedules/,
  'contest schedule should create a date-sorted list before rendering'
);
assert.match(
  contestJs,
  /const\s+sortedSchedules\s*=\s*getSortedSavedSchedules\(\)/,
  'contest schedule should render saved activities in date order'
);
assert.match(
  contestJs,
  /D-90/,
  'contest recommendations should include an activity 90 days away'
);
assert.match(
  contestJs,
  /2026-10-04/,
  'contest future activity should be scheduled 90 days later on 2026-10-04'
);
assert.match(
  contestJs,
  /협업형 클라우드 아이디어톤/,
  'contest recommendations should include a second activity on an existing date'
);
assert.match(
  contestJs,
  /10:\s*'2026-10-04'/,
  'contest duplicate-date activity should share the 90-day activity date'
);
assert.match(
  contestJs,
  /function\s+confirmDuplicateDateSave/,
  'contest saving should check for duplicate activity dates'
);
assert.match(
  contestJs,
  /이미 활동이 존재합니다\. 추가하시겠습니까\?/,
  'contest duplicate-date save warning should use the requested message'
);
assert.match(
  contestJs,
  /if\s*\(!confirmDuplicateDateSave\(item,\s*itemDate\)\)\s*return;/,
  'contest should stop saving when duplicate-date confirmation is cancelled'
);
assert.match(
  contestJs,
  /function\s+renderCalendarMonth/,
  'contest calendar should render the visible month from state'
);
assert.match(
  contestJs,
  /function\s+moveCalendarMonth/,
  'contest calendar should move between months with arrow buttons'
);
assert.match(
  contestJs,
  /function\s+showActivityMonth/,
  'contest calendar should jump to the selected activity month'
);
assert.match(
  contestJs,
  /showActivityMonth\(item\)/,
  'contest should move the calendar to an activity month when selected'
);
assert.match(
  contestJs,
  /cardElement\.insertAdjacentElement\('afterend',\s*detail\)/,
  'contest should show the selected detail directly below the clicked activity card'
);
assert.match(
  contestJs,
  /detail\.scrollIntoView\(\{\s*behavior:\s*'smooth',\s*block:\s*'nearest'\s*\}\)/s,
  'contest should reveal the detail without forcing the activity list to the top'
);
assert.ok(
  !contestJs.includes('prioritizeSelectedActivity'),
  'contest should keep the visible activity order after a card is clicked'
);
assert.ok(
  !contestJs.includes('scrollActivityListIntoView'),
  'contest should not force-scroll the selected activity to the top'
);
assert.match(
  contestJs,
  /function\s+animateCalendarTurn/,
  'contest calendar should animate when moving between months'
);
assert.match(
  contestJs,
  /calendar-turn-(next|prev)/,
  'contest calendar animation should track the month movement direction'
);
assert.match(
  contestCss,
  /\.calendar-days\.calendar-turn-next/s,
  'contest calendar should style next-month turn animation'
);
assert.match(
  contestCss,
  /\.calendar-days\.calendar-turn-prev/s,
  'contest calendar should style previous-month turn animation'
);
assert.match(
  contestJs,
  /href="https:\/\/chatgpt\.com\/"/,
  'contest preparation plan link should open an external planning tool'
);
assert.match(
  contestJs,
  /target="_blank"/,
  'contest preparation plan link should open in a new tab'
);
assert.match(
  contestJs,
  /rel="noopener noreferrer"/,
  'contest external preparation plan link should use safe rel attributes'
);
assert.match(
  contestJs,
  />활동 신청 사이트로 이동하기<\/a>/,
  'contest external activity link should say activity application site'
);
assert.ok(
  !contestJs.includes('활동 신청으로 이동하기') && !contestJs.includes('준비 계획 만들기'),
  'contest should not use older labels for the external activity link'
);
assert.ok(
  !contestJs.includes('href="plan.html"'),
  'contest preparation plan link should not point to an internal plan.html page'
);
assert.match(
  contestJs,
  /classList\.toggle\('is-danger',\s*isSaved\)/,
  'contest save button should toggle a danger state when saved'
);
assert.match(
  contestJs,
  /function\s+isActivitySaved/,
  'contest should expose saved activity state for activity cards'
);
assert.match(
  contestJs,
  /activity-card \$\{isActivitySaved\(item\.id\) \? 'is-saved' : ''\}/,
  'contest activity cards should reflect saved bookmark state'
);
assert.match(
  contestJs,
  /const\s+visibleScheduleLimit\s*=\s*5/,
  'contest should limit saved schedule previews to five items'
);
assert.match(
  contestJs,
  /sortedSchedules\.slice\(0,\s*visibleScheduleLimit\)/,
  'contest schedule list should render only the nearest saved schedules'
);
assert.match(
  contestJs,
  /savedSchedules\.length\s*>\s*visibleScheduleLimit/,
  'contest should show a more link only when more than five schedules are saved'
);
assert.match(
  contestJs,
  /href="https:\/\/calendar\.google\.com\/calendar\/u\/0\/r"/,
  'contest more schedules link should open Google Calendar'
);
assert.match(
  contestCss,
  /\.button\.primary\.is-danger\s*\{[^}]*background:\s*var\(--danger\);/s,
  'contest saved cancel button should use the red danger background'
);
assert.match(
  contestCss,
  /\.deadline-tag::after/s,
  'contest D-day tag should render as a bookmark ribbon'
);
assert.match(
  contestCss,
  /\.activity-card\.is-saved\s+\.deadline-tag/s,
  'contest saved activity cards should show a stronger bookmark state'
);
assert.match(
  contestCss,
  /\.schedule-more/s,
  'contest should style the more schedules link below the calendar'
);

for (const file of fs.readdirSync(htmlDir).filter((name) => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  assert.ok(
    !html.includes('portfolio.html'),
    `${file} should link to portfolio_create.html instead of portfolio.html`
  );
}

const portfolioCreateHtml = fs.readFileSync(path.join(htmlDir, 'portfolio_create.html'), 'utf8');
assert.match(
  portfolioCreateHtml,
  /<header class="top-nav">/,
  'portfolio_create should use the shared top navigation'
);
assert.match(
  portfolioCreateHtml,
  /href="portfolio_create\.html"[^>]*>포트폴리오 생성<\/a>/,
  'portfolio_create should keep the shared portfolio create nav link'
);
assert.ok(
  !portfolioCreateHtml.includes('id="auth"'),
  'portfolio_create should not include the standalone login screen'
);
assert.ok(
  !portfolioCreateHtml.includes('<aside class="sidebar"'),
  'portfolio_create should not include the standalone sidebar'
);
assert.ok(
  !portfolioCreateHtml.includes('class="top-menu"'),
  'portfolio_create should not include the standalone prototype top menu'
);
assert.match(
  portfolioCreateHtml,
  /function\s+triggerGeneratePortfolio/,
  'portfolio_create should keep portfolio generation behavior'
);
assert.match(
  portfolioCreateHtml,
  /\.hidden\s*\{\s*display:\s*none\s*!important;\s*\}/,
  'portfolio_create should define hidden screens as display none'
);
assert.match(
  portfolioCreateHtml,
  /id="generatePortfolioBtn"/,
  'portfolio_create should have a stable generate button id'
);
assert.match(
  portfolioCreateHtml,
  /generatePortfolioBtn'\)\.addEventListener\('click',\s*triggerGeneratePortfolio\)/,
  'portfolio_create should attach the generate click handler in script'
);
assert.match(
  portfolioCreateHtml,
  /id="pfLoadingScreen"/,
  'portfolio_create should keep the loading screen after clicking generate'
);
assert.match(
  portfolioCreateHtml,
  /id="pfWorkspaceScreen"/,
  'portfolio_create should keep the next workspace screen after loading'
);
assert.match(
  portfolioCreateHtml,
  /pfLoadingScreen'\)\.classList\.remove\('hidden'\)[\s\S]*startLoadingProgress\(\(\)\s*=>\s*\{[\s\S]*pfLoadingScreen'\)\.classList\.add\('hidden'\)[\s\S]*pfWorkspaceScreen'\)\.classList\.remove\('hidden'\)/,
  'portfolio_create should transition from loading screen to workspace screen'
);
assert.match(
  portfolioCreateHtml,
  /class="loading-dots"/,
  'portfolio_create loading screen should show animated dots'
);
assert.match(
  portfolioCreateHtml,
  /id="loadingProgressBar"/,
  'portfolio_create loading screen should include a progress bar'
);
assert.match(
  portfolioCreateHtml,
  /id="loadingProgressText"/,
  'portfolio_create loading screen should include progress text'
);
assert.match(
  portfolioCreateHtml,
  /const\s+loadingDuration\s*=\s*3000/,
  'portfolio_create loading progress should run for 3 seconds'
);
