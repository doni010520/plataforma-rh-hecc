import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const process = await prisma.onboardingProcess.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true, email: true } },
      template: { select: { id: true, name: true, durationDays: true } },
      tasks: { orderBy: { dueDate: 'asc' } },
      evaluations: {
        include: { evaluator: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!process) {
    return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(process);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.onboardingProcess.updateMany({
    where: { id, companyId: user.companyId },
    data: {
      status: body.status,
      completedAt: body.status === 'COMPLETED' ? new Date() : undefined,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  await prisma.onboardingProcess.deleteMany({
    where: { id, companyId: user.companyId },
  });

  return NextResponse.json({ success: true });
}
