import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const where: Record<string, unknown> = { companyId: user.companyId };
  if (type) where.type = type;

  const [celebrations, total] = await Promise.all([
    prisma.celebration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.celebration.count({ where }),
  ]);

  return NextResponse.json({
    data: celebrations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { content, type } = body;

  if (!content || content.length < 5) {
    return NextResponse.json(
      { error: 'O conteúdo deve ter pelo menos 5 caracteres.' },
      { status: 400 },
    );
  }

  if (!type || !['ACHIEVEMENT', 'BIRTHDAY', 'ANNIVERSARY', 'GENERAL'].includes(type)) {
    return NextResponse.json(
      { error: 'Tipo de celebração inválido.' },
      { status: 400 },
    );
  }

  const celebration = await prisma.celebration.create({
    data: {
      companyId: user.companyId,
      authorId: user.id,
      content,
      type,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      reactions: true,
      comments: true,
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(celebration, { status: 201 });
}
