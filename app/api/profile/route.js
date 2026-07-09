import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { isAnalysisMockEnabled } from '../../../lib/openai-portfolio';

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

function normalizePhoto(value) {
  const normalized = normalizeString(value);
  if (!normalized) return '';
  if (normalized.startsWith('data:image/') || /^https?:\/\//.test(normalized)) return normalized;
  return '';
}

function pickFirstString(...values) {
  return values.map(normalizeString).find(Boolean) || '';
}

function normalizeBirthDate(value) {
  const normalized = normalizeString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(normalized)) return normalized.replaceAll('.', '-');
  return '';
}

function normalizeGender(value) {
  const normalized = normalizeString(value).toLowerCase();
  if (['female', 'woman', 'women', 'f'].includes(normalized)) return '여성';
  if (['male', 'man', 'men', 'm'].includes(normalized)) return '남성';
  if (['여성', '남성', '선택 안 함'].includes(normalizeString(value))) return normalizeString(value);
  return '';
}

function normalizeAddress(value) {
  if (typeof value === 'string') return normalizeString(value);
  if (!value || typeof value !== 'object') return '';

  return pickFirstString(
    value.formatted,
    value.full,
    [value.country, value.region, value.locality, value.street_address].filter(Boolean).join(' ')
  );
}

function getSocialProfileDefaults(user) {
  const metadata = user?.user_metadata || {};

  return {
    name: pickFirstString(metadata.full_name, metadata.name, metadata.preferred_username, user?.email),
    gender: normalizeGender(pickFirstString(metadata.gender, metadata.sex)),
    birthDate: normalizeBirthDate(pickFirstString(metadata.birth_date, metadata.birthdate, metadata.birthday)),
    email: pickFirstString(user?.email, metadata.email),
    phone: pickFirstString(user?.phone, metadata.phone, metadata.phone_number),
    address: normalizeAddress(metadata.address),
    educations: [],
    preferences: {},
    chips: {},
    photo: '',
    updatedAt: null,
  };
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
    photo: normalizePhoto(normalizeObject(row.preferences).profilePhoto),
    updatedAt: row.updated_at || null,
  };
}

function mergeProfileWithSocialDefaults(row, user) {
  const socialProfile = getSocialProfileDefaults(user);
  const savedProfile = toClientProfile(row);

  if (!savedProfile) return socialProfile;

  return {
    ...savedProfile,
    name: savedProfile.name || socialProfile.name,
    gender: savedProfile.gender || socialProfile.gender,
    birthDate: savedProfile.birthDate || socialProfile.birthDate,
    email: savedProfile.email || socialProfile.email,
    phone: savedProfile.phone || socialProfile.phone,
    address: savedProfile.address || socialProfile.address,
    photo: savedProfile.photo || socialProfile.photo,
  };
}

function buildMockProfile() {
  return {
    name: 'AI스프린트3팀',
    gender: '남성',
    birthDate: '2001-01-03',
    email: 'aisprint333@gmail.com',
    phone: '010-0000-0000',
    address: '서울',
    educations: [
      {
        schoolType: '대학교 2,3년',
        schoolName: 'dd',
        periodStart: '2026.03',
        periodEnd: '2026.03',
        major: '전기공학과',
        minor: '산업공학과',
      },
    ],
    preferences: {
      detailJob: '머신러닝 엔지니어',
      workIndustry: '반도체',
      workRegion: '서울',
      salary: '3,000만원 이상',
    },
    chips: {
      jobs: ['데이터', 'AI/머신러닝'],
      fields: ['대외활동', '공모전'],
      industries: ['반도체', 'IT/SW'],
      companies: ['삼성전자', 'SK하이닉스'],
    },
    photo: '',
    updatedAt: new Date().toISOString(),
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
    if (isAnalysisMockEnabled()) {
      return Response.json({ profile: buildMockProfile(), provider: 'mock' });
    }

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

    return Response.json({ profile: mergeProfileWithSocialDefaults(data, user) });
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
    const preferences = normalizeObject(payload.preferences);
    preferences.profilePhoto = normalizePhoto(payload.photo);

    const row = {
      user_id: user.id,
      name: normalizeString(payload.name),
      gender: normalizeString(payload.gender),
      birth_date: normalizeString(payload.birthDate) || null,
      email: normalizeString(payload.email),
      phone: normalizeString(payload.phone),
      address: normalizeString(payload.address),
      educations: normalizeArray(payload.educations),
      preferences,
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
