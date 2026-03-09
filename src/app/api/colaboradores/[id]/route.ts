import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const colaborador = await prisma.user.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  if (!colaborador) {
    return NextResponse.json(
      { error: 'Colaborador não encontrado.' },
      { status: 404 },
    );
  }

  if (user.role === 'MANAGER' && colaborador.managerId !== user.id && colaborador.id !== user.id) {
    return forbiddenResponse('Você só pode visualizar seus liderados.');
  }

  return NextResponse.json(colaborador);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { name, jobTitle, departmentId, managerId, role, active } = await request.json();

    const colaborador = await prisma.user.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!colaborador) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado.' },
        { status: 404 },
      );
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId: user.companyId },
      });
      if (!dept) {
        return NextResponse.json(
          { error: 'Departamento não encontrado.' },
          { status: 400 },
        );
      }
    }

    if (managerId) {
      if (managerId === params.id) {
        return NextResponse.json(
          { error: 'Um colaborador não pode ser gestor de si mesmo.' },
          { status: 400 },
        );
      }
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId: user.companyId, active: true },
      });
      if (!manager) {
        return NextResponse.json(
          { error: 'Gestor não encontrado.' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Erro ao atualizar colaborador.' },
      { status: 500 },
    );
  }
}
