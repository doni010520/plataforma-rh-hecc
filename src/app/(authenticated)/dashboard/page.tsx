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

  const [
    recentFeedbacks,
    userObjectives,
    todayMood,
    activeSurveys,
    respondedSurveyIds,
    pendingAssignments,
    assessmentData,
    recentCelebrations,
    unreadAnnouncements,
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
    prisma.celebration.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { author: { select: { name: true } } },
    }),
    prisma.announcement.findMany({
      where: {
        companyId: user.companyId,
        reads: { none: { userId: user.id } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const respondedIds = new Set(respondedSurveyIds.map((r) => r.surveyId));
  const pendingSurveys = activeSurveys.filter((s) => !respondedIds.has(s.id));
  const pendingAssessments = assessmentData;

  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Count total pending actions
  const totalPending = pendingAssignments.length + pendingSurveys.length + pendingAssessments.length;
  const firstName = user.name?.split(' ')[0] || 'Usuário';

  // Get greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Greeting + Mood */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {greeting}, {firstName}! 👋
          </h1>
          {totalPending > 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Você tem <span className="text-emerald-500 font-semibold">{totalPending} {totalPending === 1 ? 'ação pendente' : 'ações pendentes'}</span> hoje.
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tudo em dia! Nenhuma ação pendente.</p>
          )}
        </div>
      </div>

      {/* Mood Widget — prominent if not yet answered */}
      {!todayMood && (
        <MoodWidget initialMood={null} />
      )}

      {/* === PENDING ACTIONS — the most important section === */}
      {totalPending > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
            Ações pendentes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Pending Evaluations */}
            {pendingAssignments.map((a) => (
              <Link
                key={a.id}
                href={`/avaliacoes/responder/${a.id}`}
                className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-500 transition-colors">
                      Avaliar {a.evaluatee?.name ?? 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                      {a.cycle?.name} · Prazo: {a.cycle?.endDate ? new Date(a.cycle.endDate).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}

            {/* Pending Surveys */}
            {pendingSurveys.map((s) => (
              <Link
                key={s.id}
                href={`/pesquisas/${s.id}/responder`}
                className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-500 transition-colors">
                      {s.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Pesquisa ativa</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}

            {/* Pending NR-01 Assessments */}
            {pendingAssessments.map((a) => (
              <Link
                key={a.id}
                href={`/nr01/avaliacoes/${a.id}/responder`}
                className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-500 transition-colors">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Avaliação psicossocial</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/feedback"
          className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all text-center"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500 transition-colors">Dar Feedback</p>
        </Link>
        <Link
          href="/mural"
          className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all text-center"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500 transition-colors">Celebrar</p>
        </Link>
        <Link
          href="/okrs"
          className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all text-center"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500 transition-colors">Meus OKRs</p>
        </Link>
        <Link
          href="/comunicados"
          className="group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-md transition-all text-center relative"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500 transition-colors">Comunicados</p>
          {unreadAnnouncements.length > 0 && (
            <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadAnnouncements.length}
            </span>
          )}
        </Link>
      </div>

      {/* Mood — compact if already answered */}
      {todayMood && (
        <MoodWidget initialMood={todayMood.mood} />
      )}

      {/* OKRs Progress */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Meus OKRs — Q{currentQuarter}/{currentYear}
          </h2>
          <Link href="/okrs" className="text-xs text-emerald-500 hover:text-emerald-400 font-medium">
            Ver todos →
          </Link>
        </div>
        {userObjectives.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum objetivo definido para este trimestre.</p>
            <Link href="/okrs" className="text-sm text-emerald-500 hover:text-emerald-400 font-medium mt-1 inline-block">
              Criar primeiro OKR →
            </Link>
          </div>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <Link
                      href={`/okrs/${obj.id}`}
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-emerald-500"
                    >
                      {obj.title}
                    </Link>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700/40 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress >= 70 ? 'bg-emerald-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(progress, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two columns: Feedbacks + Mural */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedbacks */}
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Feedbacks Recentes</h2>
            <Link href="/feedback" className="text-xs text-emerald-500 hover:text-emerald-400 font-medium">
              Ver todos →
            </Link>
          </div>
          {recentFeedbacks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum feedback recebido ainda.</p>
              <Link href="/feedback" className="text-sm text-emerald-500 hover:text-emerald-400 font-medium mt-1 inline-block">
                Enviar primeiro feedback →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFeedbacks.map((fb) => (
                <div key={fb.id} className="border border-gray-100 dark:border-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {fb.fromUser?.name ?? 'Anônimo'}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        fb.type === 'PRAISE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : fb.type === 'CONSTRUCTIVE'
                            ? 'bg-amber-100 text-amber-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {fb.type === 'PRAISE' ? 'Elogio' : fb.type === 'CONSTRUCTIVE' ? 'Construtivo' : 'Solicitação'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{fb.content}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Mural */}
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mural de Celebrações</h2>
            <Link href="/mural" className="text-xs text-emerald-500 hover:text-emerald-400 font-medium">
              Ver tudo →
            </Link>
          </div>
          {recentCelebrations.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma celebração ainda.</p>
              <Link href="/mural" className="text-sm text-emerald-500 hover:text-emerald-400 font-medium mt-1 inline-block">
                Seja o primeiro a celebrar →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCelebrations.map((c) => (
                <div key={c.id} className="border border-gray-100 dark:border-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.author.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Card (ADMIN/MANAGER only) */}
      {(isManager || isAdmin) && <AiDashboardCard />}

      {/* Role-specific Dashboard Sections */}
      {(isManager || isAdmin) && <ManagerDashboard />}
      {isAdmin && <AdminDashboard />}
    </div>
  );
}
