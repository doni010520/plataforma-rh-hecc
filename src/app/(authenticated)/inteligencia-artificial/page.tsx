'use client';

import { useState, useEffect, useCallback } from 'react';

interface AiAnalysis {
  id: string;
  type: string;
  title: string;
  summary: string;
  details: string;
  targetId: string | null;
  targetType: string | null;
  confidence: number;
  generatedAt: string;
}

interface AiAlert {
  id: string;
  title: string;
  message: string;
  priority: string;
  category: string;
  actionUrl: string | null;
  read: boolean;
  dismissedAt: string | null;
  createdAt: string;
}

interface DashboardData {
  analysesByType: Record<string, number>;
  recentAlerts: AiAlert[];
  totalAnalyses: number;
  totalAlerts: number;
  unreadAlerts: number;
}

interface Department {
  id: string;
  name: string;
}

type Tab = 'dashboard' | 'analises' | 'alertas';

const typeLabels: Record<string, string> = {
  PERFORMANCE_SUMMARY: 'Resumo de Performance',
  TURNOVER_RISK: 'Risco de Turnover',
  ENGAGEMENT_INSIGHT: 'Insight de Engajamento',
  SKILL_GAP: 'Lacuna de Competências',
  TEAM_HEALTH: 'Saúde do Time',
  CUSTOM: 'Personalizada',
};
const typeColors: Record<string, string> = {
  PERFORMANCE_SUMMARY: 'bg-blue-100 text-blue-800',
  TURNOVER_RISK: 'bg-red-900/30 text-red-800',
  ENGAGEMENT_INSIGHT: 'bg-purple-100 text-purple-800',
  SKILL_GAP: 'bg-orange-100 text-orange-800',
  TEAM_HEALTH: 'bg-emerald-900/40 text-emerald-300',
  CUSTOM: 'bg-green-900/40 text-gray-200',
};
const priorityLabels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };
const priorityColors: Record<string, string> = { LOW: 'bg-green-900/40 text-gray-200', MEDIUM: 'bg-yellow-100 text-yellow-300', HIGH: 'bg-orange-100 text-orange-800', URGENT: 'bg-red-900/30 text-red-800' };

export default function IAPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [alerts, setAlerts] = useState<AiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AiAnalysis | null>(null);
  const [filterType, setFilterType] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [generating, setGenerating] = useState<'insights' | 'turnover' | null>(null);
  const [generateResult, setGenerateResult] = useState<{ type: string; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, anRes, alRes] = await Promise.all([
        fetch('/api/ai/dashboard'),
        fetch(`/api/ai/analises${filterType ? `?type=${filterType}` : ''}`),
        fetch('/api/ai/alertas'),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (anRes.ok) setAnalyses(await anRes.json());
      if (alRes.ok) setAlerts(await alRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.ok ? r.json() : [])
      .then(setDepartments)
      .catch(() => {});
  }, []);

  async function generateInsights() {
    setGenerating('insights');
    setGenerateResult(null);
    try {
      const res = await fetch('/api/ai/gerar-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: selectedDept ? 'department' : 'company',
          departmentId: selectedDept || undefined,
        }),
      });
      if (res.ok) {
        setGenerateResult({ type: 'success', message: 'Insights gerados com sucesso!' });
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setGenerateResult({ type: 'error', message: err.error || 'Erro ao gerar insights.' });
      }
    } catch {
      setGenerateResult({ type: 'error', message: 'Erro de conexão.' });
    }
    setGenerating(null);
  }

  async function generateTurnover() {
    setGenerating('turnover');
    setGenerateResult(null);
    try {
      const res = await fetch('/api/ai/risco-turnover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDept || undefined,
        }),
      });
      if (res.ok) {
        setGenerateResult({ type: 'success', message: 'Análise de turnover concluída!' });
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setGenerateResult({ type: 'error', message: err.error || 'Erro ao analisar turnover.' });
      }
    } catch {
      setGenerateResult({ type: 'error', message: 'Erro de conexão.' });
    }
    setGenerating(null);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/ai/alertas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    fetchData();
  }

  async function dismissAlert(id: string) {
    await fetch(`/api/ai/alertas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismiss: true }),
    });
    fetchData();
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;

  // Analysis detail
  if (selectedAnalysis) {
    const a = selectedAnalysis;
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <button onClick={() => setSelectedAnalysis(null)} className="text-emerald-400 hover:underline text-sm">&larr; Voltar</button>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-100">{a.title}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[a.type] || 'bg-green-900/40'}`}>{typeLabels[a.type] || a.type}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Confiança: {(a.confidence * 100).toFixed(0)}%</span>
          <span>Gerado em: {new Date(a.generatedAt).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6">
          <h2 className="font-semibold text-gray-100 mb-2">Resumo</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{a.summary}</p>
        </div>
        {a.details && (
          <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6">
            <h2 className="font-semibold text-gray-100 mb-2">Detalhes</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{a.details}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100">Inteligência Artificial</h1>

      {/* Tabs */}
      <div className="border-b border-green-800/30">
        <nav className="flex space-x-8">
          {([['dashboard', 'Dashboard'], ['analises', 'Análises'], ['alertas', 'Alertas']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${tab === key ? 'border-green-600 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
              {label}
              {key === 'alertas' && dashboard && dashboard.unreadAlerts > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-900/300 rounded-full">{dashboard.unreadAlerts}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* AI Actions */}
          <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6">
            <h2 className="font-semibold text-gray-100 mb-4">Gerar Análises com IA</h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Departamento (opcional)</label>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                  disabled={!!generating}
                >
                  <option value="">Toda a empresa</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button
                onClick={generateInsights}
                disabled={!!generating}
                className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 disabled:opacity-50 flex items-center gap-2"
              >
                {generating === 'insights' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Gerando...
                  </>
                ) : 'Gerar Insights'}
              </button>
              <button
                onClick={generateTurnover}
                disabled={!!generating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating === 'turnover' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Analisando...
                  </>
                ) : 'Analisar Risco de Turnover'}
              </button>
            </div>
            {generateResult && (
              <div className={`mt-3 text-sm px-3 py-2 rounded ${generateResult.type === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-700'}`}>
                {generateResult.message}
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6 text-center">
              <p className="text-3xl font-bold text-emerald-400">{dashboard.totalAnalyses ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">Análises Geradas</p>
            </div>
            <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6 text-center">
              <p className="text-3xl font-bold text-emerald-400">{dashboard.totalAlerts ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">Alertas Totais</p>
            </div>
            <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6 text-center">
              <p className="text-3xl font-bold text-red-600">{dashboard.unreadAlerts ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">Alertas Não Lidos</p>
            </div>
          </div>

          {/* Analyses by Type */}
          <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6">
            <h2 className="font-semibold text-gray-100 mb-4">Análises por Tipo</h2>
            <div className="space-y-3">
              {Object.entries(dashboard.analysesByType ?? {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[type] || 'bg-green-900/40'}`}>{typeLabels[type] || type}</span>
                  <span className="text-sm font-medium text-gray-100">{count as number}</span>
                </div>
              ))}
              {Object.keys(dashboard.analysesByType ?? {}).length === 0 && <p className="text-sm text-gray-400">Nenhuma análise ainda.</p>}
            </div>
          </div>

          {/* Recent Alerts */}
          {(dashboard.recentAlerts?.length ?? 0) > 0 && (
            <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6">
              <h2 className="font-semibold text-gray-100 mb-4">Alertas Recentes</h2>
              <div className="space-y-3">
                {(dashboard.recentAlerts || []).map(alert => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${alert.read ? 'bg-green-900/30' : 'bg-emerald-900/30'}`}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${priorityColors[alert.priority]}`}>{priorityLabels[alert.priority]}</span>
                    <div className="flex-1">
                      <p className={`text-sm ${alert.read ? 'text-gray-300' : 'font-medium text-gray-100'}`}>{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyses Tab */}
      {tab === 'analises' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="">Todos os tipos</option>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {analyses.map(a => (
              <div key={a.id} onClick={() => setSelectedAnalysis(a)} className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-4 cursor-pointer hover:border-green-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-100">{a.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">{a.summary}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{(a.confidence * 100).toFixed(0)}%</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[a.type] || 'bg-green-900/40'}`}>{typeLabels[a.type] || a.type}</span>
                  </div>
                </div>
              </div>
            ))}
            {analyses.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma análise de IA encontrada.</p>}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alertas' && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`bg-green-950/50 backdrop-blur-lg border rounded-lg p-4 ${!alert.read ? 'border-emerald-500/20' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${priorityColors[alert.priority]}`}>{priorityLabels[alert.priority]}</span>
                  <div>
                    <p className={`text-sm ${alert.read ? 'text-gray-300' : 'font-medium text-gray-100'}`}>{alert.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                    {alert.category && <span className="text-xs text-gray-400 mt-1">{alert.category}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</span>
                  {!alert.read && (
                    <button onClick={() => markAsRead(alert.id)} className="text-xs px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded hover:bg-green-200">Marcar lido</button>
                  )}
                  {!alert.dismissedAt && (
                    <button onClick={() => dismissAlert(alert.id)} className="text-xs px-2 py-1 bg-green-900/40 text-gray-300 rounded hover:bg-green-800/40">Dispensar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum alerta.</p>}
        </div>
      )}

    </div>
  );
}
