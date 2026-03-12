import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const companyId = user.companyId;

  try {
    const [
      analysesByType,
      totalAnalyses,
      recentAlerts,
      unreadAlertCount,
      alertsByPriority,
      recentAnalyses,
    ] = await Promise.all([
      prisma.aiAnalysis.groupBy({
        by: ['type'],
        where: { companyId },
        _count: { id: true },
      }),
      prisma.aiAnalysis.count({ where: { companyId } }),
      prisma.aiAlert.findMany({
        where: {
          companyId,
          dismissedAt: null,
          ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.aiAlert.count({
        where: {
          companyId,
          read: false,
          dismissedAt: null,
          ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
        },
      }),
      prisma.aiAlert.groupBy({
        by: ['priority'],
        where: {
          companyId,
          dismissedAt: null,
          ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
        },
        _count: { id: true },
      }),
      prisma.aiAnalysis.findMany({
        where: { companyId },
        orderBy: { generatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const analysisTypeCounts: Record<string, number> = {};
    for (const group of analysesByType) {
      analysisTypeCounts[group.type] = group._count.id;
    }

    const alertPriorityCounts: Record<string, number> = {};
    for (const group of alertsByPriority) {
      alertPriorityCounts[group.priority] = group._count.id;
    }

    const highRiskAlerts =
      (alertPriorityCounts['HIGH'] || 0) + (alertPriorityCounts['URGENT'] || 0);
    const turnoverAnalyses = analysisTypeCounts['TURNOVER_RISK'] || 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (highRiskAlerts >= 5 || turnoverAnalyses >= 3) riskLevel = 'HIGH';
    else if (highRiskAlerts >= 2 || turnoverAnalyses >= 1) riskLevel = 'MEDIUM';

    const response = NextResponse.json({
      // Flat fields expected by the IA page and AiDashboardCard
      analysesByType: analysisTypeCounts,
      recentAlerts: recentAlerts,
      totalAnalyses: totalAnalyses,
      totalAlerts: recentAlerts.length,
      unreadAlerts: unreadAlertCount,
      // Nested fields for detailed consumers
      analyses: {
        total: totalAnalyses,
        byType: analysisTypeCounts,
        recent: recentAnalyses,
      },
      alerts: {
        unreadCount: unreadAlertCount,
        byPriority: alertPriorityCounts,
        recent: recentAlerts,
      },
      riskSummary: {
        level: riskLevel,
        highPriorityAlerts: highRiskAlerts,
        turnoverRiskAnalyses: turnoverAnalyses,
      },
    });
    // Cache for 60 seconds — AI data doesn't change every request
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch {
    // Tables may not exist yet if migration hasn't run
    return NextResponse.json({
      analysesByType: {},
      recentAlerts: [],
      totalAnalyses: 0,
      totalAlerts: 0,
      unreadAlerts: 0,
      analyses: { total: 0, byType: {}, recent: [] },
      alerts: { unreadCount: 0, byPriority: {}, recent: [] },
      riskSummary: { level: 'LOW', highPriorityAlerts: 0, turnoverRiskAnalyses: 0 },
    });
  }
}
