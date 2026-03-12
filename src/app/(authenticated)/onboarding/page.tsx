'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface OnboardingProcess { id: string; userId: string; startDate: string; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; completedAt: string | null; user: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null }; template: { id: string; name: string; durationDays: number }; tasks: { id: string; title: string; type: string; dueDate: string; assignedTo: string; status: 'PENDING' | 'COMPLETED' }[]; evaluations: { id: string; period: string; score: number; evaluator: { id: string; name: string } }[]; }
interface Template { id: string; name: string; description: string; durationDays: number; department: { id: string; name: string } | null; tasks: { id: string; title: string; type: string; dueDay: number; assignedTo: string }[]; _count: { processes: number }; }
interface Employee { id: string; name: string; email: string; jobTitle: string | null; }

const statusLabels: Record<string, string> = { ACTIVE: 'Ativo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };
const statusColors: Record<string, string> = { ACTIVE: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-emerald-900/40 text-emerald-300', CANCELLED: 'bg-green-900/40 text-gray-200' };
const taskTypeLabels: Record<string, string> = { DOCUMENT: 'Documento', MEETING: 'Reunião', TRAINING: 'Treinamento', SYSTEM_ACCESS: 'Acesso ao Sistema', OTHER: 'Outro' };
const assigneeLabels: Record<string, string> = { EMPLOYEE: 'Colaborador', MANAGER: 'Gestor', HR: 'RH' };

export default function OnboardingPage() {
  const [processes, setProcesses] = useState<OnboardingProcess[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewProcess, setShowNewProcess] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<'processes' | 'templates'>('processes');
  const [formUserId, setFormUserId] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplDurationDays, setTplDurationDays] = useState(90);
  const [tplTasks, setTplTasks] = useState<{ title: string; type: string; dueDay: number; assignedTo: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [procRes, tplRes, empRes] = await Promise.all([fetch('/api/onboarding/processes'), fetch('/api/onboarding/templates'), fetch('/api/colaboradores')]);
      if (procRes.ok) setProcesses(await procRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (empRes.ok) { const data = await empRes.json(); setEmployees(Array.isArray(data) ? data : data.users || []); }
    } catch (err) { console.error('Erro ao carregar dados:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserId || !formTemplateId || !formStartDate) return;
    const res = await fetch('/api/onboarding/processes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: formUserId, templateId: formTemplateId, startDate: formStartDate }) });
    if (res.ok) { setShowNewProcess(false); setFormUserId(''); setFormTemplateId(''); setFormStartDate(''); fetchData(); }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName) return;
    const res = await fetch('/api/onboarding/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tplName, description: tplDescription, durationDays: tplDurationDays, tasks: tplTasks.filter((t) => t.title.trim()) }) });
    if (res.ok) { setShowNewTemplate(false); setTplName(''); setTplDescription(''); setTplDurationDays(90); setTplTasks([]); fetchData(); }
  };

  const addTemplateTask = () => setTplTasks([...tplTasks, { title: '', type: 'TRAINING', dueDay: 1, assignedTo: 'EMPLOYEE' }]);
  const updateTemplateTask = (i: number, f: string, v: string | number) => { const u = [...tplTasks]; (u[i] as Record<string, string | number>)[f] = v; setTplTasks(u); };
  const removeTemplateTask = (i: number) => setTplTasks(tplTasks.filter((_, idx) => idx !== i));
  const filtered = statusFilter ? processes.filter((p) => p.status === statusFilter) : processes;
  const activeCount = processes.filter((p) => p.status === 'ACTIVE').length;
  const completedCount = processes.filter((p) => p.status === 'COMPLETED').length;

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Onboarding</h1>
        <div className="flex gap-2">
          {activeTab === 'processes' && <button onClick={() => setShowNewProcess(!showNewProcess)} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">+ Novo Processo</button>}
          {activeTab === 'templates' && <button onClick={() => setShowNewTemplate(!showNewTemplate)} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">+ Novo Template</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4"><h3 className="text-sm font-medium text-gray-400">Total de Processos</h3><p className="text-2xl font-bold text-gray-100 mt-1">{processes.length}</p></div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4"><h3 className="text-sm font-medium text-gray-400">Em Andamento</h3><p className="text-2xl font-bold text-blue-600 mt-1">{activeCount}</p></div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4"><h3 className="text-sm font-medium text-gray-400">Concluídos</h3><p className="text-2xl font-bold text-green-600 mt-1">{completedCount}</p></div>
      </div>
      <div className="border-b border-green-800/30"><nav className="flex gap-4">
        <button onClick={() => setActiveTab('processes')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'processes' ? 'border-green-700 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Processos ({processes.length})</button>
        <button onClick={() => setActiveTab('templates')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'templates' ? 'border-green-700 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Templates ({templates.length})</button>
      </nav></div>
      {showNewProcess && (<form onSubmit={handleCreateProcess} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-6 space-y-4"><h2 className="text-lg font-semibold text-gray-100">Novo Processo de Onboarding</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={formUserId} onChange={(e) => setFormUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required><option value="">Selecione...</option>{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-300 mb-1">Template</label><select value={formTemplateId} onChange={(e) => setFormTemplateId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required><option value="">Selecione...</option>{templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.durationDays} dias)</option>)}</select></div><div><label className="block text-sm font-medium text-gray-300 mb-1">Data de Início</label><input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div></div><div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Iniciar Onboarding</button><button type="button" onClick={() => setShowNewProcess(false)} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button></div></form>)}
      {showNewTemplate && (<form onSubmit={handleCreateTemplate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-6 space-y-4"><h2 className="text-lg font-semibold text-gray-100">Novo Template de Onboarding</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-300 mb-1">Nome</label><input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Onboarding Desenvolvedor" required /></div><div><label className="block text-sm font-medium text-gray-300 mb-1">Duração (dias)</label><input type="number" value={tplDurationDays} onChange={(e) => setTplDurationDays(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" min={1} /></div></div><div><label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label><textarea value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" rows={2} /></div><div><div className="flex items-center justify-between mb-2"><label className="block text-sm font-medium text-gray-300">Tarefas do Template</label><button type="button" onClick={addTemplateTask} className="text-sm text-emerald-400 hover:text-emerald-200">+ Adicionar Tarefa</button></div>{tplTasks.map((task, i) => (<div key={i} className="flex gap-2 mb-2 items-center"><input type="text" value={task.title} onChange={(e) => updateTemplateTask(i, 'title', e.target.value)} className="flex-1 border border-green-700/40 rounded-lg px-3 py-2 text-sm" placeholder="Título da tarefa" /><select value={task.type} onChange={(e) => updateTemplateTask(i, 'type', e.target.value)} className="border border-green-700/40 rounded-lg px-2 py-2 text-sm">{Object.entries(taskTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input type="number" value={task.dueDay} onChange={(e) => updateTemplateTask(i, 'dueDay', Number(e.target.value))} className="w-20 border border-green-700/40 rounded-lg px-2 py-2 text-sm" min={1} /><select value={task.assignedTo} onChange={(e) => updateTemplateTask(i, 'assignedTo', e.target.value)} className="border border-green-700/40 rounded-lg px-2 py-2 text-sm">{Object.entries(assigneeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button type="button" onClick={() => removeTemplateTask(i)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button></div>))}</div><div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Criar Template</button><button type="button" onClick={() => setShowNewTemplate(false)} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button></div></form>)}
      {activeTab === 'processes' && (<><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-green-700/40 rounded-lg px-3 py-2 text-sm"><option value="">Todos os status</option><option value="ACTIVE">Ativo</option><option value="COMPLETED">Concluído</option><option value="CANCELLED">Cancelado</option></select>{filtered.length === 0 ? (<div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhum processo de onboarding encontrado.</p><p className="text-gray-400 text-sm mt-1">Crie um template e inicie o primeiro processo clicando no botão acima.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((proc) => { const total = proc.tasks.length; const done = proc.tasks.filter((t) => t.status === 'COMPLETED').length; const pct = total > 0 ? Math.round((done / total) * 100) : 0; return (<Link key={proc.id} href={`/onboarding/${proc.id}`} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 hover:shadow-md transition-shadow"><div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-100">{proc.user.name}</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[proc.status]}`}>{statusLabels[proc.status]}</span></div><p className="text-sm text-gray-400 mb-1">{proc.user.jobTitle || 'Sem cargo'}</p><p className="text-xs text-gray-400 mb-3">Template: {proc.template.name}</p><div className="mb-2"><div className="flex justify-between text-xs text-gray-400 mb-1"><span>{done}/{total} tarefas</span><span>{pct}%</span></div><div className="w-full bg-green-800/40 rounded-full h-2"><div className="bg-green-700 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div><p className="text-xs text-gray-400">Início: {new Date(proc.startDate).toLocaleDateString('pt-BR')}</p></Link>); })}</div>)}</>)}
      {activeTab === 'templates' && (<>{templates.length === 0 ? (<div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhum template de onboarding encontrado.</p><p className="text-gray-400 text-sm mt-1">Crie seu primeiro template clicando no botão acima.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{templates.map((tpl) => (<div key={tpl.id} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4"><h3 className="font-medium text-gray-100 mb-1">{tpl.name}</h3>{tpl.description && <p className="text-sm text-gray-400 mb-2">{tpl.description}</p>}<div className="flex items-center gap-3 text-xs text-gray-400"><span>{tpl.durationDays} dias</span><span>{tpl.tasks.length} tarefas</span><span>{tpl._count.processes} processos</span></div>{tpl.department && <p className="text-xs text-gray-400 mt-1">Depto: {tpl.department.name}</p>}</div>))}</div>)}</>)}
    </div>
  );
}
