'use client';

import { useState, useEffect, useCallback } from 'react';

// ---- Types ----

interface DiscQuestionOption {
  D: string;
  I: string;
  S: string;
  C: string;
}

interface DiscQuestion {
  id: number;
  options: DiscQuestionOption;
}

interface DiscAssessmentResult {
  id: string;
  profileD: number;
  profileI: number;
  profileS: number;
  profileC: number;
  primaryProfile: 'D' | 'I' | 'S' | 'C' | null;
  completedAt: string | null;
}

interface DiscAnswer {
  questionId: number;
  most: 'D' | 'I' | 'S' | 'C';
  least: 'D' | 'I' | 'S' | 'C';
}

type ProfileKey = 'D' | 'I' | 'S' | 'C';

const PROFILE_INFO: Record<ProfileKey, { name: string; description: string; color: string; bgColor: string }> = {
  D: {
    name: 'Dominancia',
    description: 'Direto, orientado a resultados, determinado, competitivo. Pessoas com perfil D sao decisivas, gostam de desafios e buscam resultados rapidos.',
    color: 'text-red-700',
    bgColor: 'bg-red-900/300',
  },
  I: {
    name: 'Influencia',
    description: 'Entusiasmado, colaborativo, otimista, comunicativo. Pessoas com perfil I sao sociaveis, persuasivas e gostam de trabalhar em equipe.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/300',
  },
  S: {
    name: 'Estabilidade',
    description: 'Paciente, confiavel, trabalho em equipe, calmo. Pessoas com perfil S sao estaveis, leais e preferem ambientes harmoniosos.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/300',
  },
  C: {
    name: 'Conformidade',
    description: 'Analitico, preciso, detalhista, sistematico. Pessoas com perfil C sao rigorosas, valorizam qualidade e seguem padroes estabelecidos.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-900/300',
  },
};

// ---- Component ----

export default function DiscPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DiscAssessmentResult | null>(null);

  // Assessment flow state
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiscQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<DiscAnswer[]>([]);
  const [selectedMost, setSelectedMost] = useState<ProfileKey | null>(null);
  const [selectedLeast, setSelectedLeast] = useState<ProfileKey | null>(null);
  const [phase, setPhase] = useState<'loading' | 'intro' | 'assessment' | 'results'>('loading');
  const [submitting, setSubmitting] = useState(false);

  const fetchResult = useCallback(async () => {
    try {
      const res = await fetch('/api/disc');
      if (res.ok) {
        const data = await res.json();
        if (data.assessment) {
          setResult(data.assessment);
          setPhase('results');
        } else {
          setPhase('intro');
        }
      }
    } catch {
      setPhase('intro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  async function startAssessment() {
    setLoading(true);
    try {
      // Fetch questions
      const qRes = await fetch('/api/disc/perguntas');
      if (!qRes.ok) return;
      const qData = await qRes.json();
      setQuestions(qData.questions);

      // Create assessment
      const aRes = await fetch('/api/disc', { method: 'POST' });
      if (!aRes.ok) return;
      const aData = await aRes.json();
      setAssessmentId(aData.id);

      setAnswers([]);
      setCurrentQuestion(0);
      setSelectedMost(null);
      setSelectedLeast(null);
      setPhase('assessment');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!selectedMost || !selectedLeast) return;

    const question = questions[currentQuestion];
    const newAnswers = [
      ...answers,
      { questionId: question.id, most: selectedMost, least: selectedLeast },
    ];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedMost(null);
      setSelectedLeast(null);
    } else {
      submitAssessment(newAnswers);
    }
  }

  async function submitAssessment(finalAnswers: DiscAnswer[]) {
    if (!assessmentId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disc/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setPhase('results');
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetake() {
    setResult(null);
    setPhase('intro');
  }

  // ---- Render ----

  if (loading && phase === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  // Results view
  if (phase === 'results' && result) {
    const profiles: Array<{ key: ProfileKey; value: number }> = [
      { key: 'D', value: result.profileD },
      { key: 'I', value: result.profileI },
      { key: 'S', value: result.profileS },
      { key: 'C', value: result.profileC },
    ];

    const primary = result.primaryProfile;

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Perfil DISC</h1>
        <p className="text-gray-400 mb-8">
          Resultado da sua avaliacao comportamental DISC
          {result.completedAt && (
            <span className="text-sm text-gray-400 ml-2">
              - Concluida em {new Date(result.completedAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </p>

        {/* Primary Profile Badge */}
        {primary && (
          <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 ${PROFILE_INFO[primary].bgColor} rounded-xl flex items-center justify-center`}>
                <span className="text-2xl font-bold text-white">{primary}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">
                  Perfil Primario: {PROFILE_INFO[primary].name}
                </h2>
                <p className={`text-sm font-medium ${PROFILE_INFO[primary].color}`}>
                  {primary} - {PROFILE_INFO[primary].name}
                </p>
              </div>
            </div>
            <p className="text-gray-300">{PROFILE_INFO[primary].description}</p>
          </div>
        )}

        {/* DISC Bars */}
        <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-6">Distribuicao do Perfil</h3>
          <div className="space-y-5">
            {profiles.map(({ key, value }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 ${PROFILE_INFO[key].bgColor} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                      {key}
                    </span>
                    <span className="text-sm font-medium text-gray-300">{PROFILE_INFO[key].name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-100">{value}%</span>
                </div>
                <div className="w-full bg-green-900/40 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${PROFILE_INFO[key].bgColor} transition-all duration-700`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Profiles Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {profiles.map(({ key }) => (
            <div key={key} className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-8 h-8 ${PROFILE_INFO[key].bgColor} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                  {key}
                </span>
                <h4 className="font-semibold text-gray-100">{PROFILE_INFO[key].name}</h4>
              </div>
              <p className="text-sm text-gray-400">{PROFILE_INFO[key].description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleRetake}
            className="px-6 py-2.5 bg-green-950/50 backdrop-blur-lg border border-green-700/40 text-gray-300 font-medium rounded-lg hover:bg-green-900/30 transition-colors"
          >
            Refazer Avaliacao
          </button>
        </div>
      </div>
    );
  }

  // Introduction view
  if (phase === 'intro') {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Avaliacao DISC</h1>
        <p className="text-gray-400 mb-8">Avaliacao comportamental baseada na metodologia DISC</p>

        <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">O que e o DISC?</h2>
          <p className="text-gray-300 mb-4">
            O DISC e uma metodologia de avaliacao comportamental que identifica quatro dimensoes principais
            do comportamento humano. Ela ajuda a entender como voce se comunica, toma decisoes e interage
            com outras pessoas no ambiente de trabalho.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {(['D', 'I', 'S', 'C'] as const).map((key) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-green-900/30">
                <span className={`w-10 h-10 ${PROFILE_INFO[key].bgColor} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}>
                  {key}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-100 text-sm">{PROFILE_INFO[key].name}</h3>
                  <p className="text-xs text-gray-400">{PROFILE_INFO[key].description}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-gray-100 mb-3">Como funciona?</h3>
          <ul className="space-y-2 text-gray-300 mb-6">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-900/40 text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Voce respondera 24 perguntas rapidas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-900/40 text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Em cada pergunta, escolha o comportamento que MAIS e MENOS descreve voce</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-emerald-900/40 text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Ao final, voce recebera seu perfil DISC com analise detalhada</span>
            </li>
          </ul>

          <p className="text-sm text-gray-400 mb-6">
            Tempo estimado: 5 a 10 minutos. Nao existem respostas certas ou erradas.
          </p>

          <button
            onClick={startAssessment}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Carregando...' : 'Iniciar Avaliacao'}
          </button>
        </div>
      </div>
    );
  }

  // Assessment flow
  if (phase === 'assessment' && questions.length > 0) {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion) / questions.length) * 100;
    const isLast = currentQuestion === questions.length - 1;
    const canProceed = selectedMost && selectedLeast && selectedMost !== selectedLeast;

    const traitKeys: ProfileKey[] = ['D', 'I', 'S', 'C'];

    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Avaliacao DISC</h1>
        <p className="text-gray-400 mb-6">
          Pergunta {currentQuestion + 1} de {questions.length}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-green-800/40 rounded-full h-2.5 mb-8">
          <div
            className="bg-green-700 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">
            Selecione os comportamentos
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Escolha qual palavra mais descreve voce (<strong>MAIS</strong>) e qual menos descreve voce (<strong>MENOS</strong>).
          </p>

          <div className="space-y-3 mb-8">
            {traitKeys.map((key) => {
              const word = question.options[key];
              const isMost = selectedMost === key;
              const isLeastSel = selectedLeast === key;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isMost
                      ? 'border-green-400 bg-emerald-900/30'
                      : isLeastSel
                      ? 'border-red-400 bg-red-900/30'
                      : 'border-green-800/30 hover:border-green-700/40'
                  }`}
                >
                  <span className="font-medium text-gray-100">{word}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLeast === key) setSelectedLeast(null);
                        setSelectedMost(isMost ? null : key);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        isMost
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/40 text-gray-400 hover:bg-emerald-900/40 hover:text-emerald-400'
                      }`}
                    >
                      MAIS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedMost === key) setSelectedMost(null);
                        setSelectedLeast(isLeastSel ? null : key);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        isLeastSel
                          ? 'bg-red-600 text-white'
                          : 'bg-green-900/40 text-gray-400 hover:bg-red-900/30 hover:text-red-700'
                      }`}
                    >
                      MENOS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedMost && selectedLeast && selectedMost === selectedLeast && (
            <p className="text-sm text-red-600 mb-4">
              Voce deve selecionar opcoes diferentes para MAIS e MENOS.
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(currentQuestion - 1);
                  const prev = answers[currentQuestion - 1];
                  if (prev) {
                    setSelectedMost(prev.most);
                    setSelectedLeast(prev.least);
                    setAnswers(answers.slice(0, -1));
                  } else {
                    setSelectedMost(null);
                    setSelectedLeast(null);
                  }
                }
              }}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || submitting}
              className="px-6 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Calculando...' : isLast ? 'Finalizar' : 'Proxima'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
