'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Criteria {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface Cycle {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  criteria: Criteria[];
  _count: { assignments: number };
}

interface Department {
  id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  SELF: 'Autoavaliação',
  HALF: '180°',
  FULL: '360°',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
};

export default function AvaliacoesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('SELF');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formCriteria, setFormCriteria] = useState<
    { name: string; description: string; weight: number }[]
  >([{ name: '', description: '', weight: 1 }]);

  const [showParticipants, setShowParticipants] = useState<string | null>(null);
  const [participantDept, setParticipantDept] = useState('');
  const [addingParticipants, setAddingParticipants] = useState(false);

  const fetchCycles = useCallback(async () => {
    const res = await fetch('/api/avaliacoes');
    if (res.ok) setCycles(await res.json());
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments');
    if (res.ok) setDepartments(await res.json());
  }, []);

  useEffect(() => {
    fetchCycles();
    fetchDepartments();
  }, [fetchCycles, fetchDepartments]);

  function addCriteria() {
    setFormCriteria([...formCriteria, { name: '', description: '', weight: 1 }]);
  }

  function removeCriteria(index: number) {
    if (formCriteria.length <= 1) return;
    setFormCriteria(formCriteria.filter((_, i) => i !== index));
  }

  function updateCriteria(index: number, field: string, value: string | number) {
    const updated = [...formCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setFormCriteria(updated);
  }

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validCriteria = formCriteria.filter((c) => c.name.trim());
    if (validCriteria.length === 0) {
      setError('Adicione pelo menos um critério de avaliação.');
      return;
    }

    setSaving(true);

    const res = await fetch('/api/avaliacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        type: formType,
        startDate: formStart,
        endDate: formEnd,
        criteria: validCriteria,
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
    setFormName('');
    setFormType('SELF');
    setFormStart('');
    setFormEnd('');
    setFormCriteria([{ name: '', description: '', weight: 1 }]);
    fetchCycles();
  }

  async function handleStatusChange(id: string, status: string) {
    const action = status === 'ACTIVE' ? 'ativar' : 'encerrar';
    if (!confirm(`Tem certeza que deseja ${action} este ciclo?`)) return;

    const res = await fetch(`/api/avaliacoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    fetchCycles();
  }

  async function handleAddParticipants(cycleId: string) {
    setAddingParticipants(true);
    setError('');

    const body: Record<string, unknown> = {};
    if (participantDept) body.departmentId = participantDept;

    const res = await fetch(`/api/avaliacoes/${cycleId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setShowParticipants(null);
      setParticipantDept('');
      fetchCycles();
    }
    setAddingParticipants(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Avaliações de Desempenho</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors font-medium"
        >
          Novo Ciclo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Ciclo de Avaliação</h2>
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Ciclo</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Ex: Avaliação Q1 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                >
                  <option value="SELF">Autoavaliação</option>
                  <option value="HALF">180° (auto + gestor)</option>
                  <option value="FULL">360° (auto + gestor + pares)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                <input
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim</label>
                <input
                  type="date"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Critérios de Avaliação</label>
                <button
                  type="button"
                  onClick={addCriteria}
                  className="text-green-700 hover:text-green-900 text-sm font-medium"
                >
                  + Adicionar Critério
                </button>
              </div>
              <div className="space-y-3">
                {formCriteria.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCriteria(i, 'name', e.target.value)}
                      placeholder="Nome do critério"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={c.description}
                      onChange={(e) => updateCriteria(i, 'description', e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={c.weight}
                      onChange={(e) => updateCriteria(i, 'weight', parseFloat(e.target.value) || 1)}
                      min={0.1}
                      step={0.1}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      title="Peso"
                    />
                    {formCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriteria(i)}
                        className="text-red-500 hover:text-red-700 px-2 py-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Criando...' : 'Criar Ciclo'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {cycles.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Nenhum ciclo de avaliação criado ainda.
          </div>
        )}

        {cycles.map((cycle) => (
          <div key={cycle.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">{typeLabels[cycle.type]}</span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[cycle.status]}`}
                  >
                    {statusLabels[cycle.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(cycle.startDate).toLocaleDateString('pt-BR')} a{' '}
                  {new Date(cycle.endDate).toLocaleDateString('pt-BR')} &middot;{' '}
                  {cycle._count.assignments} avaliações &middot; {cycle.criteria.length} critérios
                </p>
              </div>
              <div className="flex gap-2">
                {cycle.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() =>
                        setShowParticipants(showParticipants === cycle.id ? null : cycle.id)
                      }
                      className="text-sm text-green-700 hover:text-green-900 font-medium"
                    >
                      Participantes
                    </button>
                    <button
                      onClick={() => handleStatusChange(cycle.id, 'ACTIVE')}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                    >
                      Ativar
                    </button>
                  </>
                )}
                {cycle.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange(cycle.id, 'CLOSED')}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
                  >
                    Encerrar
                  </button>
                )}
                {(cycle.status === 'ACTIVE' || cycle.status === 'CLOSED') && (
                  <Link
                    href={`/avaliacoes/${cycle.id}/resultados`}
                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                  >
                    Resultados
                  </Link>
                )}
              </div>
            </div>

            {showParticipants === cycle.id && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Adicionar Participantes</h4>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      Departamento (vazio = todos)
                    </label>
                    <select
                      value={participantDept}
                      onChange={(e) => setParticipantDept(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    >
                      <option value="">Todos os departamentos</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => handleAddParticipants(cycle.id)}
                    disabled={addingParticipants}
                    className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium"
                  >
                    {addingParticipants ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
