'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LearningContent {
  id: string;
  title: string;
  description: string;
  type: string;
  contentUrl: string | null;
  durationMinutes: number;
  order: number;
  required: boolean;
  _count: { progress: number };
}

interface ContentProgress {
  id: string;
  contentId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  notes: string;
}

interface Enrollment {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  enrolledAt: string;
  completedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  progress: ContentProgress[];
}

interface TrackDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  createdBy: { id: string; name: string };
  contents: LearningContent[];
  enrollments: Enrollment[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const statusLabels: Record<string, string> = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', ARCHIVED: 'Arquivada' };
const statusColors: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-800', PUBLISHED: 'bg-green-100 text-green-800', ARCHIVED: 'bg-yellow-100 text-yellow-800' };
const contentTypeLabels: Record<string, string> = { VIDEO: 'Vídeo', ARTICLE: 'Artigo', COURSE: 'Curso', PODCAST: 'Podcast', BOOK: 'Livro', OTHER: 'Outro' };
const progressLabels: Record<string, string> = { NOT_STARTED: 'Não Iniciado', IN_PROGRESS: 'Em Andamento', COMPLETED: 'Concluído' };
const progressColors: Record<string, string> = { NOT_STARTED: 'text-gray-400', IN_PROGRESS: 'text-blue-600', COMPLETED: 'text-green-600' };
const enrollStatusLabels: Record<string, string> = { ACTIVE: 'Ativo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };
const enrollStatusColors: Record<string, string> = { ACTIVE: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-gray-100 text-gray-800' };

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contents' | 'enrollments'>('contents');
  const [showAddContent, setShowAddContent] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState('VIDEO');
  const [contentUrl, setContentUrl] = useState('');
  const [contentDuration, setContentDuration] = useState(0);
  const [contentDescription, setContentDescription] = useState('');
  const [enrollUserId, setEnrollUserId] = useState('');
  const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [trackRes, empRes] = await Promise.all([
        fetch(`/api/trilhas/${id}`),
        fetch('/api/colaboradores'),
      ]);
      if (trackRes.ok) {
        const data = await trackRes.json();
        setTrack(data);
        // Find current user's enrollment (if any)
        // We'll determine this from the enrollment list — the API might filter for EMPLOYEE role
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(Array.isArray(data) ? data : data.users || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (newStatus: string) => {
    if (!track) return;
    const res = await fetch(`/api/trilhas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchData();
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta trilha?')) return;
    const res = await fetch(`/api/trilhas/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/trilhas');
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle || !contentType) return;
    const res = await fetch(`/api/trilhas/${id}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: contentTitle,
        description: contentDescription,
        type: contentType,
        contentUrl: contentUrl || null,
        durationMinutes: contentDuration,
      }),
    });
    if (res.ok) {
      setShowAddContent(false);
      setContentTitle('');
      setContentType('VIDEO');
      setContentUrl('');
      setContentDuration(0);
      setContentDescription('');
      fetchData();
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    const res = await fetch(`/api/trilhas/${id}/contents/${contentId}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/trilhas/${id}/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: enrollUserId || undefined }),
    });
    if (res.ok) {
      setShowEnroll(false);
      setEnrollUserId('');
      fetchData();
    }
  };

  const handleSelfEnroll = async () => {
    const res = await fetch(`/api/trilhas/${id}/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) fetchData();
  };

  const handleProgressUpdate = async (enrollmentId: string, contentId: string, status: string) => {
    const res = await fetch(`/api/trilhas/${id}/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, status }),
    });
    if (res.ok) fetchData();
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>);
  if (!track) return (<div className="text-center py-12"><p className="text-gray-500">Trilha não encontrada.</p><Link href="/trilhas" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">Voltar para Trilhas</Link></div>);

  const totalContents = track.contents.length;
  const totalDuration = track.contents.reduce((sum, c) => sum + c.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trilhas" className="hover:text-indigo-600">← Voltar para Trilhas</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{track.title}</h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[track.status]}`}>{statusLabels[track.status]}</span>
            </div>
            {track.description && <p className="text-gray-600 mb-2">{track.description}</p>}
            {track.category && <p className="text-sm text-indigo-600 font-medium mb-2">{track.category}</p>}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{totalContents} conteúdos</span>
              {totalDuration > 0 && <span>{Math.floor(totalDuration / 60)}h{totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}</span>}
              <span>{track.enrollments.length} inscritos</span>
              <span>Por {track.createdBy.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={track.status} onChange={(e) => handleStatusChange(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicada</option>
              <option value="ARCHIVED">Arquivada</option>
            </select>
            <button onClick={handleDelete} className="px-3 py-2 text-red-600 hover:text-red-800 text-sm">Excluir</button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button onClick={() => setActiveTab('contents')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Conteúdos ({totalContents})</button>
          <button onClick={() => setActiveTab('enrollments')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'enrollments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Inscrições ({track.enrollments.length})</button>
        </nav>
      </div>

      {activeTab === 'contents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddContent(!showAddContent)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">+ Adicionar Conteúdo</button>
          </div>

          {showAddContent && (
            <form onSubmit={handleAddContent} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input type="text" value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(contentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                  <input type="number" value={contentDuration} onChange={(e) => setContentDuration(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Conteúdo</label>
                <input type="text" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={contentDescription} onChange={(e) => setContentDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Adicionar</button>
                <button type="button" onClick={() => setShowAddContent(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">Cancelar</button>
              </div>
            </form>
          )}

          {track.contents.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum conteúdo adicionado.</p>
              <p className="text-gray-400 text-sm mt-1">Adicione conteúdos à trilha para que os colaboradores possam acompanhar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {track.contents.map((content, index) => (
                <div key={content.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{content.title}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{contentTypeLabels[content.type] || content.type}</span>
                      {content.required && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded">Obrigatório</span>}
                    </div>
                    {content.description && <p className="text-sm text-gray-500 mt-1">{content.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      {content.durationMinutes > 0 && <span>{content.durationMinutes} min</span>}
                      {content.contentUrl && <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Acessar</a>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteContent(content.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={handleSelfEnroll} className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-medium">Inscrever-me</button>
            <button onClick={() => setShowEnroll(!showEnroll)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">+ Inscrever Colaborador</button>
          </div>

          {showEnroll && (
            <form onSubmit={handleEnroll} className="bg-white rounded-lg border border-gray-200 p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                <select value={enrollUserId} onChange={(e) => setEnrollUserId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Selecione...</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Inscrever</button>
              <button type="button" onClick={() => setShowEnroll(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">Cancelar</button>
            </form>
          )}

          {track.enrollments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum colaborador inscrito nesta trilha.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {track.enrollments.map((enrollment) => {
                const total = track.contents.length;
                const completed = enrollment.progress.filter((p) => p.status === 'COMPLETED').length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={enrollment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">{enrollment.user.name.charAt(0)}</div>
                        <div>
                          <p className="font-medium text-gray-900">{enrollment.user.name}</p>
                          <p className="text-xs text-gray-500">{enrollment.user.jobTitle || 'Sem cargo'}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${enrollStatusColors[enrollment.status]}`}>{enrollStatusLabels[enrollment.status]}</span>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{completed}/{total} conteúdos</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {track.contents.map((content) => {
                        const prog = enrollment.progress.find((p) => p.contentId === content.id);
                        const currentStatus = prog?.status || 'NOT_STARTED';
                        return (
                          <div key={content.id} className="flex items-center justify-between text-sm py-1">
                            <span className={`${currentStatus === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{content.title}</span>
                            <select
                              value={currentStatus}
                              onChange={(e) => handleProgressUpdate(enrollment.id, content.id, e.target.value)}
                              className={`text-xs border-0 bg-transparent font-medium cursor-pointer ${progressColors[currentStatus]}`}
                            >
                              <option value="NOT_STARTED">Não Iniciado</option>
                              <option value="IN_PROGRESS">Em Andamento</option>
                              <option value="COMPLETED">Concluído</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Inscrito em {new Date(enrollment.enrolledAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
