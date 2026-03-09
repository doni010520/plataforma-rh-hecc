import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: params.id },
    include: { objective: { select: { companyId: true, ownerId: true } } },
  });

  if (!keyResult || keyResult.objective.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Key Result não encontrado.' }, { status: 404 });
  }

  const canEdit =
    keyResult.objective.ownerId === user.id ||
    hasRole(user.role, ['ADMIN']);

  if (!canEdit) {
    const owner = await prisma.user.findUnique({
      where: { id: keyResult.objective.ownerId },
      select: { managerId: true },
    });
    if (owner?.managerId !== user.id) {
      return forbiddenResponse('Sem permissão para editar este Key Result.');
    }
  }

  const body = await request.json();
  const { title, metricType, startValue, targetValue, confidence } = body;

  const updated = await prisma.keyResult.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(metricType !== undefined && { metricType }),
      ...(startValue !== undefined && { startValue: parseFloat(startValue) }),
      ...(targetValue !== undefined && { targetValue: parseFloat(targetValue) }),
      ...(confidence !== undefined && { confidence: parseInt(confidence) }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: params.id },
    include: { objective: { select: { companyId: true, ownerId: true } } },
  });

  if (!keyResult || keyResult.objective.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Key Result não encontrado.' }, { status: 404 });
  }

  if (keyResult.objective.ownerId !== user.id && !hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Sem permissão para excluir este Key Result.');
  }

  await prisma.keyResult.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
