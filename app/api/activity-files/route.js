import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../lib/supabase-server';
import { deriveFolderTree } from '../../../lib/folder-tree';

const ACTIVITY_FILE_BUCKET = 'activity-files';
const ACTIVITY_FILE_COLUMNS = 'id, folder_id, folder_group, folder_type, folder_label, project_id, parent_folder_id, folder_path, folder_level, file_name, mime_type, size_bytes, storage_bucket, storage_path, created_at, file_analyses(status, summary_md, index_draft, log_md)';

function getStorageClient(supabase) {
  return createSupabaseAdminClient() || supabase;
}

function sanitizePathSegment(value) {
  return String(value || 'file')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

// file_analyses는 activity_file_id unique 제약 때문에 배열/단일 객체 어느 쪽으로도 올 수 있다.
function embeddedAnalysis(embedded) {
  if (!embedded) return null;
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!row) return null;
  return {
    status: row.status || null,
    summaryMd: row.summary_md || '',
    indexDraft: row.index_draft || null,
    logMd: row.log_md || '',
  };
}

function mapActivityFile(row) {
  const analysis = embeddedAnalysis(row.file_analyses);
  return {
    id: row.id,
    name: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    folderId: row.folder_id,
    folderGroup: row.folder_group,
    folderType: row.folder_type,
    folderLabel: row.folder_label,
    projectId: row.project_id,
    parentFolderId: row.parent_folder_id,
    folderPath: row.folder_path,
    folderLevel: row.folder_level,
    analysisStatus: analysis?.status || null,
    analysis,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const projectId = new URL(request.url).searchParams.get('projectId');
    let query = supabase
      .from('activity_files')
      .select(ACTIVITY_FILE_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ files: (data || []).map(mapActivityFile) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to load activity files' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll('files').filter((file) => file && typeof file.name === 'string');
    const folderId = String(formData.get('folderId') || '');
    const folderGroup = String(formData.get('folderGroup') || '');
    const folderType = String(formData.get('folderType') || '');
    const folderLabel = String(formData.get('folderLabel') || '');
    const projectIdHint = String(formData.get('projectId') || '');

    if (!folderId || !files.length) {
      return Response.json({ message: 'folderId and files are required' }, { status: 400 });
    }

    const tree = deriveFolderTree(folderId, projectIdHint || null);
    const storage = getStorageClient(supabase).storage;
    const savedRows = [];

    for (const file of files) {
      const fileName = file.name;
      // storage_path는 folder_path를 그대로 미러링한다(#167): uid/프로젝트/하위폴더/파일
      const storagePath = [
        user.id,
        ...tree.folderPath.split('/').map(sanitizePathSegment),
        `${Date.now()}-${crypto.randomUUID()}-${sanitizePathSegment(fileName)}`,
      ].join('/');

      const { error: uploadError } = await storage.from(ACTIVITY_FILE_BUCKET).upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) return Response.json({ message: uploadError.message }, { status: 500 });

      const { data, error: insertError } = await supabase
        .from('activity_files')
        .insert({
          user_id: user.id,
          folder_id: folderId,
          folder_group: folderGroup,
          folder_type: folderType,
          folder_label: folderLabel,
          project_id: tree.projectId,
          parent_folder_id: tree.parentFolderId,
          folder_path: tree.folderPath,
          folder_level: tree.folderLevel,
          file_name: fileName,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size || 0,
          storage_bucket: ACTIVITY_FILE_BUCKET,
          storage_path: storagePath,
        })
        .select(ACTIVITY_FILE_COLUMNS)
        .single();

      if (insertError) {
        await storage.from(ACTIVITY_FILE_BUCKET).remove([storagePath]);
        return Response.json({ message: insertError.message }, { status: 500 });
      }

      savedRows.push(data);
    }

    return Response.json({ files: savedRows.map(mapActivityFile) }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to upload activity files' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { id, storagePath } = await request.json();
    const { data: fileRow, error: readError } = await supabase
      .from('activity_files')
      .select('id, storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) return Response.json({ message: readError.message }, { status: 500 });
    if (!fileRow) return Response.json({ message: 'File not found' }, { status: 404 });

    const pathToRemove = fileRow.storage_path || storagePath;
    const storage = getStorageClient(supabase).storage;
    if (pathToRemove) await storage.from(ACTIVITY_FILE_BUCKET).remove([pathToRemove]);

    const { error: deleteError } = await supabase
      .from('activity_files')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) return Response.json({ message: deleteError.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to delete activity file' }, { status: 500 });
  }
}
