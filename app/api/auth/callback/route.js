import {
  createSupabaseServerClient,
  getRequestOrigin,
  upsertUserProfile,
} from '../../../../lib/supabase-server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/main.html';
  const origin = getRequestOrigin(request);

  if (!code) {
    const loginUrl = new URL('/login.html', origin);
    loginUrl.searchParams.set('error', 'missing_oauth_code');
    return Response.redirect(loginUrl, 302);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL('/login.html', origin);
      loginUrl.searchParams.set('error', error.message);
      return Response.redirect(loginUrl, 302);
    }

    await upsertUserProfile(data?.user);
    return Response.redirect(new URL(next, origin), 302);
  } catch (error) {
    const loginUrl = new URL('/login.html', origin);
    loginUrl.searchParams.set('error', error.message || 'oauth_callback_failed');
    return Response.redirect(loginUrl, 302);
  }
}
