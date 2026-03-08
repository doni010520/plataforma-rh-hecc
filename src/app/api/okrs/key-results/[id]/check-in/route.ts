import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: params.id },
    include: { objective: { select: { companyId: true, ownerId: true } } },
  });

  if (!keyResult || keyResult.objective.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Key Result não encontrado.' }, { status: 404 });
  }

  // Only owner or admin can do check-in
  const canCheckIn =
    keyResult.objective.ownerId === user.id ||
    hasRole(user.role, ['ADMIN']);

  if (!canCheckIn) {
    return forbiddenResponse('Apenas o dono do objectivo pode fazer check-in.');
  }

  const body = await request.json();
  const { value, note, confidence } = body;

  if (value === undefined || value === null) {
    return NextResponse.json({ error: 'O valor é obrigatório.' }, { status: 400 });
  }

  // Create the check-in update
  const update = await prisma.keyResultUpdate.create({
    data: {
      keyResultId: params.id,
      userId: user.id,
      value: parseFloat(value),
      note: note || '',
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Update the key result current value and confidence
  await prisma.keyResult.update({
    where: { id: params.id },
    data: {
      currentValue: parseFloat(value),
      ...(confidence !== undefined && { confidence: parseInt(confidence) }),
    },
  });

  return NextResponse.json(update, { status: 201 });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: params.id },
    include: { objective: { select: { companyId: true } } },
  });

  if (!keyResult || keyResult.objective.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Key Result não encontrado.' }, { status: 404 });
  }

  const updates = await prisma.keyResultUpdate.findMany({
    where: { keyResultId: params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updates);
}
