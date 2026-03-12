'use client';

import { useState, useEffect, useCallback } from 'react';

interface Department {
  id: string;
  name: string;
  _count: { users: number };
}

export default function DepartamentosPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments');
    if (res.ok) {
      const data = await res.json();
      setDepartments(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setName('');
    setSaving(false);
    fetchDepartments();
  }

  async function handleUpdate(id: string) {
    setError('');
    setSaving(true);

    const res = await fetch(`/api/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setEditingId(null);
    setEditingName('');
    setSaving(false);
    fetchDepartments();
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    setError('');

    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    fetchDepartments();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Departamentos</h1>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Novo Departamento</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do departamento"
            required
            minLength={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Colaboradores
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  Nenhum departamento cadastrado.
                </td>
              </tr>
            )}
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td className="px-6 py-4">
                  {editingId === dept.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                      autoFocus
                    />
                  ) : (
                    <span className="text-gray-900 font-medium">{dept.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">{dept._count.users}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  {editingId === dept.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(dept.id)}
                        disabled={saving}
                        className="text-green-700 hover:text-green-900 text-sm font-medium"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(dept.id);
                          setEditingName(dept.name);
                        }}
                        className="text-green-700 hover:text-green-900 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
