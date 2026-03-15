import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'personal';

  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  // ─── Manager Dashboard ───
  if (view === 'manager' && hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    // Get subordinates
    const subordinateWhere =
      user.role === 'ADMIN'
        ? { companyId: user.companyId, active: true }
        : { managerId: user.id, companyId: user.companyId, active: true };

    const subordinates = await prisma.user.findMany({
      where: subordinateWhere,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    const subordinateIds = subordinates.map((s) => s.id);

    // Today's mood average for the team
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const teamMoodToday = await prisma.moodLog.findMany({
      where: {
        userId: { in: subordinateIds },
        date: today,
      },
    });
    const teamMoodAvg =
      teamMoodToday.length > 0
        ? teamMoodToday.reduce((a, l) => a + l.mood, 0) / teamMoodToday.length
        : null;

    // % of evaluations responded (active cycles)
    const activeCycles = await prisma.reviewCycle.findMany({
      where: { companyId: user.companyId, status: 'ACTIVE' },
      select: { id: true },
    });
    const activeCycleIds = activeCycles.map((c) => c.id);

    let evalTotal = 0;
    let evalDone = 0;
    if (activeCycleIds.length > 0) {
      const assignments = await prisma.reviewAssignment.findMany({
        where: {
          cycleId: { in: activeCycleIds },
          evaluatorId: { in: subordinateIds },
        },
        select: { status: true },
      });
      evalTotal = assignments.length;
      evalDone = assignments.filter((a) => a.status === 'DONE').length;
    }

    // OKRs at risk for team
    const atRiskOkrs = await prisma.objective.count({
      where: {
        companyId: user.companyId,
        ownerId: { in: subordinateIds },
        quarter: currentQuarter,
        year: currentYear,
        status: 'AT_RISK',
      },
    });

    // Per-subordinate status — parallel queries per subordinate
    const subordinateStatus = await Promise.all(
      subordinates.map(async (sub) => {
        const mood = teamMoodToday.find((m) => m.userId === sub.id);

        const [pendingEvals, okrCount, recentFeedbackCount] = await Promise.all([
          activeCycleIds.length > 0
            ? prisma.reviewAssignment.count({
                where: {
                  evaluatorId: sub.id,
                  cycleId: { in: activeCycleIds },
                  status: 'PENDING',
                },
              })
            : Promise.resolve(0),
          prisma.objective.count({
            where: {
              ownerId: sub.id,
              companyId: user.companyId,
              quarter: currentQuarter,
              year: currentYear,
              status: { not: 'CANCELLED' },
            },
          }),
          prisma.feedback.count({
            where: {
              toUserId: sub.id,
              companyId: user.companyId,
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
              },
            },
          }),
        ]);

        return {
          id: sub.id,
          name: sub.name,
          avatarUrl: sub.avatarUrl,
          jobTitle: sub.jobTitle,
          department: sub.department?.name ?? null,
          todayMood: mood?.mood ?? null,
          pendingEvals,
          okrCount,
          recentFeedbackCount,
        };
      }),
    );

    return NextResponse.json({
      teamSize: subordinates.length,
      teamMoodAvg,
      evalTotal,
      evalDone,
      evalRate: evalTotal > 0 ? (evalDone / evalTotal) * 100 : 0,
      atRiskOkrs,
      subordinateStatus,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  }

  // ─── Admin Dashboard ───
  if (view === 'admin' && hasRole(user.role, ['ADMIN'])) {
    // Total active employees
    const totalEmployees = await prisma.user.count({
      where: { companyId: user.companyId, active: true },
    });

    // Engagement rate: % of employees that did at least one action in the last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [moodUsers, feedbackUsers, surveyUsers] = await Promise.all([
      prisma.moodLog.findMany({
        where: {
          companyId: user.companyId,
          date: { gte: thirtyDaysAgo },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.feedback.findMany({
        where: {
          companyId: user.companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { fromUserId: true },
        distinct: ['fromUserId'],
      }),
      prisma.surveyResponse.findMany({
        where: {
          survey: { companyId: user.companyId },
          submittedAt: { gte: thirtyDaysAgo },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const engagedUserIds = new Set([
      ...moodUsers.map((m) => m.userId),
      ...feedbackUsers.map((f) => f.fromUserId),
      ...surveyUsers.filter((s) => s.userId).map((s) => s.userId!),
    ]);
    const engagementRate =
      totalEmployees > 0 ? (engagedUserIds.size / totalEmployees) * 100 : 0;

    // Internal NPS: average of latest CLIMATE survey scale answers (simplified)
    const latestClimateSurvey = await prisma.survey.findFirst({
      where: {
        companyId: user.companyId,
        type: 'CLIMATE',
        status: 'CLOSED',
      },
      orderBy: { endDate: 'desc' },
      select: { id: true },
    });

    let nps: number | null = null;
    if (latestClimateSurvey) {
      const scaleAnswers = await prisma.surveyAnswer.findMany({
        where: {
          response: { surveyId: latestClimateSurvey.id },
          question: { type: 'SCALE' },
        },
        select: { value: true },
      });
      if (scaleAnswers.length > 0) {
        // NPS-style: scale 1-5 → promoters (5), passives (4), detractors (1-3)
        const promoters = scaleAnswers.filter(
          (a) => parseInt(a.value) === 5,
        ).length;
        const detractors = scaleAnswers.filter(
          (a) => parseInt(a.value) <= 3,
        ).length;
        nps =
          ((promoters - detractors) / scaleAnswers.length) * 100;
      }
    }

    // Mood evolution (last 8 weeks)
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const moodLogs = await prisma.moodLog.findMany({
      where: {
        companyId: user.companyId,
        date: { gte: eightWeeksAgo },
      },
      orderBy: { date: 'asc' },
    });

    const weeklyMood: Record<string, { sum: number; count: number }> = {};
    moodLogs.forEach((log) => {
      const weekStart = new Date(log.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeklyMood[key]) weeklyMood[key] = { sum: 0, count: 0 };
      weeklyMood[key].sum += log.mood;
      weeklyMood[key].count++;
    });

    const moodEvolution = Object.entries(weeklyMood).map(([week, data]) => ({
      week,
      avg: Math.round((data.sum / data.count) * 100) / 100,
      count: data.count,
    }));

    // Active review cycles
    const activeCycles = await prisma.reviewCycle.findMany({
      where: { companyId: user.companyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        type: true,
        startDate: true,
        endDate: true,
        _count: { select: { assignments: true } },
      },
    });

    const cyclesWithProgress = await Promise.all(
      activeCycles.map(async (cycle) => {
        const done = await prisma.reviewAssignment.count({
          where: { cycleId: cycle.id, status: 'DONE' },
        });
        return {
          id: cycle.id,
          name: cycle.name,
          type: cycle.type,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          totalAssignments: cycle._count.assignments,
          completedAssignments: done,
          progress:
            cycle._count.assignments > 0
              ? (done / cycle._count.assignments) * 100
              : 0,
        };
      }),
    );

    // Company OKR map
    const companyOkrs = await prisma.objective.findMany({
      where: {
        companyId: user.companyId,
        quarter: currentQuarter,
        year: currentYear,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        title: true,
        level: true,
        status: true,
        owner: { select: { name: true } },
        keyResults: {
          select: {
            id: true,
            title: true,
            metricType: true,
            startValue: true,
            targetValue: true,
            currentValue: true,
          },
        },
      },
      orderBy: [{ level: 'asc' }, { title: 'asc' }],
    });

    const okrMap = companyOkrs.map((obj) => {
      const krs = obj.keyResults;
      const progress =
        krs.length > 0
          ? krs.reduce((acc, kr) => {
              if (kr.metricType === 'BOOLEAN')
                return acc + (kr.currentValue >= 1 ? 100 : 0);
              const range = kr.targetValue - kr.startValue;
              if (range === 0) return acc + 100;
              const p =
                ((kr.currentValue - kr.startValue) / range) * 100;
              return acc + Math.min(Math.max(p, 0), 100);
            }, 0) / krs.length
          : 0;
      return {
        id: obj.id,
        title: obj.title,
        level: obj.level,
        status: obj.status,
        owner: obj.owner?.name ?? 'Sem dono',
        progress: Math.round(progress),
        keyResultsCount: krs.length,
      };
    });

    return NextResponse.json({
      totalEmployees,
      engagementRate: Math.round(engagementRate),
      nps: nps !== null ? Math.round(nps) : null,
      moodEvolution,
      activeCycles: cyclesWithProgress,
      okrMap,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  }

  // ─── Personal Dashboard (default) ───
  // Already handled by the server component — return minimal data for client-side enhancements
  return NextResponse.json({ view: 'personal' });
}
