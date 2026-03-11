import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, taskId } = await params;
  const body = await request.json();

  // Verify process belongs to user's company
  const process = await prisma.onboardingProcess.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!process) {
    return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  }

  const task = await prisma.onboardingProcessTask.update({
    where: { id: taskId },
    data: {
      status: body.status,
      completedAt: body.status === 'COMPLETED' ? new Date() : null,
      note: body.note !== undefined ? body.note : undefined,
    },
  });

  return NextResponse.json(task);
}
