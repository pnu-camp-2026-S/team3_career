import { createSupabaseServerClient } from '../../../../lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error.message || 'Unable to sign out',
      },
      { status: 500 }
    );
  }
}
