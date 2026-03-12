import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse();
  }

  try {
    const body: unknown = await request.json();
    const { userId, points, reason, sourceType } = body as {
      userId?: string;
      points?: number;
      reason?: string;
      sourceType?: string;
    };

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId é obrigatório.' },
        { status: 400 },
      );
    }

    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: 'points deve ser um número positivo.' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason é obrigatório.' },
        { status: 400 },
      );
    }

    // Verify target user exists in same company
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId: user.companyId, active: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado.' },
        { status: 404 },
      );
    }

    const pointsRecord = await prisma.gamificationPoints.create({
      data: {
        companyId: user.companyId,
        userId,
        points: Math.round(points),
        reason: reason.trim(),
        sourceType: typeof sourceType === 'string' ? sourceType : '',
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(pointsRecord, { status: 201 });
  } catch (error) {
    console.error('Award points error:', error);
    return NextResponse.json(
      { error: 'Erro ao atribuir pontos.' },
      { status: 500 },
    );
  }
}
