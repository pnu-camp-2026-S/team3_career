// 단일 파일 분석 파이프라인 mock 테스트.
// AI 키 없이(ANALYSIS_MOCK=1) 추출→분석→검증→산출물 생성 흐름과
// 폴더 트리 파생(deriveFolderTree), 종합 분석의 no_data 처리를 검증한다.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.ANALYSIS_MOCK = '1';

(async () => {
  const { analyzeSingleFile } = await import('../ai_analysis/service.mjs');
  const { LocalAnalysisRepository } = await import('../ai_analysis/repository.mjs');
  const { aggregateAnalyses } = await import('../ai_analysis/aggregate.mjs');
  const { deriveFolderTree } = await import('../lib/folder-tree.js');

  // deriveFolderTree: 세부 폴더 id와 구버전 프로젝트 id를 트리 컬럼으로 파싱한다(#167).
  assert.deepStrictEqual(deriveFolderTree('completed-personal::sub0'), {
    projectId: 'completed-personal',
    parentFolderId: 'completed-personal',
    folderPath: 'completed-personal/sub0',
    folderLevel: 1,
  }, '세부 폴더 id는 프로젝트/부모/경로/깊이로 파싱되어야 한다');
  assert.deepStrictEqual(deriveFolderTree('completed-personal'), {
    projectId: 'completed-personal',
    parentFolderId: null,
    folderPath: 'completed-personal',
    folderLevel: 0,
  }, '구버전 프로젝트 단위 id는 level 0으로 처리되어야 한다');
  assert.strictEqual(
    deriveFolderTree('completed-personal::sub0', 'custom-project').projectId,
    'custom-project',
    'projectId 힌트가 있으면 힌트를 우선한다'
  );

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfitfolio-analysis-'));

  try {
    const repository = new LocalAnalysisRepository({ baseDir, projectId: 'test-project' });

    // 1) 지원 확장자(md): 파이프라인 전체가 성공해야 한다.
    const okResult = await analyzeSingleFile({
      originalFileName: '활동_요약.md',
      buffer: Buffer.from('# 팀 프로젝트\n요구사항 분석과 발표 자료 제작을 담당했습니다.', 'utf8'),
      mimeType: 'text/markdown',
      projectType: 'team',
      projectId: 'test-project',
      projectName: '테스트 프로젝트',
      repository,
    });

    assert.strictEqual(okResult.ok, true, 'mock 분석은 성공해야 한다');
    assert.strictEqual(okResult.provider, 'mock', 'ANALYSIS_MOCK=1이면 mock 제공자를 사용해야 한다');
    assert.strictEqual(okResult.metadata.analysisStatus, 'completed');
    assert.strictEqual(okResult.metadata.projectId, 'test-project', '전달한 projectId가 메타데이터에 반영되어야 한다');
    assert.strictEqual(
      okResult.analysisResult.requiresUserConfirmation,
      true,
      '분석 결과는 사용자 확인 전 초안으로 표시되어야 한다'
    );
    assert.strictEqual(
      okResult.indexDraft.files[0].folderId,
      'pending',
      '사용자 확정 전 index 초안의 folderId는 pending이어야 한다'
    );
    assert.ok(okResult.summaryMarkdown.length > 0, 'summary.md가 생성되어야 한다');
    assert.ok(okResult.logMarkdown.includes('ai_analysis_completed'), '완료 이벤트가 로그에 남아야 한다');

    const resultDir = path.join(baseDir, 'test-project', 'results', okResult.analysisId);
    ['metadata.json', 'analysis-result.json', 'summary.md', 'index.json', 'log.md'].forEach((name) => {
      assert.ok(fs.existsSync(path.join(resultDir, name)), `산출물 ${name}이 저장되어야 한다`);
    });

    // 2) 미지원 확장자: 업로드는 실패가 아니지만 분석은 failed로 기록되어야 한다.
    const failResult = await analyzeSingleFile({
      originalFileName: '증빙사진.png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      projectType: 'team',
      projectId: 'test-project',
      projectName: '테스트 프로젝트',
      repository,
    });

    assert.strictEqual(failResult.ok, false, '미지원 확장자는 분석 실패로 처리되어야 한다');
    assert.strictEqual(failResult.stage, 'extraction', '실패 단계가 extraction으로 보고되어야 한다');
    assert.strictEqual(failResult.metadata.analysisStatus, 'failed');

    // 3) 종합 분석: 완료된 분석이 있으면 키워드 개요가 생성되어야 한다.
    const aggregateOutcome = await aggregateAnalyses({ repository });
    assert.strictEqual(aggregateOutcome.ok, true, '완료 분석이 있으면 종합이 성공해야 한다');
    assert.ok(Array.isArray(aggregateOutcome.result.activityKeywords), '활동 키워드 목록이 있어야 한다');
    assert.ok(Array.isArray(aggregateOutcome.result.portfolioKeywords), '포트폴리오 키워드 목록이 있어야 한다');
    assert.strictEqual(aggregateOutcome.result.basedOnCount, 1, '실패 분석은 종합 입력에서 제외되어야 한다');

    // 4) 자료가 없으면 no_data를 반환해야 한다.
    const emptyRepository = new LocalAnalysisRepository({ baseDir, projectId: 'empty-project' });
    const emptyOutcome = await aggregateAnalyses({ repository: emptyRepository });
    assert.deepStrictEqual(
      { ok: emptyOutcome.ok, reason: emptyOutcome.reason },
      { ok: false, reason: 'no_data' },
      '분석 자료가 없으면 no_data를 반환해야 한다'
    );

    console.log('single-file-analysis.test.js 통과: mock 파이프라인, 트리 파싱, 종합 분석 검증 완료');
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
