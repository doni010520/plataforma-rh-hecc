import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const companyId = user.companyId;

  const [
    analysesByType,
    totalAnalyses,
    recentAlerts,
    unreadAlertCount,
    alertsByPriority,
    recentAnalyses,
  ] = await Promise.all([
    // Count analyses grouped by type
    prisma.aiAnalysis.groupBy({
      by: ['type'],
      where: { companyId },
      _count: { id: true },
    }),
    // Total analyses
    prisma.aiAnalysis.count({ where: { companyId } }),
    // Recent alerts (last 10, not dismissed)
    prisma.aiAlert.findMany({
      where: {
        companyId,
        dismissedAt: null,
        ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Unread alert count
    prisma.aiAlert.count({
      where: {
        companyId,
        read: false,
        dismissedAt: null,
        ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
      },
    }),
    // Alerts grouped by priority
    prisma.aiAlert.groupBy({
      by: ['priority'],
      where: {
        companyId,
        dismissedAt: null,
        ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
      },
      _count: { id: true },
    }),
    // Recent analyses (last 5)
    prisma.aiAnalysis.findMany({
      where: { companyId },
      orderBy: { generatedAt: 'desc' },
      take: 5,
    }),
  ]);

  // Build analysis type summary
  const analysisTypeCounts: Record<string, number> = {};
  for (const group of analysesByType) {
    analysisTypeCounts[group.type] = group._count.id;
  }

  // Build priority summary
  const alertPriorityCounts: Record<string, number> = {};
  for (const group of alertsByPriority) {
    alertPriorityCounts[group.priority] = group._count.id;
  }

  // Risk summary based on high/urgent alerts and turnover analyses
  const highRiskAlerts =
    (alertPriorityCounts['HIGH'] || 0) + (alertPriorityCounts['URGENT'] || 0);
  const turnoverAnalyses = analysisTypeCounts['TURNOVER_RISK'] || 0;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (highRiskAlerts >= 5 || turnoverAnalyses >= 3) riskLevel = 'HIGH';
  else if (highRiskAlerts >= 2 || turnoverAnalyses >= 1) riskLevel = 'MEDIUM';

  return NextResponse.json({
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
}
