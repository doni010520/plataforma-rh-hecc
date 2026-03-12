'use client';

import { useState, useEffect, useCallback } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetDepartments: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  author: { id: string; name: string };
  isRead?: boolean;
  _count?: { reads: number };
}

interface Department {
  id: string;
  name: string;
}

export default function ComunicadosPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetDepts, setTargetDepts] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    // Try admin view first
    let res = await fetch('/api/comunicados?view=admin');
    if (res.ok) {
      const data = await res.json();
      setAnnouncements(data);
      setIsAdmin(true);
    } else {
      // Fallback to user view
      res = await fetch('/api/comunicados?view=received');
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    }
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments');
    if (res.ok) {
      const data = await res.json();
      setDepartments(data);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    fetchDepartments();
  }, [fetchAnnouncements, fetchDepartments]);

  async function markAsRead(announcementId: string) {
    await fetch(`/api/comunicados/${announcementId}/read`, { method: 'POST' });
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, isRead: true } : a)),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/comunicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        targetDepartments: targetDepts,
        scheduledAt: scheduledAt || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setTitle('');
    setContent('');
    setTargetDepts([]);
    setScheduledAt('');
    fetchAnnouncements();
  }

  async function handleSendNow(id: string) {
    await fetch(`/api/comunicados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ send: true }),
    });
    fetchAnnouncements();
  }

  function toggleDept(deptId: string) {
    setTargetDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId],
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-green-800/40 rounded animate-pulse" />
        <div className="h-64 bg-green-800/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Comunicados</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium text-sm"
          >
            {showForm ? 'Cancelar' : '+ Novo Comunicado'}
          </button>
        )}
      </div>

      {/* Create Form (Admin) */}
      {showForm && (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Novo Comunicado</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Título do comunicado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Conteúdo</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                className="w-full px-3 py-2 border border-green-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Conteúdo do comunicado..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Departamentos (deixe vazio para todos)
              </label>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      targetDepts.includes(dept.id)
                        ? 'bg-green-700 text-white'
                        : 'bg-green-900/40 text-gray-400 hover:bg-green-800/40'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Agendamento (opcional, deixe vazio para enviar imediatamente)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-3 py-2 border border-green-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            {error && (
              <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md">{error}</div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium"
            >
              {saving ? 'Criando...' : scheduledAt ? 'Agendar Comunicado' : 'Enviar Agora'}
            </button>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">Nenhum comunicado encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const isExpanded = expandedId === a.id;
            const targets: string[] = JSON.parse(a.targetDepartments);
            const targetNames = targets.length > 0
              ? departments.filter((d) => targets.includes(d.id)).map((d) => d.name)
              : [];

            return (
              <div
                key={a.id}
                className={`bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm overflow-hidden ${
                  !isAdmin && !a.isRead ? 'border-l-4 border-green-600' : ''
                }`}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-green-900/30 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : a.id);
                    if (!isAdmin && !a.isRead) markAsRead(a.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!isAdmin && !a.isRead && (
                          <span className="w-2 h-2 bg-emerald-900/300 rounded-full flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-gray-100">{a.title}</h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {a.author.name} &middot;{' '}
                        {a.sentAt
                          ? new Date(a.sentAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Agendado'}
                      </p>
                      {targetNames.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Para: {targetNames.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && !a.sentAt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendNow(a.id);
                          }}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 font-medium"
                        >
                          Enviar
                        </button>
                      )}
                      {isAdmin && a.sentAt && a._count && (
                        <span className="text-xs text-gray-400">
                          {a._count.reads} leitura(s)
                        </span>
                      )}
                      {!a.sentAt && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-400">
                          Agendado
                        </span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-green-800/20 pt-4">
                    <div className="prose prose-sm max-w-none text-gray-300 whitespace-pre-wrap">
                      {a.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
