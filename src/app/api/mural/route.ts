import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import type { CelebrationType } from '@prisma/client';

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
        media: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, url: true, type: true, fileName: true, mimeType: true, width: true, height: true },
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

interface MediaInput {
  url: string;
  type: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { content, type, media } = body as {
    content: string;
    type: string;
    media?: MediaInput[];
  };

  const hasMedia = Array.isArray(media) && media.length > 0;

  if (!content && !hasMedia) {
    return NextResponse.json(
      { error: 'Adicione texto ou mídia à sua publicação.' },
      { status: 400 },
    );
  }

  if (content && !hasMedia && content.length < 5) {
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

  if (hasMedia && media.length > 10) {
    return NextResponse.json(
      { error: 'Máximo de 10 arquivos por publicação.' },
      { status: 400 },
    );
  }

  const celebration = await prisma.celebration.create({
    data: {
      companyId: user.companyId,
      authorId: user.id,
      content: content || '',
      type: type as CelebrationType,
      ...(hasMedia
        ? {
            media: {
              create: media.map((m: MediaInput) => ({
                url: m.url,
                type: m.type,
                fileName: m.fileName || null,
                fileSize: m.fileSize || null,
                mimeType: m.mimeType || null,
              })),
            },
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      reactions: true,
      comments: true,
      media: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, url: true, type: true, fileName: true, mimeType: true, width: true, height: true },
      },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(celebration, { status: 201 });
}
