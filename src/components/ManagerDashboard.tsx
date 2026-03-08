'use client';

import { useState, useEffect } from 'react';

interface SubordinateStatus {
  id: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  todayMood: number | null;
  pendingEvals: number;
  okrCount: number;
  recentFeedbackCount: number;
}

interface ManagerData {
  teamSize: number;
  teamMoodAvg: number | null;
  evalTotal: number;
  evalDone: number;
  evalRate: number;
  atRiskOkrs: number;
  subordinateStatus: SubordinateStatus[];
}

const moodEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export default function ManagerDashboard() {
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      const res = await fetch('/api/dashboard?view=manager');
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    fetch_data();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 mt-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Visão da Equipa</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Equipa</h3>
          <p className="text-2xl font-bold text-gray-900">{data.teamSize}</p>
          <p className="text-xs text-gray-400">colaboradores</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Humor Médio Hoje</h3>
          <p className="text-2xl font-bold text-gray-900">
            {data.teamMoodAvg !== null ? (
              <>
                {moodEmojis[Math.round(data.teamMoodAvg)] || '😐'}{' '}
                {data.teamMoodAvg.toFixed(1)}
              </>
            ) : (
              <span className="text-gray-400 text-base">Sem dados</span>
            )}
          </p>
          <p className="text-xs text-gray-400">de 5.0</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Avaliações</h3>
          <p className="text-2xl font-bold text-gray-900">
            {data.evalRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400">
            {data.evalDone}/{data.evalTotal} respondidas
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">OKRs em Risco</h3>
          <p className={`text-2xl font-bold ${data.atRiskOkrs > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {data.atRiskOkrs}
          </p>
          <p className="text-xs text-gray-400">este trimestre</p>
        </div>
      </div>

      {/* Subordinate Status Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Status dos Liderados</h3>
        </div>
        {data.subordinateStatus.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Nenhum liderado encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Humor</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Aval. Pend.</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">OKRs</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Feedbacks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.subordinateStatus.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {sub.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sub.name}</p>
                          <p className="text-xs text-gray-400">{sub.jobTitle || sub.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {sub.todayMood !== null ? (
                        <span className="text-lg">{moodEmojis[sub.todayMood]}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {sub.pendingEvals > 0 ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                          {sub.pendingEvals}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{sub.okrCount}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {sub.recentFeedbackCount === 0 ? (
                        <span className="text-xs text-orange-500">0</span>
                      ) : (
                        sub.recentFeedbackCount
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
