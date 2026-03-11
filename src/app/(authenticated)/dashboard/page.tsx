import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MoodWidget from '@/components/MoodWidget';
import ManagerDashboard from '@/components/ManagerDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import { AiDashboardCard } from '@/components/AiDashboardCard';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const recentFeedbacks = await prisma.feedback.findMany({
    where: { toUserId: user.id, companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      fromUser: { select: { name: true } },
    },
  });

  // OKR: Get current quarter objectives for the user
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();

  const userObjectives = await prisma.objective.findMany({
    where: {
      companyId: user.companyId,
      ownerId: user.id,
      quarter: currentQuarter,
      year: currentYear,
      status: { not: 'CANCELLED' },
    },
    include: {
      keyResults: true,
    },
    take: 5,
  });

  // Today's mood
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMood = await prisma.moodLog.findFirst({
    where: { userId: user.id, date: today },
  });

  // Active surveys the user hasn't responded to
  const activeSurveys = await prisma.survey.findMany({
    where: {
      companyId: user.companyId,
      status: 'ACTIVE',
    },
    select: { id: true, title: true },
  });

  const respondedSurveyIds = await prisma.surveyResponse.findMany({
    where: {
      userId: user.id,
      survey: { companyId: user.companyId, status: 'ACTIVE' },
    },
    select: { surveyId: true },
  });

  const respondedIds = new Set(respondedSurveyIds.map((r) => r.surveyId));
  const pendingSurveys = activeSurveys.filter((s) => !respondedIds.has(s.id));

  // Active NR-01 psychosocial assessments the user hasn't responded to
  let pendingAssessments: { id: string; title: string }[] = [];
  try {
    const activeAssessments = await prisma.psychosocialAssessment.findMany({
      where: { companyId: user.companyId, status: 'ACTIVE' },
      select: { id: true, title: true },
    });

    const respondedAssessmentIds = await prisma.psychosocialResponse.findMany({
      where: {
        userId: user.id,
        assessment: { companyId: user.companyId, status: 'ACTIVE' },
      },
      select: { assessmentId: true },
    });

    const respondedAssessmentSet = new Set(respondedAssessmentIds.map((r) => r.assessmentId));
    pendingAssessments = activeAssessments.filter((a) => !respondedAssessmentSet.has(a.id));
  } catch {
    // Tables may not exist yet if migration hasn't run
  }

  const pendingAssignments = await prisma.reviewAssignment.findMany({
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
  });

  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Bem-vindo(a)</h3>
          <p className="text-xl font-semibold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500 mt-1">{user.company.name}</p>
        </div>

        <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Cargo</h3>
          <p className="text-xl font-semibold text-gray-900">{user.jobTitle || 'Não definido'}</p>
          <p className="text-sm text-gray-500 mt-1">{user.department?.name || 'Sem departamento'}</p>
        </div>

        <div className="bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Perfil</h3>
          <p className="text-xl font-semibold text-gray-900">
            {user.role === 'ADMIN'
              ? 'Administrador'
              : user.role === 'MANAGER'
                ? 'Gestor'
                : 'Colaborador'}
          </p>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
      </div>

      {/* Mood Thermometer */}
      <div className="mt-6">
        <MoodWidget initialMood={todayMood?.mood ?? null} />
      </div>

      {/* Active Survey Banner */}
      {pendingSurveys.length > 0 && (
        <div className="mt-6 bg-indigo-50/70 backdrop-blur-lg border border-indigo-200/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-indigo-800 mb-2">
            📋 Pesquisas Activas ({pendingSurveys.length})
          </h3>
          <div className="space-y-2">
            {pendingSurveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-indigo-700">{s.title}</span>
                <Link
                  href={`/pesquisas/${s.id}/responder`}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 font-medium"
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
        <div className="mt-6 bg-yellow-50/70 backdrop-blur-lg border border-yellow-200/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            Avaliações Psicossociais Ativas ({pendingAssessments.length})
          </h3>
          <div className="space-y-2">
            {pendingAssessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-sm text-yellow-700">{a.title}</span>
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
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Avaliações Pendentes ({pendingAssignments.length})
          </h2>
          <div className="space-y-3">
            {pendingAssignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border border-gray-200 rounded-md p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Avaliar: {a.evaluatee.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.cycle.name} &middot; Prazo:{' '}
                    {new Date(a.cycle.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link
                  href={`/avaliacoes/responder/${a.id}`}
                  className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 font-medium"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentFeedbacks.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedbacks Recentes
            </h2>
            <Link href="/feedback" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {recentFeedbacks.map((fb) => (
              <div key={fb.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {fb.fromUser.name}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      fb.type === 'PRAISE'
                        ? 'bg-green-100 text-green-700'
                        : fb.type === 'CONSTRUCTIVE'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {fb.type === 'PRAISE' ? 'Elogio' : fb.type === 'CONSTRUCTIVE' ? 'Construtivo' : 'Solicitação'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{fb.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Meus OKRs — Q{currentQuarter}/{currentYear}
          </h2>
          <Link href="/okrs" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Ver todos
          </Link>
        </div>
        {userObjectives.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Nenhum objectivo definido para este trimestre.{' '}
            <Link href="/okrs" className="text-indigo-600 hover:text-indigo-800">
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
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {obj.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                        obj.status === 'AT_RISK'
                          ? 'bg-red-100 text-red-700'
                          : obj.status === 'ACHIEVED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {obj.status === 'ON_TRACK' ? 'No Caminho'
                          : obj.status === 'AT_RISK' ? 'Em Risco'
                          : obj.status === 'ACHIEVED' ? 'Alcançado' : 'Cancelado'}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        obj.status === 'AT_RISK' ? 'bg-red-500' : 'bg-indigo-600'
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
      {isManager && <ManagerDashboard />}
      {isAdmin && (
        <>
          <ManagerDashboard />
          <AdminDashboard />
        </>
      )}
    </div>
  );
}
