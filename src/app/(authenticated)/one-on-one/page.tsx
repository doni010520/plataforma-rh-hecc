'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------- Types ----------

interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

interface MeetingSummary {
  id: string;
  scheduledAt: string;
  status: string;
}

interface Cycle {
  id: string;
  managerId: string;
  employeeId: string;
  frequency: string;
  dayOfWeek: number;
  active: boolean;
  createdAt: string;
  manager: UserRef;
  employee: UserRef;
  meetings: MeetingSummary[];
}

interface MeetingListItem {
  id: string;
  scheduledAt: string;
  status: string;
  managerNotes: string;
  employeeNotes: string;
  actionItems: string;
  completedAt: string | null;
  _count: { topics: number };
}

interface TopicAuthor {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  content: string;
  discussed: boolean;
  order: number;
  authorId: string;
  author: TopicAuthor;
}

interface MeetingDetail {
  id: string;
  scheduledAt: string;
  status: string;
  managerNotes: string;
  employeeNotes: string;
  actionItems: string;
  completedAt: string | null;
  topics: Topic[];
  cycle: {
    managerId: string;
    employeeId: string;
    manager: { id: string; name: string };
    employee: { id: string; name: string };
  };
}

interface EmployeeOption {
  id: string;
  name: string;
  jobTitle?: string | null;
}

// ---------- Constants ----------

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ---------- Component ----------

export default function OneOnOnePage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  // Navigation state
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetail | null>(null);

  // Create cycle form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newFrequency, setNewFrequency] = useState('BIWEEKLY');
  const [newDayOfWeek, setNewDayOfWeek] = useState(1);

  // Create meeting form
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState('');

  // Meeting detail editing
  const [editNotes, setEditNotes] = useState('');
  const [editActionItems, setEditActionItems] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [saving, setSaving] = useState(false);

  // ---------- Data fetching ----------

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/one-on-one');
      if (res.ok) setCycles(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) setMe(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCycles();
    fetchMe();
  }, [fetchCycles, fetchMe]);

  const loadMeetings = useCallback(async (cycle: Cycle) => {
    setSelectedCycle(cycle);
    setSelectedMeeting(null);
    try {
      const res = await fetch(`/api/one-on-one/${cycle.id}/meetings`);
      if (res.ok) setMeetings(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadMeetingDetail = useCallback(async (cycleId: string, meetingId: string) => {
    try {
      const res = await fetch(`/api/one-on-one/${cycleId}/meetings/${meetingId}`);
      if (res.ok) {
        const data: MeetingDetail = await res.json();
        setSelectedMeeting(data);
        // Set edit fields based on user role
        if (me && data.cycle.managerId === me.id) {
          setEditNotes(data.managerNotes);
        } else {
          setEditNotes(data.employeeNotes);
        }
        setEditActionItems(data.actionItems);
      }
    } catch { /* ignore */ }
  }, [me]);

  // ---------- Actions ----------

  async function loadEmployees() {
    try {
      const res = await fetch('/api/colaboradores');
      if (res.ok) {
        const data: EmployeeOption[] = await res.json();
        setEmployees(data.filter((e) => e.id !== me?.id));
      }
    } catch { /* ignore */ }
  }

  async function createCycle(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmployeeId) return;
    const res = await fetch('/api/one-on-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: newEmployeeId,
        frequency: newFrequency,
        dayOfWeek: newDayOfWeek,
      }),
    });
    if (res.ok) {
      setShowCreateForm(false);
      setNewEmployeeId('');
      setNewFrequency('BIWEEKLY');
      setNewDayOfWeek(1);
      fetchCycles();
    }
  }

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCycle || !newScheduledAt) return;
    const res = await fetch(`/api/one-on-one/${selectedCycle.id}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date(newScheduledAt).toISOString() }),
    });
    if (res.ok) {
      setShowMeetingForm(false);
      setNewScheduledAt('');
      loadMeetings(selectedCycle);
    }
  }

  async function saveNotes() {
    if (!selectedMeeting || !selectedCycle || !me) return;
    setSaving(true);
    const isManager = selectedMeeting.cycle.managerId === me.id;
    const body: Record<string, string> = { actionItems: editActionItems };
    if (isManager) {
      body.managerNotes = editNotes;
    } else {
      body.employeeNotes = editNotes;
    }
    try {
      const res = await fetch(
        `/api/one-on-one/${selectedCycle.id}/meetings/${selectedMeeting.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        const data: MeetingDetail = await res.json();
        setSelectedMeeting(data);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function completeMeeting() {
    if (!selectedMeeting || !selectedCycle) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/one-on-one/${selectedCycle.id}/meetings/${selectedMeeting.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        },
      );
      if (res.ok) {
        const data: MeetingDetail = await res.json();
        setSelectedMeeting(data);
        loadMeetings(selectedCycle);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function addTopic() {
    if (!selectedMeeting || !selectedCycle || !newTopicContent.trim()) return;
    try {
      const res = await fetch(
        `/api/one-on-one/${selectedCycle.id}/meetings/${selectedMeeting.id}/topics`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newTopicContent.trim() }),
        },
      );
      if (res.ok) {
        setNewTopicContent('');
        loadMeetingDetail(selectedCycle.id, selectedMeeting.id);
      }
    } catch { /* ignore */ }
  }

  async function toggleTopic(topicId: string) {
    if (!selectedMeeting || !selectedCycle) return;
    try {
      const res = await fetch(
        `/api/one-on-one/${selectedCycle.id}/meetings/${selectedMeeting.id}/topics`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId }),
        },
      );
      if (res.ok) {
        loadMeetingDetail(selectedCycle.id, selectedMeeting.id);
      }
    } catch { /* ignore */ }
  }

  async function deleteCycle(cycleId: string) {
    const res = await fetch(`/api/one-on-one/${cycleId}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedCycle(null);
      fetchCycles();
    }
  }

  // ---------- Render helpers ----------

  const canManage = me?.role === 'ADMIN' || me?.role === 'MANAGER';
  const isManager = selectedMeeting ? selectedMeeting.cycle.managerId === me?.id : false;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  // ========== MEETING DETAIL VIEW ==========
  if (selectedMeeting && selectedCycle) {
    const m = selectedMeeting;
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedMeeting(null)}
          className="text-green-700 hover:underline text-sm"
        >
          &larr; Voltar para reuniões
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reunião 1:1
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {m.cycle.manager.name} &amp; {m.cycle.employee.name} &middot;{' '}
              {new Date(m.scheduledAt).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[m.status] || 'bg-gray-100 text-gray-800'}`}
          >
            {statusLabels[m.status] || m.status}
          </span>
        </div>

        {/* Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas do Gestor
            </label>
            {isManager ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={5}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Suas notas sobre a reunião..."
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[5rem]">
                {m.managerNotes || 'Sem notas ainda.'}
              </p>
            )}
          </div>
          <div className="bg-white border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas do Colaborador
            </label>
            {!isManager ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={5}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Suas notas sobre a reunião..."
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[5rem]">
                {m.employeeNotes || 'Sem notas ainda.'}
              </p>
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Pauta / Tópicos</h2>
          <div className="space-y-2 mb-3">
            {m.topics.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50"
              >
                <button
                  onClick={() => toggleTopic(t.id)}
                  className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                    t.discussed
                      ? 'bg-green-700 border-green-700 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {t.discussed && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${t.discussed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                  >
                    {t.content}
                  </p>
                  <p className="text-xs text-gray-400">{t.author.name}</p>
                </div>
              </div>
            ))}
            {m.topics.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">Nenhum tópico adicionado.</p>
            )}
          </div>
          {m.status === 'SCHEDULED' && (
            <div className="flex gap-2">
              <input
                value={newTopicContent}
                onChange={(e) => setNewTopicContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                placeholder="Adicionar tópico..."
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={addTopic}
                disabled={!newTopicContent.trim()}
                className="px-3 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>

        {/* Action Items */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Itens de Ação
          </label>
          <textarea
            value={editActionItems}
            onChange={(e) => setEditActionItems(e.target.value)}
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Lista de ações a serem tomadas..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={saveNotes}
            disabled={saving}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {m.status === 'SCHEDULED' && (
            <button
              onClick={completeMeeting}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Concluir Reunião
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========== MEETINGS LIST VIEW ==========
  if (selectedCycle) {
    const c = selectedCycle;
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <button
          onClick={() => { setSelectedCycle(null); setMeetings([]); }}
          className="text-green-700 hover:underline text-sm"
        >
          &larr; Voltar para ciclos
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              1:1 &middot; {c.manager.name} &amp; {c.employee.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {frequencyLabels[c.frequency] || c.frequency} &middot; {dayLabels[c.dayOfWeek]}
              {!c.active && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  Inativo
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowMeetingForm(true); setNewScheduledAt(''); }}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
            >
              Nova Reunião
            </button>
            {canManage && c.managerId === me?.id && (
              <button
                onClick={() => deleteCycle(c.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
              >
                Excluir Ciclo
              </button>
            )}
          </div>
        </div>

        {/* New Meeting form */}
        {showMeetingForm && (
          <form onSubmit={createMeeting} className="bg-white border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">Nova Reunião</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data e Hora *
              </label>
              <input
                type="datetime-local"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                required
                className="w-full md:w-auto border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowMeetingForm(false)}
                className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Meetings list */}
        <div className="space-y-3">
          {meetings.map((m) => (
            <div
              key={m.id}
              onClick={() => loadMeetingDetail(c.id, m.id)}
              className="bg-white border rounded-lg p-4 cursor-pointer hover:border-green-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(m.scheduledAt).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {m._count.topics} tópico{m._count.topics !== 1 ? 's' : ''}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[m.status] || 'bg-gray-100 text-gray-800'}`}
                >
                  {statusLabels[m.status] || m.status}
                </span>
              </div>
            </div>
          ))}
          {meetings.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              Nenhuma reunião agendada. Clique em &quot;Nova Reunião&quot; para começar.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ========== CYCLES LIST VIEW (main) ==========
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reuniões 1:1</h1>
        {canManage && (
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) loadEmployees();
            }}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800"
          >
            Novo Ciclo 1:1
          </button>
        )}
      </div>

      {/* Create cycle form */}
      {showCreateForm && (
        <form onSubmit={createCycle} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Novo Ciclo 1:1</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colaborador *
              </label>
              <select
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.jobTitle ? ` (${emp.jobTitle})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequência
              </label>
              <select
                value={newFrequency}
                onChange={(e) => setNewFrequency(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quinzenal</option>
                <option value="MONTHLY">Mensal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia da Semana
              </label>
              <select
                value={newDayOfWeek}
                onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {dayLabels.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-800"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Cycles list */}
      <div className="space-y-3">
        {cycles.map((c) => {
          const otherPerson = c.managerId === me?.id ? c.employee : c.manager;
          const roleLabel = c.managerId === me?.id ? 'Colaborador' : 'Gestor';
          const lastMeeting = c.meetings[0];
          return (
            <div
              key={c.id}
              onClick={() => loadMeetings(c)}
              className="bg-white border rounded-lg p-4 cursor-pointer hover:border-green-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    1:1 com {otherPerson.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {roleLabel} &middot; {frequencyLabels[c.frequency] || c.frequency} &middot;{' '}
                    {dayLabels[c.dayOfWeek]}
                    {otherPerson.jobTitle && (
                      <span className="ml-1 text-gray-400">
                        &middot; {otherPerson.jobTitle}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  {!c.active && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      Inativo
                    </span>
                  )}
                  {lastMeeting && (
                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lastMeeting.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {statusLabels[lastMeeting.status] || lastMeeting.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(lastMeeting.scheduledAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {cycles.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            Nenhum ciclo 1:1 encontrado.
            {canManage
              ? ' Clique em "Novo Ciclo 1:1" para começar.'
              : ' Seu gestor pode criar um ciclo 1:1 com você.'}
          </p>
        )}
      </div>
    </div>
  );
}
