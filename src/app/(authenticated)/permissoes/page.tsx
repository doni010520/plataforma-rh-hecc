'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  colaboradores: 'Colaboradores',
  departamentos: 'Departamentos',
  avaliacoes: 'Avaliações',
  feedback: 'Feedback',
  'one-on-one': '1:1',
  okrs: 'OKRs',
  pdi: 'PDI',
  onboarding: 'Onboarding',
  trilhas: 'Trilhas',
  'departamento-pessoal': 'Dept. Pessoal',
  recrutamento: 'Recrutamento',
  nr01: 'NR-01',
  'inteligencia-artificial': 'IA',
  pesquisas: 'Pesquisas',
  mural: 'Mural',
  enps: 'eNPS',
  gamificacao: 'Gamificação',
  comunicados: 'Comunicados',
  analytics: 'Analytics',
  disc: 'DISC',
};

export default function PermissoesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/permissions').then(r => r.ok ? r.json() : null),
      fetch('/api/me').then(r => r.ok ? r.json() : null),
    ]).then(([perms, me]) => {
      if (perms) setModules(perms.employeeModules);
      if (me) {
        setUserRole(me.role);
        if (me.role !== 'ADMIN') router.replace('/dashboard');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/settings/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeModules: modules }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  function toggleModule(key: string) {
    if (key === 'dashboard') return; // Dashboard is always visible
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-64 bg-gray-700/40 rounded animate-pulse" />
      </div>
    );
  }

  if (userRole !== 'ADMIN') {
    return (
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-12 text-center">
        <p className="text-gray-400">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Permissões</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure quais módulos ficam visíveis para colaboradores (perfil Colaborador).
            Administradores e Gestores sempre têm acesso completo.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {Object.entries(MODULE_LABELS).map(([key, label]) => {
            const enabled = modules[key] ?? true;
            const isFixed = key === 'dashboard';
            return (
              <button
                key={key}
                onClick={() => toggleModule(key)}
                disabled={isFixed}
                className={`flex items-center justify-between px-5 py-4 border-b border-r border-gray-700/20 transition-colors ${
                  isFixed
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:bg-gray-800/30 cursor-pointer'
                }`}
              >
                <span className="text-sm font-medium text-gray-100">{label}</span>
                <div
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        O Dashboard é sempre visível para todos os perfis. As alterações entram em vigor imediatamente após salvar.
      </p>
    </div>
  );
}
