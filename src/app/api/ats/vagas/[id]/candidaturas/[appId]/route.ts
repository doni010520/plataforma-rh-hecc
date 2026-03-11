import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, appId } = await params;
  const body = await request.json();
  const { status, currentStage, evaluation } = body;

  // Verify the position belongs to the company
  const position = await prisma.jobPosition.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!position) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  // Verify the application exists for this position
  const application = await prisma.application.findFirst({
    where: { id: appId, positionId: id },
  });

  if (!application) {
    return NextResponse.json(
      { error: 'Candidatura não encontrada.' },
      { status: 404 },
    );
  }

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (currentStage !== undefined) data.currentStage = currentStage;

  // Update application status/stage
  const updatedApplication = await prisma.application.update({
    where: { id: appId },
    data,
    include: {
      candidate: true,
      evaluations: {
        include: { evaluator: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      interviews: {
        include: { interviewer: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  // Add evaluation if provided
  if (evaluation) {
    await prisma.applicationEvaluation.create({
      data: {
        applicationId: appId,
        evaluatorId: user.id,
        score: evaluation.score ?? null,
        comment: evaluation.comment || '',
      },
    });
  }

  return NextResponse.json(updatedApplication);
}
