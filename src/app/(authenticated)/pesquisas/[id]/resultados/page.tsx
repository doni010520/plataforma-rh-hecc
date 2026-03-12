'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AiInterpretation } from '@/components/AiInterpretation';

interface DeptStat {
  name: string;
  totalUsers: number;
  responses: number;
  rate: number;
}

interface ScaleResult {
  questionId: string;
  text: string;
  type: 'SCALE';
  totalAnswers: number;
  avg: number;
  distribution: Record<number, number>;
}

interface MCResult {
  questionId: string;
  text: string;
  type: 'MULTIPLE_CHOICE';
  totalAnswers: number;
  distribution: Record<string, number>;
}

interface TextResult {
  questionId: string;
  text: string;
  type: 'TEXT';
  totalAnswers: number;
  answers: string[];
}

type QuestionResult = ScaleResult | MCResult | TextResult;

interface ResultsData {
  survey: {
    id: string;
    title: string;
    type: string;
    status: string;
    anonymous: boolean;
  };
  totalUsers: number;
  totalResponses: number;
  responseRate: number;
  departmentStats: DeptStat[];
  questionResults: QuestionResult[];
}

export default function ResultadosPesquisaPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/pesquisas/${id}/results`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-green-800/40 rounded animate-pulse" />
        <div className="h-96 bg-green-800/40 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-400">Resultados não encontrados.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/pesquisas" className="text-sm text-emerald-400 hover:text-emerald-200 mb-1 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">
          Resultados — {data.survey.title}
        </h1>
        <p className="text-sm text-gray-400">
          {data.survey.anonymous ? 'Pesquisa anónima' : 'Pesquisa identificada'}
        </p>
        <div className="mt-3">
          <AiInterpretation type="survey" targetId={id} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Taxa de Resposta</h3>
          <p className="text-2xl font-bold text-gray-100">{data.responseRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">{data.totalResponses} de {data.totalUsers} colaboradores</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Respostas</h3>
          <p className="text-2xl font-bold text-gray-100">{data.totalResponses}</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Perguntas</h3>
          <p className="text-2xl font-bold text-gray-100">{data.questionResults.length}</p>
        </div>
      </div>

      {/* Department Response Rate */}
      <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Taxa de Resposta por Departamento</h2>
        {data.departmentStats.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum departamento encontrado.</p>
        ) : (
          <div className="space-y-3">
            {data.departmentStats.map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">{dept.name}</span>
                  <span className="text-sm text-gray-400">
                    {dept.responses}/{dept.totalUsers} ({dept.rate.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-green-800/40 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-700 transition-all"
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question Results */}
      <div className="space-y-6">
        {data.questionResults.map((qr, i) => (
          <div key={qr.questionId} className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Pergunta {i + 1}</h3>
            <p className="font-semibold text-gray-100 mb-4">{qr.text}</p>
            <p className="text-xs text-gray-400 mb-3">{qr.totalAnswers} respostas</p>

            {qr.type === 'SCALE' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-emerald-400">{qr.avg.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/ 5.0</span>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = qr.distribution[score] || 0;
                    const pct = qr.totalAnswers > 0 ? (count / qr.totalAnswers) * 100 : 0;
                    return (
                      <div key={score} className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 w-4">{score}</span>
                        <div className="flex-1 bg-green-800/40 rounded-full h-4">
                          <div
                            className="h-4 rounded-full bg-emerald-900/300 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {qr.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {Object.entries(qr.distribution).map(([option, count]) => {
                  const pct = qr.totalAnswers > 0 ? (count / qr.totalAnswers) * 100 : 0;
                  return (
                    <div key={option} className="flex items-center gap-2">
                      <span className="text-sm text-gray-300 min-w-[120px]">{option}</span>
                      <div className="flex-1 bg-green-800/40 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-emerald-900/300 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-16 text-right">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {qr.type === 'TEXT' && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {qr.answers.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma resposta de texto.</p>
                ) : (
                  qr.answers.map((ans, j) => (
                    <div key={j} className="bg-green-900/30 p-3 rounded-md">
                      <p className="text-sm text-gray-300">{ans}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
