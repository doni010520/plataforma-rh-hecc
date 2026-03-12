import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { POINT_LABELS } from '@/lib/gamification';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const points = await prisma.gamificationPoints.findMany({
    where: { userId: user.id, companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Group by sourceType for summary
  const summary: Record<string, { count: number; total: number; label: string }> = {};
  let grandTotal = 0;

  for (const p of points) {
    const key = p.sourceType || 'MANUAL';
    if (!summary[key]) {
      summary[key] = {
        count: 0,
        total: 0,
        label: POINT_LABELS[key] || p.reason || 'Pontos manuais',
      };
    }
    summary[key].count++;
    summary[key].total += p.points;
    grandTotal += p.points;
  }

  return NextResponse.json({
    history: points.map((p) => ({
      id: p.id,
      points: p.points,
      reason: p.reason,
      sourceType: p.sourceType,
      createdAt: p.createdAt,
    })),
    summary: Object.entries(summary).map(([key, val]) => ({
      sourceType: key,
      label: val.label,
      count: val.count,
      totalPoints: val.total,
    })),
    grandTotal,
  });
}
