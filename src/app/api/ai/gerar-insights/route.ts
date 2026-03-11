import { NextRequest, NextResponse } from 'next/server';
import { AiAnalysisType, AiAlertPriority } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { generateCompletion, SYSTEM_PROMPT_INSIGHTS, parseJsonResponse } from '@/lib/ai';
import { collectCompanyOverview, collectDepartmentData } from '@/lib/ai-data-collector';

interface InsightResponse {
  insights: Array<{
    type: string;
    title: string;
    summary: string;
    details: string;
    confidence: number;
  }>;
  alerts: Array<{
    title: string;
    message: string;
    priority: string;
    category: string;
  }>;
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { scope = 'company', departmentId } = body;

  if (scope === 'department' && !departmentId) {
    return NextResponse.json({ error: 'departmentId é obrigatório para escopo departamento.' }, { status: 400 });
  }

  try {
    const [overview, deptData] = await Promise.all([
      collectCompanyOverview(user.companyId),
      collectDepartmentData(user.companyId, departmentId),
    ]);

    const userPrompt = `${overview}\n\n${deptData}\n\nAnalise os dados acima e gere insights acionáveis sobre: performance da equipe, engajamento, saúde do time e lacunas de competências.`;

    const raw = await generateCompletion(SYSTEM_PROMPT_INSIGHTS, userPrompt, { maxTokens: 3000 });
    const parsed = parseJsonResponse<InsightResponse>(raw);

    if (!parsed) {
      // Fallback: store raw text as a single CUSTOM analysis
      const analysis = await prisma.aiAnalysis.create({
        data: {
          companyId: user.companyId,
          type: 'CUSTOM',
          title: 'Análise Geral',
          summary: 'Resposta da IA não pôde ser estruturada automaticamente.',
          details: raw,
          confidence: 0.5,
        },
      });
      return NextResponse.json({ analyses: [analysis], alerts: [], warning: 'Resposta não estruturada' });
    }

    // Save insights
    const analyses = await Promise.all(
      parsed.insights.map(insight =>
        prisma.aiAnalysis.create({
          data: {
            companyId: user.companyId,
            type: validateAnalysisType(insight.type),
            title: insight.title,
            summary: insight.summary,
            details: insight.details,
            confidence: Math.min(1, Math.max(0, insight.confidence)),
            targetType: scope,
            targetId: departmentId || null,
          },
        }),
      ),
    );

    // Save alerts
    const alerts = await Promise.all(
      parsed.alerts.map(alert =>
        prisma.aiAlert.create({
          data: {
            companyId: user.companyId,
            title: alert.title,
            message: alert.message,
            priority: validatePriority(alert.priority),
            category: alert.category || 'INSIGHT',
          },
        }),
      ),
    );

    return NextResponse.json({ analyses, alerts });
  } catch (error) {
    console.error('[AI] Erro ao gerar insights:', error);
    return NextResponse.json({ error: 'Erro ao gerar insights. Verifique a chave da API.' }, { status: 500 });
  }
}

function validateAnalysisType(type: string): AiAnalysisType {
  const valid: AiAnalysisType[] = ['PERFORMANCE_SUMMARY', 'TURNOVER_RISK', 'ENGAGEMENT_INSIGHT', 'SKILL_GAP', 'TEAM_HEALTH', 'CUSTOM'];
  return valid.includes(type as AiAnalysisType) ? (type as AiAnalysisType) : 'CUSTOM';
}

function validatePriority(priority: string): AiAlertPriority {
  const valid: AiAlertPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  return valid.includes(priority as AiAlertPriority) ? (priority as AiAlertPriority) : 'MEDIUM';
}
