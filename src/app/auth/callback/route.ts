import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Server-side callback for PKCE flow (code exchange).
 * Supabase may redirect here with ?code= for certain auth flows.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/aceitar-convite';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange fails, redirect to the client-side handler
  // which can process hash fragments (#access_token=...)
  return NextResponse.redirect(`${origin}/auth/confirmar`);
}
