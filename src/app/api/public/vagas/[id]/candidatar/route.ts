import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ApplicationBody {
  name: string;
  email: string;
  phone?: string;
  linkedIn?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const position = await prisma.jobPosition.findUnique({
    where: { id },
    select: { id: true, companyId: true, status: true },
  });

  if (!position || position.status !== 'OPEN') {
    return NextResponse.json({ error: 'Vaga não encontrada ou encerrada.' }, { status: 404 });
  }

  const body = (await request.json()) as ApplicationBody;
  const { name, email, phone, linkedIn } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Nome e email são obrigatórios.' },
      { status: 400 }
    );
  }

  // Find or create candidate
  let candidate = await prisma.candidate.findUnique({
    where: {
      companyId_email: {
        companyId: position.companyId,
        email,
      },
    },
  });

  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        companyId: position.companyId,
        name,
        email,
        phone: phone || '',
        linkedIn: linkedIn || null,
      },
    });
  } else {
    // Update candidate info if they apply again
    candidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        name,
        phone: phone || candidate.phone,
        linkedIn: linkedIn || candidate.linkedIn,
      },
    });
  }

  // Check if already applied to this position
  const existingApp = await prisma.application.findUnique({
    where: {
      positionId_candidateId: {
        positionId: position.id,
        candidateId: candidate.id,
      },
    },
  });

  if (existingApp) {
    return NextResponse.json(
      { error: 'Você já se candidatou a esta vaga.' },
      { status: 409 }
    );
  }

  const application = await prisma.application.create({
    data: {
      positionId: position.id,
      candidateId: candidate.id,
    },
  });

  return NextResponse.json(
    { message: 'Candidatura enviada com sucesso!', applicationId: application.id },
    { status: 201 }
  );
}
