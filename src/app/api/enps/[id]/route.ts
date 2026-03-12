import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const survey = await prisma.enpsSurvey.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      createdBy: { select: { id: true, name: true } },
      responses: {
        select: { id: true, score: true, comment: true, createdAt: true, userId: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa eNPS não encontrada.' }, { status: 404 });
  }

  const scores = survey.responses.map((r) => r.score);
  const total = scores.length;

  let npsScore: number | null = null;
  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  if (total > 0) {
    promoters = scores.filter((s) => s >= 9).length;
    detractors = scores.filter((s) => s <= 6).length;
    passives = total - promoters - detractors;
    npsScore = Math.round(((promoters - detractors) / total) * 100);
  }

  // Check if current user already responded
  const userResponse = survey.responses.find((r) => r.userId === user.id);

  // Distribution: count per score value (0-10)
  const distribution: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) {
    distribution[i] = 0;
  }
  for (const r of survey.responses) {
    distribution[r.score] = (distribution[r.score] || 0) + 1;
  }

  return NextResponse.json({
    ...survey,
    npsScore,
    promoters,
    passives,
    detractors,
    totalResponses: total,
    distribution,
    hasResponded: !!userResponse,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse();
  }

  try {
    const body: unknown = await request.json();
    const { status } = body as { status?: string };

    if (!status || !['ACTIVE', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status deve ser ACTIVE ou CLOSED.' },
        { status: 400 },
      );
    }

    const survey = await prisma.enpsSurvey.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'ACTIVE' && !survey.startDate) {
      updateData.startDate = new Date();
    }
    if (status === 'CLOSED' && !survey.endDate) {
      updateData.endDate = new Date();
    }

    const updated = await prisma.enpsSurvey.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update eNPS survey error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pesquisa eNPS.' },
      { status: 500 },
    );
  }
}
