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
  const { emoji } = body;

  if (!emoji) {
    return NextResponse.json({ error: 'Emoji é obrigatório.' }, { status: 400 });
  }

  // Upsert — one reaction per user per celebration (updates emoji if already exists)
  const reaction = await prisma.celebrationReaction.upsert({
    where: {
      celebrationId_userId: {
        celebrationId: params.id,
        userId: user.id,
      },
    },
    update: { emoji },
    create: {
      celebrationId: params.id,
      userId: user.id,
      emoji,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(reaction);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  await prisma.celebrationReaction.deleteMany({
    where: {
      celebrationId: params.id,
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
