import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { candidateId } = body;

  if (!candidateId) {
    return NextResponse.json(
      { error: 'ID do candidato é obrigatório.' },
      { status: 400 },
    );
  }

  // Verify the position belongs to the company
  const position = await prisma.jobPosition.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!position) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  if (position.status !== 'OPEN') {
    return NextResponse.json(
      { error: 'Esta vaga não está aberta para candidaturas.' },
      { status: 400 },
    );
  }

  // Verify the candidate belongs to the company
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: user.companyId },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: 'Candidato não encontrado.' },
      { status: 404 },
    );
  }

  // Check for duplicate application
  const existingApp = await prisma.application.findUnique({
    where: { positionId_candidateId: { positionId: id, candidateId } },
  });

  if (existingApp) {
    return NextResponse.json(
      { error: 'Candidato já aplicou para esta vaga.' },
      { status: 409 },
    );
  }

  const application = await prisma.application.create({
    data: {
      positionId: id,
      candidateId,
      status: 'NEW',
    },
    include: {
      candidate: true,
      position: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(application, { status: 201 });
}
