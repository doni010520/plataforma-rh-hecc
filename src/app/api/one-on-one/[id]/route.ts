import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { Role } from '@prisma/client';

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
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      employee: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      meetings: {
        orderBy: { scheduledAt: 'desc' },
        include: {
          _count: { select: { topics: true } },
        },
      },
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(cycle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: { id, companyId: user.companyId, managerId: user.id },
  });

  if (!cycle) {
    if (user.role === Role.EMPLOYEE) {
      return forbiddenResponse('Apenas o gestor pode editar o ciclo 1:1.');
    }
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.frequency !== undefined) data.frequency = body.frequency;
    if (body.dayOfWeek !== undefined) data.dayOfWeek = body.dayOfWeek;
    if (body.active !== undefined) data.active = body.active;

    const updated = await prisma.oneOnOneCycle.update({
      where: { id },
      data,
      include: {
        manager: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
        employee: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update 1:1 cycle error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar ciclo 1:1.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: { id, companyId: user.companyId, managerId: user.id },
  });

  if (!cycle) {
    if (user.role === Role.EMPLOYEE) {
      return forbiddenResponse('Apenas o gestor pode excluir o ciclo 1:1.');
    }
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  await prisma.oneOnOneCycle.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
