import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { name } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'O nome do departamento deve ter no mínimo 2 caracteres.' },
        { status: 400 },
      );
    }

    const department = await prisma.department.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Departamento não encontrado.' },
        { status: 404 },
      );
    }

    const duplicate = await prisma.department.findFirst({
      where: {
        companyId: user.companyId,
        name: name.trim(),
        NOT: { id: params.id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um departamento com este nome.' },
        { status: 400 },
      );
    }

    const updated = await prisma.department.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Erro ao atualizar departamento.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const department = await prisma.department.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: { _count: { select: { users: true } } },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Departamento não encontrado.' },
        { status: 404 },
      );
    }

    if (department._count.users > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um departamento que possui colaboradores.' },
        { status: 400 },
      );
    }

    await prisma.department.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao excluir departamento.' },
      { status: 500 },
    );
  }
}
