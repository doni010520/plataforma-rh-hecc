'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const DEMO_PASSWORD = 'FeedflowDemo2026!';
const DEMO_PROFILES: Record<string, { email: string; name: string; role: string }> = {
  admin: { email: 'demo.admin@saborarte-demo.com', name: 'Patrícia Moraes', role: 'Gerente Geral' },
  manager: { email: 'chef.rodrigo@saborarte-demo.com', name: 'Rodrigo Bianchi', role: 'Chef Executivo' },
  chef: { email: 'chef.rodrigo@saborarte-demo.com', name: 'Rodrigo Bianchi', role: 'Chef Executivo' },
  user: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
  employee: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
  garcom: { email: 'larissa.garcom@saborarte-demo.com', name: 'Larissa Mendes', role: 'Garçonete' },
};

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [autoLoginStatus, setAutoLoginStatus] = useState<'trying' | 'failed' | 'idle'>('trying');

  const roleKey = typeof params.role === 'string' ? params.role : '';
  const profile = DEMO_PROFILES[roleKey];

  // Try auto-login in background — if it works, redirect silently
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: DEMO_PASSWORD,
        });
        if (cancelled || error) { setAutoLoginStatus('failed'); return; }

        // Verify server actually sees the session
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          window.location.href = '/dashboard';
        } else {
          setAutoLoginStatus('failed');
        }
      } catch {
        if (!cancelled) setAutoLoginStatus('failed');
      }
    })();

    return () => { cancelled = true; };
  }, [profile]);

  if (!profile) {
    router.replace('/login');
    return null;
  }

  function copy(value: string, field: string) {
    try {
      navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 mb-3">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Demo FeedFlow</h1>
            <p className="text-sm text-gray-400 mt-1">Sabor &amp; Arte Restaurante</p>
          </div>

          {/* Profile info */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-5 text-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Você entrará como</p>
            <p className="text-lg font-bold text-emerald-300">{profile.name}</p>
            <p className="text-sm text-gray-400">{profile.role}</p>
          </div>

          {/* Auto-login status */}
          {autoLoginStatus === 'trying' && (
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              Entrando automaticamente...
            </div>
          )}

          {/* Credentials — always visible */}
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={profile.email}
                  className="flex-1 bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => copy(profile.email, 'email')}
                  className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedField === 'email' ? '✓' : 'Copiar'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Senha</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={DEMO_PASSWORD}
                  className="flex-1 bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => copy(DEMO_PASSWORD, 'password')}
                  className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedField === 'password' ? '✓' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          {/* Manual login button */}
          <a
            href={`/login?email=${encodeURIComponent(profile.email)}&password=${encodeURIComponent(DEMO_PASSWORD)}&demo=1`}
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors text-center"
          >
            Fazer login manualmente
          </a>

          <p className="text-[11px] text-gray-600 text-center mt-4">
            Ambiente de demonstração · Dados fictícios · Reset diário
          </p>
        </div>
      </div>
    </div>
  );
}
