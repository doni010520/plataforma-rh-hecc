'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  totalAnalyses: number;
  totalAlerts: number;
  unreadAlerts: number;
  recentAlerts: Array<{
    id: string;
    title: string;
    priority: string;
  }>;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-800/40 text-gray-300',
  MEDIUM: 'bg-yellow-100 text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-900/30 text-red-700',
};

export function AiDashboardCard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/ai/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;
  if ((data.totalAnalyses ?? 0) === 0 && (data.totalAlerts ?? 0) === 0) return null;

  return (
    <div className="mt-6 bg-gradient-to-br from-green-50/70 to-purple-50/70 backdrop-blur-lg border border-emerald-500/20/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-lg font-semibold text-green-900">Insights IA</h2>
        </div>
        <Link href="/inteligencia-artificial" className="text-sm text-emerald-400 hover:text-emerald-200 font-medium">
          Ver mais
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-900/50 backdrop-blur-lg/70 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{data.totalAnalyses ?? 0}</p>
          <p className="text-xs text-gray-400">Análises</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-lg/70 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{data.totalAlerts ?? 0}</p>
          <p className="text-xs text-gray-400">Alertas</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-lg/70 rounded-lg p-3 text-center">
          <p className={`text-xl font-bold ${(data.unreadAlerts ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {data.unreadAlerts ?? 0}
          </p>
          <p className="text-xs text-gray-400">Não lidos</p>
        </div>
      </div>

      {(data.recentAlerts?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {(data.recentAlerts || []).slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-center gap-2 text-sm">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[alert.priority] || 'bg-gray-800/40'}`}>
                {alert.priority === 'URGENT' ? '!' : alert.priority === 'HIGH' ? '!!' : ''}
              </span>
              <span className="text-gray-300 line-clamp-1">{alert.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
