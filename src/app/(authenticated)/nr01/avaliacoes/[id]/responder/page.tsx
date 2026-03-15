'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
}

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  anonymous: boolean;
  questions: Question[];
  hasResponded: boolean;
}

const scaleLabels = [
  'Discordo totalmente',
  'Discordo',
  'Neutro',
  'Concordo',
  'Concordo totalmente',
];

export default function ResponderNR01Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fetchAssessment = useCallback(async () => {
    const res = await fetch(`/api/nr01/avaliacoes/${id}/perguntas`);
    if (res.ok) setAssessment(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

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

    const res = await fetch(`/api/nr01/avaliacoes/${id}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answerList }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Erro ao enviar respostas.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-64 bg-green-800/40 rounded animate-pulse" />
        <div className="h-96 bg-green-800/40 rounded animate-pulse" />
      </div>
    );
  }

  if (!assessment) {
    return <p className="text-gray-400">Avaliação não encontrada ou não está ativa.</p>;
  }

  if (assessment.hasResponded || submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">
          {submitted ? 'Respostas enviadas!' : 'Avaliação já respondida'}
        </h1>
        <p className="text-gray-400 mb-6">
          {submitted
            ? 'Obrigado por participar da avaliação psicossocial. Suas respostas foram registradas com sucesso.'
            : `Você já respondeu a avaliação "${assessment.title}".`}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-emerald-400 hover:text-emerald-200 font-medium"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const totalQuestions = assessment.questions.length;
  const currentQuestion = assessment.questions[currentStep];
  const progress = ((currentStep + 1) / totalQuestions) * 100;
  const currentAnswer = answers[currentQuestion?.id] || '';
  const isLastStep = currentStep === totalQuestions - 1;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">{assessment.title}</h1>
        {assessment.description && (
          <p className="text-sm text-gray-400 mt-1">{assessment.description}</p>
        )}
        {assessment.anonymous && (
          <p className="text-sm text-yellow-400 bg-yellow-900/30 border border-yellow-500/20 rounded px-3 py-1.5 mt-2 inline-block">
            Esta avaliação é anônima. Suas respostas não serão identificadas.
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">
            Pergunta {currentStep + 1} de {totalQuestions}
          </span>
          <span className="text-sm font-medium text-gray-300">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-green-800/40 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-yellow-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-8 mb-6">
        {currentQuestion.category && (
          <span className="text-xs font-medium text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded mb-3 inline-block">
            {currentQuestion.category}
          </span>
        )}
        <h2 className="text-lg font-semibold text-gray-100 mb-6">{currentQuestion.text}</h2>

        {/* Scale 1-5 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setAnswer(currentQuestion.id, score.toString())}
              className={`flex-1 min-w-[64px] py-3 px-2 rounded-lg border-2 text-center transition-all ${
                currentAnswer === score.toString()
                  ? 'border-yellow-500 bg-yellow-900/30 text-yellow-400 font-bold'
                  : 'border-green-800/30 hover:border-yellow-600/40 text-gray-400'
              }`}
            >
              <span className="text-xl">{score}</span>
              <span className="block text-[10px] mt-0.5 leading-tight">
                {scaleLabels[score - 1]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 text-gray-400 hover:text-gray-200 font-medium disabled:opacity-30"
        >
          &larr; Anterior
        </button>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || !currentAnswer}
            className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Enviando...' : 'Enviar Respostas'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!currentAnswer}
            className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 font-medium"
          >
            Próxima &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
