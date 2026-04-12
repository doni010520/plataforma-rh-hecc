'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Mirror these from lib/demo-seed.ts (avoid importing server code into a client component)
const DEMO_PASSWORD = 'FeedflowDemo2026!';
const DEMO_ADMIN_EMAIL = 'demo.admin@saborarte-demo.com';
const DEMO_MANAGER_EMAIL = 'chef.rodrigo@saborarte-demo.com';
const DEMO_USER_EMAIL = 'larissa.garcom@saborarte-demo.com';

export default function DemoAutoLoginPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function doLogin() {
      const role = typeof params.role === 'string' ? params.role : '';

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
          router.replace('/login');
          return;
      }

      const supabase = createClient();

      // Sign out any existing session first to avoid conflicts
      try { await supabase.auth.signOut(); } catch { /* ignore */ }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });

      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }

      // Hard navigation so the middleware picks up the new session cookies
      window.location.href = '/dashboard';
    }

    doLogin();
  }, [params.role, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 mx-auto mb-4 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
            <h1 className="text-lg font-semibold text-emerald-400 mb-1">Carregando demo FeedFlow</h1>
            <p className="text-sm text-gray-400">Preparando acesso ao Sabor &amp; Arte...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-red-400 mb-1">Demo não disponível</h1>
            <p className="text-sm text-gray-400 mb-4">
              Os dados de demonstração ainda não foram gerados.<br />
              Entre em contato com o administrador.
            </p>
            {errorMsg && (
              <p className="text-xs text-gray-600 font-mono break-all">{errorMsg}</p>
            )}
            <button
              onClick={() => router.replace('/login')}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-medium transition-colors"
            >
              Ir para login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
