import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { awardPoints } from '@/lib/gamification';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, meetingId } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: {
      id,
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  const meeting = await prisma.oneOnOneMeeting.findFirst({
    where: { id: meetingId, cycleId: id },
    include: {
      topics: {
        orderBy: { order: 'asc' },
        include: {
          author: { select: { id: true, name: true } },
        },
      },
      cycle: {
        include: {
          manager: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, meetingId } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: {
      id,
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  const meeting = await prisma.oneOnOneMeeting.findFirst({
    where: { id: meetingId, cycleId: id },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    // Manager can edit managerNotes; employee can edit employeeNotes
    const isManager = cycle.managerId === user.id;

    if (body.managerNotes !== undefined && isManager) {
      data.managerNotes = body.managerNotes;
    }
    if (body.employeeNotes !== undefined && !isManager) {
      data.employeeNotes = body.employeeNotes;
    }
    if (body.actionItems !== undefined) {
      data.actionItems = body.actionItems;
    }
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'COMPLETED') {
        data.completedAt = new Date();
      }
    }

    const updated = await prisma.oneOnOneMeeting.update({
      where: { id: meetingId },
      data,
      include: {
        topics: {
          orderBy: { order: 'asc' },
          include: {
            author: { select: { id: true, name: true } },
          },
        },
        cycle: {
          include: {
            manager: { select: { id: true, name: true } },
            employee: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Award gamification points when meeting is completed — both participants
    if (body.status === 'COMPLETED') {
      awardPoints(cycle.managerId, user.companyId, 'ONE_ON_ONE_COMPLETED', meetingId);
      awardPoints(cycle.employeeId, user.companyId, 'ONE_ON_ONE_COMPLETED', meetingId);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update 1:1 meeting error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar reunião.' }, { status: 500 });
  }
}
