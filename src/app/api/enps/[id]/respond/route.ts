import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { awardPoints } from '@/lib/gamification';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  try {
    const body: unknown = await request.json();
    const { score, comment } = body as { score?: number; comment?: string };

    if (score === undefined || score === null || typeof score !== 'number' || score < 0 || score > 10) {
      return NextResponse.json(
        { error: 'Score deve ser um número entre 0 e 10.' },
        { status: 400 },
      );
    }

    const survey = await prisma.enpsSurvey.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
    }

    if (survey.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Esta pesquisa não está ativa.' },
        { status: 400 },
      );
    }

    // Check if user already responded
    const existing = await prisma.enpsResponse.findUnique({
      where: {
        surveyId_userId: {
          surveyId: params.id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Você já respondeu esta pesquisa.' },
        { status: 400 },
      );
    }

    const response = await prisma.enpsResponse.create({
      data: {
        surveyId: params.id,
        userId: user.id,
        score: Math.round(score),
        comment: typeof comment === 'string' ? comment.trim() : '',
      },
    });

    // Award gamification points automatically
    awardPoints(user.id, user.companyId, 'ENPS_COMPLETED', params.id);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('eNPS respond error:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar resposta.' },
      { status: 500 },
    );
  }
}
