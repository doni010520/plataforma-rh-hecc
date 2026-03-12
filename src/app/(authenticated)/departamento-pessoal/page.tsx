'use client';

import { useState, useEffect, useCallback } from 'react';

interface Employee {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeDoc {
  id: string;
  userId: string;
  name: string;
  type: string;
  fileUrl: string | null;
  expiresAt: string | null;
  status: string;
  notes: string;
  uploadedAt: string;
  user: { id: string; name: string; email: string };
}

interface Payslip {
  id: string;
  userId: string;
  referenceMonth: number;
  referenceYear: number;
  grossSalary: number;
  netSalary: number;
  deductions: number;
  bonuses: number;
  fileUrl: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface VacationRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  type: string;
  status: string;
  notes: string;
  createdAt: string;
  user: { id: string; name: string; email: string; jobTitle: string | null };
  approvedBy: { id: string; name: string } | null;
}

interface SalaryHistoryEntry {
  id: string;
  userId: string;
  previousSalary: number;
  newSalary: number;
  reason: string;
  effectiveDate: string;
  user: { id: string; name: string; email: string };
  createdBy: { id: string; name: string };
}

interface JobHistoryEntry {
  id: string;
  userId: string;
  previousJobTitle: string | null;
  newJobTitle: string;
  previousDepartment: { id: string; name: string } | null;
  newDepartment: { id: string; name: string } | null;
  reason: string;
  effectiveDate: string;
  user: { id: string; name: string; email: string };
  createdBy: { id: string; name: string };
}

type Tab = 'documentos' | 'holerites' | 'ferias' | 'salario' | 'cargos';

const docTypeLabels: Record<string, string> = { RG: 'RG', CPF: 'CPF', CTPS: 'CTPS', DIPLOMA: 'Diploma', CERTIFICATE: 'Certificado', CONTRACT: 'Contrato', MEDICAL: 'Atestado Médico', OTHER: 'Outro' };
const docStatusLabels: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', EXPIRED: 'Expirado' };
const docStatusColors: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-300', APPROVED: 'bg-emerald-900/40 text-emerald-300', REJECTED: 'bg-red-900/30 text-red-800', EXPIRED: 'bg-green-900/40 text-gray-200' };
const vacStatusLabels: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', IN_PROGRESS: 'Em Andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
const vacStatusColors: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-300', APPROVED: 'bg-emerald-900/40 text-emerald-300', REJECTED: 'bg-red-900/30 text-red-800', IN_PROGRESS: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-900/40 text-gray-200', CANCELLED: 'bg-green-900/40 text-gray-200' };
const vacTypeLabels: Record<string, string> = { REGULAR: 'Regular', ADVANCE: 'Abono Pecuniário', SPLIT: 'Fracionada' };
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DepartamentoPessoalPage() {
  const [tab, setTab] = useState<Tab>('documentos');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [docs, setDocs] = useState<EmployeeDoc[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);
  const [jobHistory, setJobHistory] = useState<JobHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  // Document form
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const [docUserId, setDocUserId] = useState('');
  const [docExpires, setDocExpires] = useState('');
  // Payslip form
  const [psUserId, setPsUserId] = useState('');
  const [psMonth, setPsMonth] = useState(new Date().getMonth() + 1);
  const [psYear, setPsYear] = useState(new Date().getFullYear());
  const [psGross, setPsGross] = useState(0);
  const [psNet, setPsNet] = useState(0);
  const [psDeductions, setPsDeductions] = useState(0);
  const [psBonuses, setPsBonuses] = useState(0);
  // Vacation form
  const [vacUserId, setVacUserId] = useState('');
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');
  const [vacDays, setVacDays] = useState(30);
  const [vacType, setVacType] = useState('REGULAR');
  const [vacNotes, setVacNotes] = useState('');
  // Salary history form
  const [shUserId, setShUserId] = useState('');
  const [shPrevSalary, setShPrevSalary] = useState(0);
  const [shNewSalary, setShNewSalary] = useState(0);
  const [shReason, setShReason] = useState('');
  const [shDate, setShDate] = useState('');
  // Job history form
  const [jhUserId, setJhUserId] = useState('');
  const [jhPrevTitle, setJhPrevTitle] = useState('');
  const [jhNewTitle, setJhNewTitle] = useState('');
  const [jhPrevDeptId, setJhPrevDeptId] = useState('');
  const [jhNewDeptId, setJhNewDeptId] = useState('');
  const [jhReason, setJhReason] = useState('');
  const [jhDate, setJhDate] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [empRes, deptRes, docRes, psRes, vacRes, shRes, jhRes] = await Promise.all([
        fetch('/api/colaboradores'),
        fetch('/api/departamentos'),
        fetch('/api/dp/documentos'),
        fetch('/api/dp/holerites'),
        fetch('/api/dp/ferias'),
        fetch('/api/dp/historico-salarial'),
        fetch('/api/dp/historico-cargos'),
      ]);
      if (empRes.ok) { const d = await empRes.json(); setEmployees(Array.isArray(d) ? d : d.users || []); }
      if (deptRes.ok) { const d = await deptRes.json(); setDepartments(Array.isArray(d) ? d : []); }
      if (docRes.ok) setDocs(await docRes.json());
      if (psRes.ok) setPayslips(await psRes.json());
      if (vacRes.ok) setVacations(await vacRes.json());
      if (shRes.ok) setSalaryHistory(await shRes.json());
      if (jhRes.ok) setJobHistory(await jhRes.json());
    } catch (err) { console.error('Erro ao carregar dados:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForms = () => {
    setShowForm(false);
    setDocName(''); setDocType('OTHER'); setDocUserId(''); setDocExpires('');
    setPsUserId(''); setPsGross(0); setPsNet(0); setPsDeductions(0); setPsBonuses(0);
    setVacUserId(''); setVacStart(''); setVacEnd(''); setVacDays(30); setVacType('REGULAR'); setVacNotes('');
    setShUserId(''); setShPrevSalary(0); setShNewSalary(0); setShReason(''); setShDate('');
    setJhUserId(''); setJhPrevTitle(''); setJhNewTitle(''); setJhPrevDeptId(''); setJhNewDeptId(''); setJhReason(''); setJhDate('');
  };

  const handleDocCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dp/documentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: docUserId || undefined, name: docName, type: docType, expiresAt: docExpires || null }) });
    if (res.ok) { resetForms(); fetchData(); }
  };

  const handleDocStatus = async (id: string, status: string) => {
    await fetch(`/api/dp/documentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchData();
  };

  const handlePayslipCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dp/holerites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: psUserId, referenceMonth: psMonth, referenceYear: psYear, grossSalary: psGross, netSalary: psNet, deductions: psDeductions, bonuses: psBonuses }) });
    if (res.ok) { resetForms(); fetchData(); }
  };

  const handleVacationCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dp/ferias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: vacUserId || undefined, startDate: vacStart, endDate: vacEnd, daysRequested: vacDays, type: vacType, notes: vacNotes }) });
    if (res.ok) { resetForms(); fetchData(); }
  };

  const handleVacationStatus = async (id: string, status: string) => {
    await fetch(`/api/dp/ferias/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchData();
  };

  const handleSalaryCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dp/historico-salarial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: shUserId, previousSalary: shPrevSalary, newSalary: shNewSalary, reason: shReason, effectiveDate: shDate }) });
    if (res.ok) { resetForms(); fetchData(); }
  };

  const handleJobCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dp/historico-cargos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: jhUserId, previousJobTitle: jhPrevTitle || null, newJobTitle: jhNewTitle, previousDepartmentId: jhPrevDeptId || null, newDepartmentId: jhNewDeptId || null, reason: jhReason, effectiveDate: jhDate }) });
    if (res.ok) { resetForms(); fetchData(); }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'documentos', label: 'Documentos', count: docs.length },
    { key: 'holerites', label: 'Holerites', count: payslips.length },
    { key: 'ferias', label: 'Férias', count: vacations.length },
    { key: 'salario', label: 'Hist. Salarial', count: salaryHistory.length },
    { key: 'cargos', label: 'Hist. Cargos', count: jobHistory.length },
  ];

  const addLabels: Record<Tab, string> = { documentos: '+ Novo Documento', holerites: '+ Novo Holerite', ferias: '+ Nova Solicitação', salario: '+ Novo Registro', cargos: '+ Novo Registro' };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Departamento Pessoal</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">{addLabels[tab]}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
          <h3 className="text-sm font-medium text-gray-400">Documentos</h3>
          <p className="text-2xl font-bold text-gray-100 mt-1">{docs.length}</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
          <h3 className="text-sm font-medium text-gray-400">Holerites</h3>
          <p className="text-2xl font-bold text-gray-100 mt-1">{payslips.length}</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
          <h3 className="text-sm font-medium text-gray-400">Férias Pendentes</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{vacations.filter(v => v.status === 'PENDING').length}</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
          <h3 className="text-sm font-medium text-gray-400">Alterações Salariais</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{salaryHistory.length}</p>
        </div>
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
          <h3 className="text-sm font-medium text-gray-400">Mudanças de Cargo</h3>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{jobHistory.length}</p>
        </div>
      </div>

      <div className="border-b border-green-800/30">
        <nav className="flex gap-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowForm(false); }} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-green-700 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>{t.label} ({t.count})</button>
          ))}
        </nav>
      </div>

      {/* DOCUMENTS TAB */}
      {tab === 'documentos' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleDocCreate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Novo Documento</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={docUserId} onChange={e => setDocUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm"><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Nome</label><input type="text" value={docName} onChange={e => setDocName(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label><select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm">{Object.entries(docTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Validade</label><input type="date" value={docExpires} onChange={e => setDocExpires(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Criar</button>
                <button type="button" onClick={resetForms} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {docs.length === 0 ? (
            <div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhum documento encontrado.</p></div>
          ) : (
            <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-900/30"><tr><th className="text-left px-4 py-3 font-medium text-gray-400">Colaborador</th><th className="text-left px-4 py-3 font-medium text-gray-400">Documento</th><th className="text-left px-4 py-3 font-medium text-gray-400">Tipo</th><th className="text-left px-4 py-3 font-medium text-gray-400">Validade</th><th className="text-left px-4 py-3 font-medium text-gray-400">Status</th><th className="text-left px-4 py-3 font-medium text-gray-400">Ações</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">{d.user.name}</td>
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3">{docTypeLabels[d.type] || d.type}</td>
                      <td className="px-4 py-3">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${docStatusColors[d.status]}`}>{docStatusLabels[d.status]}</span></td>
                      <td className="px-4 py-3 flex gap-1">
                        {d.status === 'PENDING' && (<><button onClick={() => handleDocStatus(d.id, 'APPROVED')} className="text-green-600 hover:text-emerald-300 text-xs">Aprovar</button><button onClick={() => handleDocStatus(d.id, 'REJECTED')} className="text-red-600 hover:text-red-800 text-xs">Rejeitar</button></>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYSLIPS TAB */}
      {tab === 'holerites' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handlePayslipCreate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Novo Holerite</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={psUserId} onChange={e => setPsUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Mês</label><select value={psMonth} onChange={e => setPsMonth(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm">{monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Ano</label><input type="number" value={psYear} onChange={e => setPsYear(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Sal. Bruto</label><input type="number" step="0.01" value={psGross} onChange={e => setPsGross(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Descontos</label><input type="number" step="0.01" value={psDeductions} onChange={e => setPsDeductions(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Bônus</label><input type="number" step="0.01" value={psBonuses} onChange={e => setPsBonuses(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Sal. Líquido</label><input type="number" step="0.01" value={psNet} onChange={e => setPsNet(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Criar</button>
                <button type="button" onClick={resetForms} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {payslips.length === 0 ? (
            <div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhum holerite encontrado.</p></div>
          ) : (
            <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-900/30"><tr><th className="text-left px-4 py-3 font-medium text-gray-400">Colaborador</th><th className="text-left px-4 py-3 font-medium text-gray-400">Referência</th><th className="text-right px-4 py-3 font-medium text-gray-400">Bruto</th><th className="text-right px-4 py-3 font-medium text-gray-400">Descontos</th><th className="text-right px-4 py-3 font-medium text-gray-400">Bônus</th><th className="text-right px-4 py-3 font-medium text-gray-400">Líquido</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {payslips.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.user.name}</td>
                      <td className="px-4 py-3">{monthNames[p.referenceMonth - 1]}/{p.referenceYear}</td>
                      <td className="px-4 py-3 text-right">{currency(p.grossSalary)}</td>
                      <td className="px-4 py-3 text-right text-red-600">-{currency(p.deductions)}</td>
                      <td className="px-4 py-3 text-right text-green-600">+{currency(p.bonuses)}</td>
                      <td className="px-4 py-3 text-right font-medium">{currency(p.netSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VACATIONS TAB */}
      {tab === 'ferias' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleVacationCreate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Nova Solicitação de Férias</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={vacUserId} onChange={e => setVacUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm"><option value="">Eu mesmo</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Início</label><input type="date" value={vacStart} onChange={e => setVacStart(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Fim</label><input type="date" value={vacEnd} onChange={e => setVacEnd(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Dias</label><input type="number" value={vacDays} onChange={e => setVacDays(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" min={1} max={30} required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label><select value={vacType} onChange={e => setVacType(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm">{Object.entries(vacTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1">Observações</label><textarea value={vacNotes} onChange={e => setVacNotes(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" rows={2} /></div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Solicitar</button>
                <button type="button" onClick={resetForms} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {vacations.length === 0 ? (
            <div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhuma solicitação de férias encontrada.</p></div>
          ) : (
            <div className="space-y-2">
              {vacations.map(v => (
                <div key={v.id} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-100">{v.user.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${vacStatusColors[v.status]}`}>{vacStatusLabels[v.status]}</span>
                      <span className="text-xs text-gray-400">{vacTypeLabels[v.type]}</span>
                    </div>
                    <p className="text-sm text-gray-400">{new Date(v.startDate).toLocaleDateString('pt-BR')} a {new Date(v.endDate).toLocaleDateString('pt-BR')} ({v.daysRequested} dias)</p>
                    {v.notes && <p className="text-xs text-gray-400 mt-1">{v.notes}</p>}
                    {v.approvedBy && <p className="text-xs text-gray-400 mt-1">Aprovado por {v.approvedBy.name}</p>}
                  </div>
                  {v.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleVacationStatus(v.id, 'APPROVED')} className="px-3 py-1 bg-emerald-900/40 text-emerald-400 rounded text-xs hover:bg-green-200">Aprovar</button>
                      <button onClick={() => handleVacationStatus(v.id, 'REJECTED')} className="px-3 py-1 bg-red-900/30 text-red-700 rounded text-xs hover:bg-red-200">Rejeitar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SALARY HISTORY TAB */}
      {tab === 'salario' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleSalaryCreate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Registrar Alteração Salarial</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={shUserId} onChange={e => setShUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Sal. Anterior</label><input type="number" step="0.01" value={shPrevSalary} onChange={e => setShPrevSalary(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Novo Salário</label><input type="number" step="0.01" value={shNewSalary} onChange={e => setShNewSalary(Number(e.target.value))} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Data Efetiva</label><input type="date" value={shDate} onChange={e => setShDate(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Motivo</label><input type="text" value={shReason} onChange={e => setShReason(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" placeholder="Promoção, reajuste..." /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Registrar</button>
                <button type="button" onClick={resetForms} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {salaryHistory.length === 0 ? (
            <div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhuma alteração salarial registrada.</p></div>
          ) : (
            <div className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-900/30"><tr><th className="text-left px-4 py-3 font-medium text-gray-400">Colaborador</th><th className="text-right px-4 py-3 font-medium text-gray-400">Anterior</th><th className="text-right px-4 py-3 font-medium text-gray-400">Novo</th><th className="text-right px-4 py-3 font-medium text-gray-400">Variação</th><th className="text-left px-4 py-3 font-medium text-gray-400">Motivo</th><th className="text-left px-4 py-3 font-medium text-gray-400">Data</th><th className="text-left px-4 py-3 font-medium text-gray-400">Por</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {salaryHistory.map(s => {
                    const pct = s.previousSalary > 0 ? (((s.newSalary - s.previousSalary) / s.previousSalary) * 100).toFixed(1) : '0';
                    const isUp = s.newSalary >= s.previousSalary;
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3">{s.user.name}</td>
                        <td className="px-4 py-3 text-right">{currency(s.previousSalary)}</td>
                        <td className="px-4 py-3 text-right font-medium">{currency(s.newSalary)}</td>
                        <td className={`px-4 py-3 text-right ${isUp ? 'text-green-600' : 'text-red-600'}`}>{isUp ? '+' : ''}{pct}%</td>
                        <td className="px-4 py-3 text-gray-400">{s.reason || '-'}</td>
                        <td className="px-4 py-3">{new Date(s.effectiveDate).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-gray-400">{s.createdBy.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* JOB HISTORY TAB */}
      {tab === 'cargos' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleJobCreate} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Registrar Mudança de Cargo</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Colaborador</label><select value={jhUserId} onChange={e => setJhUserId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Cargo Anterior</label><input type="text" value={jhPrevTitle} onChange={e => setJhPrevTitle(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" placeholder="Cargo atual" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Novo Cargo</label><input type="text" value={jhNewTitle} onChange={e => setJhNewTitle(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Depto. Anterior</label><select value={jhPrevDeptId} onChange={e => setJhPrevDeptId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm"><option value="">Nenhum</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Novo Depto.</label><select value={jhNewDeptId} onChange={e => setJhNewDeptId(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm"><option value="">Nenhum</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Data Efetiva</label><input type="date" value={jhDate} onChange={e => setJhDate(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Motivo</label><input type="text" value={jhReason} onChange={e => setJhReason(e.target.value)} className="w-full border border-green-700/40 rounded-lg px-3 py-2 text-sm" placeholder="Promoção, transferência..." /></div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm">Registrar</button>
                <button type="button" onClick={resetForms} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {jobHistory.length === 0 ? (
            <div className="text-center py-12 bg-green-900/30 rounded-lg"><p className="text-gray-400">Nenhuma mudança de cargo registrada.</p></div>
          ) : (
            <div className="space-y-2">
              {jobHistory.map(j => (
                <div key={j.id} className="bg-green-950/50 backdrop-blur-lg rounded-lg border border-green-800/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-100">{j.user.name}</span>
                    <span className="text-xs text-gray-400">{new Date(j.effectiveDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{j.previousJobTitle || 'Sem cargo'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-emerald-400">{j.newJobTitle}</span>
                  </div>
                  {(j.previousDepartment || j.newDepartment) && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span>{j.previousDepartment?.name || 'Sem depto.'}</span>
                      <span>→</span>
                      <span>{j.newDepartment?.name || 'Sem depto.'}</span>
                    </div>
                  )}
                  {j.reason && <p className="text-xs text-gray-400 mt-1">Motivo: {j.reason}</p>}
                  <p className="text-xs text-gray-400 mt-1">Registrado por {j.createdBy.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
