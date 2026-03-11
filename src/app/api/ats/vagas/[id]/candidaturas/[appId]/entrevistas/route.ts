import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, appId } = await params;
  const body = await request.json();
  const { interviewerId, type, scheduledAt, durationMin, location, notes } = body;

  if (!scheduledAt || !type) {
    return NextResponse.json(
      { error: 'Tipo e data da entrevista são obrigatórios.' },
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

  const interview = await prisma.interview.create({
    data: {
      applicationId: appId,
      interviewerId: interviewerId || user.id,
      type,
      status: 'SCHEDULED',
      scheduledAt: new Date(scheduledAt),
      durationMin: durationMin || 60,
      location: location || null,
      notes: notes || null,
    },
    include: {
      interviewer: { select: { id: true, name: true } },
      application: {
        include: {
          candidate: { select: { id: true, name: true, email: true } },
          position: { select: { id: true, title: true } },
        },
      },
    },
  });

  return NextResponse.json(interview, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, appId } = await params;
  const body = await request.json();
  const { interviewId, status, score, feedback, notes, scheduledAt, location } = body;

  if (!interviewId) {
    return NextResponse.json(
      { error: 'ID da entrevista é obrigatório.' },
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

  // Verify the interview exists for this application
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, applicationId: appId },
  });

  if (!interview) {
    return NextResponse.json(
      { error: 'Entrevista não encontrada.' },
      { status: 404 },
    );
  }

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (score !== undefined) data.score = score;
  if (feedback !== undefined) data.feedback = feedback;
  if (notes !== undefined) data.notes = notes;
  if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
  if (location !== undefined) data.location = location;

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data,
    include: {
      interviewer: { select: { id: true, name: true } },
      application: {
        include: {
          candidate: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(updatedInterview);
}
