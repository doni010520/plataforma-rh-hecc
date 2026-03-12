import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse('Apenas gestores e administradores podem acessar analytics.');
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Determine scope: ADMIN sees all, MANAGER sees subordinates
  let userFilter: { in: string[] } | undefined;
  if (user.role === 'MANAGER') {
    const subordinates = await prisma.user.findMany({
      where: { managerId: user.id, companyId: user.companyId, active: true },
      select: { id: true },
    });
    userFilter = { in: [user.id, ...subordinates.map((s) => s.id)] };
  }

  // ─── Mood x Performance Correlation ───
  // Fetch all data in bulk queries instead of N+1 per-employee queries
  const employeeFilter = {
    companyId: user.companyId,
    active: true,
    ...(userFilter ? { id: userFilter } : {}),
  };

  const [employees, allMoods, latestCycle, allFeedbackCounts] = await Promise.all([
    prisma.user.findMany({
      where: employeeFilter,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        jobTitle: true,
        department: { select: { name: true } },
      },
    }),
    // Bulk: all moods for all employees in the last 3 months
    prisma.moodLog.findMany({
      where: {
        user: employeeFilter,
        date: { gte: threeMonthsAgo },
      },
      select: { userId: true, mood: true },
    }),
    // Single query: latest closed review cycle
    prisma.reviewCycle.findFirst({
      where: { companyId: user.companyId, status: 'CLOSED' },
      orderBy: { endDate: 'desc' },
      select: { id: true },
    }),
    // Bulk: feedback counts grouped by user
    prisma.feedback.groupBy({
      by: ['toUserId'],
      where: {
        companyId: user.companyId,
        createdAt: { gte: threeMonthsAgo },
        ...(userFilter ? { toUserId: userFilter } : {}),
      },
      _count: { id: true },
    }),
  ]);

  // Build lookup maps for O(1) access
  const moodsByUser = new Map<string, number[]>();
  for (const m of allMoods) {
    const arr = moodsByUser.get(m.userId) || [];
    arr.push(m.mood);
    moodsByUser.set(m.userId, arr);
  }

  const feedbackCountMap = new Map<string, number>();
  for (const fc of allFeedbackCounts) {
    feedbackCountMap.set(fc.toUserId, fc._count.id);
  }

  // Bulk: performance scores from latest cycle (single query instead of N)
  const performanceByUser = new Map<string, number>();
  if (latestCycle) {
    const allAnswers = await prisma.reviewAnswer.findMany({
      where: {
        assignment: {
          cycleId: latestCycle.id,
          status: 'DONE',
          evaluatee: employeeFilter,
        },
      },
      select: {
        score: true,
        assignment: { select: { evaluateeId: true } },
      },
    });

    const scoresByUser = new Map<string, number[]>();
    for (const ans of allAnswers) {
      const uid = ans.assignment.evaluateeId;
      const arr = scoresByUser.get(uid) || [];
      arr.push(ans.score ?? 0);
      scoresByUser.set(uid, arr);
    }
    scoresByUser.forEach((scores, uid) => {
      performanceByUser.set(uid, scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    });
  }

  // Assemble correlation data — no additional queries needed
  const correlationData = employees.map((emp) => {
    const moods = moodsByUser.get(emp.id);
    const avgMood = moods && moods.length > 0
      ? moods.reduce((a, b) => a + b, 0) / moods.length
      : null;

    return {
      id: emp.id,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      jobTitle: emp.jobTitle,
      department: emp.department?.name ?? null,
      avgMood,
      avgPerformance: performanceByUser.get(emp.id) ?? null,
      feedbackCount: feedbackCountMap.get(emp.id) ?? 0,
    };
  });

  // ─── At-Risk Employees ───
  // Criteria: mood < 3 OR performance < 2.5 OR no feedback in 3 months
  const atRiskEmployees = correlationData.filter((emp) => {
    const lowMood = emp.avgMood !== null && emp.avgMood < 3;
    const lowPerformance =
      emp.avgPerformance !== null && emp.avgPerformance < 2.5;
    const noFeedback = emp.feedbackCount === 0;

    return lowMood || lowPerformance || (noFeedback && (emp.avgMood !== null || emp.avgPerformance !== null));
  });

  // Add risk reasons
  const atRiskWithReasons = atRiskEmployees.map((emp) => {
    const reasons: string[] = [];
    if (emp.avgMood !== null && emp.avgMood < 3) reasons.push('Humor baixo');
    if (emp.avgPerformance !== null && emp.avgPerformance < 2.5)
      reasons.push('Avaliação baixa');
    if (emp.feedbackCount === 0) reasons.push('Sem feedback recente');
    return { ...emp, reasons };
  });

  // ─── Department Averages ───
  const deptMap: Record<
    string,
    { mood: number[]; performance: number[]; count: number }
  > = {};
  correlationData.forEach((emp) => {
    const dept = emp.department || 'Sem departamento';
    if (!deptMap[dept]) deptMap[dept] = { mood: [], performance: [], count: 0 };
    deptMap[dept].count++;
    if (emp.avgMood !== null) deptMap[dept].mood.push(emp.avgMood);
    if (emp.avgPerformance !== null)
      deptMap[dept].performance.push(emp.avgPerformance);
  });

  const departmentAverages = Object.entries(deptMap).map(([name, data]) => ({
    name,
    count: data.count,
    avgMood:
      data.mood.length > 0
        ? Math.round(
            (data.mood.reduce((a, b) => a + b, 0) / data.mood.length) * 100,
          ) / 100
        : null,
    avgPerformance:
      data.performance.length > 0
        ? Math.round(
            (data.performance.reduce((a, b) => a + b, 0) /
              data.performance.length) *
              100,
          ) / 100
        : null,
  }));

  const response = NextResponse.json({
    correlationData,
    atRiskEmployees: atRiskWithReasons,
    departmentAverages,
  });
  // Cache for 2 minutes — analytics data is heavy and doesn't change often
  response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
  return response;
}
