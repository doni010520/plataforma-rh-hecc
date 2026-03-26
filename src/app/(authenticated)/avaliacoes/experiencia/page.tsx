'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ExperienceEval {
  id: string;
  cycleId: string;
  targetUserId: string;
  periodDays: number;
  admissionDate: string;
  dueDate: string;
  status: string;
  userName: string;
  userEmail: string;
  departmentName: string | null;
  cycleName: string;
  cycleStatus: string;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

interface ReviewCycleOption {
  id: string;
  name: string;
}

const DEFAULT_PERIODS = [30, 45, 60, 90];

export default function ExperienciaPage() {
  // Config state
  const [periods, setPeriods] = useState<number[]>(DEFAULT_PERIODS);
  const [customPeriod, setCustomPeriod] = useState('');
  const [templateCycleId, setTemplateCycleId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Dashboard state
  const [evaluations, setEvaluations] = useState<ExperienceEval[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, overdue: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  // Check state
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState('');

  // Available cycles for template
  const [availableCycles, setAvailableCycles] = useState<ReviewCycleOption[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/avaliacoes/experiencia');
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods || DEFAULT_PERIODS);
        setTemplateCycleId(data.templateCycleId);
        setActive(data.active);
      }
    } catch { /* ignore */ }
    setConfigLoading(false);
  }, []);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPeriod) params.set('period', filterPeriod);
      const res = await fetch(`/api/avaliacoes/experiencia/list?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.data);
        setStats(data.stats);
      }
    } catch { /* ignore */ }
    setListLoading(false);
  }, [filterStatus, filterPeriod]);

  useEffect(() => {
    fetchConfig();
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d?.role) setUserRole(d.role); }).catch(() => {});
    fetch('/api/avaliacoes').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.data) setAvailableCycles(d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, [fetchConfig]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function saveConfig() {
    setConfigSaving(true);
    setConfigSuccess('');
    try {
      const res = await fetch('/api/avaliacoes/experiencia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periods, templateCycleId, active }),
      });
      if (res.ok) {
        setConfigSuccess('Configuração salva!');
        setTimeout(() => setConfigSuccess(''), 3000);
      }
    } catch { /* ignore */ }
    setConfigSaving(false);
  }

  function togglePeriod(p: number) {
    setPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => a - b));
  }

  function addCustomPeriod() {
    const val = parseInt(customPeriod);
    if (val > 0 && !periods.includes(val)) {
      setPeriods(prev => [...prev, val].sort((a, b) => a - b));
      setCustomPeriod('');
    }
  }

  async function runCheck() {
    setChecking(true);
    setCheckResult('');
    try {
      const res = await fetch('/api/avaliacoes/experiencia/check', { method: 'POST' });
      const data = await res.json();
      setCheckResult(data.message || 'Verificação concluída.');
      fetchList();
    } catch {
      setCheckResult('Erro ao executar verificação.');
    }
    setChecking(false);
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
      case 'OVERDUE': return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'COMPLETED': return 'Concluída';
      case 'OVERDUE': return 'Atrasada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Avaliação de Experiência</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Avaliações automáticas no período de experiência do colaborador.
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <button
            onClick={runCheck}
            disabled={checking}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {checking ? 'Verificando...' : 'Verificar Agora'}
          </button>
        )}
      </div>

      {checkResult && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
          {checkResult}
        </div>
      )}

      {/* Config Panel (ADMIN only) */}
      {userRole === 'ADMIN' && !configLoading && (
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Configuração</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-checked:bg-emerald-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Ativar avaliações de experiência</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Períodos (dias após admissão)</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PERIODS.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      periods.includes(p)
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600/30 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {p} dias
                  </button>
                ))}
                {periods.filter(p => !DEFAULT_PERIODS.includes(p)).map(p => (
                  <button
                    key={p}
                    onClick={() => togglePeriod(p)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  >
                    {p} dias ×
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customPeriod}
                    onChange={(e) => setCustomPeriod(e.target.value)}
                    placeholder="Outro"
                    className="w-20 px-2 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30"
                    min={1}
                  />
                  <button onClick={addCustomPeriod} className="px-2 py-1.5 text-emerald-600 text-sm font-medium hover:text-emerald-500">
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Modelo de critérios (opcional)</label>
              <select
                value={templateCycleId || ''}
                onChange={(e) => setTemplateCycleId(e.target.value || null)}
                className="w-full max-w-md px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30"
              >
                <option value="">Usar critérios padrão</option>
                {availableCycles.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Se não selecionar, serão usados 6 critérios padrão de avaliação de experiência.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveConfig}
                disabled={configSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {configSaving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
              {configSuccess && <span className="text-sm text-emerald-500">{configSuccess}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Pendentes', value: stats.pending, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Concluídas', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Atrasadas', value: stats.overdue, color: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="COMPLETED">Concluída</option>
          <option value="OVERDUE">Atrasada</option>
        </select>
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30"
        >
          <option value="">Todos os períodos</option>
          {periods.map(p => (
            <option key={p} value={p}>{p} dias</option>
          ))}
        </select>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl overflow-hidden">
        {listLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : evaluations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Nenhuma avaliação de experiência encontrada.</p>
            <p className="text-xs text-gray-400 mt-1">Configure os períodos e clique em &ldquo;Verificar Agora&rdquo; para disparar avaliações.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Colaborador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Departamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Período</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Data Limite</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/20">
                {evaluations.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{ev.userName}</p>
                      <p className="text-xs text-gray-400">{ev.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ev.departmentName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ev.periodDays} dias</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(ev.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge(ev.status)}`}>
                        {statusLabel(ev.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/avaliacoes/${ev.cycleId}/resultados`}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-xs font-medium"
                      >
                        Ver Resultados →
                      </Link>
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
