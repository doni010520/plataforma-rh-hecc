import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const celebration = await prisma.celebration.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!celebration) {
    return NextResponse.json({ error: 'Celebração não encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || content.length < 2) {
    return NextResponse.json(
      { error: 'O comentário deve ter pelo menos 2 caracteres.' },
      { status: 400 },
    );
  }

  const comment = await prisma.celebrationComment.create({
    data: {
      celebrationId: params.id,
      userId: user.id,
      content,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
