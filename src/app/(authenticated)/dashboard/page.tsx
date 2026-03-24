import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MoodWidget from '@/components/MoodWidget';
import ManagerDashboard from '@/components/ManagerDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import { AiDashboardCard } from '@/components/AiDashboardCard';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Run ALL independent queries in parallel instead of sequentially
  const [
    recentFeedbacks,
    userObjectives,
    todayMood,
    activeSurveys,
    respondedSurveyIds,
    pendingAssignments,
    assessmentData,
  ] = await Promise.all([
    prisma.feedback.findMany({
      where: { toUserId: user.id, companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { fromUser: { select: { name: true } } },
    }),
    prisma.objective.findMany({
      where: {
        companyId: user.companyId,
        ownerId: user.id,
        quarter: currentQuarter,
        year: currentYear,
        status: { not: 'CANCELLED' },
      },
      include: { keyResults: true },
      take: 5,
    }),
    prisma.moodLog.findFirst({
      where: { userId: user.id, date: today },
    }),
    prisma.survey.findMany({
      where: { companyId: user.companyId, status: 'ACTIVE' },
      select: { id: true, title: true },
    }),
    prisma.surveyResponse.findMany({
      where: {
        userId: user.id,
        survey: { companyId: user.companyId, status: 'ACTIVE' },
      },
      select: { surveyId: true },
    }),
    prisma.reviewAssignment.findMany({
      where: {
        evaluatorId: user.id,
        status: 'PENDING',
        cycle: { status: 'ACTIVE', companyId: user.companyId },
      },
      include: {
        cycle: { select: { name: true, endDate: true } },
        evaluatee: { select: { name: true } },
      },
      take: 5,
    }),
    // NR-01 assessments - wrapped to handle missing tables
    (async () => {
      try {
        const [active, responded] = await Promise.all([
          prisma.psychosocialAssessment.findMany({
            where: { companyId: user.companyId, status: 'ACTIVE' },
            select: { id: true, title: true },
          }),
          prisma.psychosocialResponse.findMany({
            where: {
              userId: user.id,
              assessment: { companyId: user.companyId, status: 'ACTIVE' },
            },
            select: { assessmentId: true },
          }),
        ]);
        const respondedSet = new Set(responded.map((r) => r.assessmentId));
        return active.filter((a) => !respondedSet.has(a.id));
      } catch {
        return [] as { id: string; title: string }[];
      }
    })(),
  ]);

  const respondedIds = new Set(respondedSurveyIds.map((r) => r.surveyId));
  const pendingSurveys = activeSurveys.filter((s) => !respondedIds.has(s.id));
  const pendingAssessments = assessmentData;

  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Bem-vindo(a)</h3>
          <p className="text-xl font-semibold text-gray-100">{user.name}</p>
          <p className="text-sm text-gray-400 mt-1">{user.company?.name ?? 'Sem empresa'}</p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Cargo</h3>
          <p className="text-xl font-semibold text-gray-100">{user.jobTitle || 'Não definido'}</p>
          <p className="text-sm text-gray-400 mt-1">{user.department?.name || 'Sem departamento'}</p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Perfil</h3>
          <p className="text-xl font-semibold text-gray-100">
            {user.role === 'ADMIN'
              ? 'Administrador'
              : user.role === 'MANAGER'
                ? 'Gestor'
                : 'Colaborador'}
          </p>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>
        </div>
      </div>

      {/* Mood Thermometer */}
      <div className="mt-6">
        <MoodWidget initialMood={todayMood?.mood ?? null} />
      </div>

      {/* Active Survey Banner */}
      {pendingSurveys.length > 0 && (
        <div className="mt-6 bg-emerald-900/40 backdrop-blur-lg border border-emerald-500/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-emerald-300 mb-2">
            📋 Pesquisas Ativas ({pendingSurveys.length})
          </h3>
          <div className="space-y-2">
            {pendingSurveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-emerald-400">{s.title}</span>
                <Link
                  href={`/pesquisas/${s.id}/responder`}
                  className="text-sm bg-green-700 text-white px-3 py-1 rounded-md hover:bg-gray-700 font-medium"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active NR-01 Assessment Banner */}
      {pendingAssessments.length > 0 && (
        <div className="mt-6 bg-yellow-900/30 backdrop-blur-lg border border-yellow-500/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-yellow-300 mb-2">
            Avaliações Psicossociais Ativas ({pendingAssessments.length})
          </h3>
          <div className="space-y-2">
            {pendingAssessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-sm text-yellow-400">{a.title}</span>
                <Link
                  href={`/nr01/avaliacoes/${a.id}/responder`}
                  className="text-sm bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 font-medium"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingAssignments.length > 0 && (
        <div className="mt-8 bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Avaliações Pendentes ({pendingAssignments.length})
          </h2>
          <div className="space-y-3">
            {pendingAssignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border border-gray-700/30 rounded-md p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-100">
                    Avaliar: {a.evaluatee?.name ?? 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.cycle?.name ?? ''} &middot; Prazo:{' '}
                    {a.cycle?.endDate ? new Date(a.cycle.endDate).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <Link
                  href={`/avaliacoes/responder/${a.id}`}
                  className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 font-medium"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentFeedbacks.length > 0 && (
        <div className="mt-8 bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              Feedbacks Recentes
            </h2>
            <Link href="/feedback" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {recentFeedbacks.map((fb) => (
              <div key={fb.id} className="border border-gray-700/30 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-100">
                    {fb.fromUser?.name ?? 'Anônimo'}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      fb.type === 'PRAISE'
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : fb.type === 'CONSTRUCTIVE'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-blue-900/30 text-blue-400'
                    }`}
                  >
                    {fb.type === 'PRAISE' ? 'Elogio' : fb.type === 'CONSTRUCTIVE' ? 'Construtivo' : 'Solicitação'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{fb.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">
            Meus OKRs — Q{currentQuarter}/{currentYear}
          </h2>
          <Link href="/okrs" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
            Ver todos
          </Link>
        </div>
        {userObjectives.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Nenhum objetivo definido para este trimestre.{' '}
            <Link href="/okrs" className="text-emerald-400 hover:text-emerald-300">
              Criar OKR
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            {userObjectives.map((obj) => {
              const krs = obj.keyResults;
              const progress = krs.length > 0
                ? krs.reduce((acc, kr) => {
                    if (kr.metricType === 'BOOLEAN') return acc + (kr.currentValue >= 1 ? 100 : 0);
                    const range = kr.targetValue - kr.startValue;
                    if (range === 0) return acc + 100;
                    const p = ((kr.currentValue - kr.startValue) / range) * 100;
                    return acc + Math.min(Math.max(p, 0), 100);
                  }, 0) / krs.length
                : 0;
              return (
                <div key={obj.id}>
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/okrs/${obj.id}`}
                      className="text-sm font-medium text-gray-100 hover:text-emerald-400"
                    >
                      {obj.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                        obj.status === 'AT_RISK'
                          ? 'bg-red-900/30 text-red-400'
                          : obj.status === 'ACHIEVED'
                            ? 'bg-emerald-900/40 text-emerald-400'
                            : 'bg-gray-800/40 text-gray-400'
                      }`}>
                        {obj.status === 'ON_TRACK' ? 'No Caminho'
                          : obj.status === 'AT_RISK' ? 'Em Risco'
                          : obj.status === 'ACHIEVED' ? 'Alcançado' : 'Cancelado'}
                      </span>
                      <span className="text-sm font-bold text-gray-100">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700/40 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        obj.status === 'AT_RISK' ? 'bg-red-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Insights Card (ADMIN/MANAGER only) */}
      {(isManager || isAdmin) && <AiDashboardCard />}

      {/* Role-specific Dashboard Sections */}
      {(isManager || isAdmin) && <ManagerDashboard />}
      {isAdmin && <AdminDashboard />}
    </div>
  );
}
