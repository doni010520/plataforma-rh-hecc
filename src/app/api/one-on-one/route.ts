import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const cycles = await prisma.oneOnOneCycle.findMany({
    where: {
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      employee: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      meetings: {
        orderBy: { scheduledAt: 'desc' },
        take: 1,
        select: { id: true, scheduledAt: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(cycles);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === Role.EMPLOYEE) {
    return forbiddenResponse('Apenas gestores e administradores podem criar ciclos 1:1.');
  }

  try {
    const { employeeId, frequency, dayOfWeek } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Colaborador é obrigatório.' },
        { status: 400 },
      );
    }

    const employee = await prisma.user.findFirst({
      where: { id: employeeId, companyId: user.companyId, active: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado.' },
        { status: 404 },
      );
    }

    const existing = await prisma.oneOnOneCycle.findUnique({
      where: { managerId_employeeId: { managerId: user.id, employeeId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um ciclo 1:1 com este colaborador.' },
        { status: 409 },
      );
    }

    const cycle = await prisma.oneOnOneCycle.create({
      data: {
        companyId: user.companyId,
        managerId: user.id,
        employeeId,
        frequency: frequency || 'BIWEEKLY',
        dayOfWeek: dayOfWeek ?? 1,
      },
      include: {
        manager: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
        employee: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error('Create 1:1 cycle error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar ciclo 1:1.' },
      { status: 500 },
    );
  }
}
