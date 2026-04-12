import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo FeedFlow — Sabor & Arte',
  description: 'Acesse a demonstração do FeedFlow',
};

const DEMO_PASSWORD = 'FeedflowDemo2026!';

const PROFILES = [
  {
    emoji: '👩‍💼',
    name: 'Patrícia Moraes',
    role: 'Gerente Geral',
    badge: 'Administrador',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Visão completa: colaboradores, permissões, analytics, IA, relatórios',
    email: 'demo.admin@saborarte-demo.com',
  },
  {
    emoji: '👨‍🍳',
    name: 'Rodrigo Bianchi',
    role: 'Chef Executivo',
    badge: 'Gestor',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Visão de líder: equipe da cozinha, avaliações, OKRs, 1:1, PDI',
    email: 'chef.rodrigo@saborarte-demo.com',
  },
  {
    emoji: '💁‍♀️',
    name: 'Larissa Mendes',
    role: 'Garçonete',
    badge: 'Colaborador',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Visão do dia a dia: feedbacks, mural, humor, pesquisas, meus OKRs',
    email: 'larissa.garcom@saborarte-demo.com',
  },
];

export default function DemoLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Demo FeedFlow</h1>
          <p className="text-sm text-gray-400 mt-1">Sabor &amp; Arte Restaurante · 26 colaboradores</p>
          <p className="text-xs text-gray-500 mt-2">Escolha um perfil para explorar a plataforma</p>
        </div>

        {/* Profile cards */}
        <div className="space-y-3 mb-6">
          {PROFILES.map((p) => {
            const loginUrl = `/login?email=${encodeURIComponent(p.email)}&password=${encodeURIComponent(DEMO_PASSWORD)}&demo=1`;
            return (
              <a
                key={p.email}
                href={loginUrl}
                className="block bg-gray-800/60 border border-gray-700/50 hover:border-emerald-500/40 rounded-xl p-4 transition-all hover:bg-gray-800/80 group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl mt-0.5">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{p.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${p.badgeColor}`}>{p.badge}</span>
                    </div>
                    <p className="text-sm text-gray-400">{p.role}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors mt-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>

        {/* Credentials info */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 text-center">Senha (igual para todos)</p>
          <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono text-center select-all cursor-text">
            {DEMO_PASSWORD}
          </div>
          <p className="text-[11px] text-gray-600 text-center mt-2">
            Toque para selecionar · Cole no campo de senha se necessário
          </p>
        </div>

        <p className="text-[11px] text-gray-600 text-center">
          Ambiente de demonstração · Dados fictícios · Reset diário às 3h
        </p>
      </div>
    </div>
  );
}
