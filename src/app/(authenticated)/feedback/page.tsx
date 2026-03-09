'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  visibility: string;
  createdAt: string;
  fromUser: UserRef;
  toUser: UserRef;
}

interface ColabOption {
  id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  PRAISE: 'Elogio',
  CONSTRUCTIVE: 'Construtivo',
  REQUEST: 'Solicitação',
};

const typeColors: Record<string, string> = {
  PRAISE: 'bg-green-100 text-green-700',
  CONSTRUCTIVE: 'bg-yellow-100 text-yellow-700',
  REQUEST: 'bg-blue-100 text-blue-700',
};

const typeIcons: Record<string, string> = {
  PRAISE: '🌟',
  CONSTRUCTIVE: '💡',
  REQUEST: '📋',
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [colaboradores, setColaboradores] = useState<ColabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [filterType, setFilterType] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const [formTo, setFormTo] = useState('');
  const [formType, setFormType] = useState('PRAISE');
  const [formContent, setFormContent] = useState('');
  const [formVisibility, setFormVisibility] = useState('PRIVATE');

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ direction: tab });
    if (filterType) params.set('type', filterType);
    if (filterPeriod) params.set('period', filterPeriod);

    const res = await fetch(`/api/feedback?${params}`);
    if (res.ok) setFeedbacks(await res.json());
    setLoading(false);
  }, [tab, filterType, filterPeriod]);

  const fetchColaboradores = useCallback(async () => {
    const res = await fetch('/api/colaboradores?limit=50');
    if (res.ok) {
      const data = await res.json();
      setColaboradores(
        data.data
          .filter((u: { active: boolean }) => u.active)
          .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })),
      );
    }
  }, []);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toUserId: formTo,
        type: formType,
        content: formContent,
        visibility: formVisibility,
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
    setFormTo('');
    setFormType('PRAISE');
    setFormContent('');
    setFormVisibility('PRIVATE');
    setSuccess('Feedback enviado com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
    fetchFeedbacks();
  }

  function resetForm() {
    setShowForm(false);
    setFormTo('');
    setFormType('PRAISE');
    setFormContent('');
    setFormVisibility('PRIVATE');
    setError('');
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium"
        >
          Enviar Feedback
        </button>
      </div>

      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md mb-4">{success}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário</label>
                <select
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="PRAISE">Elogio</option>
                  <option value="CONSTRUCTIVE">Construtivo</option>
                  <option value="REQUEST">Solicitação</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo <span className="text-gray-400">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
                minLength={20}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Descreva seu feedback com detalhes..."
              />
              <p className="text-xs text-gray-400 mt-1">{formContent.length}/20 caracteres mínimo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidade</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="PRIVATE"
                    checked={formVisibility === 'PRIVATE'}
                    onChange={(e) => setFormVisibility(e.target.value)}
                    className="text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Privado (apenas o destinatário)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={formVisibility === 'PUBLIC'}
                    onChange={(e) => setFormVisibility(e.target.value)}
                    className="text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Público (visível para gestores)</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setTab('received')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === 'received' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Recebidos
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === 'sent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Enviados
          </button>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os tipos</option>
          <option value="PRAISE">Elogio</option>
          <option value="CONSTRUCTIVE">Construtivo</option>
          <option value="REQUEST">Solicitação</option>
        </select>
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todo período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Carregando...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            {tab === 'received'
              ? 'Nenhum feedback recebido ainda.'
              : 'Nenhum feedback enviado ainda.'}
          </div>
        ) : (
          feedbacks.map((fb) => {
            const person = tab === 'received' ? fb.fromUser : fb.toUser;
            const personLabel = tab === 'received' ? 'De' : 'Para';

            return (
              <div key={fb.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {initials(person.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {personLabel}: {person.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[fb.type]}`}
                      >
                        {typeIcons[fb.type]} {typeLabels[fb.type]}
                      </span>
                      {fb.visibility === 'PRIVATE' && (
                        <span className="text-xs text-gray-400">🔒 Privado</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{fb.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(fb.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
