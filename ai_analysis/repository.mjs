// 분석 산출물 저장소. docs/single-file-ai-analysis-mvp.md §14의 인터페이스를 따른다.
// 현재는 로컬 파일 기반(LocalAnalysisRepository)이며,
// DB가 생기면 같은 메서드 시그니처의 DbAnalysisRepository로 교체한다.
// 서비스 계층은 어떤 구현체인지 몰라야 한다.

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_DIR = path.join(process.cwd(), 'data', 'local-analysis');
const DEFAULT_PROJECT_ID = 'single-file-session';

export class LocalAnalysisRepository {
  constructor({ baseDir = DEFAULT_BASE_DIR, projectId = DEFAULT_PROJECT_ID } = {}) {
    this.baseDir = baseDir;
    this.projectId = projectId;
  }

  fileDir(fileId) {
    return path.join(this.baseDir, this.projectId, 'files', fileId);
  }

  resultDir(analysisId) {
    return path.join(this.baseDir, this.projectId, 'results', analysisId);
  }

  async saveOriginalFile({ fileId, safeFileName, buffer }) {
    const dir = this.fileDir(fileId);
    await fs.mkdir(dir, { recursive: true });
    const extension = path.extname(safeFileName);
    const storagePath = path.join(dir, `original${extension}`);
    await fs.writeFile(storagePath, buffer);
    return { storagePath };
  }

  async saveMetadata(metadata) {
    const dir = this.resultDir(metadata.analysisId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
  }

  async saveExtractedText(fileId, text) {
    const dir = this.fileDir(fileId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'extracted-text.txt'), text, 'utf8');
  }

  async saveAnalysisResult(result, provider = null) {
    const dir = this.resultDir(result.analysisId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'analysis-result.json'),
      JSON.stringify({ ...result, provider: provider || result.provider || null }, null, 2),
      'utf8'
    );
  }

  async saveSummaryMarkdown(analysisId, markdown) {
    const dir = this.resultDir(analysisId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'summary.md'), markdown, 'utf8');
  }

  async appendLog(analysisId, entryMarkdown) {
    const dir = this.resultDir(analysisId);
    await fs.mkdir(dir, { recursive: true });
    const logPath = path.join(dir, 'log.md');
    let existing = '';
    try {
      existing = await fs.readFile(logPath, 'utf8');
    } catch {
      existing = '# 단일 파일 분석 로그\n';
    }
    await fs.writeFile(logPath, `${existing}\n${entryMarkdown}`, 'utf8');
  }

  aggregateDir() {
    return path.join(this.baseDir, this.projectId, 'aggregate');
  }

  // 저장된 모든 분석 번들을 나열한다. 종합(aggregate) 분석의 입력이 된다.
  async listAnalysisBundles() {
    const resultsRoot = path.join(this.baseDir, this.projectId, 'results');
    let entries = [];
    try {
      entries = await fs.readdir(resultsRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    const bundles = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const bundle = await this.getAnalysisBundle(entry.name);
      if (bundle) bundles.push(bundle);
    }
    return bundles;
  }

  async saveAggregateResult(result) {
    const dir = this.aggregateDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'aggregate-result.json'), JSON.stringify(result, null, 2), 'utf8');
  }

  async getAggregateResult() {
    try {
      const raw = await fs.readFile(path.join(this.aggregateDir(), 'aggregate-result.json'), 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // 프로젝트 종합 산출물 한 개만 갱신하고 수정 플래그를 세운다(개별 수정).
  async saveProjectArtifact({ artifact, content }) {
    const current = (await this.getAggregateResult()) || {};
    const key = artifact === 'summary' ? 'summaryMd' : artifact === 'index' ? 'indexJson' : 'logMd';
    current[key] = content;
    current.edited = { ...(current.edited || {}), [artifact]: true };
    await this.saveAggregateResult(current);
    return current;
  }

  // 저장된 모든 프로젝트 종합(scope='project')을 나열한다. 메인 개요의 입력이 된다.
  async listProjectAggregates() {
    let entries = [];
    try {
      entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const results = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await fs.readFile(
          path.join(this.baseDir, entry.name, 'aggregate', 'aggregate-result.json'),
          'utf8'
        );
        const parsed = JSON.parse(raw);
        if (parsed && parsed.scope === 'project') results.push(parsed);
      } catch {
        // 프로젝트 종합이 없는 폴더는 건너뛴다.
      }
    }
    return results;
  }

  async getAnalysisBundle(analysisId) {
    const dir = this.resultDir(analysisId);

    async function readJson(fileName) {
      try {
        return JSON.parse(await fs.readFile(path.join(dir, fileName), 'utf8'));
      } catch {
        return null;
      }
    }

    async function readText(fileName) {
      try {
        return await fs.readFile(path.join(dir, fileName), 'utf8');
      } catch {
        return '';
      }
    }

    const metadata = await readJson('metadata.json');
    if (!metadata) return null;
    const analysisResult = await readJson('analysis-result.json');

    return {
      analysisId,
      provider: analysisResult?.provider || null,
      metadata,
      analysisResult,
      summaryMarkdown: await readText('summary.md'),
      indexDraft: await readJson('index.json'),
      logMarkdown: await readText('log.md'),
    };
  }
}
