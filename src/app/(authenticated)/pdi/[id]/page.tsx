'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const taskTypeLabels: Record<string, string> = { COURSE: 'Curso', BOOK: 'Livro', MENTORING: 'Mentoria', PRACTICE: 'Prática', OTHER: 'Outro' };

interface PDITask {
  id: string;
  title: string;
  status: string;
  type: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface PDIComment {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
}

interface PDIPlan {
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  user: { name: string; avatarUrl: string | null; jobTitle: string | null };
  createdBy: { name: string };
  reviewCycle: { name: string } | null;
  tasks: PDITask[];
  comments: PDIComment[];
}

export default function PDIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<PDIPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('COURSE');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/pdi/' + params.id);
    if (res.ok) { setPlan(await res.json()); }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const res = await fetch('/api/pdi/' + params.id + '/tasks/' + taskId, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setPlan((prev: PDIPlan | null) => prev ? { ...prev, tasks: prev.tasks.map((t: PDITask) => t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null } : t) } : prev);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    const res = await fetch('/api/pdi/' + params.id + '/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    });
    if (res.ok) { const c = await res.json(); setPlan((prev: PDIPlan | null) => prev ? { ...prev, comments: [c, ...prev.comments] } : prev); setComment(''); }
    setSendingComment(false);
  }

  async function updateStatus(status: string) {
    await fetch('/api/pdi/' + params.id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setPlan((prev: PDIPlan | null) => prev ? { ...prev, status } : prev);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    const res = await fetch('/api/pdi/' + params.id + '/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, type: newTaskType, dueDate: newTaskDueDate || null }),
    });
    if (res.ok) { const task = await res.json(); setPlan((prev: PDIPlan | null) => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev); setNewTaskTitle(''); setNewTaskType('COURSE'); setNewTaskDueDate(''); setShowAddTask(false); }
    setSavingTask(false);
  }

  async function deleteTask(taskId: string) {
    const res = await fetch('/api/pdi/' + params.id + '/tasks/' + taskId, { method: 'DELETE' });
    if (res.ok) { setPlan((prev: PDIPlan | null) => prev ? { ...prev, tasks: prev.tasks.filter((t: PDITask) => t.id !== taskId) } : prev); }
  }

  async function deletePlan() {
    if (!confirm('Tem certeza que deseja excluir este PDI?')) return;
    const res = await fetch('/api/pdi/' + params.id, { method: 'DELETE' });
    if (res.ok) router.push('/pdi');
  }

  if (loading) return <div className="space-y-4"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /><div className="h-96 bg-gray-200 rounded animate-pulse" /></div>;
  if (!plan) return <div className="text-center py-12"><p className="text-gray-500">PDI não encontrado.</p><Link href="/pdi" className="text-green-700 hover:underline">Voltar</Link></div>;

  const progress = plan.tasks.length > 0 ? Math.round((plan.tasks.filter((t: PDITask) => t.status === 'COMPLETED').length / plan.tasks.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/pdi" className="text-green-700 hover:underline text-sm mb-4 inline-block">← Voltar para PDIs</Link>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {plan.user.avatarUrl ? <img src={plan.user.avatarUrl} alt={plan.user.name} className="w-12 h-12 rounded-full" /> : <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-800 text-lg font-medium">{plan.user.name.charAt(0)}</div>}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
              <p className="text-gray-600">{plan.user.name} {plan.user.jobTitle ? '• ' + plan.user.jobTitle : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={plan.status} onChange={(e) => updateStatus(e.target.value)} className="border rounded-lg px-3 py-1 text-sm">
              <option value="DRAFT">Rascunho</option><option value="ACTIVE">Em andamento</option><option value="COMPLETED">Concluído</option><option value="CANCELLED">Cancelado</option>
            </select>
            <button onClick={deletePlan} className="text-red-500 hover:text-red-700 p-1" title="Excluir PDI">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        {plan.description && <p className="text-gray-700 mb-4">{plan.description}</p>}
        <div className="flex gap-6 text-sm text-gray-500 mb-4">
          {plan.dueDate && <span>Prazo: {new Date(plan.dueDate).toLocaleDateString('pt-BR')}</span>}
          {plan.reviewCycle && <span>Ciclo: {plan.reviewCycle.name}</span>}
          <span>Criado por: {plan.createdBy.name}</span>
        </div>
        <div><div className="flex justify-between text-sm mb-1"><span>Progresso geral</span><span className="font-medium">{progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-green-700 h-3 rounded-full transition-all" style={{ width: progress + '%' }} /></div></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Tarefas ({plan.tasks.length})</h2>
          <button onClick={() => setShowAddTask(!showAddTask)} className="text-sm text-green-700 hover:text-green-900 font-medium">{showAddTask ? 'Cancelar' : '+ Adicionar tarefa'}</button>
        </div>
        {showAddTask && (
          <form onSubmit={addTask} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="md:col-span-2"><input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Título da tarefa" required className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" /></div>
              <select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"><option value="COURSE">Curso</option><option value="BOOK">Livro</option><option value="MENTORING">Mentoria</option><option value="PRACTICE">Prática</option><option value="OTHER">Outro</option></select>
              <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
            </div>
            <button type="submit" disabled={savingTask} className="bg-green-700 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-800 disabled:opacity-50">{savingTask ? 'Salvando...' : 'Adicionar'}</button>
          </form>
        )}
        {plan.tasks.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhuma tarefa cadastrada</p> : (
          <div className="space-y-2">{plan.tasks.map((task: PDITask) => (
            <div key={task.id} className={'border rounded-lg p-3 flex items-start gap-3 ' + (task.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : '')}>
              <button onClick={() => toggleTaskStatus(task.id, task.status)} className={'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ' + (task.status === 'COMPLETED' ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-600')}>
                {task.status === 'COMPLETED' && '✓'}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={'font-medium text-sm ' + (task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900')}>{task.title}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{taskTypeLabels[task.type] || task.type}</span>
                </div>
                {task.dueDate && <p className="text-xs text-gray-500">Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}</p>}
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          ))}</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">Comentários ({plan.comments.length})</h2>
        <form onSubmit={addComment} className="mb-6">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adicione um comentário..." className="w-full border rounded-lg px-3 py-2 mb-2 text-sm" rows={3} />
          <button type="submit" disabled={sendingComment || !comment.trim()} className="bg-green-700 text-white px-4 py-2 rounded-md text-sm hover:bg-green-800 disabled:opacity-50">{sendingComment ? 'Enviando...' : 'Comentar'}</button>
        </form>
        {plan.comments.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhum comentário ainda</p> : (
          <div className="space-y-4">{plan.comments.map((c: PDIComment) => (
            <div key={c.id} className="flex gap-3">
              {c.user.avatarUrl ? <img src={c.user.avatarUrl} alt={c.user.name} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">{c.user.name.charAt(0)}</div>}
              <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{c.user.name}</span><span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span></div><p className="text-sm text-gray-700">{c.content}</p></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
