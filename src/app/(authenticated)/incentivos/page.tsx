'use client';

import { useState, useEffect, useCallback } from 'react';

interface IncentiveProgram {
  id: string;
  name: string;
  type: string;
  cyclePeriod: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
  eligibleCount: number;
  totalDistributed: number;
  notes: string;
}

interface Eligibility {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  jobTitle: string | null;
  departmentName: string | null;
  eligible: boolean;
  calculatedAmount: number;
  performanceScore: number;
  achievementPercentage: number;
}

const typeLabels: Record<string, string> = { PLR: 'PLR', BONUS: 'Bônus', COMMISSION: 'Comissão' };
const cycleLabels: Record<string, string> = { MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' };
const statusLabels: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', CALCULATED: 'Calculado', APPROVED: 'Aprovado', DISTRIBUTED: 'Distribuído' };
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  CALCULATED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  DISTRIBUTED: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
};

export default function IncentivosPage() {
  const [programs, setPrograms] = useState<IncentiveProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [eligibilities, setEligibilities] = useState<Eligibility[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('PLR');
  const [formCycle, setFormCycle] = useState('ANNUAL');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formMinDays, setFormMinDays] = useState('90');

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incentivos');
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/incentivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          cyclePeriod: formCycle,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          totalBudget: parseFloat(formBudget) || 0,
          eligibilityCriteria: { minDaysInCompany: parseInt(formMinDays) || 0 },
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormName(''); setFormBudget(''); setFormStartDate(''); setFormEndDate('');
        fetchPrograms();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function selectProgram(programId: string) {
    setSelectedProgram(programId);
    try {
      const res = await fetch(`/api/incentivos/${programId}`);
      if (res.ok) {
        const data = await res.json();
        setEligibilities(data.eligibilities || []);
      }
    } catch { /* ignore */ }
  }

  async function calculateEligibility() {
    if (!selectedProgram) return;
    setCalculating(true);
    try {
      const res = await fetch(`/api/incentivos/${selectedProgram}/elegibilidade`, { method: 'POST' });
      if (res.ok) {
        selectProgram(selectedProgram);
        fetchPrograms();
      }
    } catch { /* ignore */ }
    setCalculating(false);
  }

  async function exportCSV() {
    if (!selectedProgram) return;
    window.open(`/api/incentivos/${selectedProgram}/exportar`, '_blank');
  }

  async function deleteProgram(programId: string) {
    if (!confirm('Excluir este programa?')) return;
    await fetch(`/api/incentivos/${programId}`, { method: 'DELETE' });
    if (selectedProgram === programId) { setSelectedProgram(null); setEligibilities([]); }
    fetchPrograms();
  }

  const totalBudget = programs.reduce((sum, p) => sum + p.totalBudget, 0);
  const totalEligible = programs.reduce((sum, p) => sum + p.eligibleCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Incentivos & PLR</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão de programas de remuneração variável.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          Novo Programa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{programs.length}</p>
          <p className="text-xs text-gray-500">Programas</p>
        </div>
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalEligible}</p>
          <p className="text-xs text-gray-500">Elegíveis</p>
        </div>
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500">Orçamento total</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Novo Programa</h2>
          <form onSubmit={handleCreateProgram} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} required className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" placeholder="Ex: PLR 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                  <option value="PLR">PLR</option>
                  <option value="BONUS">Bônus</option>
                  <option value="COMMISSION">Comissão</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ciclo</label>
                <select value={formCycle} onChange={e => setFormCycle(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Início</label>
                <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fim</label>
                <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Orçamento (R$)</label>
                <input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" placeholder="100000" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tempo mínimo na empresa (dias)</label>
                <input type="number" value={formMinDays} onChange={e => setFormMinDays(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar Programa'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Programs List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : programs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-8 text-center">
          <p className="text-gray-500">Nenhum programa de incentivo criado.</p>
          <button onClick={() => setShowForm(true)} className="text-sm text-emerald-500 mt-1">Criar primeiro →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map(prog => (
            <div
              key={prog.id}
              className={`bg-white dark:bg-gray-800/70 border rounded-xl p-4 cursor-pointer transition-all ${
                selectedProgram === prog.id
                  ? 'border-emerald-300 dark:border-emerald-500/30'
                  : 'border-gray-200 dark:border-gray-600/30 hover:border-emerald-200 dark:hover:border-emerald-500/20'
              }`}
              onClick={() => selectProgram(prog.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{prog.name}</p>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[prog.status]}`}>
                      {statusLabels[prog.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {typeLabels[prog.type]} · {cycleLabels[prog.cyclePeriod]} · {prog.eligibleCount} elegíveis
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    R$ {prog.totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <button onClick={(e) => { e.stopPropagation(); deleteProgram(prog.id); }} className="text-xs text-red-400 hover:text-red-500 mt-1">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Eligibilities Detail */}
      {selectedProgram && (
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Elegibilidade</h2>
            <div className="flex gap-2">
              <button onClick={calculateEligibility} disabled={calculating} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                {calculating ? 'Calculando...' : 'Calcular Elegíveis'}
              </button>
              {eligibilities.length > 0 && (
                <button onClick={exportCSV} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600/30 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  Exportar CSV
                </button>
              )}
            </div>
          </div>

          {eligibilities.length === 0 ? (
            <p className="text-center py-6 text-gray-400 text-sm">Clique em &ldquo;Calcular Elegíveis&rdquo; para gerar a lista.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/30">
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-500">Colaborador</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-500">Cargo</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-500">Dept.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold uppercase text-gray-500">Valor</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold uppercase text-gray-500">Elegível</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/20">
                  {eligibilities.map(e => (
                    <tr key={e.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{e.userName}</p>
                        <p className="text-xs text-gray-400">{e.userEmail}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{e.jobTitle || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{e.departmentName || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                        R$ {e.calculatedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {e.eligible ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
