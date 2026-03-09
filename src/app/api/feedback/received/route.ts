import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'ID do colaborador é obrigatório.' },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, companyId: user.companyId },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: 'Colaborador não encontrado.' },
      { status: 404 },
    );
  }

  const isOwnProfile = userId === user.id;
  const isManager = targetUser.managerId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwnProfile && !isManager && !isAdmin) {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        toUserId: userId,
        companyId: user.companyId,
        visibility: 'PUBLIC',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return NextResponse.json(feedbacks);
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      toUserId: userId,
      companyId: user.companyId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(feedbacks);
}
