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

  // Pre-create the response so we can attach cookies to it.
  // Use an HTML response with meta-refresh instead of a 302 redirect because
  // some mobile in-app browsers (Instagram, Facebook, LinkedIn) don't reliably
  // persist Set-Cookie headers across 302 redirects.
  const dashboardUrl = new URL('/dashboard', request.url).toString();
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${dashboardUrl}">
<title>Entrando na demo FeedFlow...</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.box{padding:24px}
.spinner{width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#34d399;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:18px;margin:0 0 8px;color:#34d399}
p{font-size:14px;margin:0;color:#94a3b8}
</style>
</head>
<body>
<div class="box">
<div class="spinner"></div>
<h1>Carregando demo FeedFlow</h1>
<p>Preparando acesso, aguarde...</p>
<script>setTimeout(function(){location.replace(${JSON.stringify(dashboardUrl)});},100);</script>
</div>
</body>
</html>`;
  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

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

  // Sign in with the demo credentials — this sets new session cookies on `response`
  // NOTE: We deliberately do NOT call signOut() first because that writes
  // delete-cookies to the same response, which conflicts with the new cookies
  // from signInWithPassword in some mobile in-app browsers (Instagram, Facebook, etc.)
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
