'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface EmployeeData {
  id: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  avgMood: number | null;
  avgPerformance: number | null;
  feedbackCount: number;
}

interface AtRiskEmployee extends EmployeeData {
  reasons: string[];
}

interface DepartmentAvg {
  name: string;
  count: number;
  avgMood: number | null;
  avgPerformance: number | null;
}

interface AnalyticsData {
  correlationData: EmployeeData[];
  atRiskEmployees: AtRiskEmployee[];
  departmentAverages: DepartmentAvg[];
}

const moodEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'risk' | 'scatter'>('overview');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/analytics');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500">Sem permissão para acessar analytics.</p>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: 'Visão Geral' },
    { key: 'risk' as const, label: `Em Risco (${data.atRiskEmployees.length})` },
    { key: 'scatter' as const, label: 'Humor × Performance' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 mb-1 inline-block">
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">People Analytics</h1>
          <p className="text-sm text-gray-500">Análise de correlação entre humor, performance e engajamento</p>
        </div>
        <a
          href="/api/export?module=analytics"
          className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          {/* Department Averages */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Médias por Departamento</h2>
            {data.departmentAverages.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Departamento</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Colaboradores</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Humor Médio</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Avaliação Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.departmentAverages.map((dept) => (
                      <tr key={dept.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                        <td className="px-4 py-3 text-gray-700">{dept.count}</td>
                        <td className="px-4 py-3">
                          {dept.avgMood !== null ? (
                            <div className="flex items-center gap-1">
                              <span>{moodEmojis[Math.round(dept.avgMood)]}</span>
                              <span className={`font-medium ${dept.avgMood < 3 ? 'text-red-600' : dept.avgMood >= 4 ? 'text-green-600' : 'text-gray-700'}`}>
                                {dept.avgMood.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {dept.avgPerformance !== null ? (
                            <span className={`font-medium ${dept.avgPerformance < 2.5 ? 'text-red-600' : dept.avgPerformance >= 4 ? 'text-green-600' : 'text-gray-700'}`}>
                              {dept.avgPerformance.toFixed(1)} / 5.0
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Department Visual Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Humor por Departamento</h3>
              <div className="space-y-3">
                {data.departmentAverages
                  .filter((d) => d.avgMood !== null)
                  .sort((a, b) => (b.avgMood ?? 0) - (a.avgMood ?? 0))
                  .map((dept) => (
                    <div key={dept.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{dept.name}</span>
                        <span className="text-sm font-medium text-gray-900">{dept.avgMood!.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            dept.avgMood! < 3 ? 'bg-red-500' : dept.avgMood! >= 4 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${(dept.avgMood! / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance por Departamento</h3>
              <div className="space-y-3">
                {data.departmentAverages
                  .filter((d) => d.avgPerformance !== null)
                  .sort((a, b) => (b.avgPerformance ?? 0) - (a.avgPerformance ?? 0))
                  .map((dept) => (
                    <div key={dept.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{dept.name}</span>
                        <span className="text-sm font-medium text-gray-900">{dept.avgPerformance!.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${(dept.avgPerformance! / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* At-Risk Tab */}
      {tab === 'risk' && (
        <div>
          {data.atRiskEmployees.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-700 font-medium">Nenhum colaborador em risco identificado!</p>
              <p className="text-sm text-gray-500 mt-1">
                Todos os colaboradores estão com indicadores saudáveis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
                <p className="text-sm text-red-800">
                  <strong>{data.atRiskEmployees.length}</strong> colaborador(es) identificado(s) com indicadores que requerem atenção.
                  Critérios: humor médio &lt; 3, avaliação média &lt; 2.5, ou sem feedback nos últimos 3 meses.
                </p>
              </div>

              {data.atRiskEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {emp.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">
                          {emp.jobTitle} {emp.department ? `· ${emp.department}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {emp.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Humor Médio</p>
                      <p className={`text-lg font-bold ${emp.avgMood !== null && emp.avgMood < 3 ? 'text-red-600' : 'text-gray-700'}`}>
                        {emp.avgMood !== null ? (
                          <>
                            {moodEmojis[Math.round(emp.avgMood)]} {emp.avgMood.toFixed(1)}
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Avaliação</p>
                      <p className={`text-lg font-bold ${emp.avgPerformance !== null && emp.avgPerformance < 2.5 ? 'text-red-600' : 'text-gray-700'}`}>
                        {emp.avgPerformance !== null ? `${emp.avgPerformance.toFixed(1)} / 5` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Feedbacks (3m)</p>
                      <p className={`text-lg font-bold ${emp.feedbackCount === 0 ? 'text-orange-600' : 'text-gray-700'}`}>
                        {emp.feedbackCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scatter Plot Tab (Mood x Performance) */}
      {tab === 'scatter' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Correlação Humor × Performance
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Cada ponto representa um colaborador. Eixo X = humor médio (últimos 3 meses), Eixo Y = avaliação média.
          </p>

          {/* CSS-only scatter plot */}
          <div className="relative w-full h-80 border-l-2 border-b-2 border-gray-300">
            {/* Y-axis labels */}
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={v}
                className="absolute left-0 text-xs text-gray-400"
                style={{ bottom: `${(v / 5) * 100}%`, transform: 'translate(-24px, 50%)' }}
              >
                {v}
              </div>
            ))}
            {/* X-axis labels */}
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={v}
                className="absolute bottom-0 text-xs text-gray-400"
                style={{ left: `${(v / 5) * 100}%`, transform: 'translate(-50%, 20px)' }}
              >
                {v}
              </div>
            ))}
            {/* Grid lines */}
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={`h-${v}`}
                className="absolute w-full border-t border-gray-100"
                style={{ bottom: `${(v / 5) * 100}%` }}
              />
            ))}
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={`v-${v}`}
                className="absolute h-full border-l border-gray-100"
                style={{ left: `${(v / 5) * 100}%` }}
              />
            ))}
            {/* Danger zone overlay */}
            <div
              className="absolute bg-red-50 opacity-30"
              style={{ left: 0, bottom: 0, width: '60%', height: '50%' }}
            />
            {/* Data points */}
            {data.correlationData
              .filter((emp) => emp.avgMood !== null && emp.avgPerformance !== null)
              .map((emp) => {
                const x = (emp.avgMood! / 5) * 100;
                const y = (emp.avgPerformance! / 5) * 100;
                const isRisk = emp.avgMood! < 3 || emp.avgPerformance! < 2.5;
                return (
                  <div
                    key={emp.id}
                    className={`absolute w-3 h-3 rounded-full border-2 ${
                      isRisk
                        ? 'bg-red-500 border-red-600'
                        : 'bg-indigo-500 border-indigo-600'
                    } cursor-pointer hover:scale-150 transition-transform`}
                    style={{
                      left: `${x}%`,
                      bottom: `${y}%`,
                      transform: 'translate(-50%, 50%)',
                    }}
                    title={`${emp.name}: Humor ${emp.avgMood!.toFixed(1)}, Avaliação ${emp.avgPerformance!.toFixed(1)}`}
                  />
                );
              })}
            {/* Axis labels */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
              Humor Médio →
            </div>
            <div className="absolute -left-10 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-500 font-medium">
              Avaliação →
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-12 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-xs text-gray-600">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">Em Risco</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-50 border border-red-200" />
              <span className="text-xs text-gray-600">Zona de atenção</span>
            </div>
          </div>

          {/* No-data message */}
          {data.correlationData.filter((e) => e.avgMood !== null && e.avgPerformance !== null).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow">
                Nenhum colaborador com dados de humor e avaliação simultâneos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
