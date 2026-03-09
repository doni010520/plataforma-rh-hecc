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
  // Get employees with mood data and evaluation scores
  const employees = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
      active: true,
      ...(userFilter ? { id: userFilter } : {}),
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      jobTitle: true,
      department: { select: { name: true } },
    },
  });

  const correlationData = await Promise.all(
    employees.map(async (emp) => {
      // Average mood (last 3 months)
      const moods = await prisma.moodLog.findMany({
        where: {
          userId: emp.id,
          date: { gte: threeMonthsAgo },
        },
        select: { mood: true },
      });
      const avgMood =
        moods.length > 0
          ? moods.reduce((a, m) => a + m.mood, 0) / moods.length
          : null;

      // Average performance score (latest closed cycle)
      const latestCycle = await prisma.reviewCycle.findFirst({
        where: { companyId: user.companyId, status: 'CLOSED' },
        orderBy: { endDate: 'desc' },
        select: { id: true },
      });

      let avgPerformance: number | null = null;
      if (latestCycle) {
        const answers = await prisma.reviewAnswer.findMany({
          where: {
            assignment: {
              cycleId: latestCycle.id,
              evaluateeId: emp.id,
              status: 'DONE',
            },
          },
          select: { score: true },
        });
        if (answers.length > 0) {
          avgPerformance =
            answers.reduce((a, ans) => a + (ans.score ?? 0), 0) / answers.length;
        }
      }

      // Recent feedback count
      const feedbackCount = await prisma.feedback.count({
        where: {
          toUserId: emp.id,
          companyId: user.companyId,
          createdAt: { gte: threeMonthsAgo },
        },
      });

      return {
        id: emp.id,
        name: emp.name,
        avatarUrl: emp.avatarUrl,
        jobTitle: emp.jobTitle,
        department: emp.department?.name ?? null,
        avgMood,
        avgPerformance,
        feedbackCount,
      };
    }),
  );

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

  return NextResponse.json({
    correlationData,
    atRiskEmployees: atRiskWithReasons,
    departmentAverages,
  });
}
