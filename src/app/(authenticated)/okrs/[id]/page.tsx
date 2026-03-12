'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface KeyResultUpdate {
  id: string;
  value: number;
  note: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface KeyResult {
  id: string;
  title: string;
  metricType: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  confidence: number;
  updatedAt: string;
  updates: KeyResultUpdate[];
}

interface ChildObjective {
  id: string;
  title: string;
  owner: { id: string; name: string };
  keyResults: {
    id: string;
    startValue: number;
    targetValue: number;
    currentValue: number;
    metricType: string;
  }[];
}

interface ObjectiveDetail {
  id: string;
  title: string;
  description: string;
  level: string;
  quarter: number;
  year: number;
  status: string;
  parentId: string | null;
  owner: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  parent: { id: string; title: string } | null;
  children: ChildObjective[];
  keyResults: KeyResult[];
}

const levelLabels: Record<string, string> = {
  COMPANY: 'Empresa',
  TEAM: 'Equipa',
  INDIVIDUAL: 'Individual',
};

const levelColors: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-700',
  TEAM: 'bg-blue-100 text-blue-700',
  INDIVIDUAL: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  ON_TRACK: 'No Caminho',
  AT_RISK: 'Em Risco',
  ACHIEVED: 'Alcançado',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<string, string> = {
  ON_TRACK: 'bg-green-100 text-green-700',
  AT_RISK: 'bg-red-100 text-red-700',
  ACHIEVED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const metricLabels: Record<string, string> = {
  NUMBER: 'Número',
  PERCENTAGE: 'Percentagem',
  CURRENCY: 'Moeda (R$)',
  BOOLEAN: 'Sim/Não',
};

const confidenceLabels: Record<number, string> = {
  1: '1 - Muito baixa',
  2: '2',
  3: '3 - Baixa',
  4: '4',
  5: '5 - Média',
  6: '6',
  7: '7 - Alta',
  8: '8',
  9: '9',
  10: '10 - Muito alta',
};

function getProgress(kr: { startValue: number; targetValue: number; currentValue: number; metricType: string }): number {
  if (kr.metricType === 'BOOLEAN') {
    return kr.currentValue >= 1 ? 100 : 0;
  }
  const range = kr.targetValue - kr.startValue;
  if (range === 0) return 100;
  const progress = ((kr.currentValue - kr.startValue) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function formatValue(value: number, metricType: string): string {
  if (metricType === 'BOOLEAN') return value >= 1 ? 'Sim' : 'Não';
  if (metricType === 'PERCENTAGE') return `${value}%`;
  if (metricType === 'CURRENCY') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  return value.toLocaleString('pt-BR');
}

export default function ObjectiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [objective, setObjective] = useState<ObjectiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInKrId, setCheckInKrId] = useState<string | null>(null);
  const [checkInValue, setCheckInValue] = useState('');
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInConfidence, setCheckInConfidence] = useState('5');
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add KR form
  const [showAddKR, setShowAddKR] = useState(false);
  const [newKRTitle, setNewKRTitle] = useState('');
  const [newKRMetric, setNewKRMetric] = useState('NUMBER');
  const [newKRStart, setNewKRStart] = useState('0');
  const [newKRTarget, setNewKRTarget] = useState('');
  const [savingKR, setSavingKR] = useState(false);

  const fetchObjective = useCallback(async () => {
    const res = await fetch(`/api/okrs/${id}`);
    if (res.ok) setObjective(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchObjective();
  }, [fetchObjective]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!checkInKrId) return;
    setError('');
    setSavingCheckIn(true);

    const res = await fetch(`/api/okrs/key-results/${checkInKrId}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: parseFloat(checkInValue),
        note: checkInNote,
        confidence: parseInt(checkInConfidence),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSavingCheckIn(false);
      return;
    }

    setSavingCheckIn(false);
    setCheckInKrId(null);
    setCheckInValue('');
    setCheckInNote('');
    setCheckInConfidence('5');
    setSuccess('Check-in registado com sucesso!');
    setTimeout(() => setSuccess(''), 3000);
    fetchObjective();
  }

  async function handleAddKR(e: React.FormEvent) {
    e.preventDefault();
    setSavingKR(true);
    setError('');

    const res = await fetch(`/api/okrs/${id}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newKRTitle,
        metricType: newKRMetric,
        startValue: parseFloat(newKRStart) || 0,
        targetValue: parseFloat(newKRTarget),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSavingKR(false);
      return;
    }

    setSavingKR(false);
    setShowAddKR(false);
    setNewKRTitle('');
    setNewKRMetric('NUMBER');
    setNewKRStart('0');
    setNewKRTarget('');
    fetchObjective();
  }

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/okrs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      fetchObjective();
      setSuccess('Status atualizado!');
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este objectivo?')) return;

    const res = await fetch(`/api/okrs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/okrs');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!objective) {
    return <p className="text-gray-500">Objectivo não encontrado.</p>;
  }

  const overallProgress =
    objective.keyResults.length > 0
      ? objective.keyResults.reduce((acc, kr) => acc + getProgress(kr), 0) / objective.keyResults.length
      : 0;

  return (
    <div>
      <div className="mb-6">
        <Link href="/okrs" className="text-sm text-green-700 hover:text-green-900 mb-1 inline-block">
          &larr; Voltar para OKRs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${levelColors[objective.level]}`}>
                {levelLabels[objective.level]}
              </span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[objective.status]}`}>
                {statusLabels[objective.status]}
              </span>
              <span className="text-sm text-gray-400">
                Q{objective.quarter}/{objective.year}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{objective.title}</h1>
            {objective.description && (
              <p className="text-gray-500 mt-1">{objective.description}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              Dono: {objective.owner.name}
              {objective.owner.jobTitle && ` — ${objective.owner.jobTitle}`}
            </p>
            {objective.parent && (
              <p className="text-sm text-gray-400">
                Vinculado a:{' '}
                <Link href={`/okrs/${objective.parent.id}`} className="text-green-700 hover:text-green-900">
                  {objective.parent.title}
                </Link>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{overallProgress.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">progresso</p>
          </div>
        </div>
      </div>

      {/* Status Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Alterar status:</span>
        {(['ON_TRACK', 'AT_RISK', 'ACHIEVED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={objective.status === s}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              objective.status === s
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : `${statusColors[s]} hover:opacity-80`
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Excluir
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md mb-4">{success}</div>
      )}

      {/* Overall progress bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Progresso Geral</h3>
          <span className="text-sm font-bold text-gray-900">{overallProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              objective.status === 'ACHIEVED'
                ? 'bg-green-500'
                : objective.status === 'AT_RISK'
                  ? 'bg-red-500'
                  : 'bg-green-700'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Key Results */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Key Results ({objective.keyResults.length})
          </h2>
          <button
            onClick={() => setShowAddKR(!showAddKR)}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            {showAddKR ? 'Cancelar' : '+ Adicionar KR'}
          </button>
        </div>

        {showAddKR && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <form onSubmit={handleAddKR} className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Título</label>
                <input
                  type="text"
                  value={newKRTitle}
                  onChange={(e) => setNewKRTitle(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Título do KR"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Métrica</label>
                <select
                  value={newKRMetric}
                  onChange={(e) => setNewKRMetric(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  {Object.entries(metricLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Início</label>
                <input
                  type="number"
                  value={newKRStart}
                  onChange={(e) => setNewKRStart(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meta</label>
                <input
                  type="number"
                  value={newKRTarget}
                  onChange={(e) => setNewKRTarget(e.target.value)}
                  required
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <button
                type="submit"
                disabled={savingKR}
                className="bg-green-700 text-white px-4 py-1.5 rounded-md hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
              >
                {savingKR ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {objective.keyResults.map((kr) => {
            const progress = getProgress(kr);
            const isCheckingIn = checkInKrId === kr.id;
            return (
              <div key={kr.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{kr.title}</h4>
                    <p className="text-sm text-gray-500">
                      {metricLabels[kr.metricType]} · Confiança: {kr.confidence}/10
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900">{progress.toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">
                      {formatValue(kr.currentValue, kr.metricType)} / {formatValue(kr.targetValue, kr.metricType)}
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      progress >= 100
                        ? 'bg-green-500'
                        : progress >= 70
                          ? 'bg-green-700'
                          : progress >= 30
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isCheckingIn) {
                        setCheckInKrId(null);
                      } else {
                        setCheckInKrId(kr.id);
                        setCheckInValue(kr.currentValue.toString());
                        setCheckInConfidence(kr.confidence.toString());
                      }
                    }}
                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                  >
                    {isCheckingIn ? 'Cancelar' : 'Fazer Check-in'}
                  </button>
                </div>

                {/* Check-in form */}
                {isCheckingIn && (
                  <form onSubmit={handleCheckIn} className="mt-4 p-4 bg-gray-50 rounded-md space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Novo valor ({metricLabels[kr.metricType]})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={checkInValue}
                          onChange={(e) => setCheckInValue(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confiança (1–10)
                        </label>
                        <select
                          value={checkInConfidence}
                          onChange={(e) => setCheckInConfidence(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        >
                          {Object.entries(confidenceLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nota (opcional)
                      </label>
                      <textarea
                        value={checkInNote}
                        onChange={(e) => setCheckInNote(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        placeholder="Descreva o progresso..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingCheckIn}
                      className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium text-sm"
                    >
                      {savingCheckIn ? 'Registando...' : 'Registar Check-in'}
                    </button>
                  </form>
                )}

                {/* Check-in history */}
                {kr.updates.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <h5 className="text-xs font-medium text-gray-500 mb-2">
                      Histórico de Check-ins ({kr.updates.length})
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {kr.updates.map((u) => (
                        <div key={u.id} className="flex items-start gap-2 text-sm">
                          <div className="w-16 text-right">
                            <span className="font-medium text-gray-900">
                              {formatValue(u.value, kr.metricType)}
                            </span>
                          </div>
                          <div className="flex-1">
                            {u.note && <p className="text-gray-600">{u.note}</p>}
                            <p className="text-xs text-gray-400">
                              {u.user.name} · {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Children objectives */}
      {objective.children.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Objectivos Vinculados ({objective.children.length})
          </h2>
          <div className="space-y-3">
            {objective.children.map((child) => {
              const childProgress = child.keyResults.length > 0
                ? child.keyResults.reduce((acc, kr) => acc + getProgress(kr), 0) / child.keyResults.length
                : 0;
              return (
                <Link
                  key={child.id}
                  href={`/okrs/${child.id}`}
                  className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{child.title}</h4>
                      <p className="text-sm text-gray-500">{child.owner.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-700 transition-all"
                          style={{ width: `${childProgress}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{childProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
