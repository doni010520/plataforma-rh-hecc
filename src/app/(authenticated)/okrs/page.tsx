'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface KeyResult {
  id: string;
  title: string;
  metricType: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  confidence: number;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  level: string;
  quarter: number;
  year: number;
  status: string;
  parentId: string | null;
  owner: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  keyResults: KeyResult[];
  children: {
    id: string;
    title: string;
    owner: { id: string; name: string };
    keyResults: KeyResult[];
  }[];
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

function getProgress(kr: KeyResult): number {
  if (kr.metricType === 'BOOLEAN') {
    return kr.currentValue >= 1 ? 100 : 0;
  }
  const range = kr.targetValue - kr.startValue;
  if (range === 0) return 100;
  const progress = ((kr.currentValue - kr.startValue) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function getObjectiveProgress(krs: KeyResult[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((acc, kr) => acc + getProgress(kr), 0);
  return total / krs.length;
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export default function OKRsPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('INDIVIDUAL');
  const [quarter, setQuarter] = useState(getCurrentQuarter().toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [parentId, setParentId] = useState('');
  const [krList, setKrList] = useState<{ title: string; metricType: string; startValue: string; targetValue: string }[]>([
    { title: '', metricType: 'NUMBER', startValue: '0', targetValue: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchObjectives = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterLevel) params.set('level', filterLevel);
    if (filterQuarter) params.set('quarter', filterQuarter);
    if (filterYear) params.set('year', filterYear);
    if (filterStatus) params.set('status', filterStatus);

    const res = await fetch(`/api/okrs?${params.toString()}`);
    if (res.ok) setObjectives(await res.json());
    setLoading(false);
  }, [filterLevel, filterQuarter, filterYear, filterStatus]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  function addKR() {
    setKrList([...krList, { title: '', metricType: 'NUMBER', startValue: '0', targetValue: '' }]);
  }

  function removeKR(index: number) {
    setKrList(krList.filter((_, i) => i !== index));
  }

  function updateKR(index: number, field: string, value: string) {
    setKrList(
      krList.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr)),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const validKRs = krList.filter((kr) => kr.title && kr.targetValue);
    if (validKRs.length === 0) {
      setError('Adicione pelo menos um Key Result com título e valor alvo.');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/okrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        level,
        quarter,
        year,
        parentId: parentId || null,
        keyResults: validKRs.map((kr) => ({
          title: kr.title,
          metricType: kr.metricType,
          startValue: parseFloat(kr.startValue) || 0,
          targetValue: parseFloat(kr.targetValue),
        })),
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
    setDescription('');
    setLevel('INDIVIDUAL');
    setParentId('');
    setKrList([{ title: '', metricType: 'NUMBER', startValue: '0', targetValue: '' }]);
    fetchObjectives();
  }

  // Get parent objectives for linking
  const parentOptions = objectives.filter(
    (o) => o.level === 'COMPANY' || o.level === 'TEAM',
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Calculate global progress
  const allKRs = objectives.flatMap((o) => o.keyResults);
  const globalProgress = allKRs.length > 0
    ? allKRs.reduce((acc, kr) => acc + getProgress(kr), 0) / allKRs.length
    : 0;

  const atRiskCount = objectives.filter((o) => o.status === 'AT_RISK').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OKRs</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium text-sm"
        >
          {showForm ? 'Cancelar' : '+ Novo Objectivo'}
        </button>
      </div>

      {/* Global Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Progresso Global</h3>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-gray-900">{globalProgress.toFixed(0)}%</p>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Objectivos</h3>
          <p className="text-2xl font-bold text-gray-900">{objectives.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Em Risco</h3>
          <p className={`text-2xl font-bold ${atRiskCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {atRiskCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os níveis</option>
            <option value="COMPANY">Empresa</option>
            <option value="TEAM">Equipa</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os trimestres</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os anos</option>
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os status</option>
            <option value="ON_TRACK">No Caminho</option>
            <option value="AT_RISK">Em Risco</option>
            <option value="ACHIEVED">Alcançado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Objectivo</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Aumentar a receita recorrente"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Descreva o objectivo..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Equipa</option>
                  <option value="COMPANY">Empresa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectivo Pai</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Nenhum (raiz)</option>
                  {parentOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      [{levelLabels[o.level]}] {o.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="1">Q1 (Jan–Mar)</option>
                  <option value="2">Q2 (Abr–Jun)</option>
                  <option value="3">Q3 (Jul–Set)</option>
                  <option value="4">Q4 (Out–Dez)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Key Results */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Key Results</label>
                <button
                  type="button"
                  onClick={addKR}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Adicionar KR
                </button>
              </div>
              <div className="space-y-3">
                {krList.map((kr, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-md">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={kr.title}
                          onChange={(e) => updateKR(i, 'title', e.target.value)}
                          placeholder="Título do KR"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <select
                        value={kr.metricType}
                        onChange={(e) => updateKR(i, 'metricType', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="NUMBER">Número</option>
                        <option value="PERCENTAGE">Percentagem</option>
                        <option value="CURRENCY">Moeda (R$)</option>
                        <option value="BOOLEAN">Sim/Não</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={kr.startValue}
                          onChange={(e) => updateKR(i, 'startValue', e.target.value)}
                          placeholder="Início"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          value={kr.targetValue}
                          onChange={(e) => updateKR(i, 'targetValue', e.target.value)}
                          placeholder="Meta"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    {krList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKR(i)}
                        className="text-red-500 hover:text-red-700 p-1 mt-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Criando...' : 'Criar Objectivo'}
            </button>
          </form>
        </div>
      )}

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">Nenhum objectivo encontrado.</p>
          <p className="text-sm text-gray-400 mt-1">
            Crie seu primeiro OKR clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const progress = getObjectiveProgress(obj.keyResults);
            return (
              <Link
                key={obj.id}
                href={`/okrs/${obj.id}`}
                className="block bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${levelColors[obj.level]}`}>
                        {levelLabels[obj.level]}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[obj.status]}`}>
                        {statusLabels[obj.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        Q{obj.quarter}/{obj.year}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{obj.title}</h3>
                    {obj.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{obj.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900">{progress.toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">{obj.owner.name}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      obj.status === 'ACHIEVED'
                        ? 'bg-green-500'
                        : obj.status === 'AT_RISK'
                          ? 'bg-red-500'
                          : 'bg-indigo-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Key Results summary */}
                <div className="space-y-1.5">
                  {obj.keyResults.map((kr) => {
                    const krProgress = getProgress(kr);
                    return (
                      <div key={kr.id} className="flex items-center gap-2">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 flex-1">
                          <div
                            className="h-1.5 rounded-full bg-indigo-400 transition-all"
                            style={{ width: `${krProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap min-w-[140px]">
                          {kr.title} ({krProgress.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Children count */}
                {obj.children.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {obj.children.length} objectivo(s) vinculado(s)
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
