import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || undefined;
  const period = searchParams.get('period') || undefined;
  const direction = searchParams.get('direction') || 'received';

  const where: Record<string, unknown> = {
    companyId: user.companyId,
  };

  if (direction === 'received') {
    where.toUserId = user.id;
  } else if (direction === 'sent') {
    where.fromUserId = user.id;
  }

  if (type) {
    where.type = type;
  }

  if (period) {
    const now = new Date();
    if (period === '7d') {
      where.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === '30d') {
      where.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    } else if (period === '90d') {
      where.createdAt = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    }
  }

  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
    },
  });

  return NextResponse.json(feedbacks);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  try {
    const { toUserId, type, content, visibility } = await request.json();

    if (!toUserId || !type || !content) {
      return NextResponse.json(
        { error: 'Destinatário, tipo e conteúdo são obrigatórios.' },
        { status: 400 },
      );
    }

    if (content.trim().length < 20) {
      return NextResponse.json(
        { error: 'O feedback deve ter no mínimo 20 caracteres.' },
        { status: 400 },
      );
    }

    if (!['PRAISE', 'CONSTRUCTIVE', 'REQUEST'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use PRAISE, CONSTRUCTIVE ou REQUEST.' },
        { status: 400 },
      );
    }

    if (toUserId === user.id) {
      return NextResponse.json(
        { error: 'Você não pode enviar feedback para si mesmo.' },
        { status: 400 },
      );
    }

    const recipient = await prisma.user.findFirst({
      where: { id: toUserId, companyId: user.companyId, active: true },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Destinatário não encontrado.' },
        { status: 400 },
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        companyId: user.companyId,
        fromUserId: user.id,
        toUserId,
        type,
        content: content.trim(),
        visibility: visibility || 'PRIVATE',
      },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      },
    });

    const typeLabel = type === 'PRAISE' ? 'elogio' : type === 'CONSTRUCTIVE' ? 'feedback construtivo' : 'solicitação';
    createNotification({
      companyId: user.companyId,
      userId: toUserId,
      type: 'FEEDBACK_RECEIVED',
      title: `Novo ${typeLabel} recebido`,
      body: `${user.name} enviou um ${typeLabel} para você.`,
      link: '/feedback',
    }).catch(() => {});

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Create feedback error:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar feedback.' },
      { status: 500 },
    );
  }
}
