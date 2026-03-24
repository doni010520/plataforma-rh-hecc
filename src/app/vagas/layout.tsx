import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vagas Abertas — FeedFlow',
  description: 'Confira nossas vagas abertas e candidate-se.',
};

export default function VagasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/20 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/70 backdrop-blur-md border-b border-gray-700/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/feedflow-dark.svg" alt="FeedFlow" className="h-8" />
            <div>
              <h1 className="text-lg font-bold text-gray-100">Trabalhe Conosco</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900/50 backdrop-blur-lg border-t border-gray-700/30 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>FeedFlow &mdash; Gestao de Pessoas</span>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
