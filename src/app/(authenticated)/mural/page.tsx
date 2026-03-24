'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

interface MediaItem {
  id: string;
  url: string;
  type: string;
  fileName: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

interface Celebration {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  reactions: Reaction[];
  comments: Comment[];
  media: MediaItem[];
  _count: { comments: number };
}

interface UploadedMedia {
  url: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  preview?: string;
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

interface Colleague {
  id: string;
  name: string;
}

export default function MuralPage() {
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  // Current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Media state
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment state
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Mention state
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
      if (me) { setCurrentUserId(me.id); setCurrentUserRole(me.role); }
    }).catch(() => {});
    fetch('/api/colaboradores?limit=50').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.data) setColleagues(data.data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedMedia.length + files.length > 10) {
      setError('Máximo de 10 arquivos por publicação.');
      return;
    }

    setUploading(true);
    setError('');

    for (const file of Array.from(files)) {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
      ];
      if (!allowedTypes.includes(file.type)) {
        setError(`Tipo não permitido: ${file.name}. Use JPG, PNG, GIF, WebP, MP4 ou WebM.`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`Arquivo muito grande: ${file.name}. Máximo 20MB.`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Erro ao fazer upload.');
          continue;
        }
        const data = await res.json();
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        setUploadedMedia((prev) => [...prev, { ...data, preview }]);
      } catch {
        setError('Erro de conexão ao fazer upload.');
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeMedia(index: number) {
    setUploadedMedia((prev) => {
      const item = prev[index];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!content && uploadedMedia.length === 0) {
      setError('Adicione texto ou mídia à sua publicação.');
      return;
    }

    setSaving(true);

    const mediaPayload = uploadedMedia.map((m) => ({
      url: m.url,
      type: m.type,
      fileName: m.fileName,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
    }));

    const res = await fetch('/api/mural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content || '',
        type,
        media: mediaPayload.length > 0 ? mediaPayload : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    uploadedMedia.forEach((m) => { if (m.preview) URL.revokeObjectURL(m.preview); });
    setSaving(false);
    setShowForm(false);
    setContent('');
    setType('GENERAL');
    setUploadedMedia([]);
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

  async function handleEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/mural/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingId(null);
      setEditContent('');
      fetchCelebrations();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;
    const res = await fetch(`/api/mural/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCelebrations();
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart;
    setMentionCursorPos(cursorPos);

    // Check if user is typing @mention
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  }

  function insertMention(name: string) {
    const textBeforeCursor = content.slice(0, mentionCursorPos);
    const textAfterCursor = content.slice(mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, atIndex) + `@${name} ` + textAfterCursor;
    setContent(newText);
    setShowMentions(false);
    setMentionQuery('');
    contentRef.current?.focus();
  }

  const filteredColleagues = colleagues.filter(c =>
    c.name.toLowerCase().includes(mentionQuery),
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-64 bg-gray-700/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Mídia ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Mural de Celebrações</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium text-sm"
        >
          {showForm ? 'Cancelar' : '+ Celebrar'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-600/40 rounded-md text-sm"
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
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-5 mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-3 py-1.5 border border-gray-600/40 rounded-md text-sm"
              >
                <option value="GENERAL">⭐ Geral</option>
                <option value="ACHIEVEMENT">🏆 Conquista</option>
                <option value="BIRTHDAY">🎂 Aniversário</option>
                <option value="ANNIVERSARY">🎉 Aniversário de Empresa</option>
              </select>
            </div>
            <div className="relative">
              <textarea
                ref={contentRef}
                value={content}
                onChange={handleContentChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Compartilhe uma celebração... Use @ para mencionar colegas"
              />
              {showMentions && filteredColleagues.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-gray-800 border border-gray-700/40 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredColleagues.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => insertMention(c.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700/40 flex items-center gap-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-900/40 text-emerald-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.name[0]}
                      </span>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || uploadedMedia.length >= 10}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-600/40 rounded-md text-sm text-gray-300 hover:bg-gray-800/30 disabled:opacity-40 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Foto / Vídeo
                </button>
                {uploading && (
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {uploadedMedia.length}/10 · Máx 20MB
                </span>
              </div>

              {/* Previews */}
              {uploadedMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {uploadedMedia.map((m, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-600/40">
                      {m.type === 'image' ? (
                        <img src={m.preview || m.url} alt={m.fileName} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-gray-800/30 flex flex-col items-center justify-center">
                          <span className="text-2xl">🎥</span>
                          <span className="text-[10px] text-gray-400 mt-1 truncate max-w-full px-1">{m.fileName}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-400 text-sm p-2 rounded-md">{error}</div>
            )}
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </div>
      )}

      {/* Feed */}
      {celebrations.length === 0 ? (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">Nenhuma celebração ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Seja o primeiro a celebrar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {celebrations.map((c) => {
            const reactionGroups: Record<string, { count: number; users: string[] }> = {};
            (c.reactions || []).forEach((r) => {
              if (!reactionGroups[r.emoji]) {
                reactionGroups[r.emoji] = { count: 0, users: [] };
              }
              reactionGroups[r.emoji].count++;
              reactionGroups[r.emoji].users.push(r.user.name);
            });

            const mediaItems = c.media || [];
            const images = mediaItems.filter((m) => m.type === 'image');
            const videos = mediaItems.filter((m) => m.type === 'video');

            return (
              <div key={c.id} className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {c.author.avatarUrl ? (
                      <img src={c.author.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      (c.author?.name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100">{c.author?.name || 'Usuário'}</span>
                      <span className="text-xs text-gray-400">{c.author?.jobTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {typeIcons[c.type]} {typeLabels[c.type]}
                      </span>
                    </div>
                  </div>

                  {/* Edit / Delete — only for author or admin */}
                  {(c.author?.id === currentUserId || currentUserRole === 'ADMIN') && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                        className="p-1.5 text-gray-400 hover:text-emerald-400 rounded transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Content — editable or read-only */}
                {editingId === c.id ? (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(c.id)}
                        disabled={saving}
                        className="bg-green-700 text-white px-3 py-1 rounded-md text-sm hover:bg-green-800 disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditContent(''); }}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : c.content ? (
                  <p className="text-gray-200 whitespace-pre-wrap mb-3">{c.content}</p>
                ) : null}

                {/* Media Gallery */}
                {mediaItems.length > 0 && (
                  <div className="mb-3">
                    {images.length > 0 && (
                      <div className={`grid gap-1 rounded-lg overflow-hidden ${
                        images.length === 1 ? 'grid-cols-1' :
                        images.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {images.slice(0, 4).map((img, i) => (
                          <div
                            key={img.id}
                            className={`relative cursor-pointer overflow-hidden ${
                              images.length === 3 && i === 0 ? 'row-span-2' : ''
                            } ${images.length === 1 ? 'max-h-[28rem]' : 'h-48'}`}
                            onClick={() => setLightboxUrl(img.url)}
                          >
                            <img
                              src={img.url}
                              alt={img.fileName || 'Imagem'}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            {images.length > 4 && i === 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">+{images.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {videos.length > 0 && (
                      <div className={`${images.length > 0 ? 'mt-2' : ''} space-y-2`}>
                        {videos.map((vid) => (
                          <video
                            key={vid.id}
                            controls
                            preload="metadata"
                            className="w-full rounded-lg max-h-96 bg-black"
                            playsInline
                          >
                            <source src={vid.url} type={vid.mimeType || 'video/mp4'} />
                            Seu navegador não suporta vídeo.
                          </video>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {Object.entries(reactionGroups).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(c.id, emoji)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800/40 hover:bg-gray-700/40 rounded-full text-sm transition-colors"
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
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-800/40 rounded-full transition-colors text-sm opacity-40 hover:opacity-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                {(c.comments?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-700/20 pt-3 space-y-2">
                    {(c.comments || []).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-700/40 text-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(comment.user?.name || '?')[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-100">{comment.user?.name || 'Usuário'}</span>
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
                <div className="border-t border-gray-700/20 pt-3 mt-2">
                  {commentingId === c.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva um comentário..."
                        className="flex-1 px-3 py-1.5 border border-gray-600/40 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleComment(c.id); }}
                      />
                      <button onClick={() => handleComment(c.id)} className="text-sm text-emerald-400 hover:text-emerald-200 font-medium">
                        Enviar
                      </button>
                      <button onClick={() => { setCommentingId(null); setCommentText(''); }} className="text-sm text-gray-400 hover:text-gray-300">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setCommentingId(c.id)} className="text-sm text-gray-400 hover:text-gray-300">
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
            className="px-3 py-1.5 border border-gray-600/40 rounded-md text-sm disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-600/40 rounded-md text-sm disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
