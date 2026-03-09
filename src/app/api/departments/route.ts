import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
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

    const existing = await prisma.department.findUnique({
      where: {
        companyId_name: { companyId: user.companyId, name: name.trim() },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um departamento com este nome.' },
        { status: 400 },
      );
    }

    const department = await prisma.department.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao criar departamento.' },
      { status: 500 },
    );
  }
}
