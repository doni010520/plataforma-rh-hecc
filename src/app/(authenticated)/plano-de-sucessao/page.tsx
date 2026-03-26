'use client';

import { useState, useEffect, useCallback } from 'react';

interface SuccessionPlan {
  id: string;
  positionTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  currentHolderId: string | null;
  currentHolderName: string | null;
  status: string;
  priority: string;
  notes: string;
  candidateCount: number;
}

interface Candidate {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  jobTitle: string | null;
  departmentName: string | null;
  readiness: string;
  strengths: string;
  developmentAreas: string;
  notes: string;
}

interface UserOption { id: string; name: string; }
interface DeptOption { id: string; name: string; }

const priorityLabels: Record<string, string> = { CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };
const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
};
const readinessLabels: Record<string, string> = { NOW: 'Pronto agora', '1_YEAR': 'Em 1 ano', '2_YEARS': 'Em 2 anos' };
const readinessColors: Record<string, string> = {
  NOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  '1_YEAR': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  '2_YEARS': 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
};

export default function PlanoSucessaoPage() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [planDetail, setPlanDetail] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formHolder, setFormHolder] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Add candidate form
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candUserId, setCandUserId] = useState('');
  const [candReadiness, setCandReadiness] = useState('1_YEAR');
  const [candStrengths, setCandStrengths] = useState('');
  const [candDevAreas, setCandDevAreas] = useState('');
  const [candNotes, setCandNotes] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plano-de-sucessao');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
    fetch('/api/colaboradores?limit=500').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.data) setUsers(d.data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
    fetch('/api/departamentos').then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setDepartments(d.map((dep: { id: string; name: string }) => ({ id: dep.id, name: dep.name })));
    }).catch(() => {});
  }, [fetchPlans]);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/plano-de-sucessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionTitle: formTitle,
          departmentId: formDept || null,
          currentHolderId: formHolder || null,
          priority: formPriority,
          notes: formNotes,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormTitle(''); setFormDept(''); setFormHolder(''); setFormPriority('MEDIUM'); setFormNotes('');
        fetchPlans();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function selectPlan(planId: string) {
    setSelectedPlan(planId);
    try {
      const res = await fetch(`/api/plano-de-sucessao/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setPlanDetail(data.plan);
        setCandidates(data.candidates || []);
      }
    } catch { /* ignore */ }
  }

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !candUserId) return;
    try {
      const res = await fetch(`/api/plano-de-sucessao/${selectedPlan}/candidatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: candUserId,
          readiness: candReadiness,
          strengths: candStrengths,
          developmentAreas: candDevAreas,
          notes: candNotes,
        }),
      });
      if (res.ok) {
        setShowAddCandidate(false);
        setCandUserId(''); setCandReadiness('1_YEAR'); setCandStrengths(''); setCandDevAreas(''); setCandNotes('');
        selectPlan(selectedPlan);
        fetchPlans();
      }
    } catch { /* ignore */ }
  }

  async function removeCandidate(candidateId: string) {
    if (!selectedPlan || !confirm('Remover este candidato?')) return;
    try {
      await fetch(`/api/plano-de-sucessao/${selectedPlan}/candidatos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });
      selectPlan(selectedPlan);
      fetchPlans();
    } catch { /* ignore */ }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Excluir este plano de sucessão?')) return;
    try {
      await fetch(`/api/plano-de-sucessao/${planId}`, { method: 'DELETE' });
      if (selectedPlan === planId) { setSelectedPlan(null); setCandidates([]); setPlanDetail(null); }
      fetchPlans();
    } catch { /* ignore */ }
  }

  // Stats
  const noCandidates = plans.filter(p => p.candidateCount === 0).length;
  const readyNow = plans.filter(p => p.candidateCount > 0).length; // simplified
  const critical = plans.filter(p => p.priority === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plano de Sucessão</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mapeamento de posições-chave e candidatos preparados.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          Nova Posição
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{plans.length}</p>
          <p className="text-xs text-gray-500">Posições mapeadas</p>
        </div>
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{noCandidates}</p>
          <p className="text-xs text-gray-500">Sem sucessor</p>
        </div>
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{critical}</p>
          <p className="text-xs text-gray-500">Prioridade crítica</p>
        </div>
      </div>

      {/* Create Plan Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Nova Posição-Chave</h2>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título da Posição *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} required className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" placeholder="Ex: Diretor de Tecnologia" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Departamento</label>
                <select value={formDept} onChange={e => setFormDept(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                  <option value="">Nenhum</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ocupante Atual</label>
                <select value={formHolder} onChange={e => setFormHolder(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                  <option value="">Nenhum</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
                <select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                  <option value="CRITICAL">Crítica</option>
                  <option value="HIGH">Alta</option>
                  <option value="MEDIUM">Média</option>
                  <option value="LOW">Baixa</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar Posição'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Posições-Chave</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Nenhuma posição mapeada.</p>
              <button onClick={() => setShowForm(true)} className="text-sm text-emerald-500 mt-1">Criar primeira →</button>
            </div>
          ) : (
            plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => selectPlan(plan.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedPlan === plan.id
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-white dark:bg-gray-800/70 border-gray-200 dark:border-gray-600/30 hover:border-emerald-300 dark:hover:border-emerald-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{plan.positionTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {plan.departmentName || 'Sem dept.'} · {plan.currentHolderName || 'Vago'}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${priorityColors[plan.priority]}`}>
                    {priorityLabels[plan.priority]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">{plan.candidateCount} candidato(s)</span>
                  {plan.candidateCount === 0 && (
                    <span className="text-[10px] text-red-500 font-medium">⚠ Sem sucessor</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Plan Detail + Candidates */}
        <div className="lg:col-span-2">
          {!selectedPlan ? (
            <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-8 text-center">
              <p className="text-gray-400">Selecione uma posição para ver os candidatos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Candidatos — {(planDetail as Record<string, string>)?.position_title || ''}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddCandidate(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                      + Candidato
                    </button>
                    <button onClick={() => deletePlan(selectedPlan)} className="px-3 py-1.5 text-red-500 hover:text-red-400 text-xs font-medium">
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Add Candidate Form */}
                {showAddCandidate && (
                  <form onSubmit={addCandidate} className="mb-4 p-4 border border-gray-100 dark:border-gray-700/30 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Colaborador *</label>
                        <select value={candUserId} onChange={e => setCandUserId(e.target.value)} required className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                          <option value="">Selecione...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Prontidão</label>
                        <select value={candReadiness} onChange={e => setCandReadiness(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30">
                          <option value="NOW">Pronto agora</option>
                          <option value="1_YEAR">Em 1 ano</option>
                          <option value="2_YEARS">Em 2 anos</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Pontos fortes</label>
                      <textarea value={candStrengths} onChange={e => setCandStrengths(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Áreas de desenvolvimento</label>
                      <textarea value={candDevAreas} onChange={e => setCandDevAreas(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600/30" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium">Adicionar</button>
                      <button type="button" onClick={() => setShowAddCandidate(false)} className="px-3 py-1.5 text-gray-500 text-xs">Cancelar</button>
                    </div>
                  </form>
                )}

                {/* Candidates List */}
                {candidates.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">Nenhum candidato mapeado.</p>
                    <button onClick={() => setShowAddCandidate(true)} className="text-sm text-emerald-500 mt-1">Adicionar primeiro →</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidates.map(c => (
                      <div key={c.id} className="border border-gray-100 dark:border-gray-700/30 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.userName}</p>
                            <p className="text-xs text-gray-500">{c.jobTitle || 'Sem cargo'} · {c.departmentName || 'Sem dept.'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${readinessColors[c.readiness]}`}>
                              {readinessLabels[c.readiness]}
                            </span>
                            <button onClick={() => removeCandidate(c.id)} className="text-red-400 hover:text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {(c.strengths || c.developmentAreas) && (
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            {c.strengths && (
                              <div>
                                <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">Pontos Fortes</p>
                                <p className="text-gray-600 dark:text-gray-400">{c.strengths}</p>
                              </div>
                            )}
                            {c.developmentAreas && (
                              <div>
                                <p className="font-medium text-amber-600 dark:text-amber-400 mb-0.5">Desenvolvimento</p>
                                <p className="text-gray-600 dark:text-gray-400">{c.developmentAreas}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
