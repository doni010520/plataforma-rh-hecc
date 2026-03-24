import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth callback handler.
 * When a user clicks an invite/magic link, Supabase redirects here with
 * a code in the query params. We exchange it for a session, then redirect
 * the user to the appropriate page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user needs to set password (invited users)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Invited users have no identities with a password provider,
      // or they were created via invite and haven't set a password yet.
      const hasPassword = user?.app_metadata?.providers?.includes('email') &&
        user?.user_metadata?.has_set_password;

      if (!hasPassword && user) {
        // Redirect to set-password page
        return NextResponse.redirect(`${origin}/aceitar-convite`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
