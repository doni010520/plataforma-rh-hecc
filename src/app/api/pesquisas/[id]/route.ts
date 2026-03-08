import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const survey = await prisma.survey.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
  }

  // Check if user already responded
  const existingResponse = await prisma.surveyResponse.findFirst({
    where: {
      surveyId: params.id,
      userId: user.id,
    },
  });

  return NextResponse.json({
    ...survey,
    hasResponded: !!existingResponse,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas administradores podem editar pesquisas.');
  }

  const survey = await prisma.survey.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { title, type, anonymous, startDate, endDate, status, questions } = body;

  // Status transitions: DRAFT → ACTIVE → CLOSED
  if (status) {
    if (survey.status === 'DRAFT' && status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Pesquisa em rascunho só pode ser activada.' }, { status: 400 });
    }
    if (survey.status === 'ACTIVE' && status !== 'CLOSED') {
      return NextResponse.json({ error: 'Pesquisa activa só pode ser encerrada.' }, { status: 400 });
    }
    if (survey.status === 'CLOSED') {
      return NextResponse.json({ error: 'Pesquisa encerrada não pode ser alterada.' }, { status: 400 });
    }
  }

  // If updating questions, delete existing and re-create
  if (questions && survey.status === 'DRAFT') {
    await prisma.surveyQuestion.deleteMany({ where: { surveyId: params.id } });
    await prisma.surveyQuestion.createMany({
      data: questions.map(
        (q: { text: string; type: string; options?: string[]; order?: number }, i: number) => ({
          surveyId: params.id,
          text: q.text,
          type: q.type,
          options: JSON.stringify(q.options || []),
          order: q.order ?? i,
        }),
      ),
    });
  }

  const updated = await prisma.survey.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(anonymous !== undefined && { anonymous }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(status !== undefined && { status }),
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas administradores podem excluir pesquisas.');
  }

  const survey = await prisma.survey.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
  }

  await prisma.survey.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
