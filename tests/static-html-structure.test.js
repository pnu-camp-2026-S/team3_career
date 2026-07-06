const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const htmlDir = path.join(rootDir, 'html');

const linkedHtmlFiles = [
  'contest.html',
  'create.html',
  'index.html',
  'login.html',
  'main.html',
  'mypage.html',
  'portfolio.html',
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

for (const file of ['main_old.html', 'test.html']) {
  assert.ok(
    fs.existsSync(path.join(rootDir, file)),
    `${file} should remain at the project root because it is not an active linked page`
  );
}

const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
assert.match(
  serverJs,
  /express\.static\(path\.join\(__dirname,\s*['"]html['"]\)\)/,
  'server should serve active pages from the html directory'
);
