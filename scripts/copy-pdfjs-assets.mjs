import { copyFile, mkdir } from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();
const sourceDirectory = path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build');
const targetDirectory = path.join(projectRoot, 'public', 'vendor', 'pdfjs');
const assetNames = ['pdf.mjs', 'pdf.worker.mjs'];

await mkdir(targetDirectory, { recursive: true });
await Promise.all(assetNames.map((assetName) => copyFile(
  path.join(sourceDirectory, assetName),
  path.join(targetDirectory, assetName)
)));

console.log('PDF.js 미리보기 자산 준비 완료');
