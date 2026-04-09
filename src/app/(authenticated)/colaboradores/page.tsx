'use client';

import { useState, useEffect, useCallback } from 'react';

interface Department {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  active: boolean;
  hasLoggedIn?: boolean;
  department: Department | null;
  manager: { id: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formRole, setFormRole] = useState('EMPLOYEE');
  const [formAdmissionDate, setFormAdmissionDate] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchColaboradores = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (filterDept) params.set('departmentId', filterDept);

      const res = await fetch(`/api/colaboradores?${params}`);
      if (res.ok) {
        const data = await res.json();
        setColaboradores(data.data);
        setPagination(data.pagination);
      }
      setLoading(false);
    },
    [search, filterDept],
  );

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments');
    if (res.ok) setDepartments(await res.json());
  }, []);

  const fetchManagers = useCallback(async () => {
    const res = await fetch('/api/colaboradores?limit=50');
    if (res.ok) {
      const data = await res.json();
      setManagers(
        data.data
          .filter((u: UserData) => u.active)
          .map((u: UserData) => ({ id: u.id, name: u.name })),
      );
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
      if (me) setCurrentUserRole(me.role);
    }).catch(() => {});
  }, [fetchDepartments, fetchManagers]);

  useEffect(() => {
    fetchColaboradores(1);
  }, [fetchColaboradores]);

  function resetForm() {
    setFormName('');
    setFormEmail('');
    setFormJobTitle('');
    setFormDeptId('');
    setFormManagerId('');
    setFormRole('EMPLOYEE');
    setFormAdmissionDate('');
    setEditingUser(null);
    setShowForm(false);
    setError('');
  }

  function openEdit(user: UserData) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormJobTitle(user.jobTitle || '');
    setFormDeptId(user.department?.id || '');
    setFormManagerId(user.manager?.id || '');
    setFormRole(user.role);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const body: Record<string, unknown> = {
      name: formName,
      jobTitle: formJobTitle || null,
      departmentId: formDeptId || null,
      managerId: formManagerId || null,
      role: formRole,
      admissionDate: formAdmissionDate || null,
    };

    if (!editingUser) {
      body.email = formEmail;
    }

    const url = editingUser ? `/api/colaboradores/${editingUser.id}` : '/api/colaboradores';
    const method = editingUser ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    fetchColaboradores(pagination.page);
    fetchManagers();
  }

  async function handleToggleActive(user: UserData) {
    const action = user.active ? 'desativar' : 'reativar';
    if (!confirm(`Tem certeza que deseja ${action} ${user.name}?`)) return;

    const res = await fetch(`/api/colaboradores/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    fetchColaboradores(pagination.page);
  }

  const [resendingInvite, setResendingInvite] = useState<string | null>(null);

  async function handleResendInvite(userId: string, userName: string) {
    if (!confirm(`Reenviar convite para ${userName}?`)) return;
    setResendingInvite(userId);
    try {
      const res = await fetch(`/api/colaboradores/${userId}/reenviar-convite`, {
        method: 'POST',
      });
      if (res.ok) {
        alert(`Convite reenviado para ${userName}!`);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao reenviar convite.');
      }
    } catch {
      alert('Erro de conexão ao reenviar convite.');
    }
    setResendingInvite(null);
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    EMPLOYEE: 'Colaborador',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Colaboradores</h1>
        {currentUserRole === 'ADMIN' && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            Novo Colaborador
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                disabled={!!editingUser}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-800/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cargo</label>
              <input
                type="text"
                value={formJobTitle}
                onChange={(e) => setFormJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Analista de RH"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Departamento</label>
              <select
                value={formDeptId}
                onChange={(e) => setFormDeptId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Nenhum</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Gestor Direto</label>
              <select
                value={formManagerId}
                onChange={(e) => setFormManagerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Nenhum</option>
                {managers
                  .filter((m) => m.id !== editingUser?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Perfil</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="EMPLOYEE">Colaborador</option>
                <option value="MANAGER">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data de Admissão</label>
              <input
                type="date"
                value={formAdmissionDate}
                onChange={(e) => setFormAdmissionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="col-span-full bg-red-900/30 text-red-600 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="col-span-full flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar e Enviar Convite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou cargo..."
          className="flex-1 px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-gray-600/40 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Todos os departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/30">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      Cargo
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                      Departamento
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      Perfil
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    {currentUserRole === 'ADMIN' && (
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {colaboradores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Nenhum colaborador encontrado.
                      </td>
                    </tr>
                  )}
                  {colaboradores.map((user) => (
                    <tr key={user.id} className={!user.active ? 'opacity-50' : ''}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-100">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 hidden md:table-cell">{user.jobTitle || '—'}</td>
                      <td className="px-6 py-4 text-gray-400 hidden lg:table-cell">{user.department?.name || '—'}</td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : user.role === 'MANAGER'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-800/40 text-gray-300'
                          }`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.active
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : 'bg-red-900/30 text-red-700'
                          }`}
                        >
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {currentUserRole === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => openEdit(user)}
                              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-sm font-medium px-2 py-1 rounded transition-colors"
                            >
                              Editar
                            </button>
                            {!user.hasLoggedIn && (
                              <button
                                onClick={() => handleResendInvite(user.id, user.name)}
                                disabled={resendingInvite === user.id}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-sm font-medium px-2 py-1 rounded transition-colors disabled:opacity-50"
                                title="Reenviar email de convite"
                              >
                                {resendingInvite === user.id ? '...' : 'Reenviar'}
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                                user.active
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                  : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                              }`}
                            >
                              {user.active ? 'Desativar' : 'Reativar'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-700/30 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} colaboradores
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchColaboradores(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-600/40 rounded-md text-sm disabled:opacity-50 hover:bg-gray-800/30"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => fetchColaboradores(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-600/40 rounded-md text-sm disabled:opacity-50 hover:bg-gray-800/30"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
