'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  department: { id: string; name: string } | null;
  company: { name: string } | null;
  createdAt: string;
}

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  visibility: string;
  createdAt: string;
  fromUser: { id: string; name: string; avatarUrl: string | null };
}

const feedbackTypeLabels: Record<string, string> = {
  PRAISE: 'Elogio',
  CONSTRUCTIVE: 'Construtivo',
  REQUEST: 'Solicitação',
};

const feedbackTypeColors: Record<string, string> = {
  PRAISE: 'bg-emerald-900/40 text-emerald-400',
  CONSTRUCTIVE: 'bg-yellow-100 text-yellow-400',
  REQUEST: 'bg-blue-100 text-blue-700',
};

export default function PerfilPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<File | null>(null);

  const fetchFeedbacks = useCallback(async (userId: string) => {
    const res = await fetch(`/api/feedback/received?userId=${userId}`);
    if (res.ok) setFeedbacks(await res.json());
  }, []);

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/colaboradores?limit=1');
    if (res.ok) {
      const data = await res.json();
      if (data.data.length > 0) {
        const u = data.data[0];
        setUser(u);
        setName(u.name);
        setJobTitle(u.jobTitle || '');
        setAvatarPreview(u.avatarUrl);
        fetchFeedbacks(u.id);
      }
    }
    setLoading(false);
  }, [fetchFeedbacks]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato não suportado. Use JPEG, PNG ou WebP.');
      return;
    }

    avatarFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('jobTitle', jobTitle);
    if (avatarFileRef.current) {
      formData.append('avatar', avatarFileRef.current);
    }

    const res = await fetch('/api/profile', {
      method: 'PUT',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    const updated = await res.json();
    setUser(updated);
    setAvatarPreview(updated.avatarUrl);
    avatarFileRef.current = null;
    setSaving(false);
    setSuccess('Perfil atualizado com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    EMPLOYEE: 'Colaborador',
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-64 bg-gray-700/40 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-gray-400">Erro ao carregar perfil.</p>;
  }

  const initials = (user.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Meu Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-emerald-900/40 text-emerald-300 flex items-center justify-center text-xl font-bold">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-green-700 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                    aria-label="Alterar avatar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">
                    Clique no ícone para alterar a foto. JPEG, PNG ou WebP, até 2MB.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cargo</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: Analista de RH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md bg-gray-800/40 text-gray-400"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md">{error}</div>
              )}

              {success && (
                <div className="bg-emerald-900/30 text-green-600 text-sm p-3 rounded-md">{success}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Informações</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Empresa</dt>
                <dd className="text-sm font-medium text-gray-100">{user.company?.name || 'Não definida'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Departamento</dt>
                <dd className="text-sm font-medium text-gray-100">
                  {user.department?.name || 'Não definido'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Perfil</dt>
                <dd className="text-sm font-medium text-gray-100">{roleLabels[user.role]}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Membro desde</dt>
                <dd className="text-sm font-medium text-gray-100">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Feedbacks Recebidos ({feedbacks.length})
            </h3>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum feedback recebido ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedbacks.slice(0, 10).map((fb) => (
                  <div key={fb.id} className="border-b border-gray-700/20 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-300">{fb.fromUser.name}</span>
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${feedbackTypeColors[fb.type]}`}
                      >
                        {feedbackTypeLabels[fb.type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{fb.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
