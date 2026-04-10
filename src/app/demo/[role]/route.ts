import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_ADMIN_EMAIL, DEMO_MANAGER_EMAIL, DEMO_USER_EMAIL, DEMO_PASSWORD } from '@/lib/demo-seed';

// GET /demo/admin    → auto-login como Patrícia Moraes (Gerente Geral)
// GET /demo/manager  → auto-login como Chef Rodrigo Bianchi (Chef Executivo)
// GET /demo/user     → auto-login como Larissa Mendes (Garçonete)
export async function GET(
  request: Request,
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

  const supabase = createClient();

  // Sign out any existing session to ensure clean login
  await supabase.auth.signOut().catch(() => {});

  // Sign in with demo credentials
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });

  if (error) {
    // Demo company may not be seeded yet — return friendly error page
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'demo_not_ready');
    return NextResponse.redirect(url);
  }

  // Success — redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
