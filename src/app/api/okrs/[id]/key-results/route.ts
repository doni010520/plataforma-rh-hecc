import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const objective = await prisma.objective.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!objective) {
    return NextResponse.json({ error: 'Objectivo não encontrado.' }, { status: 404 });
  }

  const canEdit =
    objective.ownerId === user.id ||
    hasRole(user.role, ['ADMIN']);

  if (!canEdit) {
    const owner = await prisma.user.findUnique({
      where: { id: objective.ownerId },
      select: { managerId: true },
    });
    if (owner?.managerId !== user.id) {
      return forbiddenResponse('Sem permissão para adicionar Key Results.');
    }
  }

  const body = await request.json();
  const { title, metricType, startValue, targetValue } = body;

  if (!title || !metricType || targetValue === undefined) {
    return NextResponse.json(
      { error: 'Título, tipo de métrica e valor alvo são obrigatórios.' },
      { status: 400 },
    );
  }

  const keyResult = await prisma.keyResult.create({
    data: {
      objectiveId: params.id,
      title,
      metricType,
      startValue: startValue ? parseFloat(startValue) : 0,
      targetValue: parseFloat(targetValue),
      currentValue: startValue ? parseFloat(startValue) : 0,
    },
  });

  return NextResponse.json(keyResult, { status: 201 });
}
