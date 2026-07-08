// 프로젝트 폴더 API. 폴더는 사용자가 '폴더 추가'로 만들 때만 생성되고 Supabase에 저장된다.
// 세부 폴더 구조는 subfolders(jsonb)에 담고, 파일은 activity_files에서 별도로 읽는다.

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../lib/supabase-server';

const FOLDER_COLUMNS = 'id, group_key, type_key, label, subfolders, github, created_at';
const ACTIVITY_FILE_BUCKET = 'activity-files';

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

// 저장된 세부 폴더 구조는 { id, label }만 유지한다(파일은 activity_files 기준).
function sanitizeSubfolders(subfolders) {
  if (!Array.isArray(subfolders)) return [];
  return subfolders
    .filter((sub) => sub && typeof sub.id === 'string')
    .map((sub) => ({ id: sub.id, label: String(sub.label || '') }));
}

function mapFolder(row) {
  return {
    id: row.id,
    group: row.group_key,
    type: row.type_key,
    label: row.label,
    subfolders: sanitizeSubfolders(row.subfolders),
    github: row.github || null,
    createdAt: row.created_at,
  };
}

// project_id 컬럼과 레거시 folder_id('프로젝트id' 또는 '프로젝트id::sub번호')를 함께 찾는다.
function projectFilesQuery(supabase, userId, projectId) {
  return supabase
    .from('activity_files')
    .select('id, storage_bucket, storage_path')
    .eq('user_id', userId)
    .or(`project_id.eq.${projectId},folder_id.eq.${projectId},folder_id.like.${projectId}::*`);
}

async function removeStorageObjects(supabase, files) {
  const storage = (createSupabaseAdminClient() || supabase).storage;
  const pathsByBucket = new Map();
  files.forEach((file) => {
    if (!file.storage_path) return;
    const bucket = file.storage_bucket || ACTIVITY_FILE_BUCKET;
    const paths = pathsByBucket.get(bucket) || [];
    paths.push(file.storage_path);
    pathsByBucket.set(bucket, paths);
  });

  for (const [bucket, paths] of pathsByBucket.entries()) {
    const { error } = await storage.from(bucket).remove(paths);
    if (error) throw new Error(`Storage 파일 삭제 실패: ${error.message}`);
  }
}

async function deleteProjectChildren(supabase, userId, projectId, files) {
  const fileIds = files.map((file) => file.id).filter(Boolean);

  if (fileIds.length) {
    const { error: analysisError } = await supabase
      .from('file_analyses')
      .delete()
      .eq('user_id', userId)
      .in('activity_file_id', fileIds);
    if (analysisError) throw new Error(analysisError.message);
  }

  const { error: projectAnalysisError } = await supabase
    .from('project_analyses')
    .delete()
    .eq('user_id', userId)
    .eq('scope', 'project')
    .eq('project_id', projectId);
  if (projectAnalysisError) throw new Error(projectAnalysisError.message);

  const { error: filesError } = await supabase
    .from('activity_files')
    .delete()
    .eq('user_id', userId)
    .or(`project_id.eq.${projectId},folder_id.eq.${projectId},folder_id.like.${projectId}::*`);
  if (filesError) throw new Error(filesError.message);
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('activity_folders')
      .select(FOLDER_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ folders: (data || []).map(mapFolder) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to load folders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const groupKey = String(body.group || '').trim();
    const typeKey = String(body.type || '').trim();
    const label = String(body.label || '').trim();

    if (!id || !groupKey || !typeKey || !label) {
      return Response.json({ message: 'id, group, type, label are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('activity_folders')
      .insert({
        id,
        user_id: user.id,
        group_key: groupKey,
        type_key: typeKey,
        label,
        subfolders: sanitizeSubfolders(body.subfolders),
        github: body.github || null,
      })
      .select(FOLDER_COLUMNS)
      .single();

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ folder: mapFolder(data) }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to create folder' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return Response.json({ message: 'id is required' }, { status: 400 });

    // 전달된 필드만 갱신한다(이름 수정 / 그룹 이동 / GitHub 연결).
    const patch = { updated_at: new Date().toISOString() };
    if (typeof body.label === 'string') patch.label = body.label.trim();
    if (typeof body.group === 'string') patch.group_key = body.group.trim();
    if (Object.prototype.hasOwnProperty.call(body, 'github')) patch.github = body.github || null;
    if (Array.isArray(body.subfolders)) patch.subfolders = sanitizeSubfolders(body.subfolders);

    const { data, error } = await supabase
      .from('activity_folders')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(FOLDER_COLUMNS)
      .maybeSingle();

    if (error) return Response.json({ message: error.message }, { status: 500 });
    if (!data) return Response.json({ message: 'Folder not found' }, { status: 404 });

    return Response.json({ folder: mapFolder(data) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to update folder' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return Response.json({ message: 'id is required' }, { status: 400 });

    const { data: files, error: filesReadError } = await projectFilesQuery(supabase, user.id, id);
    if (filesReadError) return Response.json({ message: filesReadError.message }, { status: 500 });

    await removeStorageObjects(supabase, files || []);
    await deleteProjectChildren(supabase, user.id, id, files || []);

    const { error } = await supabase
      .from('activity_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to delete folder' }, { status: 500 });
  }
}
