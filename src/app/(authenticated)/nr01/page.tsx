'use client';

import { useState, useEffect, useCallback } from 'react';
import { AiInterpretation } from '@/components/AiInterpretation';

interface Assessment {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  anonymous: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  _count: { responses: number; questions: number };
  results?: Result[];
}

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
}

interface Result {
  id: string;
  category: string;
  averageScore: number;
  riskLevel: string;
  totalResponses: number;
}

interface RiskInventory {
  id: string;
  title: string;
  description: string;
  referenceDate: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  _count: { identifiedRisks: number };
}

interface Complaint {
  id: string;
  anonymous: boolean;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  author: { id: string; name: string } | null;
  _count?: { updates: number };
}

type Tab = 'avaliacoes' | 'inventarios' | 'denuncias';

const defaultNr01Questions: { text: string; category: string }[] = [
  // Carga de Trabalho
  { text: 'O volume de trabalho que me é atribuído é adequado à minha jornada.', category: 'Carga de Trabalho' },
  { text: 'Consigo cumprir meus prazos sem pressão excessiva.', category: 'Carga de Trabalho' },
  { text: 'Não me sinto sobrecarregado(a) com minhas responsabilidades.', category: 'Carga de Trabalho' },
  // Autonomia
  { text: 'Tenho liberdade para tomar decisões no meu trabalho.', category: 'Autonomia' },
  { text: 'Consigo definir o ritmo do meu trabalho de forma adequada.', category: 'Autonomia' },
  { text: 'Minha opinião é considerada nas decisões que afetam meu trabalho.', category: 'Autonomia' },
  // Relações Interpessoais
  { text: 'Tenho um bom relacionamento com meus colegas de trabalho.', category: 'Relações Interpessoais' },
  { text: 'Posso contar com o apoio dos meus colegas quando necessário.', category: 'Relações Interpessoais' },
  { text: 'O ambiente de trabalho é respeitoso e colaborativo.', category: 'Relações Interpessoais' },
  // Liderança
  { text: 'Meu gestor se comunica de forma clara e respeitosa.', category: 'Liderança' },
  { text: 'Recebo feedback construtivo com regularidade.', category: 'Liderança' },
  { text: 'Sinto que meu trabalho é reconhecido e valorizado.', category: 'Liderança' },
  // Assédio e Discriminação
  { text: 'Nunca presenciei ou sofri situações de assédio moral no trabalho.', category: 'Assédio e Discriminação' },
  { text: 'Nunca presenciei ou sofri situações de assédio sexual no trabalho.', category: 'Assédio e Discriminação' },
  { text: 'Não existe discriminação de gênero, raça, religião ou orientação sexual no meu ambiente de trabalho.', category: 'Assédio e Discriminação' },
  // Equilíbrio Vida-Trabalho
  { text: 'Minha jornada de trabalho permite manter um equilíbrio saudável com a vida pessoal.', category: 'Equilíbrio Vida-Trabalho' },
  { text: 'Consigo ter períodos de descanso adequados durante o trabalho.', category: 'Equilíbrio Vida-Trabalho' },
  { text: 'Não sou frequentemente solicitado(a) fora do meu horário de trabalho.', category: 'Equilíbrio Vida-Trabalho' },
];

const assessmentStatusLabels: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativa', CLOSED: 'Encerrada' };
const assessmentStatusColors: Record<string, string> = { DRAFT: 'bg-gray-800/40 text-gray-200', ACTIVE: 'bg-emerald-900/40 text-emerald-300', CLOSED: 'bg-red-900/30 text-red-800' };
const riskLabels: Record<string, string> = { LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', CRITICAL: 'Crítico' };
const riskColors: Record<string, string> = { LOW: 'bg-emerald-900/40 text-emerald-300', MEDIUM: 'bg-yellow-100 text-yellow-300', HIGH: 'bg-orange-100 text-orange-800', CRITICAL: 'bg-red-900/30 text-red-800' };
const complaintStatusLabels: Record<string, string> = { OPEN: 'Aberta', INVESTIGATING: 'Em Investigação', RESOLVED: 'Resolvida', DISMISSED: 'Arquivada' };
const complaintStatusColors: Record<string, string> = { OPEN: 'bg-blue-100 text-blue-800', INVESTIGATING: 'bg-yellow-100 text-yellow-300', RESOLVED: 'bg-emerald-900/40 text-emerald-300', DISMISSED: 'bg-gray-800/40 text-gray-200' };

export default function NR01Page() {
  const [tab, setTab] = useState<Tab>('avaliacoes');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [inventories, setInventories] = useState<RiskInventory[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<(Assessment & { questions: Question[] }) | null>(null);

  // Assessment form
  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aAnonymous, setAAnonymous] = useState(true);
  const [aQuestions, setAQuestions] = useState<{ text: string; category: string }[]>([{ text: '', category: '' }]);

  // Inventory form
  const [invTitle, setInvTitle] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);

  // Complaint form
  const [compCategory, setCompCategory] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compAnonymous, setCompAnonymous] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, iRes, cRes] = await Promise.all([
        fetch('/api/nr01/avaliacoes'),
        fetch('/api/nr01/inventarios'),
        fetch('/api/nr01/denuncias'),
      ]);
      if (aRes.ok) setAssessments(await aRes.json());
      if (iRes.ok) setInventories(await iRes.json());
      if (cRes.ok) setComplaints(await cRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createAssessment(e: React.FormEvent) {
    e.preventDefault();
    const validQs = aQuestions.filter(q => q.text.trim());
    const res = await fetch('/api/nr01/avaliacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: aTitle, description: aDesc, anonymous: aAnonymous, questions: validQs }),
    });
    if (res.ok) {
      setShowForm(false);
      setATitle(''); setADesc(''); setAAnonymous(true); setAQuestions([{ text: '', category: '' }]);
      fetchData();
    }
  }

  async function createInventory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/nr01/inventarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: invTitle, description: invDesc, referenceDate: invDate }),
    });
    if (res.ok) {
      setShowForm(false);
      setInvTitle(''); setInvDesc(''); setInvDate(new Date().toISOString().split('T')[0]);
      fetchData();
    }
  }

  async function createComplaint(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/nr01/denuncias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: compCategory, description: compDesc, anonymous: compAnonymous }),
    });
    if (res.ok) {
      setShowForm(false);
      setCompCategory(''); setCompDesc(''); setCompAnonymous(false);
      fetchData();
    }
  }

  async function activateAssessment(id: string) {
    await fetch(`/api/nr01/avaliacoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE', startDate: new Date().toISOString() }),
    });
    fetchData();
  }

  async function closeAssessment(id: string) {
    await fetch(`/api/nr01/avaliacoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED', endDate: new Date().toISOString() }),
    });
    fetchData();
  }

  async function calculateResults(id: string) {
    await fetch(`/api/nr01/avaliacoes/${id}/resultados`, { method: 'POST' });
    fetchData();
  }

  async function loadAssessmentDetail(id: string) {
    const res = await fetch(`/api/nr01/avaliacoes/${id}`);
    if (res.ok) setSelectedAssessment(await res.json());
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;

  // Detail view
  if (selectedAssessment) {
    const a = selectedAssessment;
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <button onClick={() => setSelectedAssessment(null)} className="text-emerald-400 hover:underline text-sm">&larr; Voltar</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{a.title}</h1>
            <p className="text-gray-400 text-sm mt-1">{a.description}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${assessmentStatusColors[a.status]}`}>{assessmentStatusLabels[a.status]}</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{a._count?.questions || a.questions?.length || 0}</p>
            <p className="text-sm text-gray-400">Perguntas</p>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{a._count?.responses || 0}</p>
            <p className="text-sm text-gray-400">Respostas</p>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{a.anonymous ? 'Sim' : 'Não'}</p>
            <p className="text-sm text-gray-400">Anônima</p>
          </div>
        </div>

        {a.questions && a.questions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Perguntas</h2>
            <div className="space-y-2">
              {a.questions.map((q: Question, i: number) => (
                <div key={q.id} className="bg-gray-900/50 backdrop-blur-lg border rounded p-3 flex gap-3">
                  <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
                  <div>
                    <p className="text-sm text-gray-100">{q.text}</p>
                    {q.category && <span className="text-xs text-gray-400">Categoria: {q.category}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {a.results && a.results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-100">Resultados</h2>
              <AiInterpretation type="nr01" targetId={a.id} />
            </div>
            <div className="space-y-2">
              {a.results.map((r: Result) => (
                <div key={r.id} className="bg-gray-900/50 backdrop-blur-lg border rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-100">{r.category}</p>
                    <p className="text-sm text-gray-400">{r.totalResponses} respostas</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-100">{r.averageScore.toFixed(1)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColors[r.riskLevel]}`}>{riskLabels[r.riskLevel]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {a.status === 'DRAFT' && <button onClick={() => activateAssessment(a.id)} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Ativar</button>}
          {a.status === 'ACTIVE' && <button onClick={() => closeAssessment(a.id)} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">Encerrar</button>}
          {a.status === 'CLOSED' && <button onClick={() => calculateResults(a.id)} className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-gray-700">Calcular Resultados</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">NR-01 / Riscos Psicossociais</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
          {tab === 'avaliacoes' ? 'Nova Avaliação' : tab === 'inventarios' ? 'Novo Inventário' : 'Nova Denúncia'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700/30">
        <nav className="flex space-x-8">
          {([['avaliacoes', 'Avaliações Psicossociais'], ['inventarios', 'Inventários de Riscos'], ['denuncias', 'Canal de Denúncias']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setShowForm(false); }} className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${tab === key ? 'border-green-600 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Assessment Form */}
      {showForm && tab === 'avaliacoes' && (
        <form onSubmit={createAssessment} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Nova Avaliação Psicossocial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
              <input value={aTitle} onChange={e => setATitle(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={aAnonymous} onChange={e => setAAnonymous(e.target.checked)} className="rounded" />
              <label className="text-sm text-gray-300">Respostas anônimas</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea value={aDesc} onChange={e => setADesc(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Perguntas</label>
              <button
                type="button"
                onClick={() => {
                  setAQuestions([...defaultNr01Questions]);
                  if (!aTitle) setATitle('Avaliação de Riscos Psicossociais');
                  if (!aDesc) setADesc('Avaliação conforme NR-01 para identificação de fatores de risco psicossocial no ambiente de trabalho.');
                }}
                className="text-xs px-3 py-1 bg-yellow-100 text-yellow-300 rounded-md hover:bg-yellow-200 font-medium"
              >
                Usar modelo padrão NR-01 ({defaultNr01Questions.length} perguntas)
              </button>
            </div>
            {aQuestions.map((q, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={q.text} onChange={e => { const nq = [...aQuestions]; nq[i].text = e.target.value; setAQuestions(nq); }} placeholder="Pergunta..." className="flex-1 border rounded px-3 py-2 text-sm" />
                <input value={q.category} onChange={e => { const nq = [...aQuestions]; nq[i].category = e.target.value; setAQuestions(nq); }} placeholder="Categoria" className="w-40 border rounded px-3 py-2 text-sm" />
                {aQuestions.length > 1 && (
                  <button type="button" onClick={() => setAQuestions(aQuestions.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 px-2">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setAQuestions([...aQuestions, { text: '', category: '' }])} className="text-sm text-emerald-400 hover:underline">+ Adicionar pergunta</button>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-gray-700">Criar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
          </div>
        </form>
      )}

      {/* Inventory Form */}
      {showForm && tab === 'inventarios' && (
        <form onSubmit={createInventory} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Novo Inventário de Riscos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Título *</label>
              <input value={invTitle} onChange={e => setInvTitle(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data de Referência *</label>
              <input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea value={invDesc} onChange={e => setInvDesc(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-gray-700">Criar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
          </div>
        </form>
      )}

      {/* Complaint Form */}
      {showForm && tab === 'denuncias' && (
        <form onSubmit={createComplaint} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Nova Denúncia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
              <select value={compCategory} onChange={e => setCompCategory(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                <option value="ASSEDIO_MORAL">Assédio Moral</option>
                <option value="ASSEDIO_SEXUAL">Assédio Sexual</option>
                <option value="DISCRIMINACAO">Discriminação</option>
                <option value="SOBRECARGA">Sobrecarga de Trabalho</option>
                <option value="CONFLITO">Conflito Interpessoal</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={compAnonymous} onChange={e => setCompAnonymous(e.target.checked)} className="rounded" />
              <label className="text-sm text-gray-300">Denúncia anônima</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição *</label>
            <textarea value={compDesc} onChange={e => setCompDesc(e.target.value)} required rows={4} className="w-full border rounded px-3 py-2 text-sm" placeholder="Descreva a situação..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-gray-700">Enviar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700/40 rounded text-sm hover:bg-green-700/40">Cancelar</button>
          </div>
        </form>
      )}

      {/* Assessments List */}
      {tab === 'avaliacoes' && (
        <div className="space-y-3">
          {assessments.map(a => (
            <div key={a.id} onClick={() => loadAssessmentDetail(a.id)} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4 cursor-pointer hover:border-green-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-100">{a.title}</h3>
                  <p className="text-sm text-gray-400">{a._count.questions} perguntas · {a._count.responses} respostas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${assessmentStatusColors[a.status]}`}>{assessmentStatusLabels[a.status]}</span>
                  {a.status === 'DRAFT' && <button onClick={(e) => { e.stopPropagation(); activateAssessment(a.id); }} className="text-xs px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded hover:bg-green-200">Ativar</button>}
                </div>
              </div>
            </div>
          ))}
          {assessments.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma avaliação psicossocial.</p>}
        </div>
      )}

      {/* Inventories List */}
      {tab === 'inventarios' && (
        <div className="space-y-3">
          {inventories.map(inv => (
            <div key={inv.id} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-100">{inv.title}</h3>
                  <p className="text-sm text-gray-400">Ref.: {new Date(inv.referenceDate).toLocaleDateString('pt-BR')} · {inv._count.identifiedRisks} riscos identificados</p>
                </div>
                <p className="text-sm text-gray-400">{new Date(inv.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))}
          {inventories.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum inventário de riscos.</p>}
        </div>
      )}

      {/* Complaints List */}
      {tab === 'denuncias' && (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c.id} className="bg-gray-900/50 backdrop-blur-lg border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${complaintStatusColors[c.status]}`}>{complaintStatusLabels[c.status]}</span>
                  {c.category && <span className="text-xs text-gray-400">{c.category.replace('_', ' ')}</span>}
                  {c.anonymous && <span className="text-xs text-gray-400 italic">Anônima</span>}
                </div>
                <p className="text-sm text-gray-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{c.description}</p>
            </div>
          ))}
          {complaints.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma denúncia registrada.</p>}
        </div>
      )}
    </div>
  );
}
