import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo FeedFlow — Sabor & Arte',
  description: 'Acesse a demonstração do FeedFlow',
};

const DEMO_EMAIL = 'demo.admin@saborarte-demo.com';
const DEMO_PASSWORD = 'FeedflowDemo2026!';

export default function DemoLandingPage() {
  const loginUrl = `/login?email=${encodeURIComponent(DEMO_EMAIL)}&password=${encodeURIComponent(DEMO_PASSWORD)}&demo=1`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 mb-3">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Demo FeedFlow</h1>
            <p className="text-sm text-gray-400 mt-1">Sabor &amp; Arte Restaurante</p>
            <p className="text-xs text-gray-500 mt-1">26 colaboradores · Dados realistas</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-5 text-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Visão completa</p>
            <p className="text-lg font-bold text-emerald-300">Patrícia Moraes</p>
            <p className="text-sm text-gray-400">Gerente Geral · Administradora</p>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white select-all cursor-text">
                {DEMO_EMAIL}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Senha</label>
              <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono select-all cursor-text">
                {DEMO_PASSWORD}
              </div>
            </div>
          </div>

          <a
            href={loginUrl}
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-lg transition-colors text-center text-base"
          >
            Entrar na demo
          </a>

          <p className="text-[11px] text-gray-600 text-center mt-4">
            Toque nos campos para selecionar · Cole no login se necessário
          </p>
          <p className="text-[11px] text-gray-600 text-center">
            Ambiente de demonstração · Dados fictícios · Reset diário às 3h
          </p>
        </div>
      </div>
    </div>
  );
}
