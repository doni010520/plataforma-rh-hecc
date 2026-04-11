import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { DEMO_ADMIN_EMAIL, DEMO_MANAGER_EMAIL, DEMO_USER_EMAIL, DEMO_PASSWORD } from '@/lib/demo-seed';

// GET /demo/admin    → auto-login como Patrícia Moraes (Gerente Geral)
// GET /demo/manager  → auto-login como Chef Rodrigo Bianchi (Chef Executivo)
// GET /demo/user     → auto-login como Larissa Mendes (Garçonete)
//
// IMPORTANT: This route creates its own Supabase client that writes cookies
// directly to the outgoing response, because the standard createClient()
// from @/lib/supabase/server writes to cookieStore which doesn't propagate
// to NextResponse.redirect() properly.
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } },
) {
  const role = params.role;

  let email: string;
  switch (role) {
    case 'admin':
      email = DEMO_ADMIN_EMAIL;
      break;
    case 'manager':
    case 'chef':
      email = DEMO_MANAGER_EMAIL;
      break;
    case 'user':
    case 'employee':
    case 'garcom':
      email = DEMO_USER_EMAIL;
      break;
    default:
      return NextResponse.redirect(new URL('/login', request.url));
  }

  // Pre-create the response so we can attach cookies to it
  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Clear any previous session cookies
  await supabase.auth.signOut().catch(() => {});

  // Sign in with the demo credentials — this sets new session cookies on `response`
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });

  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'demo_not_ready');
    loginUrl.searchParams.set('detail', error.message);
    return NextResponse.redirect(loginUrl);
  }

  // `response` now carries the session cookies from signInWithPassword
  return response;
}
