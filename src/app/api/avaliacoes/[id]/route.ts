import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createNotificationsForMany } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { evaluationPendingTemplate } from '@/lib/email-templates';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      criteria: { orderBy: { name: 'asc' } },
      assignments: {
        include: {
          evaluator: { select: { id: true, name: true, email: true } },
          evaluatee: {
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
              department: { select: { name: true } },
            },
          },
          _count: { select: { answers: true } },
        },
      },
      _count: { select: { assignments: true } },
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(cycle);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { status } = await request.json();

    const cycle = await prisma.reviewCycle.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!cycle) {
      return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
    }

    if (status === 'ACTIVE' && cycle.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Apenas ciclos em rascunho podem ser ativados.' },
        { status: 400 },
      );
    }

    if (status === 'CLOSED' && cycle.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Apenas ciclos ativos podem ser encerrados.' },
        { status: 400 },
      );
    }

    if (status === 'ACTIVE') {
      const assignmentCount = await prisma.reviewAssignment.count({
        where: { cycleId: params.id },
      });
      if (assignmentCount === 0) {
        return NextResponse.json(
          { error: 'Adicione participantes antes de ativar o ciclo.' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.reviewCycle.update({
      where: { id: params.id },
      data: { status },
      include: {
        criteria: true,
        _count: { select: { assignments: true } },
      },
    });

    // Notify evaluators when cycle is activated
    if (status === 'ACTIVE') {
      const assignments = await prisma.reviewAssignment.findMany({
        where: { cycleId: params.id },
        select: {
          evaluatorId: true,
          evaluator: { select: { email: true, name: true } },
        },
        distinct: ['evaluatorId'],
      });
      const evaluatorIds = assignments.map((a) => a.evaluatorId);
      createNotificationsForMany(evaluatorIds, {
        companyId: user.companyId,
        type: 'EVALUATION_PENDING',
        title: 'Avaliação pendente',
        body: `O ciclo "${updated.name}" foi activado. Responda suas avaliações.`,
        link: '/avaliacoes',
      }).catch(() => {});

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      Promise.allSettled(
        assignments.map((a) => {
          const { subject, html } = evaluationPendingTemplate({
            evaluatorName: a.evaluator.name,
            cycleName: updated.name,
            evaluationUrl: `${appUrl}/avaliacoes`,
          });
          return sendEmail({ to: a.evaluator.email, subject, html });
        }),
      ).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Erro ao atualizar ciclo.' },
      { status: 500 },
    );
  }
}
