import { createSupabaseServerClient, getRequestOrigin } from '../../../../lib/supabase-server';

const DEFAULT_PROVIDER = 'google';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const provider = requestUrl.searchParams.get('provider') || DEFAULT_PROVIDER;
  const next = requestUrl.searchParams.get('next') || '/main.html';
  const origin = getRequestOrigin(request);
  const callbackUrl = new URL('/api/auth/callback', origin);
  callbackUrl.searchParams.set('next', next);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data?.url) {
      const loginUrl = new URL('/login.html', origin);
      loginUrl.searchParams.set('error', error?.message || 'social_login_failed');
      return Response.redirect(loginUrl, 302);
    }

    return Response.redirect(data.url, 302);
  } catch (error) {
    const loginUrl = new URL('/login.html', origin);
    loginUrl.searchParams.set('error', error.message || 'supabase_not_configured');
    return Response.redirect(loginUrl, 302);
  }
}
