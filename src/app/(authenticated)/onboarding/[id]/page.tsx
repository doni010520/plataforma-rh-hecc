'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OnboardingProcess { id: string; startDate: string; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; completedAt: string | null; user: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null; email: string }; template: { id: string; name: string; durationDays: number }; tasks: { id: string; title: string; description: string; type: string; dueDate: string; assignedTo: string; status: 'PENDING' | 'COMPLETED'; completedAt: string | null; note: string }[]; evaluations: { id: string; period: string; score: number; comment: string; createdAt: string; evaluator: { id: string; name: string } }[]; }

const statusColors: Record<string, string> = { ACTIVE: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-gray-100 text-gray-800' };
const taskTypeLabels: Record<string, string> = { DOCUMENT: 'Documento', MEETING: 'Reunião', TRAINING: 'Treinamento', SYSTEM_ACCESS: 'Acesso ao Sistema', OTHER: 'Outro' };
const assigneeLabels: Record<string, string> = { EMPLOYEE: 'Colaborador', MANAGER: 'Gestor', HR: 'RH' };
const periodLabels: Record<string, string> = { THIRTY: '30 dias', SIXTY: '60 dias', NINETY: '90 dias' };

export default function OnboardingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [process, setProcess] = useState<OnboardingProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalPeriod, setEvalPeriod] = useState('THIRTY');
  const [evalScore, setEvalScore] = useState(5);
  const [evalComment, setEvalComment] = useState('');

  const fetchProcess = useCallback(async () => {
    try { const res = await fetch(`/api/onboarding/processes/${params.id}`); if (res.ok) setProcess(await res.json()); }
    catch (err) { console.error('Erro ao carregar processo:', err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchProcess(); }, [fetchProcess]);

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await fetch(`/api/onboarding/processes/${params.id}/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    fetchProcess();
  };

  const updateStatus = async (newStatus: string) => {
    await fetch(`/api/onboarding/processes/${params.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    fetchProcess();
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este processo?')) return;
    await fetch(`/api/onboarding/processes/${params.id}`, { method: 'DELETE' });
    router.push('/onboarding');
  };

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/onboarding/processes/${params.id}/evaluations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period: evalPeriod, score: evalScore, comment: evalComment }) });
    if (res.ok) { setShowEvalForm(false); setEvalPeriod('THIRTY'); setEvalScore(5); setEvalComment(''); fetchProcess(); }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>);
  if (!process) return (<div className="text-center py-12"><p className="text-gray-500">Processo não encontrado.</p><Link href="/onboarding" className="text-green-700 hover:text-green-900 text-sm mt-2 inline-block">← Voltar para Onboarding</Link></div>);

  const totalTasks = process.tasks.length;
  const completedTasks = process.tasks.filter((t) => t.status === 'COMPLETED').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/onboarding" className="text-sm text-green-700 hover:text-green-900">← Voltar para Onboarding</Link>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{process.user.name}</h1>
            <p className="text-gray-500">{process.user.jobTitle || 'Sem cargo'} — {process.user.email}</p>
            <p className="text-sm text-gray-400 mt-1">Template: {process.template.name} ({process.template.durationDays} dias)</p>
            <p className="text-sm text-gray-400">Início: {new Date(process.startDate).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={process.status} onChange={(e) => updateStatus(e.target.value)} className={`text-sm px-3 py-1 rounded-full font-medium border-0 ${statusColors[process.status]}`}><option value="ACTIVE">Ativo</option><option value="COMPLETED">Concluído</option><option value="CANCELLED">Cancelado</option></select>
            <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-sm px-2 py-1">Excluir</button>
          </div>
        </div>
        <div className="mt-4"><div className="flex justify-between text-sm text-gray-500 mb-1"><span>Progresso: {completedTasks}/{totalTasks} tarefas</span><span>{progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-green-700 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} /></div></div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarefas</h2>
        {process.tasks.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma tarefa neste processo.</p> : (
          <div className="space-y-3">{process.tasks.map((task) => { const isOverdue = task.status === 'PENDING' && new Date(task.dueDate) < new Date(); return (<div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}><input type="checkbox" checked={task.status === 'COMPLETED'} onChange={() => toggleTask(task.id, task.status)} className="mt-1 h-4 w-4 text-green-700 rounded" /><div className="flex-1"><p className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>{task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}<div className="flex items-center gap-3 mt-1 text-xs text-gray-400"><span>{taskTypeLabels[task.type] || task.type}</span><span>Responsável: {assigneeLabels[task.assignedTo] || task.assignedTo}</span><span className={isOverdue ? 'text-red-500 font-medium' : ''}>Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>{task.completedAt && <span className="text-green-500">Concluído: {new Date(task.completedAt).toLocaleDateString('pt-BR')}</span>}</div></div></div>); })}</div>
        )}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-900">Avaliações</h2><button onClick={() => setShowEvalForm(!showEvalForm)} className="text-sm text-green-700 hover:text-green-900">+ Nova Avaliação</button></div>
        {showEvalForm && (<form onSubmit={handleCreateEvaluation} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Período</label><select value={evalPeriod} onChange={(e) => setEvalPeriod(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="THIRTY">30 dias</option><option value="SIXTY">60 dias</option><option value="NINETY">90 dias</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Nota (1-10)</label><input type="number" value={evalScore} onChange={(e) => setEvalScore(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={1} max={10} /></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Comentário</label><textarea value={evalComment} onChange={(e) => setEvalComment(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} /></div><div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Salvar Avaliação</button><button type="button" onClick={() => setShowEvalForm(false)} className="px-4 py-2 text-gray-600 text-sm">Cancelar</button></div></form>)}
        {process.evaluations.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma avaliação registrada.</p> : (
          <div className="space-y-3">{process.evaluations.map((ev) => (<div key={ev.id} className="border border-gray-200 rounded-lg p-4"><div className="flex items-center justify-between mb-1"><span className="font-medium text-gray-900">{periodLabels[ev.period] || ev.period}</span><span className="text-lg font-bold text-green-700">{ev.score}/10</span></div>{ev.comment && <p className="text-sm text-gray-600 mt-1">{ev.comment}</p>}<p className="text-xs text-gray-400 mt-2">Avaliador: {ev.evaluator.name} — {new Date(ev.createdAt).toLocaleDateString('pt-BR')}</p></div>))}</div>
        )}
      </div>
    </div>
  );
}
