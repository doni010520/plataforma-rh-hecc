import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

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

  const meetings = await prisma.oneOnOneMeeting.findMany({
    where: { cycleId: id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      _count: { select: { topics: true } },
    },
  });

  return NextResponse.json(meetings);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

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

  try {
    const { scheduledAt } = await request.json();

    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'Data agendada é obrigatória.' },
        { status: 400 },
      );
    }

    const meeting = await prisma.oneOnOneMeeting.create({
      data: {
        cycleId: id,
        scheduledAt: new Date(scheduledAt),
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Create 1:1 meeting error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar reunião 1:1.' },
      { status: 500 },
    );
  }
}
