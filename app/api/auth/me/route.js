import { createSupabaseServerClient } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url, provider, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    const { data: mypageProfile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const uploadedPhoto = mypageProfile?.preferences?.profilePhoto || null;

    return Response.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        avatarUrl: uploadedPhoto || profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        provider: profile?.provider || user.app_metadata?.provider || null,
      },
      profile,
    });
  } catch (error) {
    return Response.json(
      {
        authenticated: false,
        message: error.message || 'Unable to read Supabase session',
      },
      { status: 500 }
    );
  }
}
