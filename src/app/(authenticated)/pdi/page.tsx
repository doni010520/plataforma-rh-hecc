'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Task { id: string; title: string; status: string; type: string; }
interface Plan {
  id: string; title: string; description: string; status: string;
  dueDate: string | null; createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  createdBy: { id: string; name: string };
  tasks: Task[];
  _count: { comments: number };
}

const statusLabels: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };
const statusColors: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-700', ACTIVE: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' };


function getProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === 'COMPLETED').length / tasks.length) * 100);
}

export default function PDIPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tasks, setTasks] = useState<{ title: string; type: string; resourceUrl: string; dueDate: string }[]>([]);

  const fetchPlans = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    const res = await fetch('/api/pdi?' + params.toString());
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function addTask() { setTasks([...tasks, { title: '', type: 'COURSE', resourceUrl: '', dueDate: '' }]); }
  function removeTask(i: number) { setTasks(tasks.filter((_, idx) => idx !== i)); }
  function updateTask(i: number, field: string, value: string) { setTasks(tasks.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    const res = await fetch('/api/pdi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, dueDate: dueDate || null, tasks: tasks.filter((t) => t.title.trim()) }) });
    if (!res.ok) { const data = await res.json(); setError(data.error || 'Erro ao criar PDI.'); setSaving(false); return; }
    setSaving(false); setShowForm(false); setTitle(''); setDescription(''); setDueDate(''); setTasks([]); fetchPlans();
  }

  if (loading) return <div className="space-y-4"><div className="h-8 w-48 bg-gray-200 rounded animate-pulse" /><div className="h-64 bg-gray-200 rounded animate-pulse" /></div>;

  const activeCount = plans.filter((p) => p.status === 'ACTIVE').length;
  const completedCount = plans.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planos de Desenvolvimento</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium text-sm">{showForm ? 'Cancelar' : '+ Novo PDI'}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4"><h3 className="text-sm font-medium text-gray-500 mb-1">Total de PDIs</h3><p className="text-2xl font-bold text-gray-900">{plans.length}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><h3 className="text-sm font-medium text-gray-500 mb-1">Em Andamento</h3><p className="text-2xl font-bold text-blue-600">{activeCount}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><h3 className="text-sm font-medium text-gray-500 mb-1">Concluídos</h3><p className="text-2xl font-bold text-green-600">{completedCount}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
          <option value="">Todos os status</option><option value="DRAFT">Rascunho</option><option value="ACTIVE">Em andamento</option><option value="COMPLETED">Concluído</option><option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Plano de Desenvolvimento</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" placeholder="Ex: Desenvolver habilidades de liderança" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" placeholder="Descreva o objetivo do plano..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Limite</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><label className="block text-sm font-medium text-gray-700">Tarefas</label><button type="button" onClick={addTask} className="text-sm text-green-700 hover:text-green-900 font-medium">+ Adicionar tarefa</button></div>
              {tasks.length === 0 ? <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-md">Nenhuma tarefa adicionada.</p> : (
                <div className="space-y-3">{tasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-md">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2"><input type="text" value={task.title} onChange={(e) => updateTask(i, 'title', e.target.value)} placeholder="Título da tarefa" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></div>
                      <select value={task.type} onChange={(e) => updateTask(i, 'type', e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600"><option value="COURSE">Curso</option><option value="BOOK">Livro</option><option value="MENTORING">Mentoria</option><option value="PRACTICE">Prática</option><option value="OTHER">Outro</option></select>
                      <input type="date" value={task.dueDate} onChange={(e) => updateTask(i, 'dueDate', e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                    </div>
                    <button type="button" onClick={() => removeTask(i)} className="text-red-500 hover:text-red-700 p-1 mt-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}</div>
              )}
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
            <button type="submit" disabled={saving} className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium">{saving ? 'Criando...' : 'Criar PDI'}</button>
          </form>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center"><p className="text-gray-500">Nenhum PDI encontrado.</p><p className="text-sm text-gray-400 mt-1">Crie seu primeiro plano de desenvolvimento clicando no botão acima.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{plans.map((plan) => {
          const progress = getProgress(plan.tasks);
          return (
            <Link key={plan.id} href={'/pdi/' + plan.id} className="block bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {plan.user.avatarUrl ? <img src={plan.user.avatarUrl} alt={plan.user.name} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-medium">{plan.user.name.charAt(0)}</div>}
                  <div><p className="font-medium text-sm text-gray-900">{plan.user.name}</p><p className="text-xs text-gray-500">{plan.user.jobTitle}</p></div>
                </div>
                <span className={'inline-flex px-2 py-0.5 text-xs font-medium rounded-full ' + (statusColors[plan.status] || '')}>{statusLabels[plan.status]}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{plan.title}</h3>
              {plan.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{plan.description}</p>}
              <div className="mb-3"><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Progresso</span><span className="font-medium text-gray-900">{progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-700 h-2 rounded-full transition-all" style={{ width: progress + '%' }} /></div></div>
              <div className="flex justify-between text-xs text-gray-500"><span>{plan.tasks.length} tarefas</span><span>{plan._count.comments} comentários</span></div>
              {plan.dueDate && <p className="text-xs text-gray-400 mt-2">Prazo: {new Date(plan.dueDate).toLocaleDateString('pt-BR')}</p>}
            </Link>
          );
        })}</div>
      )}
    </div>
  );
}
