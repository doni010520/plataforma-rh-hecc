'use client';

import { useState, useEffect, useCallback } from 'react';

interface Department {
  id: string;
  name: string;
}

interface JobPosition {
  id: string;
  title: string;
  description: string;
  departmentId: string | null;
  location: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  vacancies: number;
  status: string;
  closedAt: string | null;
  createdAt: string;
  department: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  _count: { applications: number };
  stages?: Stage[];
  applications?: ApplicationFull[];
}

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  linkedIn: string | null;
  notes: string;
  createdAt: string;
  _count?: { applications: number };
}

interface ApplicationFull {
  id: string;
  status: string;
  currentStage: string | null;
  appliedAt: string;
  candidate: Candidate;
  evaluations: { id: string; score: number; comment: string; evaluator: { id: string; name: string }; createdAt: string }[];
  interviews: { id: string; type: string; status: string; scheduledAt: string; interviewer: { id: string; name: string }; score: number | null; feedback: string }[];
}

type Tab = 'vagas' | 'candidatos';

const statusLabels: Record<string, string> = { OPEN: 'Aberta', CLOSED: 'Fechada', CANCELLED: 'Cancelada', ON_HOLD: 'Em Espera' };
const statusColors: Record<string, string> = { OPEN: 'bg-emerald-900/40 text-emerald-300', CLOSED: 'bg-green-900/40 text-gray-200', CANCELLED: 'bg-red-900/30 text-red-800', ON_HOLD: 'bg-yellow-100 text-yellow-300' };
const appStatusLabels: Record<string, string> = { NEW: 'Novo', SCREENING: 'Triagem', INTERVIEW: 'Entrevista', OFFER: 'Proposta', HIRED: 'Contratado', REJECTED: 'Rejeitado', WITHDRAWN: 'Desistiu' };
const appStatusColors: Record<string, string> = { NEW: 'bg-blue-100 text-blue-800', SCREENING: 'bg-yellow-100 text-yellow-300', INTERVIEW: 'bg-purple-100 text-purple-800', OFFER: 'bg-emerald-900/40 text-green-900', HIRED: 'bg-emerald-900/40 text-emerald-300', REJECTED: 'bg-red-900/30 text-red-800', WITHDRAWN: 'bg-green-900/40 text-gray-200' };

export default function RecrutamentoPage() {
  const [tab, setTab] = useState<Tab>('vagas');
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);

  // Forms
  const [showForm, setShowForm] = useState(false);
  // Position form
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState('CLT');
  const [formSalaryMin, setFormSalaryMin] = useState('');
  const [formSalaryMax, setFormSalaryMax] = useState('');
  const [formVacancies, setFormVacancies] = useState(1);
  // Candidate form
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candLinkedIn, setCandLinkedIn] = useState('');
  const [candNotes, setCandNotes] = useState('');
  // Apply candidate
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyCandidateId, setApplyCandidateId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [posRes, candRes, deptRes] = await Promise.all([
        fetch('/api/ats/vagas'),
        fetch('/api/ats/candidatos'),
        fetch('/api/departments'),
      ]);
      if (posRes.ok) setPositions(await posRes.json());
      if (candRes.ok) setCandidates(await candRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function loadPositionDetail(id: string) {
    const res = await fetch(`/api/ats/vagas/${id}`);
    if (res.ok) setSelectedPosition(await res.json());
  }

  async function createPosition(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/ats/vagas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formTitle, description: formDesc, departmentId: formDeptId || null,
        location: formLocation, type: formType,
        salaryMin: formSalaryMin ? Number(formSalaryMin) : null,
        salaryMax: formSalaryMax ? Number(formSalaryMax) : null,
        vacancies: formVacancies,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormTitle(''); setFormDesc(''); setFormDeptId(''); setFormLocation(''); setFormType('CLT');
      setFormSalaryMin(''); setFormSalaryMax(''); setFormVacancies(1);
      fetchData();
    }
  }

  async function createCandidate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/ats/candidatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: candName, email: candEmail, phone: candPhone, linkedIn: candLinkedIn || null, notes: candNotes }),
    });
    if (res.ok) {
      setShowForm(false);
      setCandName(''); setCandEmail(''); setCandPhone(''); setCandLinkedIn(''); setCandNotes('');
      fetchData();
    }
  }

  async function applyCandidate() {
    if (!selectedPosition || !applyCandidateId) return;
    const res = await fetch(`/api/ats/vagas/${selectedPosition.id}/candidaturas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: applyCandidateId }),
    });
    if (res.ok) {
      setShowApplyModal(false);
      setApplyCandidateId('');
      loadPositionDetail(selectedPosition.id);
    }
  }

  async function updateAppStatus(appId: string, status: string) {
    if (!selectedPosition) return;
    await fetch(`/api/ats/vagas/${selectedPosition.id}/candidaturas/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadPositionDetail(selectedPosition.id);
  }

  async function updatePositionStatus(id: string, status: string) {
    await fetch(`/api/ats/vagas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
    if (selectedPosition?.id === id) loadPositionDetail(id);
  }

  function currency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;

  // Detail view
  if (selectedPosition) {
    const pos = selectedPosition;
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <button onClick={() => setSelectedPosition(null)} className="text-emerald-400 hover:underline text-sm">&larr; Voltar</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{pos.title}</h1>
            <p className="text-gray-400 mt-1">{pos.department?.name || 'Sem departamento'} &middot; {pos.location || 'Remoto'} &middot; {pos.type}</p>
            {pos.salaryMin && <p className="text-sm text-gray-400 mt-1">Faixa salarial: {currency(pos.salaryMin)} - {pos.salaryMax ? currency(pos.salaryMax) : '...'}</p>}
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[pos.status] || 'bg-green-900/40'}`}>{statusLabels[pos.status] || pos.status}</span>
            {pos.status === 'OPEN' && (
              <button onClick={() => updatePositionStatus(pos.id, 'CLOSED')} className="text-xs px-3 py-1 bg-green-800/40 rounded hover:bg-green-700/40">Fechar Vaga</button>
            )}
            {pos.status === 'CLOSED' && (
              <button onClick={() => updatePositionStatus(pos.id, 'OPEN')} className="text-xs px-3 py-1 bg-green-200 rounded hover:bg-green-300">Reabrir</button>
            )}
          </div>
        </div>
        {pos.description && <p className="text-gray-300 text-sm whitespace-pre-wrap">{pos.description}</p>}

        {/* Applications */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Candidaturas ({pos.applications?.length || 0})</h2>
          {pos.status === 'OPEN' && (
            <button onClick={() => setShowApplyModal(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">Adicionar Candidato</button>
          )}
        </div>

        {showApplyModal && (
          <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Vincular Candidato</h3>
            <select value={applyCandidateId} onChange={e => setApplyCandidateId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={applyCandidate} disabled={!applyCandidateId} className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800 disabled:opacity-50">Vincular</button>
              <button onClick={() => setShowApplyModal(false)} className="px-4 py-2 bg-green-800/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {pos.applications?.map(app => (
            <div key={app.id} className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-100">{app.candidate.name}</p>
                  <p className="text-sm text-gray-400">{app.candidate.email} {app.candidate.phone && `· ${app.candidate.phone}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${appStatusColors[app.status] || 'bg-green-900/40'}`}>{appStatusLabels[app.status] || app.status}</span>
                  <select
                    value={app.status}
                    onChange={e => updateAppStatus(app.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    {Object.entries(appStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              {app.evaluations.length > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  <span className="font-medium">Avaliações:</span>{' '}
                  {app.evaluations.map(ev => `${ev.evaluator.name}: ${ev.score}/10`).join(', ')}
                </div>
              )}
              {app.interviews.length > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  <span className="font-medium">Entrevistas:</span>{' '}
                  {app.interviews.map(iv => `${iv.type} em ${new Date(iv.scheduledAt).toLocaleDateString('pt-BR')} (${iv.status})`).join(', ')}
                </div>
              )}
            </div>
          ))}
          {(!pos.applications || pos.applications.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma candidatura ainda.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Recrutamento & Seleção</h1>
        <button
          onClick={() => { setShowForm(!showForm); }}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
        >
          {tab === 'vagas' ? 'Nova Vaga' : 'Novo Candidato'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-green-800/30">
        <nav className="flex space-x-8">
          {([['vagas', 'Vagas'], ['candidatos', 'Candidatos']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setShowForm(false); }}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key ? 'border-green-600 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Create Position Form */}
      {showForm && tab === 'vagas' && (
        <form onSubmit={createPosition} className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Nova Vaga</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Departamento</label>
              <select value={formDeptId} onChange={e => setFormDeptId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Nenhum</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Local</label>
              <input value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Ex: Remoto, São Paulo..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="ESTAGIO">Estágio</option>
                <option value="TEMPORARIO">Temporário</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Salário Mínimo</label>
              <input type="number" value={formSalaryMin} onChange={e => setFormSalaryMin(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Salário Máximo</label>
              <input type="number" value={formSalaryMax} onChange={e => setFormSalaryMax(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vagas</label>
              <input type="number" min={1} value={formVacancies} onChange={e => setFormVacancies(Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800">Criar Vaga</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-green-800/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
          </div>
        </form>
      )}

      {/* Create Candidate Form */}
      {showForm && tab === 'candidatos' && (
        <form onSubmit={createCandidate} className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Novo Candidato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome *</label>
              <input value={candName} onChange={e => setCandName(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
              <input type="email" value={candEmail} onChange={e => setCandEmail(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
              <input value={candPhone} onChange={e => setCandPhone(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn</label>
              <input value={candLinkedIn} onChange={e => setCandLinkedIn(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
            <textarea value={candNotes} onChange={e => setCandNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800">Criar Candidato</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-green-800/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
          </div>
        </form>
      )}

      {/* Positions List */}
      {tab === 'vagas' && (
        <div className="space-y-3">
          {positions.map(pos => (
            <div key={pos.id} onClick={() => loadPositionDetail(pos.id)} className="bg-green-950/50 backdrop-blur-lg border rounded-lg p-4 cursor-pointer hover:border-green-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-100">{pos.title}</h3>
                  <p className="text-sm text-gray-400">{pos.department?.name || 'Sem departamento'} &middot; {pos.location || 'Remoto'} &middot; {pos.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{pos._count.applications} candidatura(s)</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[pos.status] || 'bg-green-900/40'}`}>{statusLabels[pos.status] || pos.status}</span>
                </div>
              </div>
            </div>
          ))}
          {positions.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma vaga cadastrada.</p>}
        </div>
      )}

      {/* Candidates List */}
      {tab === 'candidatos' && (
        <div className="bg-green-950/50 backdrop-blur-lg border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-900/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Telefone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Candidaturas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {candidates.map(c => (
                <tr key={c.id} className="hover:bg-green-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-100">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c._count?.applications || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum candidato cadastrado.</p>}
        </div>
      )}
    </div>
  );
}
