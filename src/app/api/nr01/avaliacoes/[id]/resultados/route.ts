import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { RiskSeverity } from '@prisma/client';

function getRiskLevel(avgScore: number): RiskSeverity {
  if (avgScore <= 2) return 'LOW';
  if (avgScore <= 3) return 'MEDIUM';
  if (avgScore <= 4) return 'HIGH';
  return 'CRITICAL';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem visualizar resultados.');
  }

  const { id } = await params;

  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: 'Avaliação psicossocial não encontrada.' },
      { status: 404 },
    );
  }

  const results = await prisma.psychosocialResult.findMany({
    where: { assessmentId: id },
    orderBy: { category: 'asc' },
  });

  return NextResponse.json(results);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem calcular resultados.');
  }

  const { id } = await params;

  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      questions: true,
      responses: { include: { answers: true } },
    },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: 'Avaliação psicossocial não encontrada.' },
      { status: 404 },
    );
  }

  if (assessment.responses.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma resposta encontrada para calcular resultados.' },
      { status: 400 },
    );
  }

  // Group questions by category
  const questionsByCategory: Record<string, string[]> = {};
  for (const question of assessment.questions) {
    const cat = question.category;
    if (!questionsByCategory[cat]) {
      questionsByCategory[cat] = [];
    }
    questionsByCategory[cat].push(question.id);
  }

  // Calculate average score per category
  const resultsData: Array<{
    assessmentId: string;
    category: string;
    averageScore: number;
    riskLevel: RiskSeverity;
    totalResponses: number;
    calculatedAt: Date;
  }> = [];

  for (const category of Object.keys(questionsByCategory)) {
    const questionIds = questionsByCategory[category];
    let totalScore = 0;
    let answerCount = 0;

    for (const response of assessment.responses) {
      for (const answer of response.answers) {
        if (questionIds.includes(answer.questionId)) {
          totalScore += parseFloat(answer.value) || 0;
          answerCount++;
        }
      }
    }

    const averageScore = answerCount > 0 ? totalScore / answerCount : 0;

    resultsData.push({
      assessmentId: id,
      category,
      averageScore: Math.round(averageScore * 100) / 100,
      riskLevel: getRiskLevel(averageScore),
      totalResponses: assessment.responses.length,
      calculatedAt: new Date(),
    });
  }

  // Delete previous results and create new ones
  await prisma.psychosocialResult.deleteMany({ where: { assessmentId: id } });
  await prisma.psychosocialResult.createMany({ data: resultsData });

  const results = await prisma.psychosocialResult.findMany({
    where: { assessmentId: id },
    orderBy: { category: 'asc' },
  });

  return NextResponse.json(results, { status: 201 });
}
