import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { departmentId, userIds } = await request.json();

    const cycle = await prisma.reviewCycle.findFirst({
      where: { id: params.id, companyId: user.companyId, status: 'DRAFT' },
      include: { criteria: true },
    });

    if (!cycle) {
      return NextResponse.json(
        { error: 'Ciclo não encontrado ou não está em rascunho.' },
        { status: 404 },
      );
    }

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      active: true,
    };

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      where.id = { in: userIds };
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    const participants = await prisma.user.findMany({
      where,
      include: { manager: { select: { id: true } } },
    });

    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum colaborador encontrado com os filtros informados.' },
        { status: 400 },
      );
    }

    const assignmentsToCreate: { cycleId: string; evaluatorId: string; evaluateeId: string }[] =
      [];

    for (const participant of participants) {
      if (cycle.type === 'SELF' || cycle.type === 'HALF' || cycle.type === 'FULL') {
        assignmentsToCreate.push({
          cycleId: cycle.id,
          evaluatorId: participant.id,
          evaluateeId: participant.id,
        });
      }

      if (cycle.type === 'HALF' || cycle.type === 'FULL') {
        if (participant.manager) {
          assignmentsToCreate.push({
            cycleId: cycle.id,
            evaluatorId: participant.manager.id,
            evaluateeId: participant.id,
          });
        }
      }

      if (cycle.type === 'FULL') {
        const peers = participants.filter(
          (p) =>
            p.id !== participant.id &&
            p.departmentId === participant.departmentId &&
            p.departmentId !== null,
        );
        for (const peer of peers) {
          assignmentsToCreate.push({
            cycleId: cycle.id,
            evaluatorId: peer.id,
            evaluateeId: participant.id,
          });
        }
      }
    }

    const uniqueAssignments = assignmentsToCreate.filter(
      (a, index, self) =>
        self.findIndex(
          (b) => b.evaluatorId === a.evaluatorId && b.evaluateeId === a.evaluateeId,
        ) === index,
    );

    let created = 0;
    for (const assignment of uniqueAssignments) {
      const existing = await prisma.reviewAssignment.findUnique({
        where: {
          cycleId_evaluatorId_evaluateeId: {
            cycleId: assignment.cycleId,
            evaluatorId: assignment.evaluatorId,
            evaluateeId: assignment.evaluateeId,
          },
        },
      });

      if (!existing) {
        const newAssignment = await prisma.reviewAssignment.create({
          data: assignment,
        });

        await prisma.reviewAnswer.createMany({
          data: cycle.criteria.map((criteria) => ({
            assignmentId: newAssignment.id,
            criteriaId: criteria.id,
          })),
        });

        created++;
      }
    }

    return NextResponse.json({
      message: `${created} avaliações criadas com sucesso.`,
      created,
    });
  } catch (error) {
    console.error('Create assignments error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar avaliações.' },
      { status: 500 },
    );
  }
}
