import {
  PROJECT_SUBFOLDER_MAP,
  PROJECT_TYPE_LABELS,
  getSubfoldersForProjectType,
} from '../../../../lib/analysis/subfolder-config.mjs';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectType = searchParams.get('projectType');

  if (projectType) {
    if (!Object.prototype.hasOwnProperty.call(PROJECT_SUBFOLDER_MAP, projectType)) {
      return Response.json({ ok: false, error: `알 수 없는 프로젝트 유형입니다: ${projectType}` }, { status: 400 });
    }
    return Response.json({
      ok: true,
      projectType,
      projectTypeLabel: PROJECT_TYPE_LABELS[projectType],
      subfolders: getSubfoldersForProjectType(projectType),
    });
  }

  const projectTypes = Object.keys(PROJECT_SUBFOLDER_MAP).map((type) => ({
    projectType: type,
    projectTypeLabel: PROJECT_TYPE_LABELS[type],
    subfolders: getSubfoldersForProjectType(type),
  }));

  return Response.json({ ok: true, projectTypes });
}
