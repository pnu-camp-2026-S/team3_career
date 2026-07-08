import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../lib/supabase-server';

const ACTIVITY_FILE_BUCKET = 'activity-files';
const ACTIVITY_FILE_COLUMNS = 'id, folder_id, folder_group, folder_type, folder_label, file_name, mime_type, size_bytes, storage_bucket, storage_path, created_at';

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

function mapActivityFile(row) {
  return {
    id: row.id,
    name: row.file_name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    folderId: row.folder_id,
    folderGroup: row.folder_group,
    folderType: row.folder_type,
    folderLabel: row.folder_label,
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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('activity_files')
      .select(ACTIVITY_FILE_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

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

    if (!folderId || !files.length) {
      return Response.json({ message: 'folderId and files are required' }, { status: 400 });
    }

    const storage = getStorageClient(supabase).storage;
    const savedRows = [];

    for (const file of files) {
      const fileName = file.name;
      const storagePath = [
        user.id,
        sanitizePathSegment(folderId),
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
