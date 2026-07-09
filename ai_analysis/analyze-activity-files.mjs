// activity_files 행 목록을 받아 파일별 단일 분석(L1)을 실행하는 공용 헬퍼.
// /api/analysis/file(업로드 후 자동)과 /api/analysis/project(분석하기 안전망)에서 공유한다.
// 원본은 Supabase Storage에 있으므로 storage 클라이언트를 주입받아 내려받는다.

import { analyzeSingleFile } from './service.mjs';

const ACTIVITY_FILE_BUCKET = 'activity-files';

// resolveProject(row) → { projectType, projectName, projectId }
export async function analyzeActivityFileRows({ storage, repository, rows, resolveProject }) {
  const fileResults = [];
  let analyzedCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    const fileRepository = repository.forActivityFile(row);
    const project = resolveProject(row);
    try {
      const { data: blob, error: downloadError } = await storage
        .from(row.storage_bucket || ACTIVITY_FILE_BUCKET)
        .download(row.storage_path);
      if (downloadError) throw new Error(`원본 파일을 내려받지 못했습니다: ${downloadError.message}`);

      const buffer = Buffer.from(await blob.arrayBuffer());
      const outcome = await analyzeSingleFile({
        originalFileName: row.file_name,
        buffer,
        mimeType: row.mime_type || 'application/octet-stream',
        projectType: project.projectType,
        projectId: project.projectId,
        projectName: project.projectName,
        repository: fileRepository,
      });

      if (outcome.ok) {
        analyzedCount += 1;
        fileResults.push({ activityFileId: row.id, name: row.file_name, ok: true, errors: [] });
      } else {
        failedCount += 1;
        await fileRepository
          .saveFailureDetails({ stage: outcome.stage, errors: outcome.errors })
          .catch(() => {});
        fileResults.push({ activityFileId: row.id, name: row.file_name, ok: false, errors: outcome.errors || [] });
      }
    } catch (error) {
      failedCount += 1;
      await fileRepository
        .saveFailureDetails({ stage: 'pipeline', errors: [error.message] })
        .catch(() => {});
      fileResults.push({ activityFileId: row.id, name: row.file_name, ok: false, errors: [error.message] });
    }
  }

  return { analyzedCount, failedCount, fileResults };
}
