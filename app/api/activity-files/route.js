import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../lib/supabase-server';
import { deriveFolderTree } from '../../../lib/folder-tree';

const ACTIVITY_FILE_BUCKET = 'activity-files';
const ACTIVITY_FILE_COLUMNS = 'id, folder_id, folder_group, folder_type, folder_label, project_id, parent_folder_id, folder_path, folder_level, file_name, mime_type, size_bytes, storage_bucket, storage_path, created_at, file_analyses(status, summary_md, index_draft, log_md)';
const TEXT_PREVIEW_EXTENSIONS = new Set(['txt', 'md', 'csv']);
const TEXT_PREVIEW_MIME_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv']);
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 10;
const TEXT_PREVIEW_MAX_BYTES = 512 * 1024;

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

function getSafeStorageFileName(fileName) {
  const normalized = String(fileName || 'file').normalize('NFKC');
  const extensionMatch = normalized.match(/\.([A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : '';

  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
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

function getFileExtension(fileName) {
  return String(fileName || '').split('.').pop()?.toLowerCase() || '';
}

function getPreviewKind(fileName, mimeType) {
  const extension = getFileExtension(fileName);
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (String(mimeType || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
  if (TEXT_PREVIEW_MIME_TYPES.has(mimeType) || TEXT_PREVIEW_EXTENSIONS.has(extension)) return 'text';
  return 'unsupported';
}

async function createStorageSignedUrl(storage, bucket, path) {
  const { data, error } = await storage
    .from(bucket || ACTIVITY_FILE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error) throw error;
  return data?.signedUrl || '';
}

async function buildActivityFilePreview({ storage, fileRow }) {
  const kind = getPreviewKind(fileRow.file_name, fileRow.mime_type);
  const bucket = fileRow.storage_bucket || ACTIVITY_FILE_BUCKET;
  const path = fileRow.storage_path;
  const basePreview = {
    id: fileRow.id,
    name: fileRow.file_name,
    mimeType: fileRow.mime_type,
    size: fileRow.size_bytes,
    kind,
  };

  if (!path) {
    return {
      ...basePreview,
      kind: 'unavailable',
      message: '미리보기에 사용할 원본 파일 경로가 없습니다.',
    };
  }

  if (kind === 'image' || kind === 'pdf') {
    return {
      ...basePreview,
      signedUrl: await createStorageSignedUrl(storage, bucket, path),
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }

  if (kind === 'text') {
    if (Number(fileRow.size_bytes || 0) > TEXT_PREVIEW_MAX_BYTES) {
      return {
        ...basePreview,
        signedUrl: await createStorageSignedUrl(storage, bucket, path),
        message: '파일이 커서 일부 내용을 바로 표시하지 않고 새 탭 열기로 안내합니다.',
      };
    }

    const { data, error } = await storage.from(bucket).download(path);
    if (error) throw error;

    return {
      ...basePreview,
      text: await data.text(),
    };
  }

  return {
    ...basePreview,
    signedUrl: await createStorageSignedUrl(storage, bucket, path),
    message: '이 파일 형식은 아직 직접 미리보기를 지원하지 않습니다. 원본 파일을 새 탭에서 확인해 주세요.',
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

    const searchParams = new URL(request.url).searchParams;
    const previewId = searchParams.get('previewId');
    const projectId = searchParams.get('projectId');

    if (previewId) {
      const { data: fileRow, error: previewReadError } = await supabase
        .from('activity_files')
        .select('id, file_name, mime_type, size_bytes, storage_bucket, storage_path')
        .eq('id', previewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (previewReadError) return Response.json({ message: previewReadError.message }, { status: 500 });
      if (!fileRow) return Response.json({ message: 'File not found' }, { status: 404 });

      const storage = getStorageClient(supabase).storage;
      const preview = await buildActivityFilePreview({ storage, fileRow });
      return Response.json({ preview });
    }

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

    // 'AI 요약' 세부 폴더에는 원본 자료를 올릴 수 없다(요약 산출물 전용).
    if (folderId.endsWith('::ai-summary')) {
      return Response.json(
        { message: 'AI 요약 폴더에는 자료를 직접 올릴 수 없습니다.' },
        { status: 400 }
      );
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
        getSafeStorageFileName(fileName),
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
