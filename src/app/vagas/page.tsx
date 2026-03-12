'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
  createdAt: string;
  department: Department | null;
  company: Company;
}

export default function VagasPage() {
  const searchParams = useSearchParams();
  const companySlug = searchParams.get('company');

  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companySlug) params.set('company', companySlug);
      if (search) params.set('search', search);
      if (locationFilter) params.set('location', locationFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/public/vagas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.data);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [companySlug, search, locationFilter, typeFilter]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Group positions by department
  const grouped = positions.reduce<Record<string, JobPosition[]>>((acc, pos) => {
    const dept = pos.department?.name || 'Geral';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(pos);
    return acc;
  }, {});

  // Get unique locations and types for filters
  const locations = Array.from(new Set(positions.map((p) => p.location).filter(Boolean)));
  const types = Array.from(new Set(positions.map((p) => p.type).filter(Boolean)));

  const companyName = positions[0]?.company?.name;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          {companyName ? `Vagas na ${companyName}` : 'Vagas Abertas'}
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Encontre a oportunidade ideal para sua carreira. Confira nossas vagas abertas e faca parte do nosso time.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              id="search"
              type="text"
              placeholder="Cargo, palavra-chave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Localidade
            </label>
            <select
              id="location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todas</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma vaga encontrada</h3>
          <p className="text-gray-500">Tente ajustar os filtros ou volte mais tarde.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([dept, jobs]) => (
            <div key={dept}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {dept}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/vagas/${job.id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {job.description || 'Clique para ver mais detalhes sobre esta vaga.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                      {job.type && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.type}
                        </span>
                      )}
                      {job.department && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                          {job.department.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && positions.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          {positions.length} vaga{positions.length !== 1 ? 's' : ''} aberta{positions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
