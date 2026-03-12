'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface JobPosition {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  vacancies: number;
  createdAt: string;
  department: Department | null;
  company: Company;
}

export default function VagaDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [position, setPosition] = useState<JobPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function fetchPosition() {
      try {
        const res = await fetch(`/api/public/vagas/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPosition(data);
        } else {
          setError('Vaga nao encontrada.');
        }
      } catch {
        setError('Erro ao carregar a vaga.');
      } finally {
        setLoading(false);
      }
    }
    fetchPosition();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !email.trim()) {
      setFormError('Nome e email sao obrigatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/vagas/${id}/candidatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, linkedIn }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Erro ao enviar candidatura.');
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError('Erro de conexao. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Vaga nao encontrada'}</h2>
        <Link href="/vagas" className="text-green-700 hover:text-green-800 font-medium">
          Voltar para vagas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link href="/vagas" className="text-green-700 hover:text-green-800 text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para vagas
        </Link>
      </nav>

      {/* Position Detail */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{position.title}</h1>
          <div className="flex flex-wrap gap-3 mb-4">
            {position.department && (
              <span className="inline-flex items-center gap-1.5 text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                {position.department.name}
              </span>
            )}
            {position.location && (
              <span className="inline-flex items-center gap-1.5 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {position.location}
              </span>
            )}
            {position.type && (
              <span className="inline-flex items-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {position.type}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm bg-gray-50 text-gray-600 px-3 py-1 rounded-full">
              {position.vacancies} vaga{position.vacancies !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Publicada em {new Date(position.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Descricao da Vaga</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {position.description || 'Descricao nao disponivel.'}
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8" id="candidatar">
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Candidatura enviada!</h3>
            <p className="text-gray-600 mb-6">
              Obrigado pelo seu interesse. Entraremos em contato em breve.
            </p>
            <Link
              href="/vagas"
              className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ver outras vagas
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Candidate-se</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn
                  </label>
                  <input
                    id="linkedin"
                    type="url"
                    value={linkedIn}
                    onChange={(e) => setLinkedIn(e.target.value)}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Enviando...' : 'Enviar Candidatura'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
