'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface LearningTrack {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  createdBy: { id: string; name: string };
  _count: { contents: number; enrollments: number };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const statusLabels: Record<string, string> = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', ARCHIVED: 'Arquivada' };
const statusColors: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-800', PUBLISHED: 'bg-green-100 text-green-800', ARCHIVED: 'bg-yellow-100 text-yellow-800' };
const contentTypeLabels: Record<string, string> = { VIDEO: 'Vídeo', ARTICLE: 'Artigo', COURSE: 'Curso', PODCAST: 'Podcast', BOOK: 'Livro', OTHER: 'Outro' };

export default function TrilhasPage() {
  const [tracks, setTracks] = useState<LearningTrack[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewTrack, setShowNewTrack] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formHours, setFormHours] = useState(0);
  const [formContents, setFormContents] = useState<{ title: string; type: string; contentUrl: string; durationMinutes: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [tracksRes, empRes] = await Promise.all([fetch('/api/trilhas'), fetch('/api/colaboradores')]);
      if (tracksRes.ok) setTracks(await tracksRes.json());
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(Array.isArray(data) ? data : data.users || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    const res = await fetch('/api/trilhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formTitle,
        description: formDescription,
        category: formCategory,
        estimatedHours: formHours,
        contents: formContents.filter((c) => c.title.trim()),
      }),
    });
    if (res.ok) {
      setShowNewTrack(false);
      setFormTitle('');
      setFormDescription('');
      setFormCategory('');
      setFormHours(0);
      setFormContents([]);
      fetchData();
    }
  };

  const addContent = () => setFormContents([...formContents, { title: '', type: 'VIDEO', contentUrl: '', durationMinutes: 0 }]);
  const updateContent = (i: number, field: string, value: string | number) => {
    const updated = [...formContents];
    (updated[i] as Record<string, string | number>)[field] = value;
    setFormContents(updated);
  };
  const removeContent = (i: number) => setFormContents(formContents.filter((_, idx) => idx !== i));

  const filtered = statusFilter ? tracks.filter((t) => t.status === statusFilter) : tracks;
  const publishedCount = tracks.filter((t) => t.status === 'PUBLISHED').length;
  const totalEnrollments = tracks.reduce((sum, t) => sum + t._count.enrollments, 0);

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trilhas de Desenvolvimento</h1>
        <button onClick={() => setShowNewTrack(!showNewTrack)} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">+ Nova Trilha</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Total de Trilhas</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{tracks.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Publicadas</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{publishedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Total de Inscrições</h3>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalEnrollments}</p>
        </div>
      </div>

      {showNewTrack && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Nova Trilha de Desenvolvimento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Liderança para Gestores" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Liderança, Técnico" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas Estimadas</label>
              <input type="number" value={formHours} onChange={(e) => setFormHours(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Conteúdos da Trilha</label>
              <button type="button" onClick={addContent} className="text-sm text-green-700 hover:text-green-900">+ Adicionar Conteúdo</button>
            </div>
            {formContents.map((content, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input type="text" value={content.title} onChange={(e) => updateContent(i, 'title', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Título do conteúdo" />
                <select value={content.type} onChange={(e) => updateContent(i, 'type', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm">
                  {Object.entries(contentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="text" value={content.contentUrl} onChange={(e) => updateContent(i, 'contentUrl', e.target.value)} className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="URL do conteúdo" />
                <input type="number" value={content.durationMinutes} onChange={(e) => updateContent(i, 'durationMinutes', Number(e.target.value))} className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm" min={0} placeholder="min" />
                <button type="button" onClick={() => removeContent(i)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Criar Trilha</button>
            <button type="button" onClick={() => setShowNewTrack(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicada</option>
          <option value="ARCHIVED">Arquivada</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhuma trilha de desenvolvimento encontrada.</p>
          <p className="text-gray-400 text-sm mt-1">Crie sua primeira trilha clicando no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((track) => (
            <Link key={track.id} href={`/trilhas/${track.id}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 truncate">{track.title}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[track.status]}`}>{statusLabels[track.status]}</span>
              </div>
              {track.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{track.description}</p>}
              {track.category && <p className="text-xs text-green-700 font-medium mb-2">{track.category}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{track._count.contents} conteúdos</span>
                <span>{track._count.enrollments} inscritos</span>
                {track.estimatedHours > 0 && <span>{track.estimatedHours}h</span>}
              </div>
              <p className="text-xs text-gray-400 mt-2">Por {track.createdBy.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
