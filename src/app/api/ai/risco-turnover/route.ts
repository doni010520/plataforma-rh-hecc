import { NextRequest, NextResponse } from 'next/server';
import { AiAlertPriority } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { generateCompletion, SYSTEM_PROMPT_TURNOVER, parseJsonResponse } from '@/lib/ai';
import { collectEmployeeTurnoverSignals } from '@/lib/ai-data-collector';

interface TurnoverResponse {
  employees: Array<{
    userId: string;
    name: string;
    riskLevel: string;
    riskScore: number;
    reasons: string[];
    recommendations: string[];
  }>;
  summary: string;
  overallRiskLevel: string;
}

const riskToSeverity: Record<string, AiAlertPriority> = {
  CRITICO: 'URGENT',
  ALTO: 'HIGH',
  MEDIO: 'MEDIUM',
  BAIXO: 'LOW',
};

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { departmentId } = body;

  try {
    const signalsData = await collectEmployeeTurnoverSignals(user.companyId, departmentId);

    const userPrompt = `${signalsData}\n\nAnalise os sinais de risco de turnover para cada colaborador listado acima. Classifique o nível de risco e forneça recomendações de retenção.`;

    const raw = await generateCompletion(SYSTEM_PROMPT_TURNOVER, userPrompt, {
      maxTokens: 3000,
      temperature: 0.2,
    });

    const parsed = parseJsonResponse<TurnoverResponse>(raw);

    if (!parsed) {
      const analysis = await prisma.aiAnalysis.create({
        data: {
          companyId: user.companyId,
          type: 'TURNOVER_RISK',
          title: 'Análise de Risco de Turnover',
          summary: 'Resposta da IA não pôde ser estruturada.',
          details: raw,
          confidence: 0.5,
          targetType: departmentId ? 'department' : 'company',
          targetId: departmentId || null,
        },
      });
      return NextResponse.json({ analysis, alerts: [], employees: [], warning: 'Resposta não estruturada' });
    }

    // Save main analysis
    const analysis = await prisma.aiAnalysis.create({
      data: {
        companyId: user.companyId,
        type: 'TURNOVER_RISK',
        title: 'Análise de Risco de Turnover',
        summary: parsed.summary,
        details: JSON.stringify(parsed.employees),
        confidence: 0.8,
        targetType: departmentId ? 'department' : 'company',
        targetId: departmentId || null,
      },
    });

    // Create alerts for high-risk employees
    const highRisk = parsed.employees.filter(e =>
      ['ALTO', 'CRITICO'].includes(e.riskLevel),
    );

    const alerts = await Promise.all(
      highRisk.map(emp =>
        prisma.aiAlert.create({
          data: {
            companyId: user.companyId,
            userId: emp.userId,
            title: `Risco de turnover: ${emp.name}`,
            message: `Nível ${emp.riskLevel}. Motivos: ${emp.reasons.join(', ')}. Recomendações: ${emp.recommendations.join(', ')}`,
            priority: riskToSeverity[emp.riskLevel] || 'MEDIUM',
            category: 'TURNOVER_RISK',
          },
        }),
      ),
    );

    return NextResponse.json({ analysis, alerts, employees: parsed.employees });
  } catch (error) {
    console.error('[AI] Erro ao analisar turnover:', error);
    return NextResponse.json({ error: 'Erro ao analisar risco de turnover.' }, { status: 500 });
  }
}
