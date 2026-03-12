'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Assignment {
  id: string;
  status: string;
  evaluator: { id: string; name: string; email: string };
  evaluatee: {
    id: string;
    name: string;
    email: string;
    department: { name: string } | null;
  };
  _count: { answers: number };
}

interface Cycle {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  criteria: Array<{ id: string; name: string; weight: number }>;
  assignments: Assignment[];
  _count: { assignments: number };
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  DONE: 'Respondida',
};

export default function CycleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycle = useCallback(async () => {
    const res = await fetch(`/api/avaliacoes/${id}`);
    if (res.ok) setCycle(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!cycle) {
    return <p className="text-gray-500">Ciclo não encontrado.</p>;
  }

  const totalAssignments = cycle.assignments.length;
  const doneAssignments = cycle.assignments.filter((a) => a.status === 'DONE').length;
  const completionRate = totalAssignments > 0 ? Math.round((doneAssignments / totalAssignments) * 100) : 0;

  const byEvaluatee: Record<string, Assignment[]> = {};
  for (const a of cycle.assignments) {
    if (!byEvaluatee[a.evaluatee.id]) byEvaluatee[a.evaluatee.id] = [];
    byEvaluatee[a.evaluatee.id].push(a);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/avaliacoes" className="text-sm text-green-700 hover:text-green-900 mb-1 inline-block">
            &larr; Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{cycle.name}</h1>
        </div>
        {(cycle.status === 'ACTIVE' || cycle.status === 'CLOSED') && (
          <Link
            href={`/avaliacoes/${cycle.id}/resultados`}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium text-sm"
          >
            Ver Resultados
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Total de Avaliações</p>
          <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Respondidas</p>
          <p className="text-2xl font-bold text-green-600">{doneAssignments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Taxa de Preenchimento</p>
          <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-700 h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Status por Colaborador</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Avaliado
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Departamento
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Avaliador
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cycle.assignments.map((a) => (
              <tr key={a.id}>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {a.evaluatee.name}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">
                  {a.evaluatee.department?.name || '—'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {a.evaluator.name}
                  {a.evaluator.id === a.evaluatee.id && (
                    <span className="text-xs text-gray-400 ml-1">(auto)</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      a.status === 'DONE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {statusLabels[a.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
