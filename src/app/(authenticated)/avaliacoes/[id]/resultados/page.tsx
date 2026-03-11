'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AiInterpretation } from '@/components/AiInterpretation';

interface CriteriaInfo {
  id: string;
  name: string;
  weight: number;
}

interface EvaluateeSummary {
  name: string;
  departmentName: string | null;
  scores: Record<string, number[]>;
  avgScore: number;
}

interface ResultsData {
  cycle: {
    id: string;
    name: string;
    type: string;
    status: string;
    criteria: CriteriaInfo[];
  };
  summary: {
    byEvaluatee: Record<string, EvaluateeSummary>;
    byDepartment: Record<string, { scores: number[]; avg: number }>;
  };
}

const boxLabels = [
  ['Enigma', 'Forte Desempenho', 'Alto Potencial'],
  ['Questionável', 'Mantenedor', 'Forte Desempenho'],
  ['Insuficiente', 'Eficaz', 'Comprometido'],
];

const boxColors = [
  ['bg-yellow-100', 'bg-blue-100', 'bg-green-100'],
  ['bg-orange-100', 'bg-gray-100', 'bg-blue-100'],
  ['bg-red-100', 'bg-orange-100', 'bg-yellow-100'],
];

export default function ResultadosPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/avaliacoes/${id}/results`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Resultados não encontrados.</p>;
  }

  const evaluatees = Object.entries(data.summary.byEvaluatee);
  const departments = Object.entries(data.summary.byDepartment);
  const criteria = data.cycle.criteria;

  // 9Box: split into 3x3 grid based on score (1-5 mapped to low/mid/high)
  function getBox(score: number): [number, number] {
    if (score >= 4) return [0, 2]; // high
    if (score >= 3) return [1, 1]; // mid
    return [2, 0]; // low
  }

  const nineBox: Record<string, string[]> = {};
  for (const [, ev] of evaluatees) {
    const [row, col] = getBox(ev.avgScore);
    const key = `${row}-${col}`;
    if (!nineBox[key]) nineBox[key] = [];
    nineBox[key].push(ev.name);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/avaliacoes" className="text-sm text-indigo-600 hover:text-indigo-800 mb-1 inline-block">
            &larr; Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Resultados — {data.cycle.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <AiInterpretation type="avaliacao" targetId={id} />
          <a
            href={`/api/avaliacoes/${id}/export`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium text-sm"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      {/* 9Box Grid */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Matriz 9Box</h2>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-gray-500 writing-mode-vertical transform -rotate-90 origin-center">
            Potencial
          </span>
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {boxLabels.map((row, ri) =>
                row.map((label, ci) => {
                  const key = `${ri}-${ci}`;
                  const names = nineBox[key] || [];
                  return (
                    <div
                      key={key}
                      className={`${boxColors[ri][ci]} rounded-lg p-3 min-h-[100px]`}
                    >
                      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                      {names.length > 0 ? (
                        <div className="space-y-0.5">
                          {names.map((n) => (
                            <p key={n} className="text-xs text-gray-600">
                              {n}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">—</p>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">Desempenho &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de Calor por Departamento */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mapa de Calor por Departamento</h2>
        {departments.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum resultado disponível.</p>
        ) : (
          <div className="space-y-3">
            {departments.map(([dept, info]) => {
              const pct = (info.avg / 5) * 100;
              const hue = (info.avg / 5) * 120;
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{dept}</span>
                    <span className="text-sm text-gray-500">
                      {info.avg.toFixed(2)} / 5.0 ({info.scores.length} avaliados)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="h-4 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: `hsl(${hue}, 60%, 50%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabela Individual */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Resultados Individuais</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Colaborador
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Departamento
                </th>
                {criteria.map((c) => (
                  <th
                    key={c.id}
                    className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase"
                  >
                    {c.name}
                  </th>
                ))}
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Média
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evaluatees.length === 0 && (
                <tr>
                  <td
                    colSpan={criteria.length + 3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum resultado disponível.
                  </td>
                </tr>
              )}
              {evaluatees
                .sort((a, b) => b[1].avgScore - a[1].avgScore)
                .map(([eId, ev]) => (
                  <tr key={eId}>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{ev.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {ev.departmentName || '—'}
                    </td>
                    {criteria.map((c) => {
                      const scores = ev.scores[c.id] || [];
                      const avg =
                        scores.length > 0
                          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                          : '—';
                      return (
                        <td key={c.id} className="px-4 py-3 text-center text-sm text-gray-600">
                          {avg}
                        </td>
                      );
                    })}
                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                      {ev.avgScore.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
