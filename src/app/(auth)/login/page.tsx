'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemoPrefill, setIsDemoPrefill] = useState(false);

  // Pre-fill from query params (used by /demo/[role] fallback)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const passwordParam = searchParams.get('password');
    const isDemo = searchParams.get('demo') === '1';
    if (emailParam) setEmail(emailParam);
    if (passwordParam) setPassword(passwordParam);
    if (isDemo) setIsDemoPrefill(true);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email ou senha inválidos. Tente novamente.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800/30 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/feedflow-dark.svg" alt="FeedFlow" className="h-12 mx-auto logo-dark" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/feedflow-primary.svg" alt="FeedFlow" className="h-12 mx-auto logo-light" />
            <p className="text-gray-400 mt-2">
              {isDemoPrefill ? 'Demo pronta para entrar' : 'Faça login para continuar'}
            </p>
          </div>

          {isDemoPrefill && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-md mb-4 text-center">
              ✨ Credenciais já preenchidas — basta clicar em &ldquo;Entrar&rdquo;
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Ainda não tem conta?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Cadastre sua empresa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
