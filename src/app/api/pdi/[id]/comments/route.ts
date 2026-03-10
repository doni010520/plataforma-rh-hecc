import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  // Verify plan belongs to company
  const plan = await prisma.developmentPlan.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!plan) {
    return NextResponse.json({ error: 'PDI não encontrado.' }, { status: 404 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Conteúdo é obrigatório.' }, { status: 400 });
  }

  const comment = await prisma.developmentPlanComment.create({
    data: {
      planId: id,
      userId: user.id,
      content,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
