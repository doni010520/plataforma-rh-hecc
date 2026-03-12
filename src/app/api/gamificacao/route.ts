import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  totalPoints: number;
  rank: number;
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  // Aggregate points per user
  const pointsAgg = await prisma.gamificationPoints.groupBy({
    by: ['userId'],
    where: { companyId: user.companyId },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 50,
  });

  const userIds = pointsAgg.map((p) => p.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, active: true },
    select: { id: true, name: true, avatarUrl: true, jobTitle: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard: LeaderboardEntry[] = pointsAgg
    .map((entry, index) => {
      const u = userMap.get(entry.userId);
      if (!u) return null;
      return {
        userId: u.id,
        userName: u.name,
        avatarUrl: u.avatarUrl,
        jobTitle: u.jobTitle,
        totalPoints: entry._sum.points ?? 0,
        rank: index + 1,
      };
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);

  // Current user ranking
  const currentUserEntry = leaderboard.find((e) => e.userId === user.id);
  let currentUserRank: LeaderboardEntry | null = null;

  if (!currentUserEntry) {
    // User not in top 50, calculate their total
    const userTotal = await prisma.gamificationPoints.aggregate({
      where: { companyId: user.companyId, userId: user.id },
      _sum: { points: true },
    });
    const totalPoints = userTotal._sum.points ?? 0;

    // Count users with more points
    const usersAbove = await prisma.gamificationPoints.groupBy({
      by: ['userId'],
      where: { companyId: user.companyId },
      _sum: { points: true },
      having: { points: { _sum: { gt: totalPoints } } },
    });

    currentUserRank = {
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl ?? null,
      jobTitle: user.jobTitle ?? null,
      totalPoints,
      rank: usersAbove.length + 1,
    };
  } else {
    currentUserRank = currentUserEntry;
  }

  return NextResponse.json({ leaderboard, currentUser: currentUserRank });
}
