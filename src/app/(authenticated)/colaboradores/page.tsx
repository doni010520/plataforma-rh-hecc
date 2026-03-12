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

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    EMPLOYEE: 'Colaborador',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors font-medium"
        >
          Novo Colaborador
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                disabled={!!editingUser}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input
                type="text"
                value={formJobTitle}
                onChange={(e) => setFormJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Ex: Analista de RH"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <select
                value={formDeptId}
                onChange={(e) => setFormDeptId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Gestor Direto</label>
              <select
                value={formManagerId}
                onChange={(e) => setFormManagerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="EMPLOYEE">Colaborador</option>
                <option value="MANAGER">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            {error && (
              <div className="col-span-full bg-red-50 text-red-600 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="col-span-full flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar e Enviar Convite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou cargo..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        >
          <option value="">Todos os departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Departamento
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perfil
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {colaboradores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nenhum colaborador encontrado.
                      </td>
                    </tr>
                  )}
                  {colaboradores.map((user) => (
                    <tr key={user.id} className={!user.active ? 'opacity-50' : ''}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.jobTitle || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{user.department?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : user.role === 'MANAGER'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-green-700 hover:text-green-900 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`text-sm font-medium ${
                            user.active
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {user.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} colaboradores
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchColaboradores(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => fetchColaboradores(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
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
