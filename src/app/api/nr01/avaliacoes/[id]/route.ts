import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      responses: {
        include: {
          answers: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      results: { orderBy: { category: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { responses: true } },
    },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: 'Avaliação psicossocial não encontrada.' },
      { status: 404 },
    );
  }

  // If anonymous, strip user info from responses
  if (assessment.anonymous) {
    assessment.responses = assessment.responses.map((r) => ({
      ...r,
      user: null,
      userId: null,
    }));
  }

  return NextResponse.json(assessment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem editar avaliações.');
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

  const body = await request.json();
  const { title, description, status, anonymous, startDate, endDate, questions } = body;

  // Status transitions: DRAFT → ACTIVE → CLOSED
  if (status) {
    if (assessment.status === 'DRAFT' && status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Avaliação em rascunho só pode ser ativada.' },
        { status: 400 },
      );
    }
    if (assessment.status === 'ACTIVE' && status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'Avaliação ativa só pode ser encerrada.' },
        { status: 400 },
      );
    }
    if (assessment.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Avaliação encerrada não pode ser alterada.' },
        { status: 400 },
      );
    }
  }

  // If updating questions, only allow in DRAFT
  if (questions && assessment.status === 'DRAFT') {
    await prisma.psychosocialQuestion.deleteMany({ where: { assessmentId: id } });
    await prisma.psychosocialQuestion.createMany({
      data: questions.map(
        (q: { text: string; category: string; order?: number }, i: number) => ({
          assessmentId: id,
          text: q.text,
          category: q.category,
          order: q.order ?? i,
        }),
      ),
    });
  }

  const updated = await prisma.psychosocialAssessment.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(anonymous !== undefined && { anonymous }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem excluir avaliações.');
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

  await prisma.psychosocialAssessment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
