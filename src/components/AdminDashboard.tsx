'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MoodWeek {
  week: string;
  avg: number;
  count: number;
}

interface CycleProgress {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  totalAssignments: number;
  completedAssignments: number;
  progress: number;
}

interface OkrItem {
  id: string;
  title: string;
  level: string;
  status: string;
  owner: string;
  progress: number;
  keyResultsCount: number;
}

interface AdminData {
  totalEmployees: number;
  engagementRate: number;
  nps: number | null;
  moodEvolution: MoodWeek[];
  activeCycles: CycleProgress[];
  okrMap: OkrItem[];
}

const levelLabels: Record<string, string> = {
  COMPANY: 'Empresa',
  TEAM: 'Equipa',
  INDIVIDUAL: 'Individual',
};

const statusLabels: Record<string, string> = {
  ON_TRACK: 'No Caminho',
  AT_RISK: 'Em Risco',
  ACHIEVED: 'Alcançado',
  CANCELLED: 'Cancelado',
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/dashboard?view=admin');
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 mt-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Painel Administrativo</h2>
        <Link
          href="/analytics"
          className="text-sm text-green-700 hover:text-green-900 font-medium"
        >
          People Analytics →
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Colaboradores</h3>
          <p className="text-3xl font-bold text-gray-900">{data.totalEmployees}</p>
          <p className="text-xs text-gray-400">activos na plataforma</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Taxa de Engajamento</h3>
          <p className="text-3xl font-bold text-gray-900">{data.engagementRate}%</p>
          <p className="text-xs text-gray-400">últimos 30 dias</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-1">eNPS Interno</h3>
          <p className={`text-3xl font-bold ${data.nps !== null ? (data.nps >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
            {data.nps !== null ? `${data.nps > 0 ? '+' : ''}${data.nps}` : '—'}
          </p>
          <p className="text-xs text-gray-400">
            {data.nps !== null ? 'última pesquisa de clima' : 'nenhuma pesquisa fechada'}
          </p>
        </div>
      </div>

      {/* Mood Evolution Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Evolução do Humor da Empresa (últimas 8 semanas)
        </h3>
        {data.moodEvolution.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum dado de humor disponível.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.moodEvolution.map((week) => {
              const height = (week.avg / 5) * 100;
              const barColor =
                week.avg >= 4
                  ? 'bg-green-500'
                  : week.avg >= 3
                    ? 'bg-yellow-500'
                    : 'bg-red-500';
              return (
                <div
                  key={week.week}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs font-bold text-gray-700">
                    {week.avg.toFixed(1)}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${barColor} transition-all`}
                    style={{ height: `${height}%` }}
                    title={`${week.count} registos`}
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(week.week).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-gray-300">{week.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Review Cycles */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Ciclos de Avaliação Activos
        </h3>
        {data.activeCycles.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum ciclo activo.</p>
        ) : (
          <div className="space-y-4">
            {data.activeCycles.map((cycle) => (
              <div key={cycle.id}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <Link
                      href={`/avaliacoes/${cycle.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-700"
                    >
                      {cycle.name}
                    </Link>
                    <span className="ml-2 text-xs text-gray-400">{cycle.type}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {cycle.completedAssignments}/{cycle.totalAssignments} ({cycle.progress.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-700 transition-all"
                    style={{ width: `${cycle.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Prazo: {new Date(cycle.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OKR Map */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Mapa de OKRs da Empresa
          </h3>
          <Link href="/okrs" className="text-sm text-green-700 hover:text-green-900 font-medium">
            Ver todos
          </Link>
        </div>
        {data.okrMap.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum OKR definido este trimestre.</p>
        ) : (
          <div className="space-y-3">
            {data.okrMap.map((okr) => (
              <div key={okr.id} className="flex items-center gap-3">
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    okr.level === 'COMPANY'
                      ? 'bg-purple-100 text-purple-700'
                      : okr.level === 'TEAM'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {levelLabels[okr.level] || okr.level}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/okrs/${okr.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-green-700 truncate block"
                  >
                    {okr.title}
                  </Link>
                  <p className="text-xs text-gray-400">{okr.owner}</p>
                </div>
                <span
                  className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                    okr.status === 'AT_RISK'
                      ? 'bg-red-100 text-red-700'
                      : okr.status === 'ACHIEVED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusLabels[okr.status] || okr.status}
                </span>
                <div className="w-24 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        okr.status === 'AT_RISK' ? 'bg-red-500' : 'bg-green-700'
                      }`}
                      style={{ width: `${okr.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right">
                    {okr.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="mt-6 flex gap-3 flex-wrap">
        {[
          { module: 'employees', label: 'Colaboradores' },
          { module: 'feedback', label: 'Feedbacks' },
          { module: 'okrs', label: 'OKRs' },
          { module: 'mood', label: 'Humor' },
          { module: 'analytics', label: 'Analytics' },
        ].map((item) => (
          <a
            key={item.module}
            href={`/api/export?module=${item.module}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {item.label} CSV
          </a>
        ))}
      </div>
    </div>
  );
}
