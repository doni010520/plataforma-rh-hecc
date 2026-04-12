'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Demo credentials (mirror from lib/demo-seed.ts — avoid importing server code)
const DEMO_PASSWORD = 'FeedflowDemo2026!';
const DEMO_PROFILES: Record<string, { email: string; name: string; role: string }> = {
  admin: { email: 'demo.admin@saborarte-demo.com', name: 'Patrícia Moraes', role: 'Gerente Geral' },
  manager: { email: 'chef.rodrigo@saborarte-demo.com', name: 'Rodrigo Bianchi', role: 'Chef Executivo' },
  chef: { email: 'chef.rodrigo@saborarte-demo.com', name: 'Rodrigo Bianchi', role: 'Chef Executivo' },
  user: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
  employee: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
  garcom: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
};

export default function DemoAutoLoginPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const roleKey = typeof params.role === 'string' ? params.role : '';
  const profile = DEMO_PROFILES[roleKey];

  useEffect(() => {
    if (!profile) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    async function tryAutoLogin() {
      const supabase = createClient();

      try { await supabase.auth.signOut(); } catch { /* ignore */ }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: DEMO_PASSWORD,
      });

      if (cancelled) return;

      if (error) {
        setStatus('ready');
        return;
      }

      // IMPORTANT: Verify the session is actually accessible from the server.
      // On iOS Instagram/WebView, signInWithPassword can "succeed" but the
      // cookies don't persist across navigation, so the middleware won't see
      // the session and will redirect to /login. We test with /api/me first.
      try {
        const testRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        if (!testRes.ok) {
          // Cookies aren't being persisted — show manual fallback
          setStatus('ready');
          return;
        }
      } catch {
        setStatus('ready');
        return;
      }

      // Session verified — safe to navigate
      window.location.href = '/dashboard';
    }

    // If auto-login doesn't finish in 3.5s (iOS WebView blocking, etc.),
    // show the manual credentials card so the user isn't stuck.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setStatus('ready');
    }, 3500);

    tryAutoLogin();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [profile, router]);

  async function copy(value: string, field: 'email' | 'password') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Fallback: use document.execCommand
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  }

  function goToLoginWithPrefill() {
    if (!profile) return;
    const url = `/login?email=${encodeURIComponent(profile.email)}&password=${encodeURIComponent(DEMO_PASSWORD)}&demo=1`;
    router.push(url);
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4 py-8">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
            <h1 className="text-lg font-semibold text-emerald-400 mb-1">Carregando demo FeedFlow</h1>
            <p className="text-sm text-gray-400">Preparando acesso ao Sabor &amp; Arte...</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Demo FeedFlow</h1>
              <p className="text-sm text-gray-400">Você entrará como:</p>
              <p className="text-base font-semibold text-emerald-400 mt-2">{profile.name}</p>
              <p className="text-xs text-gray-500">{profile.role} · Sabor &amp; Arte Restaurante</p>
            </div>

            <button
              onClick={goToLoginWithPrefill}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors mb-5"
            >
              Entrar na demo
            </button>

            <div className="border-t border-gray-700/50 pt-5">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-3 text-center">
                Credenciais (use se preferir)
              </p>

              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <div className="flex gap-2 mb-3">
                <input
                  readOnly
                  value={profile.email}
                  className="flex-1 bg-gray-900/70 border border-gray-700/60 rounded-md px-3 py-2 text-sm text-white"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => copy(profile.email, 'email')}
                  className="px-3 py-2 bg-gray-700/60 hover:bg-gray-700 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                >
                  {copiedField === 'email' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              <label className="block text-xs text-gray-400 mb-1">Senha</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={DEMO_PASSWORD}
                  className="flex-1 bg-gray-900/70 border border-gray-700/60 rounded-md px-3 py-2 text-sm text-white font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => copy(DEMO_PASSWORD, 'password')}
                  className="px-3 py-2 bg-gray-700/60 hover:bg-gray-700 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                >
                  {copiedField === 'password' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 text-center mt-5">
              Ambiente de demonstração · Dados fictícios · Reset diário
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
