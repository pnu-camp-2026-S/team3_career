import { createSupabaseServerClient } from '../../../lib/supabase-server';

const PROFILE_COLUMNS = 'user_id, name, gender, birth_date, email, phone, address, educations, preferences, chips, updated_at';

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toClientProfile(row) {
  if (!row) return null;

  return {
    name: row.name || '',
    gender: row.gender || '',
    birthDate: row.birth_date || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    educations: normalizeArray(row.educations),
    preferences: normalizeObject(row.preferences),
    chips: normalizeObject(row.chips),
    updatedAt: row.updated_at || null,
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

    if (!user) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ message: error.message }, { status: 500 });
    }

    return Response.json({ profile: toClientProfile(data) });
  } catch (error) {
    return Response.json(
      { message: error.message || 'Unable to load profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const payload = await request.json();
    const row = {
      user_id: user.id,
      name: normalizeString(payload.name),
      gender: normalizeString(payload.gender),
      birth_date: normalizeString(payload.birthDate) || null,
      email: normalizeString(payload.email),
      phone: normalizeString(payload.phone),
      address: normalizeString(payload.address),
      educations: normalizeArray(payload.educations),
      preferences: normalizeObject(payload.preferences),
      chips: normalizeObject(payload.chips),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select(PROFILE_COLUMNS)
      .single();

    if (error) {
      return Response.json({ message: error.message }, { status: 500 });
    }

    return Response.json({ profile: toClientProfile(data) });
  } catch (error) {
    return Response.json(
      { message: error.message || 'Unable to save profile' },
      { status: 500 }
    );
  }
}
