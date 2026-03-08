import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const where: Record<string, unknown> = { companyId: user.companyId };
  if (status) where.status = status;
  if (type) where.type = type;

  const surveys = await prisma.survey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json(surveys);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas administradores podem criar pesquisas.');
  }

  const body = await request.json();
  const { title, type, anonymous, startDate, endDate, questions } = body;

  if (!title || !type) {
    return NextResponse.json(
      { error: 'Título e tipo são obrigatórios.' },
      { status: 400 },
    );
  }

  const survey = await prisma.survey.create({
    data: {
      companyId: user.companyId,
      title,
      type,
      anonymous: anonymous || false,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      questions: questions?.length
        ? {
            create: questions.map(
              (q: { text: string; type: string; options?: string[]; order?: number }, i: number) => ({
                text: q.text,
                type: q.type,
                options: JSON.stringify(q.options || []),
                order: q.order ?? i,
              }),
            ),
          }
        : undefined,
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  return NextResponse.json(survey, { status: 201 });
}
