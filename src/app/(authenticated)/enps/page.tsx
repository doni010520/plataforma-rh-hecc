'use client';

import { useState, useEffect, useCallback } from 'react';

interface EnpsSurvey {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  _count: { responses: number };
  npsScore: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
}

interface EnpsSurveyDetail extends EnpsSurvey {
  distribution: Record<number, number>;
  hasResponded: boolean;
  responses: {
    id: string;
    score: number;
    comment: string;
    createdAt: string;
    userId: string | null;
  }[];
}

interface UserInfo {
  role: string;
}

function getNpsColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 50) return 'text-green-600';
  if (score >= 0) return 'text-yellow-600';
  return 'text-red-600';
}

function getNpsBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 50) return 'bg-green-100 text-green-800';
  if (score >= 0) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'bg-green-500';
  if (score >= 7) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT': return 'Rascunho';
    case 'ACTIVE': return 'Ativa';
    case 'CLOSED': return 'Encerrada';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-700';
    case 'ACTIVE': return 'bg-green-100 text-green-700';
    case 'CLOSED': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export default function EnpsPage() {
  const [surveys, setSurveys] = useState<EnpsSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<EnpsSurveyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Response form state
  const [respondScore, setRespondScore] = useState<number | null>(null);
  const [respondComment, setRespondComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userInfo?.role === 'ADMIN' || userInfo?.role === 'MANAGER';

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch('/api/enps');
      if (res.ok) {
        const data: EnpsSurvey[] = await res.json();
        setSurveys(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setUserInfo({ role: data.role }); })
      .catch(() => {});
  }, [fetchSurveys]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/enps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle('');
        setShowCreate(false);
        fetchSurveys();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const loadSurveyDetail = async (id: string) => {
    setLoadingDetail(true);
    setRespondScore(null);
    setRespondComment('');
    try {
      const res = await fetch(`/api/enps/${id}`);
      if (res.ok) {
        const data: EnpsSurveyDetail = await res.json();
        setSelectedSurvey(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'ACTIVE' | 'CLOSED') => {
    try {
      const res = await fetch(`/api/enps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchSurveys();
        loadSurveyDetail(id);
      }
    } catch {
      // ignore
    }
  };

  const handleRespond = async () => {
    if (respondScore === null || !selectedSurvey) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enps/${selectedSurvey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: respondScore, comment: respondComment }),
      });
      if (res.ok) {
        fetchSurveys();
        loadSurveyDetail(selectedSurvey.id);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedSurvey) {
    const s = selectedSurvey;
    const maxDistribution = Math.max(...Object.values(s.distribution), 1);

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedSurvey(null)}
          className="mb-4 text-green-700 hover:text-green-900 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{s.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Criado por {s.createdBy.name} em{' '}
                {new Date(s.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(s.status)}`}>
              {getStatusLabel(s.status)}
            </span>
          </div>

          {/* NPS Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">NPS Score</p>
              <p className={`text-4xl font-bold ${getNpsColor(s.npsScore)}`}>
                {s.npsScore !== null ? s.npsScore : '—'}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">Promotores (9-10)</p>
              <p className="text-2xl font-bold text-green-700">{s.promoters}</p>
              {s.totalResponses > 0 && (
                <p className="text-xs text-green-500">
                  {Math.round((s.promoters / s.totalResponses) * 100)}%
                </p>
              )}
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-600 mb-1">Passivos (7-8)</p>
              <p className="text-2xl font-bold text-yellow-700">{s.passives}</p>
              {s.totalResponses > 0 && (
                <p className="text-xs text-yellow-500">
                  {Math.round((s.passives / s.totalResponses) * 100)}%
                </p>
              )}
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 mb-1">Detratores (0-6)</p>
              <p className="text-2xl font-bold text-red-700">{s.detractors}</p>
              {s.totalResponses > 0 && (
                <p className="text-xs text-red-500">
                  {Math.round((s.detractors / s.totalResponses) * 100)}%
                </p>
              )}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Distribuicao de Notas</h3>
            <div className="space-y-2">
              {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                const count = s.distribution[score] ?? 0;
                const width = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
                return (
                  <div key={score} className="flex items-center gap-2">
                    <span className="w-6 text-right text-sm text-gray-600 font-medium">{score}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                      <div
                        className={`h-5 rounded-full ${getScoreColor(score)} transition-all`}
                        style={{ width: `${width}%`, minWidth: count > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <span className="w-8 text-sm text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2 mb-6">
              {s.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange(s.id, 'ACTIVE')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Ativar Pesquisa
                </button>
              )}
              {s.status === 'ACTIVE' && (
                <button
                  onClick={() => handleStatusChange(s.id, 'CLOSED')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Encerrar Pesquisa
                </button>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500">
            Total de respostas: {s.totalResponses}
          </p>
        </div>

        {/* Response form */}
        {s.status === 'ACTIVE' && !s.hasResponded && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Responder Pesquisa</h3>
            <p className="text-sm text-gray-600 mb-4">
              Em uma escala de 0 a 10, o quanto voce recomendaria esta empresa como um bom lugar para trabalhar?
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                let bgClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                if (respondScore === score) {
                  if (score >= 9) bgClass = 'bg-green-600 text-white';
                  else if (score >= 7) bgClass = 'bg-yellow-500 text-white';
                  else bgClass = 'bg-red-600 text-white';
                } else {
                  if (score >= 9) bgClass = 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200';
                  else if (score >= 7) bgClass = 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200';
                  else bgClass = 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
                }
                return (
                  <button
                    key={score}
                    onClick={() => setRespondScore(score)}
                    className={`w-11 h-11 rounded-lg font-bold text-sm transition-colors ${bgClass}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-gray-400 mb-4 px-1">
              <span>Nada provavel</span>
              <span>Extremamente provavel</span>
            </div>

            <textarea
              value={respondComment}
              onChange={(e) => setRespondComment(e.target.value)}
              placeholder="Comentario (opcional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-green-600 focus:border-green-600"
            />

            <button
              onClick={handleRespond}
              disabled={respondScore === null || submitting}
              className="px-6 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {submitting ? 'Enviando...' : 'Enviar Resposta'}
            </button>
          </div>
        )}

        {s.status === 'ACTIVE' && s.hasResponded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-medium">Voce ja respondeu esta pesquisa. Obrigado!</p>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eNPS</h1>
          <p className="text-sm text-gray-500 mt-1">Employee Net Promoter Score</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium"
          >
            Nova Pesquisa
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Criar Pesquisa eNPS</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titulo da pesquisa"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Surveys list */}
      {surveys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhuma pesquisa eNPS encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <button
              key={survey.id}
              onClick={() => loadSurveyDetail(survey.id)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(survey.status)}`}>
                      {getStatusLabel(survey.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {survey.totalResponses} resposta{survey.totalResponses !== 1 ? 's' : ''}{' '}
                    &middot; Criado em {new Date(survey.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${getNpsBgColor(survey.npsScore)}`}>
                    {survey.npsScore !== null ? survey.npsScore : '—'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
