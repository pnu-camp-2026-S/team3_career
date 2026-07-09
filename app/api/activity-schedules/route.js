import { createSupabaseServerClient } from '../../../lib/supabase-server';

const ACTIVITY_SCHEDULE_COLUMNS = 'activity_id, title, note, schedule_date, created_at, updated_at';
const PROFILE_SCHEDULE_KEY = 'savedActivitySchedules';

function normalizeSchedule(row) {
  return {
    id: Number(row.activity_id),
    title: row.title || '',
    note: row.note || '',
    date: row.schedule_date || '',
  };
}

function normalizePayloadSchedule(item) {
  const id = Number(item?.id);
  const date = String(item?.date || '').trim();

  if (!Number.isInteger(id) || id <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    activity_id: id,
    title: String(item?.title || '').trim().slice(0, 200),
    note: String(item?.note || '').trim().slice(0, 200),
    schedule_date: date,
  };
}

function normalizeProfileSchedule(item) {
  return normalizePayloadSchedule(item);
}

function toClientSchedules(schedules) {
  return schedules.map((schedule) => ({
    id: Number(schedule.activity_id),
    title: schedule.title || '',
    note: schedule.note || '',
    date: schedule.schedule_date || '',
  }));
}

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

async function loadProfileScheduleFallback(supabase, userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { schedules: [], error };

  const schedules = (Array.isArray(data?.preferences?.[PROFILE_SCHEDULE_KEY])
    ? data.preferences[PROFILE_SCHEDULE_KEY]
    : [])
    .map(normalizeProfileSchedule)
    .filter(Boolean);

  return { schedules: toClientSchedules(schedules), error: null };
}

async function saveProfileScheduleFallback(supabase, userId, schedules) {
  const { data, error: readError } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) return { error: readError };

  const preferences = {
    ...(data?.preferences && typeof data.preferences === 'object' ? data.preferences : {}),
    [PROFILE_SCHEDULE_KEY]: toClientSchedules(schedules),
  };

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  return { error };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('activity_schedules')
      .select(ACTIVITY_SCHEDULE_COLUMNS)
      .eq('user_id', user.id)
      .order('schedule_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      const fallback = await loadProfileScheduleFallback(supabase, user.id);
      if (!fallback.error) return Response.json({ schedules: fallback.schedules });
      return Response.json({ message: error.message }, { status: 500 });
    }

    const schedules = (data || []).map(normalizeSchedule);
    if (schedules.length) return Response.json({ schedules });

    const fallback = await loadProfileScheduleFallback(supabase, user.id);
    if (!fallback.error && fallback.schedules.length) return Response.json({ schedules: fallback.schedules });

    return Response.json({ schedules });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to load activity schedules' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const payload = await request.json();
    const schedules = (Array.isArray(payload?.schedules) ? payload.schedules : [])
      .map(normalizePayloadSchedule)
      .filter(Boolean);

    const fallback = await saveProfileScheduleFallback(supabase, user.id, schedules);

    const { error: deleteError } = await supabase
      .from('activity_schedules')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      if (!fallback.error) return Response.json({ schedules: toClientSchedules(schedules) });
      return Response.json({ message: deleteError.message }, { status: 500 });
    }

    if (!schedules.length) return Response.json({ schedules: [] });

    const now = new Date().toISOString();
    const rows = schedules.map((schedule) => ({
      ...schedule,
      user_id: user.id,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from('activity_schedules')
      .insert(rows)
      .select(ACTIVITY_SCHEDULE_COLUMNS);

    if (error) {
      if (!fallback.error) return Response.json({ schedules: toClientSchedules(schedules) });
      return Response.json({ message: error.message }, { status: 500 });
    }

    return Response.json({ schedules: (data || []).map(normalizeSchedule) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to save activity schedules' }, { status: 500 });
  }
}
