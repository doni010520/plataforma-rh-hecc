'use client';

import { useState, useEffect, useCallback } from 'react';

interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; name: string };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Celebration {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  reactions: Reaction[];
  comments: Comment[];
  _count: { comments: number };
}

const typeLabels: Record<string, string> = {
  ACHIEVEMENT: 'Conquista',
  BIRTHDAY: 'Aniversário',
  ANNIVERSARY: 'Aniversário de Empresa',
  GENERAL: 'Geral',
};

const typeIcons: Record<string, string> = {
  ACHIEVEMENT: '🏆',
  BIRTHDAY: '🎂',
  ANNIVERSARY: '🎉',
  GENERAL: '⭐',
};

const reactionEmojis = ['👏', '❤️', '🎉', '🔥', '💪'];

export default function MuralPage() {
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Comment state
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const fetchCelebrations = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (filterType) params.set('type', filterType);

    const res = await fetch(`/api/mural?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCelebrations(data.data);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [page, filterType]);

  useEffect(() => {
    fetchCelebrations();
  }, [fetchCelebrations]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/mural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setContent('');
    setType('GENERAL');
    fetchCelebrations();
  }

  async function handleReaction(celebrationId: string, emoji: string) {
    const celebration = celebrations.find((c) => c.id === celebrationId);
    const existingReaction = celebration?.reactions.find(
      (r) => r.emoji === emoji && r.user.id === celebration?.author.id,
    );

    if (existingReaction) {
      await fetch(`/api/mural/${celebrationId}/reactions`, { method: 'DELETE' });
    } else {
      await fetch(`/api/mural/${celebrationId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    }

    fetchCelebrations();
  }

  async function handleComment(celebrationId: string) {
    if (!commentText.trim()) return;

    await fetch(`/api/mural/${celebrationId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    });

    setCommentingId(null);
    setCommentText('');
    fetchCelebrations();
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Mural de Celebrações</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium text-sm"
        >
          {showForm ? 'Cancelar' : '+ Celebrar'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-green-700/40 rounded-md text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="ACHIEVEMENT">Conquista</option>
          <option value="BIRTHDAY">Aniversário</option>
          <option value="ANNIVERSARY">Aniversário de Empresa</option>
          <option value="GENERAL">Geral</option>
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-5 mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-3 py-1.5 border border-green-700/40 rounded-md text-sm"
              >
                <option value="GENERAL">⭐ Geral</option>
                <option value="ACHIEVEMENT">🏆 Conquista</option>
                <option value="BIRTHDAY">🎂 Aniversário</option>
                <option value="ANNIVERSARY">🎉 Aniversário de Empresa</option>
              </select>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              required
              minLength={5}
              className="w-full px-3 py-2 border border-green-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Compartilhe uma celebração, mencione colegas..."
            />
            {error && (
              <div className="bg-red-900/30 text-red-600 text-sm p-2 rounded-md">{error}</div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </div>
      )}

      {/* Feed */}
      {celebrations.length === 0 ? (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">Nenhuma celebração ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Seja o primeiro a celebrar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {celebrations.map((c) => {
            // Group reactions by emoji
            const reactionGroups: Record<string, { count: number; users: string[] }> = {};
            c.reactions.forEach((r) => {
              if (!reactionGroups[r.emoji]) {
                reactionGroups[r.emoji] = { count: 0, users: [] };
              }
              reactionGroups[r.emoji].count++;
              reactionGroups[r.emoji].users.push(r.user.name);
            });

            return (
              <div key={c.id} className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {c.author.avatarUrl ? (
                      <img src={c.author.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      c.author.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100">{c.author.name}</span>
                      <span className="text-xs text-gray-400">
                        {c.author.jobTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {typeIcons[c.type]} {typeLabels[c.type]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <p className="text-gray-200 whitespace-pre-wrap mb-3">{c.content}</p>

                {/* Reactions */}
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {Object.entries(reactionGroups).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(c.id, emoji)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/40 hover:bg-green-800/40 rounded-full text-sm transition-colors"
                      title={data.users.join(', ')}
                    >
                      <span>{emoji}</span>
                      <span className="text-xs text-gray-400">{data.count}</span>
                    </button>
                  ))}
                  <div className="flex gap-0.5 ml-1">
                    {reactionEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(c.id, emoji)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-green-900/40 rounded-full transition-colors text-sm opacity-40 hover:opacity-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                {c.comments.length > 0 && (
                  <div className="border-t border-green-800/20 pt-3 space-y-2">
                    {c.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-800/40 text-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {comment.user.name[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-100">{comment.user.name}</span>
                          <span className="text-sm text-gray-400 ml-1">{comment.content}</span>
                          <p className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="border-t border-green-800/20 pt-3 mt-2">
                  {commentingId === c.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva um comentário..."
                        className="flex-1 px-3 py-1.5 border border-green-700/40 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleComment(c.id);
                        }}
                      />
                      <button
                        onClick={() => handleComment(c.id)}
                        className="text-sm text-emerald-400 hover:text-emerald-200 font-medium"
                      >
                        Enviar
                      </button>
                      <button
                        onClick={() => { setCommentingId(null); setCommentText(''); }}
                        className="text-sm text-gray-400 hover:text-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCommentingId(c.id)}
                      className="text-sm text-gray-400 hover:text-gray-400"
                    >
                      💬 Comentar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-green-700/40 rounded-md text-sm disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-green-700/40 rounded-md text-sm disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
