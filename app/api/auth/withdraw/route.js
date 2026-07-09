import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../../../lib/supabase-server';

const ACTIVITY_FILE_BUCKET = 'activity-files';

const USER_ROW_TARGETS = [
  { table: 'activity_schedules', column: 'user_id' },
  { table: 'activity_files', column: 'user_id' },
  { table: 'portfolios', column: 'user_id' },
  { table: 'user_profiles', column: 'user_id' },
  { table: 'profiles', column: 'id' },
];

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

function groupStoragePaths(fileRows) {
  return (fileRows || []).reduce((groups, row) => {
    if (!row.storage_path) return groups;

    const bucket = row.storage_bucket || ACTIVITY_FILE_BUCKET;
    if (!groups.has(bucket)) groups.set(bucket, new Set());
    groups.get(bucket).add(row.storage_path);
    return groups;
  }, new Map());
}

async function removeActivityStorageObjects(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('activity_files')
    .select('storage_bucket, storage_path')
    .eq('user_id', userId);

  if (error) throw error;

  const groupedPaths = groupStoragePaths(data);
  for (const [bucket, pathSet] of groupedPaths.entries()) {
    const paths = Array.from(pathSet);
    if (!paths.length) continue;

    const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
  }
}

async function deleteUserRows(supabaseAdmin, userId) {
  for (const target of USER_ROW_TARGETS) {
    const { error } = await supabaseAdmin
      .from(target.table)
      .delete()
      .eq(target.column, userId);

    if (error) throw error;
  }
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return Response.json(
        { message: '회원 탈퇴 처리를 위한 서버 설정이 필요합니다.' },
        { status: 500 }
      );
    }

    await removeActivityStorageObjects(supabaseAdmin, user.id);
    await deleteUserRows(supabaseAdmin, user.id);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.warn('Account withdrawal sign-out failed.', signOutError);

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { message: error.message || '회원 탈퇴를 완료하지 못했습니다.' },
      { status: 500 }
    );
  }
}
