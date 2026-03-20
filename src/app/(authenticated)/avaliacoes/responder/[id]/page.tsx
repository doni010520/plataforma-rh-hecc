'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Answer {
  id: string;
  criteriaId: string;
  score: number | null;
  comment: string;
  criteria: {
    id: string;
    name: string;
    description: string;
    weight: number;
  };
}

interface Assignment {
  id: string;
  status: string;
  cycle: { id: string; name: string; type: string; status: string };
  evaluatee: { id: string; name: string; avatarUrl: string | null; jobTitle: string | null };
  answers: Answer[];
}

const scoreLabels: Record<number, string> = {
  1: 'Insuficiente',
  2: 'Abaixo do esperado',
  3: 'Dentro do esperado',
  4: 'Acima do esperado',
  5: 'Excepcional',
};

export default function ResponderAvaliacaoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [answers, setAnswers] = useState<Record<string, { score: number | null; comment: string }>>(
    {},
  );

  const fetchAssignment = useCallback(async () => {
    const res = await fetch(`/api/avaliacoes/assignments/${id}`);
    if (res.ok) {
      const data: Assignment = await res.json();
      setAssignment(data);
      const initialAnswers: Record<string, { score: number | null; comment: string }> = {};
      for (const answer of data.answers) {
        initialAnswers[answer.criteriaId] = {
          score: answer.score,
          comment: answer.comment,
        };
      }
      setAnswers(initialAnswers);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  function updateAnswer(criteriaId: string, field: 'score' | 'comment', value: number | string) {
    setAnswers((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        [field]: value,
      },
    }));
  }

  async function handleSave(submit: boolean) {
    setError('');
    setSuccess('');
    setSaving(true);

    const answerList = Object.entries(answers).map(([criteriaId, data]) => ({
      criteriaId,
      score: data.score,
      comment: data.comment,
    }));

    const res = await fetch(`/api/avaliacoes/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answerList, submit }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setSaving(false);

    if (submit) {
      setSuccess('Avaliação submetida com sucesso!');
      setTimeout(() => router.push('/avaliacoes'), 1500);
    } else {
      setSuccess('Rascunho salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-96 bg-gray-700/40 rounded animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return <p className="text-gray-400">Avaliação não encontrada.</p>;
  }

  if (assignment.status === 'DONE') {
    return (
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-100 mb-2">Avaliação Submetida</h1>
        <p className="text-gray-400">
          Você já submeteu esta avaliação de <strong>{assignment.evaluatee.name}</strong> no ciclo{' '}
          <strong>{assignment.cycle.name}</strong>.
        </p>
        <div className="mt-4 space-y-3">
          {assignment.answers.map((a) => (
            <div key={a.id} className="border border-gray-700/30 rounded-md p-3">
              <p className="font-medium text-gray-100">{a.criteria.name}</p>
              <p className="text-sm text-gray-400">
                Nota: {a.score}/5 — {a.score ? scoreLabels[a.score] : ''}
              </p>
              {a.comment && <p className="text-sm text-gray-400 mt-1">{a.comment}</p>}
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push('/avaliacoes')}
          className="mt-4 text-emerald-400 hover:text-emerald-200 font-medium text-sm"
        >
          Voltar para avaliações
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">{assignment.cycle.name}</h1>
      <p className="text-gray-400 mb-6">
        Avaliando: <strong>{assignment.evaluatee.name}</strong>
        {assignment.evaluatee.jobTitle && ` — ${assignment.evaluatee.jobTitle}`}
      </p>

      {error && (
        <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-900/30 text-green-600 text-sm p-3 rounded-md mb-4">{success}</div>
      )}

      <div className="space-y-6">
        {assignment.answers.map((answer) => (
          <div key={answer.id} className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-1">{answer.criteria.name}</h3>
            {answer.criteria.description && (
              <p className="text-sm text-gray-400 mb-4">{answer.criteria.description}</p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nota (1 a 5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => updateAnswer(answer.criteriaId, 'score', score)}
                    className={`flex-1 py-3 rounded-md border-2 text-center transition-colors ${
                      answers[answer.criteriaId]?.score === score
                        ? 'border-gray-600 bg-emerald-900/30 text-emerald-300 font-bold'
                        : 'border-gray-700/30 hover:border-gray-600/40 text-gray-400'
                    }`}
                  >
                    <span className="text-lg">{score}</span>
                    <span className="block text-xs mt-0.5">{scoreLabels[score]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Comentário (opcional)
              </label>
              <textarea
                value={answers[answer.criteriaId]?.comment || ''}
                onChange={(e) => updateAnswer(answer.criteriaId, 'comment', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Descreva suas observações..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end mt-6">
        <button
          onClick={() => router.push('/avaliacoes')}
          className="px-4 py-2 text-gray-400 hover:text-gray-200 font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="border border-gray-600 text-emerald-400 px-4 py-2 rounded-md hover:bg-emerald-900/30 disabled:opacity-50 font-medium"
        >
          {saving ? 'Salvando...' : 'Salvar Rascunho'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Submetendo...' : 'Submeter Avaliação'}
        </button>
      </div>
    </div>
  );
}
