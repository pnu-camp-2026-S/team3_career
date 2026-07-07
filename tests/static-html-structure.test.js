const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const htmlDir = path.join(rootDir, 'html');
const cssDir = path.join(rootDir, 'css');
const jsDir = path.join(rootDir, 'js');

const linkedHtmlFiles = [
  'contest.html',
  'create.html',
  'login.html',
  'mypage.html',
  'portfolio_create.html',
  'portfolio_manage.html',
  'signup.html',
  'withdraw.html',
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

const pageCssFiles = {
  'index.html': 'index.css',
  'login.html': 'login.css',
  'signup.html': 'signup.css',
  'main.html': 'main.css',
  'mypage.html': 'mypage.css',
  'create.html': 'create.css',
  'portfolio_create.html': 'portfolio_create.css',
  'portfolio_manage.html': 'portfolio_manage.css',
  'contest.html': 'contest.css',
  'withdraw.html': 'withdraw.css',
};

assert.ok(
  fs.existsSync(path.join(cssDir, 'common.css')),
  'shared common stylesheet should live in the css directory'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'fitfolio.css')),
  'old bundled Fitfolio stylesheet should not remain in the html directory'
);
assert.ok(
  !fs.existsSync(path.join(rootDir, 'fitfolio.css')),
  'old bundled Fitfolio stylesheet should not remain at the project root'
);
assert.ok(
  !fs.existsSync(path.join(cssDir, 'fitfolio.css')),
  'old bundled Fitfolio stylesheet should not remain in the css directory'
);

for (const [htmlFile, cssFile] of Object.entries(pageCssFiles)) {
  assert.ok(
    fs.existsSync(path.join(cssDir, cssFile)),
    `${cssFile} should live in the css directory`
  );

  const html = fs.readFileSync(path.join(htmlDir, htmlFile), 'utf8');
  assert.match(
    html,
    /href="\.\.\/css\/common\.css"/,
    `${htmlFile} should load the shared common stylesheet`
  );
  assert.match(
    html,
    new RegExp(`href="\\.\\./css/${cssFile.replace('.', '\\.')}"`),
    `${htmlFile} should load its page-specific stylesheet`
  );
}

const commonCss = fs.readFileSync(path.join(cssDir, 'common.css'), 'utf8');
const authCss = fs.readFileSync(path.join(cssDir, 'auth.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(cssDir, 'main.css'), 'utf8');
const mypageCss = fs.readFileSync(path.join(cssDir, 'mypage.css'), 'utf8');
const createCss = fs.readFileSync(path.join(cssDir, 'create.css'), 'utf8');
const withdrawCss = fs.readFileSync(path.join(cssDir, 'withdraw.css'), 'utf8');
const fitfolioCss = [commonCss, authCss, mainCss, createCss].join('\n');
const sharedNavJsPath = path.join(jsDir, 'shared-nav.js');
const authNavJsPath = path.join(jsDir, 'auth-nav.js');
const sharedNavPages = [
  ['main.html', 'main'],
  ['create.html', 'create'],
  ['contest.html', 'contest'],
  ['mypage.html', 'mypage'],
  ['portfolio_create.html', 'portfolio_create'],
  ['portfolio_manage.html', 'portfolio_manage'],
];

assert.ok(
  fs.existsSync(sharedNavJsPath),
  'shared navigation script should live in the js directory'
);
assert.ok(
  fs.existsSync(authNavJsPath),
  'auth navigation script should live in the js directory'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'shared-nav.js')),
  'shared navigation script should not remain in the html directory'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'auth-nav.js')),
  'auth navigation script should not live in the html directory'
);

const sharedNavJs = fs.existsSync(sharedNavJsPath)
  ? fs.readFileSync(sharedNavJsPath, 'utf8')
  : '';
const authNavJs = fs.existsSync(authNavJsPath)
  ? fs.readFileSync(authNavJsPath, 'utf8')
  : '';
for (const [file, activeKey] of sharedNavPages) {
  const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  assert.match(
    html,
    new RegExp(`<div data-shared-nav data-active="${activeKey}"></div>\\s*<script src="\\.\\./js/shared-nav\\.js"></script>`),
    `${file} should mount the shared navigation with the ${activeKey} active key`
  );
  assert.ok(
    !html.includes('<header class="top-nav">'),
    `${file} should not duplicate the top navigation markup`
  );
  assert.match(
    html,
    /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
    `${file} should load the auth navigation behavior`
  );
}
for (const authFile of ['index.html', 'login.html']) {
  const html = fs.readFileSync(path.join(htmlDir, authFile), 'utf8');
  assert.ok(
    !html.includes('shared-nav.js'),
    `${authFile} should not load the shared app navigation`
  );
  assert.ok(
    !html.includes('auth-danger-link') && !html.includes('href="withdraw.html"'),
    `${authFile} should not link directly to account withdrawal`
  );
  assert.match(
    html,
    /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
    `${authFile} should load shared auth behavior`
  );
  assert.ok(
    !html.includes("document.querySelectorAll('[data-login]')"),
    `${authFile} should not duplicate inline login button behavior`
  );
}
{
  const signupHtml = fs.readFileSync(path.join(htmlDir, 'signup.html'), 'utf8');
  assert.ok(
    !signupHtml.includes('shared-nav.js'),
    'signup.html should not load the shared app navigation'
  );
  assert.ok(
    !signupHtml.includes('auth-danger-link') && !signupHtml.includes('withdraw.html'),
    'signup.html should not expose account withdrawal from the signup flow'
  );
  assert.match(
    signupHtml,
    /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
    'signup.html should load shared auth behavior'
  );
  assert.ok(
    !signupHtml.includes("document.querySelectorAll('[data-login]')"),
    'signup.html should not duplicate inline login button behavior'
  );
}
for (const navText of ['메인', '포트폴리오 생성', '포트폴리오 관리', '파일 관리', '활동 추천', '마이페이지']) {
  assert.ok(
    sharedNavJs.includes(navText),
    `shared navigation should define ${navText}`
  );
}
assert.match(
  sharedNavJs,
  /key:\s*'main'[\s\S]*key:\s*'create'[\s\S]*key:\s*'portfolio_create'[\s\S]*key:\s*'portfolio_manage'[\s\S]*key:\s*'contest'[\s\S]*key:\s*'mypage'/,
  'shared navigation should order items as main, file management, portfolio create, portfolio manage, activity recommendation, mypage'
);
assert.ok(
  !/myfitfolioNavWidth|navResizeHandle|nav-resize-handle|--nav-tabs-width/.test(sharedNavJs),
  'shared navigation should not include the removed top navigation resize feature'
);
assert.match(
  sharedNavJs,
  /class="profile-menu"[\s\S]*data-profile-toggle[\s\S]*data-profile-menu[\s\S]*data-logout/,
  'shared navigation should render the profile dropdown menu'
);
assert.match(
  sharedNavJs,
  /href="withdraw\.html"[\s\S]*회원 탈퇴/,
  'shared navigation profile dropdown should link to account withdrawal'
);
assert.ok(
  !/aria-label="알림"|<button class="icon-button"[^>]*>\s*!/.test(sharedNavJs),
  'shared navigation should not render the old alert action'
);
assert.match(
  authNavJs,
  /const\s+LOGIN_KEY\s*=\s*'myfitfolioLoggedIn'/,
  'auth navigation should use the existing login session key'
);
assert.match(
  authNavJs,
  /function\s+wireAuthLoginButtons/,
  'auth navigation should wire auth page login buttons'
);
assert.match(
  authNavJs,
  /sessionStorage\.setItem\(LOGIN_KEY,\s*'true'\);[\s\S]*window\.location\.href\s*=\s*'main\.html'/,
  'auth navigation should mark login state and move auth users to main'
);
assert.match(
  authNavJs,
  /function\s+wireProfileMenus/,
  'auth navigation should wire profile dropdown menus'
);
assert.match(
  authNavJs,
  /function\s+renderLoggedOutMain/,
  'auth navigation should render the logged-out main dashboard state'
);
assert.match(
  authNavJs,
  /clearAccountState\(\);[\s\S]*window\.location\.href\s*=\s*'main\.html'/,
  'auth navigation should clear account state before logout redirect'
);
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
assert.match(
  authCss,
  /\.auth-danger-link\s*\{[^}]*color:\s*#bf2940;/s,
  'auth pages should style the account withdrawal link as a danger action'
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
assert.match(
  serverJs,
  /app\.use\(['"]\/css['"],\s*express\.static\(path\.join\(__dirname,\s*['"]css['"]\)\)\)/,
  'server should serve shared styles from the css directory'
);
assert.match(
  serverJs,
  /app\.use\(['"]\/js['"],\s*express\.static\(path\.join\(__dirname,\s*['"]js['"]\)\)\)/,
  'server should serve shared scripts from the js directory'
);

const mainHtml = fs.readFileSync(path.join(htmlDir, 'main.html'), 'utf8');
assert.match(
  mainHtml,
  /<body\s+data-page="main">/,
  'main page should expose its page key for auth-nav logged-out rendering'
);
assert.match(
  mainHtml,
  /id="sidebarToggle"/,
  'main sidebar should have a collapse toggle button'
);
assert.match(
  mainHtml,
  /id="sidebarResizeHandle"/,
  'main sidebar should expose a resize handle'
);
assert.match(
  mainHtml,
  /myfitfolioSidebarWidth/,
  'main sidebar should persist the resized sidebar width'
);
assert.ok(
  !mainHtml.includes('id="deleteModeBtn"'),
  'main sidebar should remove the old delete mode button'
);
assert.ok(
  !mainHtml.includes('활동 자료 업로드'),
  'main sidebar should remove the activity upload button'
);
assert.match(
  mainHtml,
  /data-analysis-start/,
  'main sidebar should move analysis start to the top action area'
);
assert.match(
  mainHtml,
  /id="fileInput"[^>]*type="file"[^>]*multiple/,
  'main sidebar should retain a hidden multi-file input for drag and folder uploads'
);
assert.match(
  mainHtml,
  /완료된 활동 폴더에 있는 파일을 바탕으로 분석해드려요/,
  'main sidebar should explain that completed folders drive analysis'
);
assert.match(
  mainHtml,
  /진행중인 활동 폴더/,
  'main sidebar should rename ready folders to in-progress folders'
);
assert.match(
  mainHtml,
  /\['completed',\s*'inProgress'\]/,
  'main sidebar should create folders inside completed and in-progress groups'
);
assert.match(
  mainHtml,
  /\{\s*key:\s*'other',\s*label:\s*'기타'\s*\}/,
  'main sidebar should include an other folder type inside each activity group'
);
assert.match(
  mainHtml,
  /function\s+normalizeFolderLabel[\s\S]*folder\.type\s*===\s*'other'[\s\S]*folder\.label\s*===\s*'기타 폴더'[\s\S]*return '기타'/,
  'main sidebar should migrate the old other-folder label to 기타'
);
assert.ok(
  !mainHtml.includes('data-folder-section="other"'),
  'main sidebar should not render a separate other folder section'
);
assert.match(
  mainHtml,
  /data-rename-folder/,
  'main sidebar should support folder renaming'
);
assert.match(
  fitfolioCss,
  /\.main-sidebar\s+\.icon-tool-button\s*\{[^}]*min-width:\s*56px;[^}]*padding:\s*0 10px;[^}]*white-space:\s*nowrap;[^}]*line-height:\s*1;/s,
  'main sidebar rename buttons should be wide enough to keep the label visible on one line'
);
assert.match(
  mainHtml,
  /data-delete-file/,
  'main sidebar should show per-file delete controls'
);
assert.match(
  mainHtml,
  /class="trash-icon"/,
  'main file delete buttons should render a trash can icon'
);
assert.match(
  mainHtml,
  /파일을 삭제하시겠습니까/,
  'main sidebar should confirm before deleting a file'
);
assert.match(
  mainHtml,
  /folder\.files\.length\s*\?\s*folder\.files\.map[\s\S]*파일을 이 폴더로 끌어오세요/,
  'main sidebar should render an empty-folder placeholder for folders with no files'
);
assert.match(
  fitfolioCss,
  /\.main-sidebar\s+\.uploaded-file-list\s*\{[^}]*display:\s*grid;/s,
  'main sidebar should show each empty-folder placeholder before any upload'
);
assert.ok(
  !/\.main-sidebar\s+\.uploaded-file-list\s*\{[^}]*display:\s*none;/s.test(fitfolioCss),
  'main sidebar uploaded-file-list should not be hidden until a folder is opened'
);
assert.match(
  mainHtml,
  /function\s+getFileTypeIcon/,
  'main sidebar should map file extensions to file type icons'
);
assert.ok(
  !mainHtml.includes('기획 자료') && !mainHtml.includes('결과 자료') && !mainHtml.includes('renderNestedFolder'),
  'main sidebar should not split each folder into planning/result subfolders'
);
assert.match(
  mainHtml,
  /event\.target\.closest\('\.drop-folder'\)/,
  'main sidebar should allow files to be dropped directly on each visible folder row'
);
assert.match(
  mainHtml,
  /clearDropOverFolders\(\)/,
  'main sidebar should clear drag highlight when the pointer leaves a folder'
);
assert.match(
  mainHtml,
  /<script src="\.\.\/js\/shared-nav\.js"><\/script>/,
  'main should load the shared navigation script'
);
assert.match(
  mainHtml,
  /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
  'main should load the auth navigation script'
);

for (const folderLabel of ['개인 프로젝트', '팀 프로젝트', '공모전', '자격증', '교육', '봉사', '기타']) {
  assert.ok(
    mainHtml.includes(`label: '${folderLabel}'`),
    `main sidebar should include the ${folderLabel} folder`
  );
}

assert.match(
  mainHtml,
  /내 정보 입력이 필요해요/,
  'main dashboard should show a large profile-required message before profile save'
);
assert.match(
  mainHtml,
  /class="next-card profile-needed-card"[\s\S]*class="metric-icon"[\s\S]*![\s\S]*내 정보 입력이 필요해요/,
  'main profile-required warning should keep the original large next-card icon layout'
);
assert.match(
  mainHtml,
  /href="mypage\.html">내 정보 작성하기<\/a>/,
  'main profile-required warning should keep the mypage call to action'
);
assert.match(
  mainHtml,
  /href="create\.html">활동기록 먼저 정리하기<\/a>/,
  'main profile-required warning should keep the activity organization call to action'
);
assert.ok(
  !mainHtml.includes('파일 관리로 이동'),
  'main sidebar should remove per-folder file management shortcut buttons'
);
assert.match(
  mainHtml,
  /myfitfolioProfile/,
  'main dashboard should read the saved mypage profile'
);
assert.match(
  mainHtml,
  /myfitfolioFolders/,
  'main dashboard should persist folder and file state'
);
assert.match(
  mainHtml,
  /키워드 중심 활동 개요/,
  'main dashboard should include a keyword-focused overview'
);
assert.match(
  mainHtml,
  /분석된 프로젝트/,
  'main dashboard should rename analyzed materials to analyzed projects'
);
assert.match(
  mainHtml,
  /활동 분류 현황/,
  'main dashboard should include the activity classification card'
);
assert.match(
  mainHtml,
  /analysis-info-button/,
  'main dashboard cards should include info buttons'
);
assert.ok(
  !mainHtml.includes('커리어 준비도'),
  'main dashboard should remove the career readiness card'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'portfolio.html')),
  'old portfolio.html should be renamed to portfolio_create.html'
);

const mypageHtml = fs.readFileSync(path.join(htmlDir, 'mypage.html'), 'utf8');
for (const text of [
  '경영지원',
  '광고/브랜드',
  '재무/IR',
  '해외영업',
  'UI/UX',
  'AI/머신러닝',
  '네트워크/인프라',
  '공공/행정',
  '금융/보험',
  '미디어/콘텐츠',
]) {
  assert.ok(
    mypageHtml.includes(text),
    `mypage should include the expanded job option ${text}`
  );
}
for (const text of [
  '신사업 기획',
  'CRM 마케팅',
  '컴플라이언스',
  '글로벌 세일즈',
  '컴퓨터비전 엔지니어',
  'SRE',
  '반도체 공정',
  '항공서비스',
]) {
  assert.ok(
    mypageHtml.includes(text),
    `mypage should include the expanded detail job option ${text}`
  );
}
for (const text of ['전기공학과', '정보컴퓨터공학과', '화공생명공학과', '산업공학과']) {
  assert.ok(
    mypageHtml.includes(text),
    `mypage should include the attachment major option ${text}`
  );
}
assert.match(
  mypageHtml,
  /<div data-shared-nav data-active="mypage"><\/div>\s*<script src="\.\.\/js\/shared-nav\.js"><\/script>\s*<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
  'mypage should keep the shared nav and auth-nav scripts when applying the attachment'
);
assert.ok(
  !mypageHtml.includes('href="fitfolio.css"') && !mypageHtml.includes('<header class="top-nav">'),
  'mypage should not restore the standalone stylesheet or duplicated header'
);
assert.match(
  mypageCss,
  /\.account-card\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;[^}]*background:\s*#fbfcff;/s,
  'mypage account management card should use the login-related account card styles'
);
assert.match(
  mypageCss,
  /\.account-actions\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end;/s,
  'mypage account management actions should align buttons to the right'
);
assert.match(
  mypageCss,
  /\.account-actions\s+\.outline-button,\s*\.account-actions\s+\.danger-button\s*\{[^}]*min-width:\s*104px;[^}]*min-height:\s*40px;/s,
  'mypage account management buttons should use the account action sizing from fitfolio.css'
);
assert.match(
  mypageCss,
  /\.account-actions\s+\.danger-button\s*\{[^}]*border-color:\s*#f05265;[^}]*background:\s*#f05265;[^}]*color:\s*#fff;/s,
  'mypage account withdrawal button should use the login-related danger button style'
);
assert.match(
  mypageCss,
  /@media\s*\(max-width:\s*900px\)[\s\S]*\.account-card\s*\{[^}]*align-items:\s*stretch;[^}]*flex-direction:\s*column;[\s\S]*\.account-actions\s+\.outline-button,\s*\.account-actions\s+\.danger-button\s*\{[^}]*flex:\s*1;/s,
  'mypage account management actions should stack cleanly on small screens'
);

const withdrawHtml = fs.readFileSync(path.join(htmlDir, 'withdraw.html'), 'utf8');
assert.match(
  withdrawHtml,
  /<title>Myfitfolio - 회원 탈퇴<\/title>/,
  'withdraw page should use the requested title'
);
assert.match(
  withdrawHtml,
  /href="\.\.\/css\/common\.css"[\s\S]*href="\.\.\/css\/withdraw\.css"/,
  'withdraw page should use separated common and page-specific stylesheets'
);
assert.match(
  withdrawHtml,
  /<main class="withdraw-page">[\s\S]*<section class="withdraw-card" aria-labelledby="withdrawTitle">/,
  'withdraw page should render the withdrawal card'
);
assert.match(
  withdrawHtml,
  /id="withdrawConfirm"[\s\S]*id="withdrawButton"[\s\S]*disabled/,
  'withdraw page should require confirmation before enabling withdrawal'
);
assert.match(
  withdrawHtml,
  /localStorage\.clear\(\);[\s\S]*sessionStorage\.clear\(\);[\s\S]*window\.location\.href\s*=\s*'login\.html'/,
  'withdraw page should clear local and session state before returning to login'
);
assert.ok(
  !withdrawHtml.includes('fitfolio.css') && !withdrawHtml.includes('shared-nav.js') && !withdrawHtml.includes('auth-nav.js'),
  'withdraw page should stay standalone instead of loading app navigation'
);
assert.match(
  withdrawCss,
  /\.withdraw-page\s*\{[^}]*place-items:\s*center;/s,
  'withdraw stylesheet should center the withdrawal page'
);
assert.match(
  withdrawCss,
  /\.danger-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/s,
  'withdraw stylesheet should make disabled withdrawal action visibly inactive'
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
  /data-shared-nav data-active="create"/,
  'file management should use the shared top navigation mount'
);
assert.match(
  sharedNavJs,
  /\{\s*key:\s*'create',\s*href:\s*'create\.html',\s*label:\s*'파일 관리'\s*\}/,
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
  fitfolioCss,
  /\.profile-needed-card\s+\.next-actions\s+a\s*\{[^}]*padding-left:\s*28px;[^}]*padding-right:\s*28px;/s,
  'main profile-required action links should have wider horizontal padding'
);
assert.match(
  fitfolioCss,
  /\.profile-menu\s*\{[^}]*position:\s*relative;/s,
  'shared stylesheet should position the profile dropdown menu'
);
assert.match(
  fitfolioCss,
  /\.profile-dropdown\.open\s*\{[^}]*display:\s*grid;/s,
  'shared stylesheet should display an opened profile dropdown'
);
assert.match(
  fitfolioCss,
  /\.login-required-page\s*\{[^}]*place-items:\s*center;/s,
  'main stylesheet should center the logged-out main page message'
);
assert.match(
  fitfolioCss,
  /\.login-required-card\s*\{[^}]*grid-template-columns:\s*82px minmax\(0,\s*1fr\);/s,
  'main stylesheet should style the logged-out main page card'
);
assert.ok(
  !/\.nav-resize-handle|--nav-tabs-width/.test(fitfolioCss),
  'shared stylesheet should not keep top navigation resize styles'
);
assert.match(
  fitfolioCss,
  /\.nav-tab\s*\{[^}]*white-space:\s*nowrap;/s,
  'navigation buttons should keep their labels horizontal'
);
assert.match(
  fitfolioCss,
  /\.sidebar-resize-handle/,
  'shared stylesheet should style the main sidebar resize handle'
);
assert.match(
  fitfolioCss,
  /\.profile-needed-card\s+\.metric-icon\s*\{[^}]*width:\s*96px;[^}]*height:\s*96px;[^}]*font-size:\s*64px;[^}]*line-height:\s*1;/s,
  'profile-required warning icon and icon box should both be visibly larger'
);
assert.match(
  fitfolioCss,
  /\.profile-needed-card\s+p\s*\{[^}]*font-size:\s*28px;/s,
  'profile-required description should be twice the previous text size'
);
assert.match(
  fitfolioCss,
  /\.profile-needed-card\s+\.next-actions\s*\{[^}]*grid-column:\s*2;[^}]*justify-content:\s*flex-start;/s,
  'profile-required action buttons should sit below the message like the original layout'
);
assert.match(
  fitfolioCss,
  /\.trash-icon/,
  'shared stylesheet should draw the trash can delete icon'
);
assert.match(
  fitfolioCss,
  /\.status-completed\s+\.mini-folder,[\s\S]*\.status-completed\s+\.icon-tool-button\s*\{[^}]*color:\s*#227a4b;/,
  'completed folder icons should match the completed section text color'
);
assert.match(
  fitfolioCss,
  /\.status-in-progress\s+\.mini-folder,[\s\S]*\.status-in-progress\s+\.icon-tool-button\s*\{[^}]*color:\s*#3157c9;/,
  'in-progress folder icons should match the in-progress section text color'
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
  /<h1>[\s\S]*<span class="recommend-count" id="recommendCount">추천 활동 0개<\/span>[\s\S]*<\/h1>/,
  'contest page should show the dynamic recommendation count next to the title'
);
assert.match(
  contestHtml,
  /<div class="filter-controls">[\s\S]*<select id="industry-filter"[\s\S]*<select id="level-filter"[\s\S]*<label class="search-box" for="keyword-search">[\s\S]*<input id="keyword-search"/,
  'contest keyword search should sit at the far right after the job and difficulty filters'
);
assert.match(
  contestHtml,
  /href="\.\.\/css\/contest\.css"/,
  'contest page should use the recommendation-specific stylesheet'
);
assert.match(
  contestHtml,
  /href="\.\.\/css\/common\.css"/,
  'contest page should load the shared common stylesheet for the top navigation'
);
assert.match(
  contestHtml,
  /src="\.\.\/js\/contest\.js"/,
  'contest page should use the recommendation-specific script'
);
assert.match(
  contestHtml,
  /data-shared-nav data-active="contest"/,
  'contest page should use the shared top navigation mount'
);
assert.match(
  sharedNavJs,
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
  fs.existsSync(path.join(cssDir, 'contest.css')),
  'contest recommendation stylesheet should live in the css directory'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'contest.css')),
  'contest recommendation stylesheet should not remain in the html directory'
);
assert.ok(
  fs.existsSync(path.join(jsDir, 'contest.js')),
  'contest recommendation script should live in the js directory'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'contest.js')),
  'contest recommendation script should not remain in the html directory'
);

const contestJs = fs.readFileSync(path.join(jsDir, 'contest.js'), 'utf8');
const contestCss = fs.readFileSync(path.join(cssDir, 'contest.css'), 'utf8');
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
  /function\s+getTodayDate/,
  'contest should read the current date before calculating D-day labels'
);
assert.match(
  contestJs,
  /new Date\(\)/,
  'contest D-day calculation should use the browser current date'
);
assert.match(
  contestJs,
  /function\s+calculateDeadline/,
  'contest should calculate D-day labels from activity schedule dates'
);
assert.match(
  contestJs,
  /getActivityDeadline\(item\.id\)/,
  'contest cards should render D-day labels from the schedule date'
);
assert.match(
  contestJs,
  /function\s+getReadinessScheduleText/,
  'contest should create readiness copy from the calculated schedule date'
);
assert.match(
  contestJs,
  /getReadinessScheduleText\(item\.id,\s*item\.readinessReason\)/,
  'contest readiness detail should render date-aware preparation copy'
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
  /1:\s*'2026-07-12'[\s\S]*2:\s*'2026-07-12'/,
  'contest should place two July activities on the same date'
);
assert.match(
  contestJs,
  /3:\s*'2026-08-05'[\s\S]*4:\s*'2026-08-12'[\s\S]*5:\s*'2026-08-19'[\s\S]*6:\s*'2026-08-26'/,
  'contest should schedule four activities in August'
);
assert.match(
  contestJs,
  /7:\s*'2026-09-09'[\s\S]*8:\s*'2026-09-23'/,
  'contest should schedule two activities in September'
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
  /<button class="deadline-tag" type="button"/,
  'contest D-day bookmark should be a clickable button'
);
assert.match(
  contestJs,
  /function\s+toggleBookmarkSave/,
  'contest should save or remove an activity from the bookmark without opening details'
);
assert.match(
  contestJs,
  /event\.target\.closest\('\.deadline-tag'\)/,
  'contest should handle bookmark clicks separately from card clicks'
);
assert.match(
  contestJs,
  /event\.stopPropagation\(\)/,
  'contest bookmark clicks should not expand the activity card'
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
  contestHtml,
  /id="recommendCount"/,
  'contest recommendation count should have a stable render target'
);
assert.match(
  contestJs,
  /const\s+recommendationMatchThreshold\s*=\s*85/,
  'contest recommendation count should use an 85 percent match threshold'
);
assert.match(
  contestJs,
  /getMatchScore\(item\)\s*>=\s*recommendationMatchThreshold/,
  'contest recommendation count should include only activities over the match threshold'
);
assert.match(
  contestJs,
  /function\s+renderRecommendationCount/,
  'contest should render the threshold-based recommendation count'
);
assert.match(
  contestJs,
  /sortedSchedules\.slice\(0,\s*visibleScheduleLimit\)/,
  'contest schedule list should render only the nearest saved schedules'
);
assert.match(
  contestJs,
  /savedSchedules\.length\s*>\s*visibleScheduleLimit/,
  'contest should show a more control only when more than five schedules are saved'
);
assert.match(
  contestJs,
  /let\s+isScheduleExpanded\s*=\s*false/,
  'contest schedule list should keep an expanded state for more schedules'
);
assert.match(
  contestJs,
  /isScheduleExpanded\s*\?\s*sortedSchedules\s*:\s*sortedSchedules\.slice\(0,\s*visibleScheduleLimit\)/,
  'contest more schedules control should reveal the hidden saved schedules inline'
);
assert.match(
  contestJs,
  /data-toggle-schedule-list/,
  'contest more schedules control should toggle the inline saved schedule list'
);
assert.match(
  contestJs,
  /간략화하기/,
  'contest expanded saved schedule list should provide a compact action'
);
assert.ok(
  !contestJs.includes('https://calendar.google.com/calendar/u/0/r'),
  'contest more schedules control should not navigate to Google Calendar'
);
assert.match(
  contestJs,
  /class="text-button schedule-view"/,
  'contest saved schedule view buttons should be identifiable'
);
assert.match(
  contestJs,
  /data-date="\$\{event\.date\}"/,
  'contest saved schedule view buttons should carry the saved date'
);
assert.match(
  contestJs,
  /function\s+showScheduleDate/,
  'contest should move the calendar to a saved schedule date'
);
assert.match(
  contestJs,
  /focusedScheduleDate\s*=\s*null;[\s\S]*showActivityMonth\(item\)/,
  'contest activity selection should clear the saved schedule date highlight'
);
assert.match(
  contestJs,
  /selectedActivityId\s*=\s*null;[\s\S]*focusedScheduleDate\s*=\s*date;/,
  'contest saved schedule view should clear the selected activity highlight'
);
assert.match(
  contestJs,
  /scheduleList\.addEventListener\('click'/,
  'contest should handle saved schedule view button clicks'
);
assert.match(
  contestJs,
  /event\.target\.closest\('\.schedule-view'\)/,
  'contest should detect saved schedule view button clicks'
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
const portfolioCreateCss = fs.readFileSync(path.join(cssDir, 'portfolio_create.css'), 'utf8');
assert.match(
  portfolioCreateHtml,
  /data-shared-nav data-active="portfolio_create"/,
  'portfolio_create should use the shared top navigation mount'
);
assert.match(
  sharedNavJs,
  /\{\s*key:\s*'portfolio_create',\s*href:\s*'portfolio_create\.html',\s*label:\s*'포트폴리오 생성'\s*\}/,
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
  portfolioCreateCss,
  /\.hidden\s*\{\s*display:\s*none\s*!important;\s*\}/,
  'portfolio_create stylesheet should define hidden screens as display none'
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
  /const\s+loadingDuration\s*=\s*1200/,
  'portfolio_create loading progress should use the faster attachment timing'
);
assert.match(
  portfolioCreateHtml,
  /class="setup-layout"[\s\S]*class="setup-left"[\s\S]*class="setup-right"/,
  'portfolio_create setup should use the attachment two-column layout'
);
assert.match(
  portfolioCreateHtml,
  /id="pfFormatSelect"\s+type="hidden"/,
  'portfolio_create should store the selected format in a hidden input'
);
assert.match(
  portfolioCreateHtml,
  /class="format-card-grid"[\s\S]*role="radiogroup"[\s\S]*class="format-card selected"[\s\S]*data-format=/,
  'portfolio_create should render selectable visual format cards'
);
assert.match(
  portfolioCreateHtml,
  /id="pfMajorSelect"/,
  'portfolio_create should include the major selector from the attachment'
);
assert.match(
  portfolioCreateHtml,
  /id="keywordPool"/,
  'portfolio_create should render major-based keywords into a keyword pool'
);
assert.match(
  portfolioCreateHtml,
  /id="workspaceSubtitle"[\s\S]*id="workspaceBadge"/,
  'portfolio_create workspace should expose subtitle and badge targets'
);
assert.match(
  portfolioCreateHtml,
  /class="master-actions"[\s\S]*handleMasterAction\('save'\)[\s\S]*handleMasterAction\('download'\)[\s\S]*handleMasterAction\('exit'\)/,
  'portfolio_create should use the attachment master action controls'
);
assert.match(
  portfolioCreateHtml,
  /<textarea id="pfAssistantInput"[\s\S]*id="pfAssistantSendBtn"/,
  'portfolio_create assistant should use a textarea and dedicated send button'
);
for (const fnName of [
  'selectFormat',
  'renderKeywordPool',
  'buildPortfolioDraft',
  'buildSlides',
  'renderPortfolioPreview',
  'renderPptPreview',
  'moveSlide',
  'handleMasterAction',
  'downloadPptPreview',
  'exitEditingSession',
  'reviseDraftFromConversation',
  'appendChatBubble',
  'resetAssistantChat',
]) {
  assert.match(
    portfolioCreateHtml,
    new RegExp(`function\\s+${fnName}`),
    `portfolio_create should include ${fnName} from the attachment`
  );
}
assert.match(
  portfolioCreateHtml,
  /let\s+currentPortfolio\s*=\s*null;[\s\S]*let\s+chatHistory\s*=\s*\[\];[\s\S]*let\s+currentSlideIndex\s*=\s*0;/,
  'portfolio_create should track current portfolio, chat history, and PPT slide index'
);
assert.match(
  portfolioCreateHtml,
  /const\s+commonKeywords[\s\S]*const\s+majorKeywordMap/,
  'portfolio_create should generate keyword options from common and major-specific maps'
);
assert.match(
  portfolioCreateHtml,
  /currentPortfolio\.format\s*===\s*'PPT[^']*'/,
  'portfolio_create should branch to PPT preview rendering for PPT format'
);
assert.match(
  portfolioCreateHtml,
  /new Blob\(\[body\][\s\S]*application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation/,
  'portfolio_create should create a PPT download blob'
);
for (const cssPattern of [
  /\.setup-layout\s*\{/,
  /\.format-card-grid\s*\{/,
  /\.format-card\.selected::after\s*\{/,
  /\.ppt-preview-wrap\s*\{/,
  /\.ppt-slide\s*\{/,
  /\.slide-arrow\s*\{/,
  /\.master-actions\s*\{/,
  /\.flat-action\.danger\s*\{/,
  /\.chat-input\s+textarea\s*\{/,
  /\.chat-send-button\s*\{/,
  /\.portfolio-workspace\.leaving\s*\{/,
]) {
  assert.match(
    portfolioCreateCss,
    cssPattern,
    `portfolio_create stylesheet should include ${cssPattern}`
  );
}
assert.ok(
  !portfolioCreateHtml.includes('<header class="top-nav">') && !portfolioCreateHtml.includes('href="fitfolio.css"'),
  'portfolio_create should keep current separated assets and shared navigation while applying attachment changes'
);

const loginHtml = fs.readFileSync(path.join(htmlDir, 'login.html'), 'utf8');
const indexAuthHtml = fs.readFileSync(path.join(htmlDir, 'index.html'), 'utf8');
const signupHtml = fs.readFileSync(path.join(htmlDir, 'signup.html'), 'utf8');
const portfolioManageHtml = fs.readFileSync(path.join(htmlDir, 'portfolio_manage.html'), 'utf8');

for (const [fileName, html] of Object.entries({
  'main.html': mainHtml,
  'contest.html': contestHtml,
  'create.html': createHtml,
  'mypage.html': mypageHtml,
  'portfolio_create.html': portfolioCreateHtml,
  'portfolio_manage.html': portfolioManageHtml,
})) {
  assert.ok(
    !/<button[^>]*aria-label="알림"[^>]*>\s*!<\/button>/.test(html),
    `${fileName} should not show the old exclamation notification button`
  );
  assert.match(
    html,
    /<div data-shared-nav data-active="[^"]+"><\/div>/,
    `${fileName} should mount the shared navigation shell`
  );
  assert.match(
    html,
    /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
    `${fileName} should load the shared auth navigation script`
  );
}

assert.ok(
  !loginHtml.includes('href="withdraw.html"'),
  'login page should not link directly to account withdrawal'
);
assert.ok(
  !signupHtml.includes('href="withdraw.html"'),
  'signup page should not link directly to account withdrawal'
);
assert.ok(
  !indexAuthHtml.includes('href="withdraw.html"'),
  'auth index page should not link directly to account withdrawal'
);

assert.match(
  sharedNavJs,
  /data-profile-toggle/,
  'shared navigation should expose the profile dropdown toggle'
);
assert.match(
  sharedNavJs,
  /data-logout/,
  'shared navigation should expose logout in the profile menu'
);
assert.match(
    mypageHtml,
  /id="account"/,
  'mypage should include an account management section'
);
assert.match(
  mypageHtml,
  /data-anchor-target="account"/,
  'mypage side anchor menu should include account management'
);
assert.match(
  mypageHtml,
  /class="outline-button" type="button" data-logout/,
  'mypage account management should include a logout button'
);
assert.match(
  mypageHtml,
  /class="danger-button" href="withdraw\.html"/,
  'mypage account management should link to withdrawal'
);

assert.ok(
  !signupHtml.includes('auth-danger-link') && !signupHtml.includes('withdraw.html'),
  'signup page should not link to account withdrawal'
);
assert.match(
  withdrawHtml,
  /id="withdrawConfirm"/,
  'withdrawal page should require an explicit confirmation checkbox'
);
assert.match(
  withdrawHtml,
  /localStorage\.clear\(\)/,
  'withdrawal should clear locally stored profile data'
);
assert.match(
  mypageHtml,
  /const majors = \["전기공학과", "정보컴퓨터공학과", "화공생명공학과", "산업공학과"\]/,
  'mypage major pickers should use the requested department list'
);
for (const jobLabel of ['AI/머신러닝', '네트워크/인프라', '전기/전자', '화학/바이오', '금융/보험', '미디어/콘텐츠']) {
  assert.ok(
    mypageHtml.includes(`"${jobLabel}"`),
    `mypage job list should include ${jobLabel}`
  );
}
