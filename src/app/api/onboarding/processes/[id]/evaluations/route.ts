import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { period, score, comment } = body;

  if (!period || score === undefined) {
    return NextResponse.json(
      { error: 'Período e nota são obrigatórios.' },
      { status: 400 }
    );
  }

  const process = await prisma.onboardingProcess.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!process) {
    return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  }

  const evaluation = await prisma.onboardingEvaluation.create({
    data: {
      processId: id,
      evaluatorId: user.id,
      period,
      score,
      comment: comment || '',
    },
    include: {
      evaluator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(evaluation, { status: 201 });
}
