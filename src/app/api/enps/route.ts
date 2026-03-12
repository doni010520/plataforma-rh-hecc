import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const surveys = await prisma.enpsSurvey.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { responses: true } },
      responses: {
        select: { score: true },
      },
    },
  });

  const surveysWithNps = surveys.map((survey) => {
    const scores = survey.responses.map((r) => r.score);
    const total = scores.length;
    if (total === 0) {
      return {
        ...survey,
        responses: undefined,
        npsScore: null,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalResponses: 0,
      };
    }
    const promoters = scores.filter((s) => s >= 9).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const passives = total - promoters - detractors;
    const npsScore = Math.round(((promoters - detractors) / total) * 100);
    return {
      ...survey,
      responses: undefined,
      npsScore,
      promoters,
      passives,
      detractors,
      totalResponses: total,
    };
  });

  const response = NextResponse.json(surveysWithNps);
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
  return response;
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse();
  }

  try {
    const body: unknown = await request.json();
    const { title } = body as { title?: string };

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Título é obrigatório.' },
        { status: 400 },
      );
    }

    const survey = await prisma.enpsSurvey.create({
      data: {
        companyId: user.companyId,
        title: title.trim(),
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error('Create eNPS survey error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pesquisa eNPS.' },
      { status: 500 },
    );
  }
}
