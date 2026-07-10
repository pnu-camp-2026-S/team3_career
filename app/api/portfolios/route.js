import { createSupabaseServerClient } from '../../../lib/supabase-server';

const PORTFOLIO_COLUMNS = 'id, title, purpose, summary, content, format, status, liked, experiences, experience_projects, keywords, blocks, slides, cover_lines, raw, template_values, created_at, updated_at, deleted_at';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// jsonb 원본 객체 컬럼(raw, template_values)은 배열이 아닌 순수 객체일 때만 그대로 저장한다.
function normalizeObjectOrNull(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function mapPortfolio(row) {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose || '',
    summary: row.summary || '',
    content: row.content || '',
    format: row.format || '',
    status: row.status || 'done',
    liked: Boolean(row.liked),
    experiences: normalizeArray(row.experiences),
    experienceProjects: normalizeArray(row.experience_projects),
    keywords: normalizeArray(row.keywords),
    blocks: normalizeArray(row.blocks),
    slides: normalizeArray(row.slides),
    coverLines: normalizeArray(row.cover_lines),
    raw: row.raw || null,
    templateValues: row.template_values || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPortfolioRow(payload, userId) {
  const now = new Date().toISOString();
  const id = normalizeString(payload.id) || `portfolio-${crypto.randomUUID()}`;

  return {
    id,
    user_id: userId,
    title: normalizeString(payload.title) || 'Untitled Portfolio',
    purpose: normalizeString(payload.purpose),
    summary: normalizeString(payload.summary),
    content: normalizeString(payload.content),
    format: normalizeString(payload.format),
    status: normalizeString(payload.status) || 'done',
    liked: Boolean(payload.liked),
    experiences: normalizeArray(payload.experiences),
    experience_projects: normalizeArray(payload.experienceProjects),
    keywords: normalizeArray(payload.keywords),
    blocks: normalizeArray(payload.blocks),
    slides: normalizeArray(payload.slides),
    cover_lines: normalizeArray(payload.coverLines),
    raw: normalizeObjectOrNull(payload.raw),
    template_values: normalizeObjectOrNull(payload.templateValues),
    updated_at: now,
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

    const requestUrl = new URL(request.url);
    const id = requestUrl.searchParams.get('id');

    let query = supabase
      .from('portfolios')
      .select(PORTFOLIO_COLUMNS)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (id) query = query.eq('id', id).maybeSingle();
    else query = query.order('liked', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return Response.json({ message: error.message }, { status: 500 });

    if (id) return Response.json({ portfolio: data ? mapPortfolio(data) : null });
    return Response.json({ portfolios: (data || []).map(mapPortfolio) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to load portfolios' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const payload = await request.json();
    const row = toPortfolioRow(payload, user.id);
    const { data, error } = await supabase
      .from('portfolios')
      .upsert(row, { onConflict: 'id' })
      .select(PORTFOLIO_COLUMNS)
      .single();

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ portfolio: mapPortfolio(data) }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to save portfolio' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const payload = await request.json();
    if (!payload.id) return Response.json({ message: 'id is required' }, { status: 400 });

    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (typeof payload.liked === 'boolean') updates.liked = payload.liked;
    if (payload.title !== undefined) updates.title = normalizeString(payload.title);
    if (payload.summary !== undefined) updates.summary = normalizeString(payload.summary);
    if (payload.content !== undefined) updates.content = normalizeString(payload.content);

    const { data, error } = await supabase
      .from('portfolios')
      .update(updates)
      .eq('id', payload.id)
      .eq('user_id', user.id)
      .select(PORTFOLIO_COLUMNS)
      .single();

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ portfolio: mapPortfolio(data) });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to update portfolio' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return Response.json({ message: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('portfolios')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return Response.json({ message: error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error.message || 'Unable to delete portfolio' }, { status: 500 });
  }
}
