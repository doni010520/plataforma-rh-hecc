import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Server-side auth callback. Handles:
 * 1. PKCE code exchange (?code=xxx) — standard OAuth/magic link flow
 * 2. Token verification (?token=xxx&type=invite) — from Supabase invite links
 *
 * Both paths end with a valid session and redirect to /aceitar-convite.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/aceitar-convite';

  const supabase = createClient();

  // Path 1: PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[Auth Callback] Code exchange failed:', error.message);
  }

  // Path 2: Token verification (invite/recovery/magiclink)
  if (token && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'invite' | 'recovery' | 'magiclink' | 'email',
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[Auth Callback] Token verification failed:', error.message);
  }

  // Fallback: redirect to client-side handler for hash fragment processing
  return NextResponse.redirect(`${origin}/auth/confirmar`);
}
