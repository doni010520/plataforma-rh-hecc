import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, hasRole } from '@/lib/auth';
import { awardPoints } from '@/lib/gamification';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'week';
  const view = searchParams.get('view') || 'personal';

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    default: // week
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
  }

  if (view === 'company' && hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    // Company/team mood overview
    const where: Record<string, unknown> = {
      companyId: user.companyId,
      date: { gte: startDate },
    };

    // Manager sees only subordinates
    if (user.role === 'MANAGER') {
      const subordinateIds = await prisma.user.findMany({
        where: { managerId: user.id, companyId: user.companyId, active: true },
        select: { id: true },
      });
      where.userId = { in: [user.id, ...subordinateIds.map((s) => s.id)] };
    }

    const logs = await prisma.moodLog.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        user: { select: { id: true, name: true, departmentId: true } },
      },
    });

    // Group by week for evolution chart
    const weeklyAvg: Record<string, { sum: number; count: number }> = {};
    logs.forEach((log) => {
      const weekStart = new Date(log.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeklyAvg[key]) weeklyAvg[key] = { sum: 0, count: 0 };
      weeklyAvg[key].sum += log.mood;
      weeklyAvg[key].count++;
    });

    const weeklyData = Object.entries(weeklyAvg).map(([week, data]) => ({
      week,
      avg: data.sum / data.count,
      count: data.count,
    }));

    // Current average
    const todayStr = now.toISOString().split('T')[0];
    const todayLogs = logs.filter(
      (l) => l.date.toISOString().split('T')[0] === todayStr,
    );
    const todayAvg = todayLogs.length > 0
      ? todayLogs.reduce((a, l) => a + l.mood, 0) / todayLogs.length
      : null;

    return NextResponse.json({
      weeklyData,
      todayAvg,
      totalLogs: logs.length,
    });
  }

  // Personal mood history
  const logs = await prisma.moodLog.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate },
    },
    orderBy: { date: 'desc' },
  });

  // Today's mood
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLog = await prisma.moodLog.findFirst({
    where: {
      userId: user.id,
      date: today,
    },
  });

  return NextResponse.json({
    logs,
    todayMood: todayLog?.mood ?? null,
    todayNote: todayLog?.note ?? '',
  });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { mood, note } = body;

  if (!mood || mood < 1 || mood > 5) {
    return NextResponse.json(
      { error: 'O humor deve ser um valor entre 1 e 5.' },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert — one mood per day per user
  const moodLog = await prisma.moodLog.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    update: {
      mood,
      note: note || '',
    },
    create: {
      companyId: user.companyId,
      userId: user.id,
      mood,
      date: today,
      note: note || '',
    },
  });

  // Award gamification points for daily mood vote (once per day via sourceId)
  const moodSourceId = `mood_${user.id}_${today.toISOString().split('T')[0]}`;
  awardPoints(user.id, user.companyId, 'MOOD_VOTE', moodSourceId);

  return NextResponse.json(moodLog);
}
