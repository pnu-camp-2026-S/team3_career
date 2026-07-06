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
