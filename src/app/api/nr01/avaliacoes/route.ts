import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { companyId: user.companyId };
  if (status) where.status = status;

  const assessments = await prisma.psychosocialAssessment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      questions: { orderBy: { order: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { responses: true, results: true } },
    },
  });

  return NextResponse.json(assessments);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem criar avaliações psicossociais.');
  }

  const body = await request.json();
  const { title, description, anonymous, startDate, endDate, questions } = body;

  if (!title) {
    return NextResponse.json(
      { error: 'Título é obrigatório.' },
      { status: 400 },
    );
  }

  const assessment = await prisma.psychosocialAssessment.create({
    data: {
      companyId: user.companyId,
      title,
      description: description || null,
      anonymous: anonymous || false,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdById: user.id,
      questions: questions?.length
        ? {
            create: questions.map(
              (q: { text: string; category: string; order?: number }, i: number) => ({
                text: q.text,
                category: q.category,
                order: q.order ?? i,
              }),
            ),
          }
        : undefined,
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
