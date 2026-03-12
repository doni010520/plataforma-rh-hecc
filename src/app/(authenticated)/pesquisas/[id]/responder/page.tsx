'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface SurveyQuestion {
  id: string;
  text: string;
  type: string;
  options: string;
  order: number;
}

interface SurveyDetail {
  id: string;
  title: string;
  type: string;
  anonymous: boolean;
  questions: SurveyQuestion[];
  hasResponded: boolean;
}

export default function ResponderPesquisaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSurvey = useCallback(async () => {
    const res = await fetch(`/api/pesquisas/${id}`);
    if (res.ok) setSurvey(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);

    const answerList = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    const res = await fetch(`/api/pesquisas/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answerList }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSubmitting(false);
      return;
    }

    router.push('/pesquisas');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!survey) {
    return <p className="text-gray-500">Pesquisa não encontrada.</p>;
  }

  if (survey.hasResponded) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pesquisa já respondida</h1>
        <p className="text-gray-500 mb-4">Você já respondeu a pesquisa &ldquo;{survey.title}&rdquo;.</p>
        <button
          onClick={() => router.push('/pesquisas')}
          className="text-green-700 hover:text-green-900 font-medium"
        >
          Voltar para pesquisas
        </button>
      </div>
    );
  }

  const totalQuestions = survey.questions.length;
  const currentQuestion = survey.questions[currentStep];
  const progress = ((currentStep + 1) / totalQuestions) * 100;
  const currentAnswer = answers[currentQuestion?.id] || '';
  const isLastStep = currentStep === totalQuestions - 1;

  const parsedOptions: string[] = currentQuestion?.type === 'MULTIPLE_CHOICE'
    ? JSON.parse(currentQuestion.options || '[]')
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
        {survey.anonymous && (
          <p className="text-sm text-gray-500 mt-1">
            🔒 Esta pesquisa é anónima. Suas respostas não serão identificadas.
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">
            Pergunta {currentStep + 1} de {totalQuestions}
          </span>
          <span className="text-sm font-medium text-gray-700">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-green-700 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{currentQuestion.text}</h2>

        {currentQuestion.type === 'SCALE' && (
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setAnswer(currentQuestion.id, score.toString())}
                className={`w-16 h-16 rounded-lg border-2 text-center transition-all ${
                  currentAnswer === score.toString()
                    ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-xl">{score}</span>
                <span className="block text-[10px] mt-0.5">
                  {score === 1
                    ? 'Discordo'
                    : score === 2
                      ? 'Pouco'
                      : score === 3
                        ? 'Neutro'
                        : score === 4
                          ? 'Concordo'
                          : 'Muito'}
                </span>
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {parsedOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswer(currentQuestion.id, option)}
                className={`block w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  currentAnswer === option
                    ? 'border-green-700 bg-green-50 text-green-800 font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'TEXT' && (
          <textarea
            value={currentAnswer}
            onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            placeholder="Escreva sua resposta..."
          />
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-30"
        >
          &larr; Anterior
        </button>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || !currentAnswer}
            className="bg-green-700 text-white px-6 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Enviando...' : 'Enviar Respostas'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!currentAnswer}
            className="bg-green-700 text-white px-6 py-2 rounded-md hover:bg-green-800 disabled:opacity-50 font-medium"
          >
            Próxima &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
