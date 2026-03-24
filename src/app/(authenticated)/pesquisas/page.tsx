'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SurveyQuestion {
  id: string;
  text: string;
  type: string;
  options: string;
  order: number;
}

interface Survey {
  id: string;
  title: string;
  type: string;
  status: string;
  anonymous: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  questions: SurveyQuestion[];
  _count: { responses: number };
}

const typeLabels: Record<string, string> = {
  CLIMATE: 'Clima',
  PULSE: 'Pulso',
  SATISFACTION: 'Satisfação',
  CUSTOM: 'Personalizada',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Activa',
  CLOSED: 'Encerrada',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-800/40 text-gray-400',
  ACTIVE: 'bg-emerald-900/40 text-emerald-400',
  CLOSED: 'bg-red-900/30 text-red-600',
};

const questionBank = [
  { text: 'Estou satisfeito(a) com o meu ambiente de trabalho.', type: 'SCALE' },
  { text: 'Sinto que meu trabalho é reconhecido.', type: 'SCALE' },
  { text: 'Tenho oportunidades de crescimento profissional.', type: 'SCALE' },
  { text: 'A comunicação interna é clara e eficiente.', type: 'SCALE' },
  { text: 'Me sinto parte de uma equipa colaborativa.', type: 'SCALE' },
  { text: 'Recebo feedback regular do meu gestor.', type: 'SCALE' },
  { text: 'Minha carga de trabalho é adequada.', type: 'SCALE' },
  { text: 'Tenho os recursos necessários para realizar meu trabalho.', type: 'SCALE' },
  { text: 'Estou satisfeito(a) com os benefícios oferecidos.', type: 'SCALE' },
  { text: 'Recomendaria esta empresa como um bom lugar para trabalhar.', type: 'SCALE' },
  { text: 'Meu gestor directo me apoia no meu desenvolvimento.', type: 'SCALE' },
  { text: 'Sinto que a empresa se preocupa com meu bem-estar.', type: 'SCALE' },
  { text: 'A cultura da empresa está alinhada com os meus valores.', type: 'SCALE' },
  { text: 'Tenho clareza sobre as expectativas do meu cargo.', type: 'SCALE' },
  { text: 'Me sinto motivado(a) para vir trabalhar todos os dias.', type: 'SCALE' },
  { text: 'A empresa investe em inovação e melhoria contínua.', type: 'SCALE' },
  { text: 'Sinto-me seguro(a) para expressar minhas opiniões.', type: 'SCALE' },
  { text: 'A empresa promove diversidade e inclusão.', type: 'SCALE' },
  { text: 'Estou satisfeito(a) com minha remuneração.', type: 'SCALE' },
  { text: 'O que poderia ser melhorado na empresa?', type: 'TEXT' },
];

export default function PesquisasPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('CLIMATE');
  const [anonymous, setAnonymous] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState<{ text: string; type: string; options: string[] }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showBank, setShowBank] = useState(false);

  const fetchSurveys = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    const res = await fetch(`/api/pesquisas?${params.toString()}`);
    if (res.ok) setSurveys(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  function addQuestion() {
    setQuestions([...questions, { text: '', type: 'SCALE', options: [] }]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: string, value: string | string[]) {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  }

  function addFromBank(item: { text: string; type: string }) {
    setQuestions([...questions, { text: item.text, type: item.type, options: [] }]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (questions.length === 0) {
      setError('Adicione pelo menos uma pergunta.');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/pesquisas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        type,
        anonymous,
        startDate: startDate || null,
        endDate: endDate || null,
        questions: questions.map((q, i) => ({
          text: q.text,
          type: q.type,
          options: q.options,
          order: i,
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
    setType('CLIMATE');
    setAnonymous(true);
    setStartDate('');
    setEndDate('');
    setQuestions([]);
    fetchSurveys();
  }

  async function handleStatusChange(surveyId: string, newStatus: string) {
    await fetch(`/api/pesquisas/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchSurveys();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-64 bg-gray-700/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Pesquisas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nova Pesquisa'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-600/40 rounded-md text-sm"
        >
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="ACTIVE">Activa</option>
          <option value="CLOSED">Encerrada</option>
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Nova Pesquisa</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: Pesquisa de Clima Q1 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="CLIMATE">Clima</option>
                  <option value="PULSE">Pulso</option>
                  <option value="SATISFACTION">Satisfação</option>
                  <option value="CUSTOM">Personalizada</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 text-emerald-400 focus:ring-emerald-500 border-gray-600/40 rounded"
                />
                <label htmlFor="anonymous" className="text-sm font-medium text-gray-300">
                  Pesquisa anónima
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Perguntas ({questions.length})
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBank(!showBank)}
                    className="text-sm text-emerald-400 hover:text-emerald-200 font-medium"
                  >
                    {showBank ? 'Fechar banco' : 'Banco de perguntas'}
                  </button>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="text-sm text-emerald-400 hover:text-emerald-200 font-medium"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {showBank && (
                <div className="bg-emerald-900/30 p-4 rounded-md mb-3 max-h-64 overflow-y-auto">
                  <p className="text-xs font-medium text-emerald-300 mb-2">
                    Clique para adicionar uma pergunta do banco:
                  </p>
                  <div className="space-y-1">
                    {questionBank.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => addFromBank(item)}
                        className="block w-full text-left text-sm text-gray-300 hover:bg-emerald-900/40 px-2 py-1 rounded"
                      >
                        <span className="text-xs text-green-600 mr-1">[{item.type === 'SCALE' ? '1-5' : 'Texto'}]</span>
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="bg-gray-800/30 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 mt-2 min-w-[20px]">{i + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => updateQuestion(i, 'text', e.target.value)}
                          placeholder="Texto da pergunta"
                          className="w-full px-3 py-1.5 border border-gray-600/40 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex gap-2 items-center">
                          <select
                            value={q.type}
                            onChange={(e) => updateQuestion(i, 'type', e.target.value)}
                            className="px-2 py-1 border border-gray-600/40 rounded-md text-sm"
                          >
                            <option value="SCALE">Escala (1–5)</option>
                            <option value="MULTIPLE_CHOICE">Múltipla escolha</option>
                            <option value="TEXT">Texto livre</option>
                          </select>
                          {q.type === 'MULTIPLE_CHOICE' && (
                            <input
                              type="text"
                              value={q.options.join(', ')}
                              onChange={(e) =>
                                updateQuestion(
                                  i,
                                  'options',
                                  e.target.value.split(',').map((o) => o.trim()),
                                )
                              }
                              placeholder="Opções separadas por vírgula"
                              className="flex-1 px-2 py-1 border border-gray-600/40 rounded-md text-sm"
                            />
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-600 text-sm p-3 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Criando...' : 'Criar Pesquisa'}
            </button>
          </form>
        </div>
      )}

      {/* Surveys List */}
      {surveys.length === 0 ? (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">Nenhuma pesquisa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[survey.status]}`}>
                      {statusLabels[survey.status]}
                    </span>
                    <span className="text-xs text-gray-400">{typeLabels[survey.type]}</span>
                    {survey.anonymous && (
                      <span className="text-xs text-gray-400">· Anónima</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">{survey.title}</h3>
                  <p className="text-sm text-gray-400">
                    {survey.questions.length} perguntas · {survey._count.responses} respostas
                  </p>
                  {survey.startDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(survey.startDate).toLocaleDateString('pt-BR')}
                      {survey.endDate && ` — ${new Date(survey.endDate).toLocaleDateString('pt-BR')}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {survey.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange(survey.id, 'ACTIVE')}
                      className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 font-medium"
                    >
                      Activar
                    </button>
                  )}
                  {survey.status === 'ACTIVE' && (
                    <>
                      <Link
                        href={`/pesquisas/${survey.id}/responder`}
                        className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 font-medium"
                      >
                        Responder
                      </Link>
                      <button
                        onClick={() => handleStatusChange(survey.id, 'CLOSED')}
                        className="text-sm border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-900/30 font-medium"
                      >
                        Encerrar
                      </button>
                    </>
                  )}
                  {(survey.status === 'ACTIVE' || survey.status === 'CLOSED') && (
                    <Link
                      href={`/pesquisas/${survey.id}/resultados`}
                      className="text-sm text-emerald-400 hover:text-emerald-200 font-medium"
                    >
                      Resultados
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
