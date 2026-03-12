import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse();
  }

  try {
    const body: unknown = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId é obrigatório.' },
        { status: 400 },
      );
    }

    // Verify badge exists in same company
    const badge = await prisma.badge.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge não encontrado.' },
        { status: 404 },
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId: user.companyId, active: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado.' },
        { status: 404 },
      );
    }

    // Check if already awarded
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: params.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Este badge já foi concedido a este colaborador.' },
        { status: 400 },
      );
    }

    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId: params.id,
        awardedBy: user.id,
      },
      include: {
        badge: true,
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(userBadge, { status: 201 });
  } catch (error) {
    console.error('Award badge error:', error);
    return NextResponse.json(
      { error: 'Erro ao conceder badge.' },
      { status: 500 },
    );
  }
}
