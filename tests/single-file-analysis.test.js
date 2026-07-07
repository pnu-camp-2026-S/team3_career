// 단일 파일 분석 파이프라인 mock 모드 검증.
// 실제 AI 호출 없이 업로드→추출→분석→검증→산출물 생성까지 확인한다.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

process.env.ANALYSIS_MOCK = '1';

function libUrl(relativePath) {
  return pathToFileURL(path.join(process.cwd(), relativePath)).href;
}

(async () => {
  const { analyzeSingleFile } = await import(libUrl('lib/analysis/service.mjs'));
  const { LocalAnalysisRepository } = await import(libUrl('lib/analysis/repository.mjs'));
  const { getAllowedFolderIds, PROJECT_SUBFOLDER_MAP } = await import(libUrl('lib/analysis/subfolder-config.mjs'));
  const { validateAnalysisResult } = await import(libUrl('lib/analysis/validator.mjs'));

  // 프로젝트 유형별 하위 폴더 구성 검증
  for (const projectType of ['personal', 'team', 'contest', 'certificate', 'education', 'volunteer', 'other']) {
    const allowed = getAllowedFolderIds(projectType);
    assert.ok(allowed.includes('pending'), `${projectType} 유형은 pending 하위 폴더를 포함해야 한다`);
    assert.ok(allowed.includes('other'), `${projectType} 유형은 other 하위 폴더를 포함해야 한다`);
  }
  assert.strictEqual(PROJECT_SUBFOLDER_MAP.contest[0], 'submission', '공모전 유형은 제출 자료가 최우선이어야 한다');

  // mock 파이프라인 전체 실행
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfa-test-'));
  const repository = new LocalAnalysisRepository({ baseDir: tmpDir });
  const output = await analyzeSingleFile({
    originalFileName: '테스트_기획서.md',
    buffer: Buffer.from('# 목표\n\n서비스 기획 문서입니다.\n\n## 결과\n\n프로토타입 완성.', 'utf8'),
    projectType: 'contest',
    repository,
  });

  assert.strictEqual(output.ok, true, 'mock 파이프라인이 성공해야 한다');
  assert.strictEqual(output.provider, 'mock');
  assert.strictEqual(output.indexDraft.files[0].folderId, 'pending', 'folderId는 사용자 확정 전 pending이어야 한다');
  assert.strictEqual(output.indexDraft.files[0].aiRecommendation.requiresUserConfirmation, true);
  assert.ok(
    getAllowedFolderIds('contest').includes(output.analysisResult.classification.recommendedFolderId),
    '추천 하위 폴더는 프로젝트 유형의 허용 목록에 있어야 한다'
  );

  // validator가 mock 결과를 통과시키는지 확인
  const validation = validateAnalysisResult(output.analysisResult, {
    fileId: output.fileId,
    analysisId: output.analysisId,
    allowedFolderIds: getAllowedFolderIds('contest'),
  });
  assert.strictEqual(validation.ok, true, `validator 통과 실패: ${validation.errors.join(' / ')}`);

  // 산출물 파일 5종 생성 확인 (문서 §4 구조)
  const resultDir = path.join(tmpDir, 'single-file-session', 'results', output.analysisId);
  for (const fileName of ['metadata.json', 'analysis-result.json', 'summary.md', 'index.json', 'log.md']) {
    assert.ok(fs.existsSync(path.join(resultDir, fileName)), `${fileName}이 생성되어야 한다`);
  }
  const fileDir = path.join(tmpDir, 'single-file-session', 'files', output.fileId);
  assert.ok(fs.existsSync(path.join(fileDir, 'extracted-text.txt')), 'extracted-text.txt가 생성되어야 한다');

  // summary.md / log.md 내용 검증
  assert.ok(output.summaryMarkdown.includes('# 자료 요약'), 'summary.md는 템플릿 헤더로 시작해야 한다');
  assert.ok(output.summaryMarkdown.includes('공모전'), 'summary.md에 프로젝트 유형 라벨이 들어가야 한다');
  assert.ok(output.logMarkdown.includes('file_uploaded'), 'log.md에 업로드 이벤트가 기록되어야 한다');
  assert.ok(output.logMarkdown.includes('ai_analysis_completed'), 'log.md에 분석 완료 이벤트가 기록되어야 한다');

  // 미지원 확장자는 추출 실패로 처리
  const failed = await analyzeSingleFile({
    originalFileName: 'image.png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    projectType: 'personal',
    repository,
  });
  assert.strictEqual(failed.ok, false, '미지원 확장자는 실패해야 한다');
  assert.strictEqual(failed.stage, 'extraction');
  assert.strictEqual(failed.metadata.analysisStatus, 'failed');

  // 종합(aggregate) 분석: 데이터 0건이면 no_data
  const { aggregateAnalyses } = await import(libUrl('lib/analysis/aggregate.mjs'));
  const emptyRepo = new LocalAnalysisRepository({ baseDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sfa-empty-')) });
  const emptyAggregate = await aggregateAnalyses({ repository: emptyRepo });
  assert.strictEqual(emptyAggregate.ok, false);
  assert.strictEqual(emptyAggregate.reason, 'no_data', '분석 자료가 없으면 no_data를 반환해야 한다');

  // 종합 분석: 분석 2건(성공 1건 + 위 실패 1건 제외) 기준으로 실행
  await analyzeSingleFile({
    originalFileName: '두번째_보고서.md',
    buffer: Buffer.from('# 결과 보고\n\n실험 결과를 정리했습니다.', 'utf8'),
    projectType: 'personal',
    repository,
  });
  const aggregate = await aggregateAnalyses({ repository });
  assert.strictEqual(aggregate.ok, true, '종합 분석이 성공해야 한다');
  assert.strictEqual(aggregate.result.basedOnCount, 2, '실패 건은 제외하고 완료된 분석만 종합해야 한다');
  assert.ok(aggregate.result.headline.length > 0, '종합 headline이 있어야 한다');
  assert.ok(
    Array.isArray(aggregate.result.activityKeywords) && aggregate.result.activityKeywords.length >= 1,
    '메인 칩용 activityKeywords가 있어야 한다'
  );
  assert.ok(
    Array.isArray(aggregate.result.portfolioKeywords) && aggregate.result.portfolioKeywords.length >= 1,
    '포트폴리오 강조용 portfolioKeywords가 있어야 한다'
  );

  const storedAggregate = await repository.getAggregateResult();
  assert.ok(storedAggregate && storedAggregate.headline === aggregate.result.headline, '종합 결과가 저장되어야 한다');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('single-file-analysis mock pipeline: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
