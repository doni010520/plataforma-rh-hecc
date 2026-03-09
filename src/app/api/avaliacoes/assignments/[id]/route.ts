import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const assignment = await prisma.reviewAssignment.findFirst({
    where: { id: params.id, evaluatorId: user.id },
    include: {
      cycle: { select: { id: true, name: true, type: true, status: true } },
      evaluatee: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      answers: {
        include: { criteria: true },
        orderBy: { criteria: { name: 'asc' } },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(assignment);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  try {
    const { answers, submit } = await request.json();

    const assignment = await prisma.reviewAssignment.findFirst({
      where: { id: params.id, evaluatorId: user.id },
      include: { cycle: { select: { status: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 });
    }

    if (assignment.cycle.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Este ciclo de avaliação não está ativo.' },
        { status: 400 },
      );
    }

    if (assignment.status === 'DONE') {
      return forbiddenResponse('Esta avaliação já foi submetida.');
    }

    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        if (submit && (!answer.score || answer.score < 1 || answer.score > 5)) {
          return NextResponse.json(
            { error: 'Todas as notas devem estar entre 1 e 5 para submeter.' },
            { status: 400 },
          );
        }

        await prisma.reviewAnswer.update({
          where: {
            assignmentId_criteriaId: {
              assignmentId: params.id,
              criteriaId: answer.criteriaId,
            },
          },
          data: {
            score: answer.score || null,
            comment: answer.comment || '',
          },
        });
      }
    }

    if (submit) {
      await prisma.reviewAssignment.update({
        where: { id: params.id },
        data: { status: 'DONE' },
      });
    }

    const updated = await prisma.reviewAssignment.findFirst({
      where: { id: params.id },
      include: {
        answers: {
          include: { criteria: true },
          orderBy: { criteria: { name: 'asc' } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Erro ao salvar avaliação.' },
      { status: 500 },
    );
  }
}
