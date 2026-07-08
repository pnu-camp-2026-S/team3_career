// 실제 AI 키(gemini_key.env 또는 key.env)로 repo 문서를 분석하는 예시 실행 스크립트.
// 사용법: node scripts/run-analysis-example.mjs [입력파일] [projectType]
// 산출물은 data/local-analysis에 저장되고, docs/examples/single-file-analysis에 예시로 복사된다.

import fs from 'node:fs/promises';
import path from 'node:path';
import { LocalAnalysisRepository } from '../ai_analysis/repository.mjs';
import { analyzeSingleFile } from '../ai_analysis/service.mjs';
import { resolveProvider } from '../ai_analysis/ai-client.mjs';

const inputPath = process.argv[2] || path.join('docs', 'file-management.md');
const projectType = process.argv[3] || 'personal';
const exampleDir = path.join('docs', 'examples', 'single-file-analysis');

const provider = resolveProvider();
console.log(`AI 제공자: ${provider}`);
if (provider === 'mock') {
  console.warn('경고: API 키가 없어 mock 모드로 실행됩니다. 실제 예시를 만들려면 gemini_key.env를 확인하세요.');
}

const buffer = await fs.readFile(inputPath);
const repository = new LocalAnalysisRepository();

const output = await analyzeSingleFile({
  originalFileName: path.basename(inputPath),
  buffer,
  mimeType: 'text/markdown',
  projectType,
  repository,
});

if (!output.ok) {
  console.error(`분석 실패 (${output.stage}):`, output.errors);
  process.exit(1);
}

console.log(`분석 완료: ${output.analysisId}`);
console.log(`추천 하위 폴더: ${output.analysisResult.classification.recommendedFolderId} (신뢰도 ${output.analysisResult.classification.confidence})`);

await fs.mkdir(exampleDir, { recursive: true });
await fs.writeFile(path.join(exampleDir, 'analysis-result.json'), JSON.stringify(output.analysisResult, null, 2), 'utf8');
await fs.writeFile(path.join(exampleDir, 'summary.md'), output.summaryMarkdown, 'utf8');
await fs.writeFile(path.join(exampleDir, 'index.json'), JSON.stringify(output.indexDraft, null, 2), 'utf8');
await fs.writeFile(path.join(exampleDir, 'log.md'), output.logMarkdown, 'utf8');
console.log(`예시 산출물 저장 완료: ${exampleDir}`);
