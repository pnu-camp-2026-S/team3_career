const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const htmlDir = path.join(rootDir, 'html');
const cssDir = path.join(rootDir, 'css');
const jsDir = path.join(rootDir, 'js');
const appDir = path.join(rootDir, 'app');
const libDir = path.join(rootDir, 'lib');

function readHtml(fileName) {
  return fs.readFileSync(path.join(htmlDir, fileName), 'utf8');
}

function readPageSource(fileName) {
  const html = readHtml(fileName);
  const scriptPath = path.join(jsDir, fileName.replace(/\.html$/i, '.js'));
  if (!fs.existsSync(scriptPath)) return html;
  return `${html}\n${fs.readFileSync(scriptPath, 'utf8')}`;
}

const linkedHtmlFiles = [
  'contest.html',
  'create.html',
  'login.html',
  'mypage.html',
  'portfolio_create.html',
  'portfolio_manage.html',
  'portfolio_viewer.html',
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
  'portfolio_viewer.html': 'portfolio_manage.css',
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
assert.ok(
  fs.existsSync(path.join(jsDir, 'activity-recommendation-dataset.js')),
  'activity recommendation dummy dataset should live in the js directory'
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
const folderStoreJsPath = path.join(jsDir, 'folder-store.js');
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

assert.ok(
  fs.existsSync(folderStoreJsPath),
  'folder data store script should live in the js directory (Firebase-ready abstraction)'
);
const folderStoreJs = fs.readFileSync(folderStoreJsPath, 'utf8');
assert.match(
  folderStoreJs,
  /myfitfolioFolders/,
  'folder store should persist folder and file state under the shared storage key'
);
assert.match(
  folderStoreJs,
  /key:\s*'completed'[\s\S]*key:\s*'inProgress'/,
  'folder store should define completed and in-progress folder groups'
);
assert.match(
  folderStoreJs,
  /\{\s*key:\s*'other',\s*label:\s*'기타',\s*color:\s*'#[0-9a-fA-F]{6}'\s*\}/,
  'folder store should include an other folder type inside each activity group'
);
assert.match(
  folderStoreJs,
  /function\s+normalizeFolderLabel[\s\S]*folder\.type\s*===\s*'other'[\s\S]*folder\.label\s*===\s*'기타 폴더'[\s\S]*return '기타'/,
  'folder store should migrate the old other-folder label to 기타'
);
for (const folderLabel of ['개인 프로젝트', '팀 프로젝트', '공모전', '자격증', '교육', '봉사', '기타']) {
  assert.ok(
    folderStoreJs.includes(`label: '${folderLabel}'`),
    `folder store should include the ${folderLabel} folder type`
  );
}
assert.match(
  folderStoreJs,
  /function\s+createFolder\(/,
  'folder store should expose a helper to create custom project folders (#132)'
);
assert.match(
  folderStoreJs,
  /github:\s*null/,
  'folder store folders should carry a per-project github connection field (#132)'
);
// #137-2: 프로젝트 폴더는 활동 유형별 하위 폴더(subfolders)를 가진다
assert.match(
  folderStoreJs,
  /subfolders:\s*buildSubfolders\(/,
  'folder store folders should carry template subfolders (#137-2)'
);
assert.match(
  folderStoreJs,
  /const\s+SUBFOLDER_TEMPLATES\s*=/,
  'folder store should define default subfolder templates per activity type (#137-2)'
);
assert.match(
  folderStoreJs,
  /function\s+createFolder\(groupKey,\s*label,\s*typeKey\)/,
  'createFolder should accept an activity type to build matching subfolders (#137-2)'
);
assert.match(
  folderStoreJs,
  /function\s+getFolderFiles\(folder\)[\s\S]*subfolders[\s\S]*flatMap/,
  'folder store should expose getFolderFiles that flattens subfolder files (#137-2)'
);
assert.match(
  folderStoreJs,
  /function\s+findSubfolder\(folders,\s*subfolderId\)/,
  'folder store should expose findSubfolder to locate a subfolder by id (#137-2)'
);
assert.match(
  folderStoreJs,
  /ANALYSIS_SUBFOLDER_LABEL\s*=\s*'AI 요약'[\s\S]*function\s+ensureAnalysisSubfolder[\s\S]*analysisSubfolderId/,
  'folder store should append a dedicated AI 요약 subfolder to each project'
);
assert.match(
  folderStoreJs,
  /function\s+getAnalysisSubfolder\(folder\)[\s\S]*ensureAnalysisSubfolder/,
  'folder store should expose the dedicated AI summary subfolder lookup'
);
assert.match(
  folderStoreJs,
  /window\.FolderStore\s*=/,
  'folder store should expose its API on window.FolderStore'
);

for (const [file, activeKey] of sharedNavPages) {
  const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  assert.match(
    html,
    new RegExp(`<div data-shared-nav data-active="${activeKey}"></div>\\s*(?:<script src="\\.\\./js/folder-store\\.js"></script>\\s*)?<script src="\\.\\./js/shared-nav\\.js"></script>`),
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
for (const file of [
  'create.html',
  'main.html',
  'mypage.html',
  'portfolio_create.html',
  'portfolio_manage.html',
  'portfolio_viewer.html',
  'withdraw.html',
]) {
  const html = readHtml(file);
  const scriptName = file.replace(/\.html$/i, '.js');
  const scriptPath = path.join(jsDir, scriptName);
  const script = fs.readFileSync(scriptPath, 'utf8');

  assert.ok(
    fs.existsSync(scriptPath),
    `${scriptName} should exist in the js directory after extracting inline scripts`
  );
  assert.ok(
    !/<script\b(?![^>]*\bsrc=)/i.test(html),
    `${file} should not keep inline script blocks`
  );
  assert.match(
    html,
    new RegExp(`<script src="\\.\\./js/${scriptName.replace('.', '\\.')}(?:\\?[^"]+)?" defer><\\/script>`),
    `${file} should load its extracted page script with defer`
  );
  for (const section of [
    '1. 전역 상수 및 상태 변수 선언',
    '2. DOM 요소 선택',
    '3. 유틸리티 및 일반 함수 정의',
    '4. 이벤트 리스너 등록',
    '5. 초기화 실행',
  ]) {
    assert.ok(script.includes(section), `${scriptName} should include the ${section} section`);
  }
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
  /const\s+AUTH_ME_ENDPOINT\s*=\s*'\/api\/auth\/me'/,
  'auth navigation should read login state from the Supabase-backed session endpoint'
);
assert.match(
  authNavJs,
  /function\s+wireAuthLoginButtons/,
  'auth navigation should wire auth page login buttons'
);
assert.match(
  authNavJs,
  /window\.location\.href\s*=\s*`\/api\/auth\/social\?provider=\$\{provider\}`/,
  'auth navigation should send social login buttons through the Supabase OAuth API'
);
assert.ok(
  !/\.naver-icon/.test(authCss),
  'auth stylesheet should drop the unused Naver login icon style'
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
  /fetch\(AUTH_LOGOUT_ENDPOINT,\s*\{\s*method:\s*'POST'\s*\}\)/,
  'auth navigation should call the Supabase logout API before returning to login'
);

const activityDatasetJs = fs.readFileSync(path.join(jsDir, 'activity-recommendation-dataset.js'), 'utf8');
const activityDatasetContext = {};
Function(
  'window',
  `${activityDatasetJs}; window.dataset = activityRecommendationDataset;`
)(activityDatasetContext);
const activityRecommendationDataset = activityDatasetContext.dataset;

assert.strictEqual(
  activityRecommendationDataset.length,
  100,
  'activity recommendation dataset should include 100 dummy activities'
);
assert.strictEqual(
  activityRecommendationDataset.filter((item) => item.category === 'major-relevant').length,
  90,
  'activity recommendation dataset should include 90 major-relevant activities'
);
assert.strictEqual(
  activityRecommendationDataset.filter((item) => item.category === 'arts-adjacent').length,
  5,
  'activity recommendation dataset should include 5 arts-adjacent activities'
);
assert.strictEqual(
  activityRecommendationDataset.filter((item) => item.category === 'low-value-noise').length,
  5,
  'activity recommendation dataset should include 5 low-value noise activities'
);
for (const department of ['컴퓨터공학과', '전기공학과', '화공생명공학과', '산업공학과']) {
  assert.ok(
    activityRecommendationDataset.some((item) => item.primaryDepartment === department),
    `activity recommendation dataset should include activities for ${department}`
  );
  assert.ok(
    activityRecommendationDataset.every((item) => typeof item.departmentFit[department] === 'number'),
    `activity recommendation dataset should score every activity for ${department}`
  );
}
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

for (const file of ['index.html']) {
  assert.ok(
    fs.existsSync(path.join(rootDir, file)),
    `${file} should exist at the project root as a GitHub Pages fallback redirect`
  );
  assert.ok(
    fs.existsSync(path.join(htmlDir, file)),
    `${file} should also live in the html directory`
  );
}

assert.ok(
  !fs.existsSync(path.join(rootDir, 'main.html')),
  'main.html should only live in the html directory now that Vercel renders it through Next.js'
);

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const nextConfig = fs.readFileSync(path.join(rootDir, 'next.config.js'), 'utf8');
assert.strictEqual(packageJson.scripts.dev, 'next dev --webpack', 'project should expose the Next.js dev server command without Turbopack path issues on Korean Windows folders');
assert.strictEqual(packageJson.scripts.build, 'next build', 'project should expose the Next.js build command');
assert.strictEqual(packageJson.scripts.start, 'next start', 'project should run the Next.js production server');
assert.ok(packageJson.dependencies.next, 'project should depend on Next.js');
assert.ok(packageJson.dependencies.react, 'project should depend on React');
assert.ok(packageJson.dependencies['react-dom'], 'project should depend on React DOM');
assert.ok(packageJson.dependencies['@supabase/supabase-js'], 'project should depend on the Supabase JavaScript client');
assert.ok(packageJson.dependencies['@supabase/ssr'], 'project should depend on Supabase SSR helpers for Next.js auth cookies');
assert.ok(!packageJson.dependencies.express, 'project should no longer depend on Express after the Next.js migration');
assert.ok(!fs.existsSync(path.join(rootDir, 'server.js')), 'legacy Express server.js should be removed after the Next.js migration');
assert.match(
  nextConfig,
  /require\('dotenv'\)\.config\(\{\s*path:\s*'key\.env'\s*\}\)/,
  'Next config should load key.env so Supabase environment variables are available in dev and build'
);

const nextLegacyPage = fs.readFileSync(path.join(appDir, '[[...slug]]', 'page.js'), 'utf8');
const nextLegacyScripts = fs.readFileSync(path.join(appDir, 'LegacyScripts.jsx'), 'utf8');
const nextLegacyLib = fs.readFileSync(path.join(libDir, 'legacy-page.js'), 'utf8');
const nextCssRoute = fs.readFileSync(path.join(appDir, 'css', '[...file]', 'route.js'), 'utf8');
const nextJsRoute = fs.readFileSync(path.join(appDir, 'js', '[...file]', 'route.js'), 'utf8');
const nextSignupRoute = fs.readFileSync(path.join(appDir, 'api', 'signup', 'route.js'), 'utf8');
const nextChatRoute = fs.readFileSync(path.join(appDir, 'api', 'chat', 'route.js'), 'utf8');
const supabaseServerPath = path.join(libDir, 'supabase-server.js');
const socialAuthRoutePath = path.join(appDir, 'api', 'auth', 'social', 'route.js');
const authCallbackRoutePath = path.join(appDir, 'api', 'auth', 'callback', 'route.js');
const authMeRoutePath = path.join(appDir, 'api', 'auth', 'me', 'route.js');
const authLogoutRoutePath = path.join(appDir, 'api', 'auth', 'logout', 'route.js');
const authWithdrawRoutePath = path.join(appDir, 'api', 'auth', 'withdraw', 'route.js');
const userProfileRoutePath = path.join(appDir, 'api', 'profile', 'route.js');
const activityFilesRoutePath = path.join(appDir, 'api', 'activity-files', 'route.js');
const portfoliosRoutePath = path.join(appDir, 'api', 'portfolios', 'route.js');
const profilesSchemaPath = path.join(rootDir, 'docs', 'supabase-profiles.sql');
const userProfilesSchemaPath = path.join(rootDir, 'docs', 'supabase-user-profiles.sql');
const activityFilesSchemaPath = path.join(rootDir, 'docs', 'supabase-activity-files.sql');
const portfoliosSchemaPath = path.join(rootDir, 'docs', 'supabase-portfolios.sql');
assert.ok(fs.existsSync(supabaseServerPath), 'Supabase server helper should live in lib/supabase-server.js');
assert.ok(fs.existsSync(socialAuthRoutePath), 'social login API should live in app/api/auth/social/route.js');
assert.ok(fs.existsSync(authCallbackRoutePath), 'OAuth callback API should live in app/api/auth/callback/route.js');
assert.ok(fs.existsSync(authMeRoutePath), 'current-user API should live in app/api/auth/me/route.js');
assert.ok(fs.existsSync(authLogoutRoutePath), 'logout API should live in app/api/auth/logout/route.js');
assert.ok(fs.existsSync(authWithdrawRoutePath), 'account withdrawal API should live in app/api/auth/withdraw/route.js');
assert.ok(fs.existsSync(userProfileRoutePath), 'mypage profile API should live in app/api/profile/route.js');
assert.ok(fs.existsSync(activityFilesRoutePath), 'activity file API should live in app/api/activity-files/route.js');
assert.ok(fs.existsSync(portfoliosRoutePath), 'portfolio API should live in app/api/portfolios/route.js');
assert.ok(fs.existsSync(profilesSchemaPath), 'Supabase profiles schema should be documented for DB setup');
assert.ok(fs.existsSync(userProfilesSchemaPath), 'Supabase user_profiles schema should be documented for mypage DB setup');
assert.ok(fs.existsSync(activityFilesSchemaPath), 'Supabase activity_files schema should be documented for file DB setup');
assert.ok(fs.existsSync(portfoliosSchemaPath), 'Supabase portfolios schema should be documented for portfolio DB setup');
const supabaseServer = fs.existsSync(supabaseServerPath) ? fs.readFileSync(supabaseServerPath, 'utf8') : '';
const socialAuthRoute = fs.existsSync(socialAuthRoutePath) ? fs.readFileSync(socialAuthRoutePath, 'utf8') : '';
const authCallbackRoute = fs.existsSync(authCallbackRoutePath) ? fs.readFileSync(authCallbackRoutePath, 'utf8') : '';
const authMeRoute = fs.existsSync(authMeRoutePath) ? fs.readFileSync(authMeRoutePath, 'utf8') : '';
const authLogoutRoute = fs.existsSync(authLogoutRoutePath) ? fs.readFileSync(authLogoutRoutePath, 'utf8') : '';
const authWithdrawRoute = fs.existsSync(authWithdrawRoutePath) ? fs.readFileSync(authWithdrawRoutePath, 'utf8') : '';
const userProfileRoute = fs.existsSync(userProfileRoutePath) ? fs.readFileSync(userProfileRoutePath, 'utf8') : '';
const activityFilesRoute = fs.existsSync(activityFilesRoutePath) ? fs.readFileSync(activityFilesRoutePath, 'utf8') : '';
const portfoliosRoute = fs.existsSync(portfoliosRoutePath) ? fs.readFileSync(portfoliosRoutePath, 'utf8') : '';
const profilesSchema = fs.existsSync(profilesSchemaPath) ? fs.readFileSync(profilesSchemaPath, 'utf8') : '';
const userProfilesSchema = fs.existsSync(userProfilesSchemaPath) ? fs.readFileSync(userProfilesSchemaPath, 'utf8') : '';
const activityFilesSchema = fs.existsSync(activityFilesSchemaPath) ? fs.readFileSync(activityFilesSchemaPath, 'utf8') : '';
const portfoliosSchema = fs.existsSync(portfoliosSchemaPath) ? fs.readFileSync(portfoliosSchemaPath, 'utf8') : '';

assert.match(
  nextLegacyPage,
  /const resolvedParams = await params;[\s\S]*getLegacyPage\(resolvedParams\?\.slug \|\| \[\]\)/,
  'Next catch-all route should render the existing html pages'
);
assert.match(
  nextLegacyScripts,
  /document\.createElement\('script'\)[\s\S]*document\.body\.appendChild\(element\)/,
  'Next migration should re-run legacy page scripts in browser order'
);
assert.match(
  nextLegacyScripts,
  /function\s+wrapInlineScript\(content\)[\s\S]*element\.text\s*=\s*wrapInlineScript\(script\.content \|\| ''\)/,
  'Next legacy script loader should wrap inline scripts so repeated mounts do not redeclare top-level const bindings'
);
assert.match(
  nextLegacyLib,
  /const htmlDir = path\.join\(process\.cwd\(\), 'html'\)/,
  'Next legacy renderer should keep the current html directory as source of truth'
);
assert.ok(
  nextLegacyLib.includes('function normalizeAssetPath(assetPath)') &&
    nextLegacyLib.includes(".replace(/^(\\.\\.\\/|\\.\\/)+/, '')") &&
    nextLegacyLib.includes("normalized.startsWith('/')"),
  'Next legacy renderer should normalize existing relative asset paths'
);
assert.match(
  nextCssRoute,
  /const params = await context\.params;[\s\S]*path\.join\(process\.cwd\(\), 'css'/,
  'Next route handler should serve existing css assets'
);
assert.match(
  nextJsRoute,
  /const params = await context\.params;[\s\S]*path\.join\(process\.cwd\(\), 'js'/,
  'Next route handler should serve existing js assets'
);
assert.match(
  nextSignupRoute,
  /export async function POST\(request\)[\s\S]*bcrypt\.hash/,
  'signup API should move from Express to a Next route handler'
);
assert.match(
  nextChatRoute,
  /export async function POST\(request\)[\s\S]*OpenAI/,
  'chat API should move from Express to a Next route handler'
);
assert.match(
  userProfileRoute,
  /export async function GET\(\)[\s\S]*\.from\('user_profiles'\)[\s\S]*\.maybeSingle\(\)/,
  'profile API should load the current user mypage profile from Supabase'
);
assert.match(
  authWithdrawRoute,
  /async function getCurrentUser\(supabase\)[\s\S]*supabase\.auth\.getUser\(\)[\s\S]*export async function POST\(\)[\s\S]*getCurrentUser\(supabase\)[\s\S]*createSupabaseAdminClient\(\)/,
  'withdrawal API should authenticate the current Supabase user and use the server admin client'
);
assert.match(
  authWithdrawRoute,
  /\.from\('activity_files'\)[\s\S]*\.select\('storage_bucket, storage_path'\)[\s\S]*storage\.from\(bucket\)\.remove\(paths\)/,
  'withdrawal API should remove uploaded Storage objects before deleting account data'
);
assert.match(
  authWithdrawRoute,
  /USER_ROW_TARGETS[\s\S]*activity_files[\s\S]*portfolios[\s\S]*user_profiles[\s\S]*profiles[\s\S]*\.delete\(\)[\s\S]*\.eq\(target\.column, userId\)/,
  'withdrawal API should hard-delete app-owned rows for the withdrawing user'
);
assert.match(
  authWithdrawRoute,
  /supabase\.auth\.signOut\(\)[\s\S]*supabaseAdmin\.auth\.admin\.deleteUser\(user\.id\)/,
  'withdrawal API should end the current session and delete the Supabase Auth user'
);
assert.match(
  userProfileRoute,
  /function\s+getSocialProfileDefaults\(user\)[\s\S]*user\?\.user_metadata[\s\S]*metadata\.full_name[\s\S]*user\?\.email/,
  'profile API should derive mypage defaults from the authenticated social user metadata'
);
assert.match(
  userProfileRoute,
  /function\s+mergeProfileWithSocialDefaults\(row,\s*user\)[\s\S]*toClientProfile\(row\)[\s\S]*savedProfile\.name\s*\|\|\s*socialProfile\.name[\s\S]*savedProfile\.email\s*\|\|\s*socialProfile\.email/,
  'profile API should fill empty mypage fields from social login defaults'
);
assert.match(
  userProfileRoute,
  /export async function PUT\(request\)[\s\S]*\.from\('user_profiles'\)[\s\S]*\.upsert\(/,
  'profile API should upsert the current user mypage profile into Supabase'
);
assert.match(
  userProfileRoute,
  /user_id:\s*user\.id[\s\S]*birth_date:[\s\S]*educations:[\s\S]*preferences:[\s\S]*chips:/,
  'profile API should map mypage fields into the user_profiles table'
);
assert.match(
  userProfilesSchema,
  /create table if not exists public\.user_profiles[\s\S]*user_id uuid primary key references auth\.users\(id\) on delete cascade/,
  'user_profiles schema should create one mypage profile row per auth user'
);
assert.match(
  userProfilesSchema,
  /educations jsonb[\s\S]*preferences jsonb[\s\S]*chips jsonb/,
  'user_profiles schema should store repeatable mypage sections as jsonb'
);
assert.match(
  userProfilesSchema,
  /enable row level security[\s\S]*auth\.uid\(\) = user_id/,
  'user_profiles schema should restrict access to the signed-in user'
);
assert.match(
  activityFilesRoute,
  /export async function GET\(request\)[\s\S]*\.from\('activity_files'\)[\s\S]*\.select\(/,
  'activity file API should list the current user files from Supabase'
);
assert.match(
  activityFilesRoute,
  /file_analyses\(status, summary_md, index_draft, log_md\)[\s\S]*summaryMd[\s\S]*indexDraft[\s\S]*logMd/,
  'activity file API should return saved AI summary artifacts for file-management display'
);
assert.match(
  activityFilesRoute,
  /export async function POST\(request\)[\s\S]*request\.formData\(\)[\s\S]*storage\.from\(ACTIVITY_FILE_BUCKET\)\.upload/,
  'activity file API should upload dropped files to Supabase Storage'
);
assert.match(
  activityFilesRoute,
  /export async function DELETE\(request\)[\s\S]*storage\.from\(ACTIVITY_FILE_BUCKET\)\.remove[\s\S]*\.from\('activity_files'\)[\s\S]*\.delete\(\)/,
  'activity file API should remove both Storage objects and activity_files rows'
);
assert.match(
  portfoliosRoute,
  /export async function GET\(request\)[\s\S]*\.from\('portfolios'\)[\s\S]*deleted_at/,
  'portfolio API should list non-deleted current user portfolios'
);
assert.match(
  portfoliosRoute,
  /export async function POST\(request\)[\s\S]*\.from\('portfolios'\)[\s\S]*\.upsert\(/,
  'portfolio API should save generated portfolios to Supabase'
);
assert.match(
  portfoliosRoute,
  /export async function PATCH\(request\)[\s\S]*liked[\s\S]*updated_at/,
  'portfolio API should update portfolio state such as liked'
);
assert.match(
  portfoliosRoute,
  /export async function DELETE\(request\)[\s\S]*deleted_at/,
  'portfolio API should soft-delete portfolios'
);
assert.match(
  activityFilesSchema,
  /create table if not exists public\.activity_files[\s\S]*storage_bucket text[\s\S]*storage_path text/,
  'activity_files schema should store Storage object metadata'
);
assert.match(
  activityFilesSchema,
  /insert into storage\.buckets[\s\S]*activity-files/,
  'activity_files schema should create the activity-files Storage bucket'
);

// #167: 프로젝트-하위폴더 트리 구조 컬럼과 마이그레이션
assert.match(
  activityFilesSchema,
  /project_id text not null[\s\S]*parent_folder_id text[\s\S]*folder_path text not null[\s\S]*folder_level smallint not null/,
  'activity_files schema should include the folder tree columns (#167)'
);
assert.match(
  activityFilesSchema,
  /foreign key \(user_id, project_id\)[\s\S]*references public\.activity_folders \(user_id, id\)[\s\S]*on delete cascade/,
  'activity_files should be connected to activity_folders so folder deletion removes file rows'
);
assert.match(
  activityFilesSchema,
  /delete from public\.activity_files as af[\s\S]*not exists[\s\S]*public\.activity_folders as folder/,
  'activity_files schema should document cleanup for files left after a folder was manually deleted'
);
const activityFilesTreeMigrationPath = path.join(rootDir, 'docs', 'supabase-activity-files-tree-migration.sql');
assert.ok(
  fs.existsSync(activityFilesTreeMigrationPath),
  'the activity_files tree migration SQL should be documented for existing installs (#167)'
);
const activityFilesTreeMigration = fs.readFileSync(activityFilesTreeMigrationPath, 'utf8');
assert.match(
  activityFilesTreeMigration,
  /add column if not exists project_id[\s\S]*split_part\(folder_id, '::', 1\)[\s\S]*replace\(folder_id, '::', '\/'\)/,
  'the tree migration should backfill tree columns from legacy folder_id values (#167)'
);
assert.match(
  activityFilesRoute,
  /deriveFolderTree[\s\S]*project_id: tree\.projectId[\s\S]*folder_path: tree\.folderPath/,
  'activity file API should persist the derived folder tree columns (#167)'
);

// AI 분석 결과 저장 스키마 + 분석 API
const analysisSchemaPath = path.join(rootDir, 'docs', 'supabase-analysis.sql');
assert.ok(fs.existsSync(analysisSchemaPath), 'Supabase analysis schema should be documented for analysis DB setup');
const analysisSchema = fs.readFileSync(analysisSchemaPath, 'utf8');
assert.match(
  analysisSchema,
  /create table if not exists public\.file_analyses[\s\S]*activity_file_id uuid not null references public\.activity_files\(id\)[\s\S]*unique \(activity_file_id\)/,
  'file_analyses schema should keep one analysis row per activity file'
);
assert.match(
  analysisSchema,
  /create table if not exists public\.project_analyses[\s\S]*scope text not null default 'project' check \(scope in \('project', 'user'\)\)[\s\S]*unique \(user_id, scope, project_id\)/,
  'project_analyses schema should store project and user scoped aggregate results'
);
assert.match(
  analysisSchema,
  /alter table public\.file_analyses enable row level security[\s\S]*auth\.uid\(\) = user_id[\s\S]*alter table public\.project_analyses enable row level security[\s\S]*auth\.uid\(\) = user_id/,
  'analysis tables should restrict rows to their owner'
);
assert.match(
  analysisSchema,
  /delete_project_analysis_for_activity_folder[\s\S]*delete from public\.project_analyses[\s\S]*scope = 'project'[\s\S]*project_id = old\.id[\s\S]*create trigger activity_folders_delete_project_analyses/,
  'project_analyses should be cleaned up when an activity folder is deleted'
);
assert.match(
  analysisSchema,
  /delete from public\.project_analyses as pa[\s\S]*pa\.scope = 'project'[\s\S]*not exists[\s\S]*public\.activity_folders as folder/,
  'analysis schema should document cleanup for project analyses left after a folder was manually deleted'
);

const projectAnalysisRoutePath = path.join(appDir, 'api', 'analysis', 'project', 'route.js');
const aggregateAnalysisRoutePath = path.join(appDir, 'api', 'analysis', 'aggregate', 'route.js');
const dbRepositoryPath = path.join(rootDir, 'ai_analysis', 'db-repository.mjs');
assert.ok(fs.existsSync(projectAnalysisRoutePath), 'project analysis API should live in app/api/analysis/project/route.js');
assert.ok(fs.existsSync(aggregateAnalysisRoutePath), 'aggregate analysis API should live in app/api/analysis/aggregate/route.js');
assert.ok(fs.existsSync(dbRepositoryPath), 'the Supabase analysis repository should live in ai_analysis/db-repository.mjs');
const projectAnalysisRoute = fs.readFileSync(projectAnalysisRoutePath, 'utf8');
const aggregateAnalysisRoute = fs.readFileSync(aggregateAnalysisRoutePath, 'utf8');
const dbRepositorySource = fs.readFileSync(dbRepositoryPath, 'utf8');
assert.match(
  projectAnalysisRoute,
  /export const maxDuration/,
  'project analysis API should extend the route timeout for multi-file analysis'
);
assert.match(
  projectAnalysisRoute,
  /function\s+isAnalysisCurrent\(fileRow,\s*analysisRow\)[\s\S]*analysisUpdatedAt >= fileUpdatedAt[\s\S]*pendingFiles = projectFiles\.filter\(\(row\) => !isAnalysisCurrent/,
  'project analysis API should only analyze new or changed files'
);
assert.match(
  projectAnalysisRoute,
  /analyzeSingleFile\(\{[\s\S]*repository: fileRepository/,
  'project analysis API should run the single-file pipeline against the DB repository'
);
assert.match(
  projectAnalysisRoute,
  /aggregateAnalyses\(\{ repository \}\)/,
  'project analysis API should refresh the project-level aggregate after analyzing files'
);
assert.match(
  aggregateAnalysisRoute,
  /projectId: null[\s\S]*aggregateAnalyses\(/,
  'aggregate analysis API should aggregate across all of the current user analyses'
);
assert.match(
  dbRepositorySource,
  /class DbAnalysisRepository[\s\S]*saveMetadata[\s\S]*listAnalysisBundles[\s\S]*saveAggregateResult/,
  'the DB repository should implement the LocalAnalysisRepository interface'
);
assert.match(
  packageJson.dependencies?.['pdf-parse'] || '',
  /\^?2/,
  'pdf-parse v2 should be installed for PDF text extraction'
);
assert.ok(
  Boolean(packageJson.dependencies?.mammoth),
  'mammoth should be installed for docx text extraction'
);

// 폴더 SQL 저장: 가입 직후 빈 목록 + '폴더 추가' 시 activity_folders에 등록
const foldersSchemaPath = path.join(rootDir, 'docs', 'supabase-activity-folders.sql');
assert.ok(fs.existsSync(foldersSchemaPath), 'Supabase activity_folders schema should be documented for folder DB setup');
const foldersSchema = fs.readFileSync(foldersSchemaPath, 'utf8');
assert.match(
  foldersSchema,
  /create table if not exists public\.activity_folders[\s\S]*group_key text not null[\s\S]*type_key text not null[\s\S]*subfolders jsonb/,
  'activity_folders schema should store per-user project folders with their subfolder structure'
);
assert.match(
  foldersSchema,
  /alter table public\.activity_folders enable row level security[\s\S]*auth\.uid\(\) = user_id/,
  'activity_folders schema should restrict folders to their owner'
);

const foldersRoutePath = path.join(appDir, 'api', 'folders', 'route.js');
assert.ok(fs.existsSync(foldersRoutePath), 'folder API should live in app/api/folders/route.js');
const foldersRoute = fs.readFileSync(foldersRoutePath, 'utf8');
assert.match(
  foldersRoute,
  /export async function GET\(\)[\s\S]*\.from\('activity_folders'\)[\s\S]*\.select\(/,
  'folder API should list the current user folders from Supabase'
);
assert.match(
  foldersRoute,
  /export async function POST\(request\)[\s\S]*\.from\('activity_folders'\)[\s\S]*\.insert\(/,
  'folder API should register new folders in Supabase'
);
assert.match(
  foldersRoute,
  /export async function PATCH\(request\)[\s\S]*export async function DELETE\(request\)/,
  'folder API should support updating and deleting folders'
);
assert.match(
  foldersRoute,
  /removeStorageObjects[\s\S]*deleteProjectChildren[\s\S]*\.from\('file_analyses'\)[\s\S]*\.from\('project_analyses'\)[\s\S]*\.from\('activity_files'\)/,
  'folder deletion should remove Storage objects, files, and analysis rows together'
);

// folder-store: 가입 직후 폴더는 비어 있고, API로 불러오고 저장한다
assert.match(
  folderStoreJs,
  /function\s+createDefaultFolders\(\)\s*\{\s*return\s*\{\};\s*\}/,
  'new users should start with no default folders (empty list)'
);
assert.match(
  folderStoreJs,
  /async function\s+loadFoldersFromApi\(\)[\s\S]*fetch\(FOLDERS_ENDPOINT/,
  'folder store should load folders from the server'
);
assert.match(
  folderStoreJs,
  /async function\s+createFolderRemote\([\s\S]*async function\s+updateFolderRemote\([\s\S]*async function\s+deleteFolderRemote\(/,
  'folder store should expose remote create/update/delete helpers'
);
assert.match(
  portfoliosSchema,
  /create table if not exists public\.portfolios[\s\S]*experiences jsonb[\s\S]*keywords jsonb[\s\S]*slides jsonb/,
  'portfolios schema should store generated portfolio content and structured draft data'
);
assert.match(
  portfoliosSchema,
  /alter table public\.portfolios enable row level security[\s\S]*auth\.uid\(\) = user_id/,
  'portfolios schema should restrict portfolio rows to their owner'
);

const mainHtml = readPageSource('main.html');
assert.match(
  mainHtml,
  /<body\s+data-page="main">/,
  'main page should expose its page key for auth-nav logged-out rendering'
);
assert.ok(
  !mainHtml.includes('id="sidebarToggle"') && !mainHtml.includes('class="sidebar-toggle"'),
  'main sidebar should not include the open/close toggle button'
);
assert.ok(
  !/<span class="folder-count">/.test(mainHtml),
  'main sidebar folder rows should not display the file count number'
);
assert.match(
  mainHtml,
  /id="sidebarResizeHandle"/,
  'main sidebar should keep the width resize handle'
);
assert.match(
  mainHtml,
  /const\s+sidebarResizeHandle\s*=\s*document\.getElementById\('sidebarResizeHandle'\)/,
  'main sidebar should keep the resize handle element wired in JavaScript'
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
assert.ok(
  !mainHtml.includes('id="fileInput"'),
  'main sidebar should not offer a file upload input (uploads happen in file management only)'
);
assert.match(
  mainHtml,
  /완료된 활동 폴더의 자료로 강점 키워드와 활동 분류를 정리해 드려요/,
  'main sidebar should explain that completed folders drive analysis'
);
assert.match(
  mainHtml,
  /진행중인 활동 폴더/,
  'main sidebar should rename ready folders to in-progress folders'
);
assert.match(
  folderStoreJs,
  /FOLDER_GROUPS[\s\S]*key:\s*'completed'[\s\S]*key:\s*'inProgress'/,
  'shared folder store should create folders inside completed and in-progress groups'
);
assert.match(
  folderStoreJs,
  /\{\s*key:\s*'other',\s*label:\s*'기타',\s*color:\s*'#[0-9a-fA-F]{6}'\s*\}/,
  'shared folder store should include an other folder type with a chart color'
);
assert.match(
  folderStoreJs,
  /function\s+normalizeFolderLabel[\s\S]*folder\.type\s*===\s*'other'[\s\S]*folder\.label\s*===\s*'기타 폴더'[\s\S]*return '기타'/,
  'shared folder store should migrate the old other-folder label to 기타'
);
assert.ok(
  !mainHtml.includes('data-folder-section="other"'),
  'main sidebar should not render a separate other folder section'
);
assert.ok(
  !mainHtml.includes('data-rename-folder') && !mainHtml.includes('renameFolder') && !mainHtml.includes('폴더명 수정'),
  'main sidebar should not offer folder rename controls (#125)'
);
assert.match(
  mainHtml,
  /<a class="folder-row" href="create\.html\?folder=\$\{escapeHtml\(folder\.id\)\}"/,
  'main sidebar folders should be summary cards linking to file management (#126 5-7)'
);
assert.ok(
  !mainHtml.includes('data-toggle-folder') && !mainHtml.includes('파일을 이 폴더로 끌어오세요'),
  'main sidebar should not expand inline file lists or invite drops (#126 5-7)'
);
assert.ok(
  !mainHtml.includes('addFilesToFolder') && !mainHtml.includes("addEventListener('drop'") && !mainHtml.includes('data-delete-file'),
  'main sidebar should not upload or delete files (uploads happen in file management only, #126 5-8)'
);
assert.ok(
  !mainHtml.includes('기획 자료') && !mainHtml.includes('결과 자료') && !mainHtml.includes('renderNestedFolder'),
  'main sidebar should not split each folder into planning/result subfolders'
);
assert.match(
  mainHtml,
  /<script src="\.\.\/js\/folder-store\.js"><\/script>\s*<script src="\.\.\/js\/shared-nav\.js"><\/script>/,
  'main should load the shared folder store before the navigation script'
);
assert.match(
  mainHtml,
  /<script src="\.\.\/js\/auth-nav\.js"><\/script>/,
  'main should load the auth navigation script'
);
assert.match(
  mainHtml,
  /FolderStore\.loadFolders\(\)/,
  'main dashboard should load folder state through the shared folder store'
);
assert.match(
  mainHtml,
  /FolderStore\.saveFolders\(folders\)/,
  'main dashboard should persist folder state through the shared folder store'
);
assert.match(
  mainHtml,
  /const\s+ACTIVITY_FILES_ENDPOINT\s*=\s*'\/api\/activity-files'/,
  'main dashboard should define the Supabase activity file API endpoint'
);
assert.match(
  mainHtml,
  /async function\s+loadActivityFilesFromApi\(\)[\s\S]*fetch\(ACTIVITY_FILES_ENDPOINT/,
  'main dashboard should load existing uploaded files from the activity file API'
);
assert.match(
  mainHtml,
  /FolderStore\.FOLDER_GROUPS/,
  'main sidebar should render folder groups from the shared folder store'
);

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
  /const\s+PROFILE_ENDPOINT\s*=\s*'\/api\/profile'/,
  'main dashboard should read mypage profile status from the Supabase profile API'
);
assert.match(
  mainHtml,
  /fetch\(PROFILE_ENDPOINT,\s*\{[\s\S]*credentials:\s*'same-origin'[\s\S]*cache:\s*'no-store'/,
  'main dashboard should request the current user profile without using a stale cache'
);
assert.match(
  mainHtml,
  /키워드 중심 활동 개요/,
  'main dashboard should include a keyword-focused overview'
);
assert.match(
  mainHtml,
  /분석된 자료/,
  'main dashboard should label completed file totals as analyzed materials'
);
assert.match(
  mainHtml,
  /활동 분류 현황/,
  'main dashboard should include the activity classification card'
);
assert.match(
  mainHtml,
  /folders = await FolderStore\.loadFoldersFromApi\(\)/,
  'main dashboard should load folders from the server on init'
);
// 분석 전에는 키워드 개요·분류가 "분석이 필요합니다" 상태
assert.match(
  mainHtml,
  /id="keywordOverviewHeading">분석이 필요합니다/,
  'main dashboard should show a 분석이 필요합니다 state before analysis'
);
assert.match(
  mainHtml,
  /id="classificationEmpty"[\s\S]*분석이 필요합니다/,
  'activity classification should show 분석이 필요합니다 before analysis'
);
// #166-3: 키워드 개요는 단일 섹션으로 상태에 따라 내용만 바뀐다(중복 제거)
assert.ok(
  !mainHtml.includes('id="keywordOverviewResult"') && !mainHtml.includes('id="keywordOverviewEmpty"'),
  'keyword overview should be a single section, not duplicated (#166-3)'
);
// 분석 시작 시 서버 종합 분석 결과로 키워드/분류를 채우고 전/후를 전환한다
assert.match(
  mainHtml,
  /function\s+applyAnalysisState\(\)[\s\S]*keywordOverview[\s\S]*hasAnalyzed/,
  'main dashboard should toggle before/after analysis states'
);
assert.match(
  mainHtml,
  /async function\s+runAnalysis\(\)[\s\S]*fetch\(AGGREGATE_ENDPOINT[\s\S]*method:\s*'POST'/,
  'running analysis should call the aggregate analysis API'
);
assert.match(
  mainHtml,
  /function\s+applyAggregateResult\(result\)[\s\S]*hasAnalyzed\s*=\s*true[\s\S]*myfitfolioAiKeywords|AI_KEYWORDS_STORAGE_KEY[\s\S]*renderKeywordChips\(\)[\s\S]*applyAnalysisState\(\)/,
  'aggregate results should fill keywords, persist them for the portfolio flow, and switch to the analyzed state'
);
assert.match(
  mainHtml,
  /AI_KEYWORDS_STORAGE_KEY\s*=\s*'myfitfolioAiKeywords'/,
  'aggregate results should be stored under the shared myfitfolioAiKeywords key'
);
assert.match(
  mainHtml,
  /data-analysis-start\]'\)\.addEventListener\('click',\s*async\s*\(\)\s*=>\s*\{\s*await runAnalysis\(\)/,
  'the analysis start button should trigger runAnalysis'
);
assert.match(
  mainHtml,
  /분석된 자료/,
  'main dashboard should label the completed-file total as analyzed materials'
);
assert.match(
  mainHtml,
  /id="analysisCompletionPercent"/,
  'main dashboard should expose a visual completion percent for activity classification'
);
assert.match(
  mainHtml,
  /id="completedActivityTotal"[\s\S]*id="inProgressActivityTotal"/,
  'main dashboard should show completed and in-progress file totals in the analyzed materials card'
);
assert.match(
  mainHtml,
  /function\s+getFolderFileTotal[\s\S]*folder\.group\s*===\s*groupKey[\s\S]*sum\s*\+\s*FolderStore\.getFolderFiles\(folder\)\.length/,
  'main dashboard should total analysis counts from files inside each folder group'
);
assert.match(
  mainHtml,
  /analyzedProjectTotal'\)\.textContent\s*=\s*completedFileTotal/,
  'main dashboard should count analyzed materials from completed folder files, not completed folder count'
);
assert.match(
  mainHtml,
  /analysisSummaryBar[\s\S]*completedShare/,
  'main dashboard should visualize completed file share with a progress bar'
);
assert.match(
  folderStoreJs,
  /\{\s*key:\s*'personal',\s*label:\s*'개인 프로젝트',\s*color:\s*'#[0-9a-fA-F]{6}'\s*\}/,
  'shared folder store should define category colors for analysis charts'
);
assert.match(
  mainHtml,
  /function\s+buildDonutGradient[\s\S]*conic-gradient[\s\S]*item\.color/,
  'main dashboard should build the classification donut from category-specific colors'
);
assert.match(
  mainHtml,
  /inProgressBreakdownItem[\s\S]*label:\s*'진행중인 활동'[\s\S]*color:\s*'#[0-9a-fA-F]{6}'[\s\S]*count:\s*inProgressFileTotal/,
  'main dashboard should add in-progress activity as a gray chart item'
);
assert.match(
  mainHtml,
  /buildDonutGradient\(chartBreakdown,\s*allFileTotal\)/,
  'main dashboard donut should include completed category files and in-progress files'
);
assert.match(
  mainHtml,
  /const\s+itemShare\s*=\s*allFileTotal\s*\?\s*Math\.round\(\(item\.count\s*\/\s*allFileTotal\)\s*\*\s*100\)/,
  'main dashboard category bars should scale against all chart files including in-progress activity'
);
assert.match(
  mainHtml,
  /--category-color:\s*\$\{item\.color\}/,
  'main dashboard should pass each folder color into its category bar row'
);
assert.match(
  fitfolioCss,
  /--in-progress-color:\s*#[0-9a-fA-F]{6}/,
  'main dashboard should use a distinct color token for in-progress activity'
);
assert.match(
  fitfolioCss,
  /\.category-bar i\s*\{[^}]*background:\s*var\(--category-color\)/s,
  'main dashboard category bars should use their per-folder color'
);
assert.match(
  mainHtml,
  /analysis-info-button/,
  'main dashboard cards should include info buttons'
);
assert.match(
  mainHtml,
  /id="analysisOverview"[\s\S]*id="analysisOverviewText"/,
  'main dashboard should include an AI analysis overview panel below the analysis cards'
);
assert.match(
  mainHtml,
  /function\s+renderAnalysisOverview[\s\S]*analysisOverviewText\.textContent/,
  'main dashboard should render a simple AI analysis overview after analysis starts'
);
assert.match(
  mainHtml,
  /function\s+applyAggregateResult\(result\)[\s\S]*updateAnalysisSummary\(\)/,
  'main dashboard should update analysis numbers when analysis runs'
);
assert.ok(
  !/function\s+renderDashboardState\(\)\s*\{[^}]*updateAnalysisSummary\(\)/.test(mainHtml),
  'main dashboard should not refresh analysis numbers just because folders render'
);
assert.ok(
  !mainHtml.includes('커리어 준비도'),
  'main dashboard should remove the career readiness card'
);
assert.ok(
  !fs.existsSync(path.join(htmlDir, 'portfolio.html')),
  'old portfolio.html should be renamed to portfolio_create.html'
);

const mypageHtml = readPageSource('mypage.html');
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
assert.match(
  mypageHtml,
  /<body class="profile-loading profile-readonly">[\s\S]*<main class="mypage" aria-busy="true">/,
  'mypage should start hidden in readonly loading state until the profile request finishes'
);
assert.match(
  mypageHtml,
  /<div class="section-stack">\s*<div class="profile-top-actions">\s*<div class="form-actions" data-form-actions><\/div>\s*<\/div>\s*<section class="profile-section" id="basic">\s*<h2 class="section-heading">기본 정보<\/h2>/,
  'mypage edit and save actions should sit above the basic information card'
);
assert.ok(
  !/<section class="profile-section" id="basic">[\s\S]*<div class="form-actions" data-form-actions><\/div>/.test(mypageHtml),
  'mypage should not keep the edit and save actions inside the basic information card'
);
for (const sampleValue of ['김예지', 'user@univ.ac.kr', '010-1234-5678', '부산광역시 금정구 장전동', '2001.03.15', '2001-03-15', '부산대학교', '4.1/4.5']) {
  assert.ok(
    !mypageHtml.includes(sampleValue),
    `mypage initial markup should not expose the old sample value ${sampleValue}`
  );
}
assert.match(
  mypageHtml,
  /const\s+PROFILE_ENDPOINT\s*=\s*"\/api\/profile"/,
  'mypage should define the Supabase-backed profile API endpoint'
);
assert.match(
  mypageHtml,
  /async function\s+loadSavedProfile\(\)[\s\S]*fetch\(PROFILE_ENDPOINT,\s*\{[\s\S]*method:\s*"GET"[\s\S]*credentials:\s*"same-origin"/,
  'mypage should load saved profile values from the Supabase profile API'
);
assert.match(
  mypageHtml,
  /async function\s+saveProfile\(\)[\s\S]*fetch\(PROFILE_ENDPOINT,\s*\{[\s\S]*method:\s*"PUT"[\s\S]*body:\s*JSON\.stringify\(payload\)/,
  'mypage should save edited profile values through the Supabase profile API'
);
const saveProfileSource = (mypageHtml.match(/async function\s+saveProfile\(\)[\s\S]*?\n    function renderAllDynamicParts/) || [''])[0];
assert.ok(
  !saveProfileSource.includes('localStorage.setItem("myfitfolioProfile", JSON.stringify(payload))'),
  'mypage should not treat local cache fallback as a successful DB profile save'
);
assert.match(
  saveProfileSource,
  /catch \(error\)[\s\S]*sessionStorage\.removeItem\("myfitfolioProfileSaved"\)[\s\S]*return false;/,
  'mypage should report DB save failure instead of marking the profile as saved'
);
assert.match(
  mypageHtml,
  /if \(event\.target\.closest\("\[data-save-profile\]"\)\)[\s\S]*const saved = await saveProfile\(\);[\s\S]*if \(saved\)[\s\S]*profileState\.editing = false;[\s\S]*else[\s\S]*profileState\.saveError = "DB 저장에 실패했습니다\. 다시 저장해주세요\."/,
  'mypage should leave edit mode only after the DB save succeeds'
);
assert.match(
  mypageHtml,
  /function\s+applyProfilePayload\(profile\)[\s\S]*profile\.educations[\s\S]*profile\.preferences[\s\S]*profile\.chips/,
  'mypage should apply persisted DB profile values back into the existing form state'
);
assert.match(
  mypageHtml,
  /Object\.hasOwn\(profile,\s*"name"\)[\s\S]*profile\.name\s*\|\|\s*""[\s\S]*Object\.hasOwn\(profile,\s*"email"\)[\s\S]*profile\.email\s*\|\|\s*""/,
  'mypage should apply empty social profile fields so seed values do not remain visible'
);
assert.match(
  mypageHtml,
  /function\s+formatDateDisplay\(value\)[\s\S]*if\s*\(!value\)\s*return\s+"";/,
  'mypage should render an empty birth date when social login does not provide one'
);
assert.match(
  mypageHtml,
  /function\s+revealProfilePage\(\)[\s\S]*classList\.remove\("profile-loading"\)[\s\S]*removeAttribute\("aria-busy"\)/,
  'mypage should reveal the page only after profile loading completes'
);
assert.match(
  mypageHtml,
  /async function\s+initProfilePage\(\)[\s\S]*finally\s*\{[\s\S]*renderAllDynamicParts\(\);[\s\S]*revealProfilePage\(\);/,
  'mypage should render and reveal the profile page in a finally block after loading'
);
assert.ok(
  mypageHtml.includes('<label>세부직무</label>') && !mypageHtml.includes('<label>세부직무 선택</label>'),
  'mypage detail job field label should be shortened to 세부직무'
);
assert.match(
  mypageHtml,
  /function\s+formatMonthDisplay\(value\)[\s\S]*return\s+`\$\{year\}\.\$\{String\(month\)\.padStart\(2,\s*"0"\)\}`;/,
  'mypage enrollment period buttons should use compact YYYY.MM labels'
);
assert.ok(
  !mypageHtml.includes('href="fitfolio.css"') && !mypageHtml.includes('<header class="top-nav">'),
  'mypage should not restore the standalone stylesheet or duplicated header'
);
assert.match(
  mypageCss,
  /\.profile-readonly\s+\.form-field\s+select:disabled\s*\{[^}]*background-image:\s*none;/s,
  'mypage readonly selects should hide dropdown arrows until edit mode'
);
assert.match(
  mypageCss,
  /\.profile-readonly\s+\.date-trigger:disabled\s+\.calendar-icon,\s*\.profile-readonly\s+\.major-trigger:disabled\s+\.select-chevron,\s*\.profile-readonly\s+\.picker-trigger:disabled\s+span\[aria-hidden="true"\]\s*\{[^}]*display:\s*none;/s,
  'mypage readonly date, major, and search picker icons should be hidden until edit mode'
);
assert.match(
  mypageCss,
  /\.profile-loading\s+\.mypage-content,\s*\.profile-loading\s+\.anchor-menu\s*\{[^}]*visibility:\s*hidden;/s,
  'mypage should hide stale profile content while the profile request is loading'
);
assert.match(
  mypageCss,
  /\.save-status\.error\s*\{[^}]*color:\s*#d13f52;/s,
  'mypage should style DB save failure feedback in the form actions'
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
  /\.account-actions\s+\.danger-button\s*\{[^}]*border-color:\s*#f05265;[^}]*background:\s*#fff;[^}]*color:\s*#d13f52;/s,
  'mypage account withdrawal button should use a white danger outline style'
);
assert.match(
  mypageCss,
  /\.mypage\s*\{[^}]*--mypage-top-action-offset:\s*76px;[\s\S]*\.anchor-menu\s*\{[^}]*margin-top:\s*var\(--mypage-top-action-offset\);/s,
  'mypage side anchor menu should align to the top action area through the shared offset'
);
assert.match(
  mypageCss,
  /@media\s*\(max-width:\s*900px\)[\s\S]*\.account-card\s*\{[^}]*align-items:\s*stretch;[^}]*flex-direction:\s*column;[\s\S]*\.account-actions\s+\.outline-button,\s*\.account-actions\s+\.danger-button\s*\{[^}]*flex:\s*1;/s,
  'mypage account management actions should stack cleanly on small screens'
);

const withdrawHtml = readPageSource('withdraw.html');
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
  /function clearClientStateAndRedirect\(\)[\s\S]*localStorage\.clear\(\);[\s\S]*sessionStorage\.clear\(\);[\s\S]*window\.location\.href\s*=\s*'login\.html'[\s\S]*fetch\(WITHDRAW_ENDPOINT,[\s\S]*method:\s*'POST'[\s\S]*if \(!response\.ok\)[\s\S]*clearClientStateAndRedirect\(\)/,
  'withdraw page should call the server withdrawal API before clearing local and session state'
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

const createHtml = readPageSource('create.html');
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
for (const text of ['파일 관리', '폴더 목록', '자료 추가', '미리보기', '분석하기', 'GitHub 동기화', '대화로 내용 추가하기', '세부 폴더', '이름 수정', '프로젝트 삭제']) {
  assert.ok(
    createHtml.includes(text),
    `file management page should include ${text}`
  );
}
// #166-4: '프로젝트 정리' 명칭을 '프로젝트 분석'으로 교체
assert.ok(
  !createHtml.includes('프로젝트 정리'),
  'file management should rename 프로젝트 정리 to 프로젝트 분석 (#166-4)'
);
// #137-3: 개별 파일 AI 요약 버튼/액션 제거
assert.ok(
  !createHtml.includes('data-action="summarize-file"') && !createHtml.includes('function summarizeFile'),
  'file management should remove the per-file AI 요약 action (#137-3)'
);
// #137-5: 상단 공용 'AI 대화로 md 만들기' 제거, 프로젝트별 '대화로 내용 추가하기'로 교체
assert.ok(
  !createHtml.includes('AI 대화로 md 만들기') && !createHtml.includes('data-action="make-md"'),
  'file management should drop the shared top AI md button (#137-5)'
);
assert.match(
  createHtml,
  /data-action="add-conversation"/,
  'file management should offer a per-project 대화로 내용 추가하기 action (#137-5)'
);
// 프로젝트 분석 진입점은 상단 '분석하기' 하나로 통합한다.
assert.ok(
  !createHtml.includes('data-action="organize-project"'),
  'file management should not keep a duplicate project analysis button next to repo connect'
);
// 프로젝트 분석은 실제 분석 API를 호출하고, 미분석 자료만 새로 분석해 종합한다
assert.match(
  createHtml,
  /async function\s+organizeProject\(\)[\s\S]*fetch\('\/api\/analysis\/project'[\s\S]*projectId:\s*folder\.id/,
  'project analysis should call the real analysis API with the selected project'
);
assert.match(
  createHtml,
  /mapAnalysisSummaryFile[\s\S]*name:\s*`\$\{getFileBaseName\(file\.name\)\} AI 요약\.md`[\s\S]*kind:\s*'analysis-summary'[\s\S]*FolderStore\.getAnalysisSubfolder\(projectFolder\)[\s\S]*analysisTarget\.files\.push\(summaryFile\)/,
  'file management should show saved AI analysis artifacts in the dedicated AI 요약 subfolder'
);
assert.match(
  createHtml,
  /formData\.append\('projectId',\s*folder\.id\)/,
  'file uploads should send the owning project id for the folder tree columns (#167)'
);
assert.match(
  createHtml,
  /file\.analysisStatus\s*===\s*'completed'\s*\?\s*'분석완료'\s*:\s*'분석대기'/,
  'file status pills should restore the saved analysis state after reload'
);
// #166-1: 완료 ↔ 진행중 양방향 이동
assert.match(
  createHtml,
  /data-action="toggle-group"[\s\S]*function\s+toggleProjectGroup[\s\S]*folder\.group\s*===\s*'completed'\s*\?\s*'inProgress'\s*:\s*'completed'/,
  'file management should toggle a project between completed and in-progress (#166-1)'
);
// 사용자 요청: 프로젝트 이름 수정 / 삭제
assert.match(
  createHtml,
  /data-action="rename-project"[\s\S]*function\s+saveProjectName[\s\S]*folder\.label\s*=\s*name/,
  'file management should let a project be renamed'
);
assert.match(
  createHtml,
  /data-action="delete-project"[\s\S]*function\s+deleteProject[\s\S]*FolderStore\.deleteFolder\(/,
  'file management should let a project be deleted'
);
// folder-store: 프로젝트 삭제 헬퍼(tombstone로 삭제 유지)
assert.match(
  folderStoreJs,
  /function\s+deleteFolder\(folders,\s*id\)[\s\S]*DELETED_KEY|function\s+deleteFolder\(folders,\s*id\)[\s\S]*saveDeletedIds/,
  'folder store should expose deleteFolder that persists deletions'
);
// #137-2: 활동 유형 드롭다운 + 유형별 하위 폴더 생성
assert.match(
  createHtml,
  /id="newFolderType"/,
  'folder-add modal should offer an activity type dropdown (#137-2)'
);
assert.match(
  createHtml,
  /FolderStore\.createFolder\(group,\s*name,\s*type\)/,
  'folder creation should pass the selected activity type to build template subfolders (#137-2)'
);
assert.match(
  createHtml,
  /async function\s+confirmCreateFolder\(\)[\s\S]*FolderStore\.createFolderRemote\(folder\)/,
  'creating a folder should register it on the server'
);
assert.match(
  createHtml,
  /folders = await FolderStore\.loadFoldersFromApi\(\)/,
  'file management should load folders from the server on init'
);
// #137-2: 하위 폴더 내비게이션(세부 폴더 클릭 시 해당 자료만)
assert.match(
  createHtml,
  /data-subfolder-id=/,
  'file management should render clickable subfolders for the selected project (#137-2)'
);
assert.match(
  createHtml,
  /new URLSearchParams\(window\.location\.search\)\.get\('folder'\)/,
  'file management should read the selected folder from the URL'
);
assert.match(
  createHtml,
  /data-folder-id="\$\{escapeHtml\(folder\.id\)\}"/,
  'file management folder buttons should expose folder ids from real folder data'
);
assert.match(
  createHtml,
  /<script src="\.\.\/js\/folder-store\.js"><\/script>\s*<script src="\.\.\/js\/shared-nav\.js"><\/script>/,
  'file management should load the shared folder store before the navigation script'
);
assert.match(
  createHtml,
  /FolderStore\.loadFolders\(\)/,
  'file management should load folder state through the shared folder store'
);
assert.match(
  createHtml,
  /FolderStore\.saveFolders\(folders\)/,
  'file management should persist folder state through the shared folder store'
);
assert.match(
  createHtml,
  /FolderStore\.FOLDER_GROUPS/,
  'file management should render folder groups from the shared folder store'
);
assert.ok(
  !createHtml.includes("key: 'ready'") && !createHtml.includes('준비된 활동 폴더'),
  'file management should use the unified in-progress folder group instead of the old ready group'
);
assert.ok(
  !createHtml.includes('AI 대화창') && !createHtml.includes('id="chatLog"') && !createHtml.includes('id="chatInput"'),
  'file management should not render the AI chat panel'
);
assert.ok(
  !createHtml.includes('class="file-dashboard"') && !createHtml.includes('class="file-stat-card"'),
  'file management should not render the old four-box summary dashboard'
);
assert.ok(
  !createHtml.includes('class="ai-status-summary"'),
  'file management should not keep the 전체 자료 중 분석 완료 summary box (#132)'
);
assert.match(
  createHtml,
  /id="analysisPanelTitle"/,
  'file management should give the AI status panel a dynamic, per-project title (#132)'
);
assert.match(
  createHtml,
  /\$\{selectedFolder\.label\} AI 정리 상태/,
  'file management AI status title should follow the [프로젝트 이름] AI 정리 상태 format (#132)'
);
assert.match(
  createHtml,
  /data-action="connect-repo"[^>]*id="repoConnectButton"/,
  'file management should expose a per-project repo connect button (#132)'
);
assert.match(
  createHtml,
  /data-action="connect-repo-save"/,
  'file management repo modal should save the per-project connection (#132)'
);
assert.match(
  createHtml,
  /FolderStore\.createFolder\(/,
  'file management should create real folders through the shared folder store (#132)'
);
assert.match(
  createHtml,
  /data-action="create-folder-confirm"/,
  'file management folder-add modal should confirm creation (#132)'
);
assert.ok(
  !createHtml.includes('function setLatestChange'),
  'file management should drop the removed latest-change summary hook (#132)'
);
assert.match(
  createHtml,
  /async function\s+addFilesToSelectedFolder[\s\S]*FormData[\s\S]*fetch\(ACTIVITY_FILES_ENDPOINT,\s*\{[\s\S]*method:\s*'POST'/,
  'file management uploads should go through the activity file API'
);
assert.match(
  createHtml,
  /async function\s+deleteFile[\s\S]*fetch\(ACTIVITY_FILES_ENDPOINT,\s*\{[\s\S]*method:\s*'DELETE'/,
  'file management deletes should remove files through the activity file API'
);
assert.match(
  createHtml,
  /async function\s+loadActivityFilesFromApi\(\)[\s\S]*fetch\(ACTIVITY_FILES_ENDPOINT/,
  'file management should load uploaded files from the activity file API'
);
assert.match(
  createCss,
  /\.visually-hidden\s*\{/,
  'file management stylesheet should define visually-hidden so the file input stays hidden (#132)'
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
assert.ok(
  !fitfolioCss.includes('.trash-icon') && !fitfolioCss.includes('.icon-tool-button'),
  'stylesheets should drop the removed sidebar file-delete and rename tool styles (#125, #126)'
);
assert.match(
  fitfolioCss,
  /\.status-completed\s+\.mini-folder\s*\{[^}]*color:\s*#227a4b;/,
  'completed folder icons should match the completed section text color'
);
assert.match(
  fitfolioCss,
  /\.status-in-progress\s+\.mini-folder\s*\{[^}]*color:\s*#3157c9;/,
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
  fs.existsSync(path.join(jsDir, 'activity-recommendation-dataset.js')),
  'activity recommendation dummy dataset should live in the js directory'
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
  contestHtml,
  /id="activityPagination"/,
  'contest page should render pagination below the activity list'
);
assert.match(
  contestHtml,
  /src="\.\.\/js\/activity-recommendation-dataset\.js"[\s\S]*src="\.\.\/js\/contest\.js"/,
  'contest page should load the activity dataset before the recommendation script'
);
assert.match(
  contestJs,
  /const\s+activitiesPerPage\s*=\s*20/,
  'contest activity list should show 20 recommendations per page'
);
assert.match(
  contestJs,
  /activityRecommendationDataset/,
  'contest activity list should use the 100 item dummy dataset when available'
);
assert.match(
  contestJs,
  /function\s+getRecommendationScore/,
  'contest activity list should calculate recommendation scores before sorting'
);
assert.match(
  contestJs,
  /function\s+getScoreBandCounts/,
  'contest activity list should split recommendation scores into high, middle, and low bands'
);
assert.match(
  contestJs,
  /Math\.round\(total\s*\/\s*3\.5\)/,
  'contest score distribution should keep the high band at a 1 ratio'
);
assert.match(
  contestJs,
  /Math\.round\(\(total\s*\/\s*3\.5\)\s*\*\s*1\.5\)/,
  'contest score distribution should keep the middle band at a 1.5 ratio'
);
assert.match(
  contestJs,
  /return interpolateScore\(96,\s*75,[\s\S]*return interpolateScore\(74,\s*40,[\s\S]*return interpolateScore\(40,\s*12,/,
  'contest displayed match scores should use lower high, middle, and low score ranges'
);
assert.match(
  contestJs,
  /function\s+getSortedRecommendedActivities/,
  'contest activity list should sort all activities by recommendation score'
);
assert.match(
  contestJs,
  /visibleActivities\s*=\s*filtered\.slice\(startIndex,\s*startIndex\s*\+\s*activitiesPerPage\)/,
  'contest activity list should render one paged slice at a time'
);
assert.match(
  contestJs,
  /data-page="\$\{page\}"/,
  'contest pagination buttons should carry page numbers'
);
assert.match(
  contestCss,
  /\.activity-pagination/s,
  'contest stylesheet should lay out activity pagination'
);
assert.match(
  contestCss,
  /\.pagination-button\.active/s,
  'contest stylesheet should show the active activity page'
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
  /\.deadline-tag::before/s,
  'contest D-day tag should render as one bookmark ribbon shape'
);
assert.match(
  contestCss,
  /\.deadline-tag\s*\{[^}]*min-width:\s*56px;[^}]*clip-path:\s*polygon\(0 0,\s*100% 0,\s*100% 100%,\s*50% calc\(100% - 13px\),\s*0 100%\);[^}]*font-size:\s*14px;/s,
  'contest D-day bookmark ribbon notch should connect to the bottom corners'
);
assert.match(
  contestCss,
  /\.deadline-tag::before\s*\{[^}]*inset:\s*1px;[^}]*background:\s*#fff1e2;[^}]*clip-path:\s*polygon\(0 0,\s*100% 0,\s*100% 100%,\s*50% calc\(100% - 12px\),\s*0 100%\);/s,
  'contest D-day bookmark ribbon should keep a filled inner notch connected to the bottom corners'
);
assert.match(
  contestCss,
  /\.activity-card\.is-saved\s+\.deadline-tag::before\s*\{[^}]*background:\s*#a45f2b;/s,
  'contest saved D-day bookmark ribbon should use the active brown fill'
);
assert.match(
  contestJs,
  /<span class="deadline-tag-label">\$\{getActivityDeadline\(item\.id\)\}<\/span>/,
  'contest D-day bookmark text should sit above the ribbon fill'
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

const portfolioCreateHtml = readPageSource('portfolio_create.html');
const portfolioCreateCss = fs.readFileSync(path.join(cssDir, 'portfolio_create.css'), 'utf8');
assert.match(
  portfolioCreateHtml,
  /data-shared-nav data-active="portfolio_create"/,
  'portfolio_create should use the shared top navigation mount'
);
assert.match(
  portfolioCreateHtml,
  /<main class="page-shell portfolio-create-page">/,
  'portfolio_create should use a compact page shell for the setup screen'
);
assert.ok(
  !portfolioCreateHtml.includes('<h1 class="page-title">포트폴리오 생성</h1>') &&
    !portfolioCreateHtml.includes('활동 자료와 프로젝트 경험을 바탕으로 제출용 포트폴리오 초안을 생성합니다.'),
  'portfolio_create should remove the redundant page heading above the setup panel'
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
  /pfLoadingScreen'\)\.classList\.remove\('hidden'\)[\s\S]*startLoadingProgress\(async\s*\(\)\s*=>\s*\{[\s\S]*pfLoadingScreen'\)\.classList\.add\('hidden'\)[\s\S]*pfWorkspaceScreen'\)\.classList\.remove\('hidden'\)/,
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
  portfolioCreateCss,
  /\.portfolio-loading\s*\{[\s\S]*min-height:\s*min\(560px,\s*calc\(100vh - 108px\)\)[\s\S]*align-items:\s*center[\s\S]*justify-items:\s*center/,
  'portfolio_create loading screen should stay centered in the visible viewport after the compact setup layout'
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
  /AI 포트폴리오 추천 서비스[\s\S]*AI 포트폴리오 추천 서비스[\s\S]*AI 포트폴리오 추천 서비스[\s\S]*AI 포트폴리오 추천 서비스/,
  'portfolio_create format previews should show the same source experience across all formats'
);
assert.match(
  portfolioCreateHtml,
  /PROFILE[\s\S]*ACTIVITIES[\s\S]*CASE STUDY[\s\S]*슬라이드별 발표 흐름[\s\S]*지원동기/,
  'portfolio_create format previews should distinguish summary, case study, presentation, and resume-cover letter forms'
);
assert.ok(
  !portfolioCreateHtml.includes('aria-label="알림"') && !portfolioCreateHtml.includes('notification'),
  'portfolio_create format preview update should not add notification UI'
);
assert.match(
  portfolioCreateHtml,
  /id="pfPurposeSelect"\s+class="setting-select"[\s\S]*<option>취업 지원용<\/option>[\s\S]*<option>대학원 진학<\/option>/,
  'portfolio_create should keep the generation purpose select while applying the improved selector style'
);
assert.match(
  portfolioCreateHtml,
  /class="form-field major-inline-field"[\s\S]*<label>전공<\/label>[\s\S]*id="pfMajorDisplay"[\s\S]*data-major-value=""/,
  'portfolio_create should display the mypage major as an inline card next to the major label'
);
assert.ok(
  !portfolioCreateHtml.includes('id="pfMajorSelect"'),
  'portfolio_create should not let users pick a separate major on the generation page'
);
assert.match(
  portfolioCreateHtml,
  /majorDisplay\.textContent\s*=\s*profileMajor\s*\|\|\s*'마이페이지 전공 입력 필요'/,
  'portfolio_create major card should show only the department name without repeating the major label'
);
assert.match(
  portfolioCreateHtml,
  /id="experienceDataList"[\s\S]*업로드한 경험 데이터를 불러오는 중입니다\./,
  'portfolio_create should render the experience list container for uploaded user files'
);
assert.ok(
  !portfolioCreateHtml.includes('data-purpose-option') && !portfolioCreateHtml.includes('data-major-option'),
  'portfolio_create setting selector update should not replace selects with button-card choices'
);
assert.ok(
  !portfolioCreateHtml.includes('aria-label="알림"') && !portfolioCreateHtml.includes('notification'),
  'portfolio_create setting selector update should not add notification UI'
);
assert.match(
  portfolioCreateHtml,
  /id="keywordPool"/,
  'portfolio_create should render recommended keywords into a keyword pool'
);
assert.match(
  portfolioCreateHtml,
  /const\s+PROFILE_ENDPOINT\s*=\s*'\/api\/profile'/,
  'portfolio_create should define the mypage profile API endpoint for the major display'
);
assert.match(
  portfolioCreateHtml,
  /const\s+ACTIVITY_FILES_ENDPOINT\s*=\s*'\/api\/activity-files'/,
  'portfolio_create should define the uploaded activity file API endpoint'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+loadProfileMajor\(\)[\s\S]*fetch\(PROFILE_ENDPOINT,[\s\S]*profileMajor\s*=\s*educations\.find\(\(education\)\s*=>\s*education\?\.major\)\?\.major/,
  'portfolio_create should load the displayed major from mypage education data'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+loadExperienceData\(\)[\s\S]*fetch\(ACTIVITY_FILES_ENDPOINT,[\s\S]*activityFiles\s*=\s*Array\.isArray\(result\.files\)\s*\?\s*result\.files\s*:\s*\[\]/,
  'portfolio_create should load uploaded files as selectable experience data'
);
assert.match(
  portfolioCreateHtml,
  /function\s+getExperienceKeywordRecommendations\(\)[\s\S]*experienceKeywordRules[\s\S]*getSelectedExperienceLabels\(\)/,
  'portfolio_create should recommend keyword chips from selected experience files'
);
assert.match(
  portfolioCreateHtml,
  /id="workspaceSubtitle"[\s\S]*id="workspaceBadge"/,
  'portfolio_create workspace should expose subtitle and badge targets'
);
assert.match(
  portfolioCreateHtml,
  /class="master-actions"[\s\S]*data-master-action="save"[\s\S]*data-master-action="download"[\s\S]*data-master-action="exit"/,
  'portfolio_create should use event-driven master action controls'
);
assert.match(
  portfolioCreateHtml,
  /const\s+PORTFOLIO_ENDPOINT\s*=\s*'\/api\/portfolios'/,
  'portfolio_create should define the Supabase portfolio API endpoint'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+saveGeneratedPortfolio\(\)[\s\S]*fetch\(PORTFOLIO_ENDPOINT,\s*\{[\s\S]*method:\s*'POST'/,
  'portfolio_create should save generated portfolios through the portfolio API'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+openPortfolioEditorFromQuery\(\)[\s\S]*fetch\(`\$\{PORTFOLIO_ENDPOINT\}\?id=/,
  'portfolio_create should load portfolio edits through the portfolio API'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+requestPortfolioGeneration\(\{[\s\S]*fetch\('\/api\/portfolio\/generate'/,
  'portfolio_create should request OpenAI portfolio generation through the server API'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+requestPortfolioRevision\([\s\S]*fetch\('\/api\/portfolio\/revise'/,
  'portfolio_create should request OpenAI portfolio revision through the server API'
);
assert.match(
  portfolioCreateHtml,
  /function\s+renderPortfolioImagePreview\(\)[\s\S]*renderCaseStudyPortfolio/,
  'portfolio_create should render ChatGPT JSON as visual portfolio previews'
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
  /const\s+commonKeywords[\s\S]*const\s+majorKeywordMap[\s\S]*const\s+experienceKeywordRules/,
  'portfolio_create should generate keyword options from common, major, and selected-experience rules'
);
assert.match(
  portfolioCreateHtml,
  /currentPortfolio\.format\s*===\s*'PPT[^']*'/,
  'portfolio_create should branch to PPT preview rendering for PPT format'
);
assert.match(
  portfolioCreateHtml,
  /async function\s+downloadPptPreview\(\)[\s\S]*fetch\('\/api\/portfolio\/export-pptx'[\s\S]*JSON\.stringify\(currentPortfolio\)[\s\S]*response\.blob\(\)/,
  'portfolio_create should download editable PowerPoint files through the server export API'
);

const portfolioExportPptxRoutePath = path.join(appDir, 'api', 'portfolio', 'export-pptx', 'route.js');
const portfolioGenerateRoutePath = path.join(appDir, 'api', 'portfolio', 'generate', 'route.js');
const portfolioGenerateRoute = fs.existsSync(portfolioGenerateRoutePath)
  ? fs.readFileSync(portfolioGenerateRoutePath, 'utf8')
  : '';
const portfolioExportPptxRoute = fs.existsSync(portfolioExportPptxRoutePath)
  ? fs.readFileSync(portfolioExportPptxRoutePath, 'utf8')
  : '';
assert.match(
  portfolioGenerateRoute,
  /ANALYSIS_MOCK\s*===\s*'1'[\s\S]*buildMockPortfolioResponse/,
  'portfolio generation API should return mock portfolio data when ANALYSIS_MOCK=1'
);
assert.ok(
  fs.existsSync(portfolioExportPptxRoutePath),
  'portfolio PPTX export API should live in app/api/portfolio/export-pptx/route.js'
);
assert.match(
  portfolioExportPptxRoute,
  /import pptxgen from 'pptxgenjs'/,
  'portfolio PPTX export should use pptxgenjs instead of a hand-written fake pptx blob'
);
assert.match(
  portfolioExportPptxRoute,
  /addOverviewSlide\(pptx,\s*portfolio,\s*blocks\)[\s\S]*addDetailSlides\(pptx,\s*portfolio,\s*blocks\.slice/,
  'portfolio PPTX export should create editable text overview and detail slides'
);
assert.match(
  portfolioExportPptxRoute,
  /slide\.addText\([\s\S]*Content-Disposition[\s\S]*myfitfolio-portfolio\.pptx/,
  'portfolio PPTX export should return a real downloadable pptx file with editable text boxes'
);
for (const cssPattern of [
  /\.portfolio-create-page\s*\{/,
  /\.setup-layout\s*\{/,
  /\.setup-right\s+\.form-row\s+\.form-field\s*\{[\s\S]*grid-template-columns:\s*74px var\(--setting-control-width\);/,
  /\.setting-select\s*\{/,
  /\.setting-select:focus\s*\{/,
  /\.setting-select\s*\{[\s\S]*width:\s*176px;/,
  /\.major-inline-field\s*\{[\s\S]*display:\s*grid;/,
  /\.profile-major-display\s*\{[\s\S]*width:\s*176px;/,
  /\.profile-major-display\s*\{/,
  /\.format-card-grid\s*\{/,
  /\.format-card\.selected::after\s*\{/,
  /\.experience-checkbox-group\s*\{[\s\S]*max-height:\s*214px;[\s\S]*overflow-y:\s*auto;/,
  /\.ppt-preview-wrap\s*\{/,
  /\.ppt-slide\s*\{/,
  /\.slide-arrow\s*\{/,
  /\.master-actions\s*\{/,
  /\.flat-action\.danger\s*\{/,
  /\.chat-input\s+textarea\s*\{/,
  /\.chat-send-button\s*\{/,
  /\.portfolio-canvas\s*\{/,
  /\.compact-case-canvas\s*\{/,
  /\.case-summary-strip\s*\{/,
  /\.deck-grid\s*\{/,
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
for (const [fileName, html] of [
  ['index.html', indexAuthHtml],
  ['login.html', loginHtml],
  ['signup.html', signupHtml],
]) {
  assert.ok(
    !/data-provider="naver"|Naver|네이버|naver-icon/.test(html),
    `${fileName} should not expose Naver login because Supabase OAuth is not configured for it`
  );
  assert.match(
    html,
    /data-provider="google"/,
    `${fileName} should keep Google as the available Supabase OAuth provider`
  );
}
const portfolioManageHtml = readPageSource('portfolio_manage.html');
const portfolioViewerHtml = readPageSource('portfolio_viewer.html');
const portfolioManageCss = fs.readFileSync(path.join(cssDir, 'portfolio_manage.css'), 'utf8');

assert.match(
  portfolioManageHtml,
  /class="portfolio-library-page"/,
  'portfolio_manage should use the uploaded portfolio library page shell'
);
assert.match(
  portfolioManageHtml,
  /class="portfolio-library-list" id="portfolioList"/,
  'portfolio_manage should render portfolios into the uploaded library list'
);
assert.match(
  portfolioManageHtml,
  /function\s+firstPagePreview/,
  'portfolio_manage should show first-page portfolio previews'
);
assert.match(
  portfolioManageHtml,
  /function\s+sortPortfolios/,
  'portfolio_manage should sort liked portfolios before recent portfolios'
);
assert.match(
  portfolioManageHtml,
  /const\s+PORTFOLIO_ENDPOINT\s*=\s*'\/api\/portfolios'/,
  'portfolio_manage should define the Supabase portfolio API endpoint'
);
assert.match(
  portfolioManageHtml,
  /async function\s+readPortfolios\(\)[\s\S]*fetch\(PORTFOLIO_ENDPOINT/,
  'portfolio_manage should load portfolios from the portfolio API'
);
assert.match(
  portfolioManageHtml,
  /data-action="like"/,
  'portfolio_manage should support liking saved portfolios'
);
assert.match(
  portfolioManageHtml,
  /data-action="delete"/,
  'portfolio_manage should support deleting saved portfolios'
);
assert.match(
  portfolioManageHtml,
  /포트폴리오를 삭제할까요/,
  'portfolio_manage should confirm before deleting a portfolio'
);
assert.match(
  portfolioManageHtml,
  /포트폴리오가 없습니다\./,
  'portfolio_manage should show a clear empty portfolio message'
);
assert.match(
  portfolioManageHtml,
  /portfolio_viewer\.html\?id=\$\{encodeURIComponent\(portfolio\.id\)\}#viewerContent/,
  'portfolio_manage should open portfolios in portfolio_viewer.html'
);
assert.match(
  portfolioManageHtml,
  /fetch\(PORTFOLIO_ENDPOINT,\s*\{[\s\S]*method:\s*'PATCH'[\s\S]*liked/,
  'portfolio_manage should persist like changes through the portfolio API'
);
assert.match(
  portfolioManageHtml,
  /fetch\(PORTFOLIO_ENDPOINT,\s*\{[\s\S]*method:\s*'DELETE'/,
  'portfolio_manage should soft-delete portfolios through the portfolio API'
);
assert.ok(
  !portfolioManageHtml.includes('id="searchInput"') && !portfolioManageHtml.includes('function openPortfolio'),
  'portfolio_manage should replace the old search-and-alert manager with the uploaded library UI'
);
for (const cssPattern of [
  /\.portfolio-library-page\s*\{/,
  /\.portfolio-library-card\s*\{/,
  /\.portfolio-library-actions\s+\.like-action\.liked\s*\{/,
  /\.portfolio-library-actions\s+\.delete-action\s*\{/,
  /\.portfolio-web-viewer\s*\{/,
  /\.portfolio-slide-viewer\s*\{/,
  /\.viewer-control-bar\s*\{/,
]) {
  assert.match(
    portfolioManageCss,
    cssPattern,
    `portfolio_manage stylesheet should include ${cssPattern}`
  );
}
assert.match(
  portfolioViewerHtml,
  /<div class="portfolio-web-viewer" id="viewerContent">/,
  'portfolio_viewer should use the uploaded full-screen viewer shell'
);
assert.match(
  portfolioViewerHtml,
  /id="viewerBody"/,
  'portfolio_viewer should render slide images into the viewer body'
);
assert.match(
  portfolioViewerHtml,
  /new URLSearchParams\(window\.location\.search\)\.get\('id'\)/,
  'portfolio_viewer should read the selected portfolio id from the URL'
);
assert.match(
  portfolioViewerHtml,
  /function\s+drawSlideImage/,
  'portfolio_viewer should draw slide images from portfolio content'
);
assert.match(
  portfolioViewerHtml,
  /id="bottomNextSlideBtn"/,
  'portfolio_viewer should include bottom slide controls'
);
assert.match(
  portfolioViewerHtml,
  /href="portfolio_manage\.html"/,
  'portfolio_viewer should link back to the portfolio management page'
);
assert.ok(
  !portfolioViewerHtml.includes('href="fitfolio.css"') && !portfolioViewerHtml.includes('<header class="top-nav">'),
  'portfolio_viewer should use separated assets and no duplicated top navigation'
);

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
  withdrawHtml,
  /id="withdrawMessage"[\s\S]*role="status"[\s\S]*WITHDRAW_ENDPOINT\s*=\s*'\/api\/auth\/withdraw'/,
  'withdrawal should show server deletion status and target the withdrawal API'
);
assert.match(
  mypageHtml,
  /const majors = \["전기공학과", "정보컴퓨터공학과", "화공생명공학과", "산업공학과"\]/,
  'mypage major pickers should use the requested department list'
);
assert.match(
  mypageHtml,
  /const ALL_OPTION = "전체";[\s\S]*const industries = \[ALL_OPTION,/,
  'mypage work industry picker should include the all option'
);
assert.match(
  mypageHtml,
  /const regions = \[ALL_OPTION,/,
  'mypage work region picker should include the all option'
);
assert.match(
  mypageHtml,
  /return \[ALL_OPTION, \.\.\.new Set\(options\.length \? options : Object\.values\(detailJobs\)\.flat\(\)\)\]/,
  'mypage detail job picker should include the all option'
);
assert.match(
  mypageHtml,
  /const options = fieldName === "minor" \? \[NO_MINOR_OPTION, \.\.\.majors\] : majors;/,
  'mypage minor major picker should include the none option without changing the main major list'
);
assert.match(
  mypageHtml,
  /const jobs = \[\s*"기획\/전략", "UI\/UX", "개발", "IT\/개발", "데이터", "AI\/머신러닝",\s*"보안", "네트워크\/인프라", "연구개발", "전기\/전자", "화학\/바이오",\s*"생산\/품질", "구매\/자재", "물류\/유통"\s*\];/,
  'mypage job chip list should only keep target-major-related options'
);
