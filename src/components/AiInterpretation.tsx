'use client';

import { useState, useEffect } from 'react';

interface AiInterpretationProps {
  type: 'survey' | 'avaliacao' | 'nr01';
  targetId: string;
}

interface InterpretationResult {
  interpretation: string;
  highlights: string[];
  recommendations: string[];
}

export function AiInterpretation({ type, targetId }: AiInterpretationProps) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.role) setRole(data.role); })
      .catch(() => {});
  }, []);

  async function interpret() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/interpretar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(err.error || 'Erro ao interpretar dados.');
      }
    } catch {
      setError('Erro de conexão.');
    }
    setLoading(false);
  }

  // Hide for EMPLOYEE or before role loads
  if (!role || role === 'EMPLOYEE') return null;

  return (
    <div>
      {!result && (
        <button
          onClick={interpret}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Interpretando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Interpretar com IA
            </>
          )}
        </button>
      )}

      {error && (
        <div className="mt-3 text-sm px-3 py-2 rounded bg-red-50 text-red-700">
          {error}
          <button onClick={interpret} className="ml-2 underline hover:no-underline">Tentar novamente</button>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-gradient-to-br from-green-50/70 to-purple-50/70 backdrop-blur-lg border border-green-200/50 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium text-green-900 text-sm">Interpretação IA</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setResult(null); }}
                className="text-xs text-green-600 hover:text-green-800"
              >
                Refazer
              </button>
              <svg className={`w-4 h-4 text-green-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.interpretation}</p>
              </div>

              {result.highlights.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">Destaques</h4>
                  <ul className="space-y-1">
                    {result.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-600 mt-0.5">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">Recomendações</h4>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 mt-0.5">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
