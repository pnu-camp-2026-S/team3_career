// 분석 파이프라인 mock 테스트.
// AI 키 없이(ANALYSIS_MOCK=1) 파일별 요약(L1)→프로젝트 종합(L2)→메인 개요(L3) 흐름과
// 수정본 보존, 폴더 트리 파생(deriveFolderTree), no_data/mock_data 처리를 검증한다.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.ANALYSIS_MOCK = '1';

(async () => {
  const { analyzeSingleFile } = await import('../ai_analysis/service.mjs');
  const { LocalAnalysisRepository } = await import('../ai_analysis/repository.mjs');
  const { aggregateProjectAnalyses, aggregateMainOverview } = await import('../ai_analysis/aggregate.mjs');
  const { supportsCustomTemperature } = await import('../ai_analysis/ai-client.mjs');
  const { deriveFolderTree } = await import('../lib/folder-tree.js');

  assert.strictEqual(
    supportsCustomTemperature('gpt-5.5'),
    false,
    'gpt-5 계열 모델에는 기본 temperature만 사용해야 한다'
  );
  assert.strictEqual(
    supportsCustomTemperature('o3-mini'),
    false,
    'o 계열 추론 모델에는 custom temperature를 보내지 않아야 한다'
  );
  assert.strictEqual(
    supportsCustomTemperature('gpt-4o-mini'),
    true,
    'gpt-4o-mini에는 기존 temperature 설정을 유지할 수 있어야 한다'
  );

  // deriveFolderTree: 세부 폴더 id와 구버전 프로젝트 id를 트리 컬럼으로 파싱한다(#167).
  assert.deepStrictEqual(deriveFolderTree('completed-personal::sub0'), {
    projectId: 'completed-personal',
    parentFolderId: 'completed-personal',
    folderPath: 'completed-personal/sub0',
    folderLevel: 1,
  }, '세부 폴더 id는 프로젝트/부모 경로/깊이로 파싱되어야 한다');
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

    // 1) 지원 확장자(md): 파일별 요약(L1)이 성공해야 한다.
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
      okResult.analysisResult.classification,
      undefined,
      '파일별 분석 결과에는 더 이상 AI 추천 분류(classification)가 없어야 한다'
    );
    assert.ok(okResult.summaryMarkdown.length > 0, 'summary.md가 생성되어야 한다');
    assert.ok(okResult.logMarkdown.includes('ai_analysis_completed'), '완료 이벤트가 로그에 담겨야 한다');

    const resultDir = path.join(baseDir, 'test-project', 'results', okResult.analysisId);
    ['metadata.json', 'analysis-result.json', 'summary.md', 'log.md'].forEach((name) => {
      assert.ok(fs.existsSync(path.join(resultDir, name)), `산출물 ${name}이 저장되어야 한다`);
    });
    assert.ok(
      !fs.existsSync(path.join(resultDir, 'index.json')),
      '파일 단위 index.json은 더 이상 생성하지 않아야 한다'
    );

    // 명시적 mock 모드가 아니면 저장된 mock 결과는 실제 분석 입력에서 제외되어야 한다.
    const previousMock = process.env.ANALYSIS_MOCK;
    const previousProvider = process.env.ANALYSIS_PROVIDER;
    delete process.env.ANALYSIS_MOCK;
    delete process.env.ANALYSIS_PROVIDER;
    const blockedMockOutcome = await aggregateProjectAnalyses({
      repository,
      project: { projectId: 'test-project', projectName: '테스트 프로젝트', projectType: 'team' },
    });
    assert.deepStrictEqual(
      { ok: blockedMockOutcome.ok, reason: blockedMockOutcome.reason },
      { ok: false, reason: 'mock_data' },
      '명시적 mock 모드가 아니면 기존 mock 분석 결과를 프로젝트 종합 입력으로 쓰면 안 된다'
    );
    process.env.ANALYSIS_MOCK = previousMock;
    if (previousProvider === undefined) delete process.env.ANALYSIS_PROVIDER;
    else process.env.ANALYSIS_PROVIDER = previousProvider;

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

    // 3) 프로젝트 종합(L2): 완료된 파일 요약을 모아 summary.md/index.json/log.md 3종을 만든다.
    const projectOutcome = await aggregateProjectAnalyses({
      repository,
      project: { projectId: 'test-project', projectName: '테스트 프로젝트', projectType: 'team' },
    });
    assert.strictEqual(projectOutcome.ok, true, '완료 분석이 있으면 프로젝트 종합이 성공해야 한다');
    assert.strictEqual(
      (await repository.getAnalysisBundle(okResult.analysisId)).provider,
      'mock',
      '파일 분석 저장소에 AI provider가 기록되어야 한다'
    );
    assert.ok(projectOutcome.result.summaryMd.length > 0, '프로젝트 summary.md가 생성되어야 한다');
    assert.ok(projectOutcome.result.logMd.includes('project_analysis'), '프로젝트 log.md에 분석 실행 기록이 담겨야 한다');
    assert.strictEqual(projectOutcome.result.indexJson.files.length, 1, 'index.json에는 완료된 파일이 나열되어야 한다');
    assert.ok(Array.isArray(projectOutcome.result.activityKeywords), '활동 키워드 목록이 있어야 한다');
    assert.ok(Array.isArray(projectOutcome.result.portfolioKeywords), '포트폴리오 키워드 목록이 있어야 한다');
    assert.strictEqual(projectOutcome.result.basedOnCount, 1, '실패 분석은 종합 입력에서 제외되어야 한다');
    assert.deepStrictEqual(
      projectOutcome.result.edited,
      { summary: false, index: false, log: false },
      '첫 종합에서는 사용자 수정 플래그가 모두 false여야 한다'
    );

    // 3-1) 산출물 개별 수정 + 수정본 보존: summary를 수정하면 재분석해도 덮어쓰지 않는다.
    await repository.saveProjectArtifact({ artifact: 'summary', content: '# 사용자가 직접 고친 요약' });
    const rerun = await aggregateProjectAnalyses({
      repository,
      project: { projectId: 'test-project', projectName: '테스트 프로젝트', projectType: 'team' },
    });
    assert.strictEqual(rerun.result.summaryMd, '# 사용자가 직접 고친 요약', '사용자가 수정한 summary.md는 재분석해도 유지되어야 한다');
    assert.strictEqual(rerun.result.edited.summary, true, '수정 플래그가 유지되어야 한다');

    // 4) 여러 프로젝트: 다른 프로젝트도 별도 L2 산출물을 만들 수 있어야 한다.
    const secondRepository = new LocalAnalysisRepository({ baseDir, projectId: 'second-project' });
    const secondResult = await analyzeSingleFile({
      originalFileName: '개인_프로젝트.md',
      buffer: Buffer.from('# 개인 프로젝트\n데이터 정리 자동화 도구를 구현했습니다.', 'utf8'),
      mimeType: 'text/markdown',
      projectType: 'personal',
      projectId: 'second-project',
      projectName: '두 번째 프로젝트',
      repository: secondRepository,
    });
    assert.strictEqual(secondResult.ok, true, '두 번째 프로젝트의 파일별 요약이 성공해야 한다');

    const secondProjectOutcome = await aggregateProjectAnalyses({
      repository: secondRepository,
      project: { projectId: 'second-project', projectName: '두 번째 프로젝트', projectType: 'personal' },
    });
    assert.strictEqual(secondProjectOutcome.ok, true, '두 번째 프로젝트의 프로젝트 종합이 성공해야 한다');
    assert.ok(secondProjectOutcome.result.summaryMd.length > 0, '두 번째 프로젝트 summary.md가 생성되어야 한다');

    // 5) 자료가 없으면 no_data를 반환하고, 다른 성공 프로젝트의 전체 종합은 막지 않는다.
    const emptyRepository = new LocalAnalysisRepository({ baseDir, projectId: 'empty-project' });
    const emptyOutcome = await aggregateProjectAnalyses({
      repository: emptyRepository,
      project: { projectId: 'empty-project', projectName: '빈 프로젝트', projectType: 'other' },
    });
    assert.deepStrictEqual(
      { ok: emptyOutcome.ok, reason: emptyOutcome.reason },
      { ok: false, reason: 'no_data' },
      '분석 자료가 없으면 no_data를 반환해야 한다'
    );

    // 6) 메인 개요(L3): 저장된 프로젝트 종합을 모아 전체 개요와 포트폴리오 키워드를 만든다.
    const mainRepository = new LocalAnalysisRepository({ baseDir, projectId: '__main__' });
    const mainOutcome = await aggregateMainOverview({ repository: mainRepository });
    assert.strictEqual(mainOutcome.ok, true, '프로젝트 종합이 있으면 메인 개요가 성공해야 한다');
    assert.ok(typeof mainOutcome.result.activityOverview === 'string', '메인 개요에는 활동 흐름 개요가 있어야 한다');
    assert.ok(Array.isArray(mainOutcome.result.projects), '메인 개요에는 프로젝트별 하이라이트가 있어야 한다');
    assert.ok(Array.isArray(mainOutcome.result.portfolioKeywords), '메인 개요에는 포트폴리오 키워드가 있어야 한다');
    assert.strictEqual(mainOutcome.result.basedOnCount, 2, '메인 개요는 성공한 프로젝트 수를 기준으로 종합해야 한다');

    console.log('single-file-analysis.test.js 통과: L1 요약, L2 프로젝트 종합(3종·수정본 보존), L3 메인 개요, mock 차단 검증 완료');
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
