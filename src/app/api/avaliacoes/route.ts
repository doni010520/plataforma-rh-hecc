import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const cycles = await prisma.reviewCycle.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      criteria: { orderBy: { name: 'asc' } },
      _count: { select: { assignments: true } },
    },
  });

  return NextResponse.json(cycles);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { name, type, startDate, endDate, criteria } = await request.json();

    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Nome, tipo, data de início e data de fim são obrigatórios.' },
        { status: 400 },
      );
    }

    if (!['SELF', 'HALF', 'FULL'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo deve ser SELF, HALF ou FULL.' },
        { status: 400 },
      );
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: 'A data de fim deve ser posterior à data de início.' },
        { status: 400 },
      );
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { error: 'É necessário definir pelo menos um critério de avaliação.' },
        { status: 400 },
      );
    }

    const cycle = await prisma.reviewCycle.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'DRAFT',
        criteria: {
          create: criteria.map(
            (c: { name: string; description?: string; weight?: number }) => ({
              name: c.name.trim(),
              description: c.description?.trim() || '',
              weight: c.weight || 1.0,
            }),
          ),
        },
      },
      include: {
        criteria: true,
        _count: { select: { assignments: true } },
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error('Create cycle error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar ciclo de avaliação.' },
      { status: 500 },
    );
  }
}
